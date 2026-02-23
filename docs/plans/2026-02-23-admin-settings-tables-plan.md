# Admin Settings + Tables Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the admin setup flow by adding tables CRUD with QR codes, logo upload, and operating hours to settings.

**Architecture:** API routes follow existing pattern (getServerSession + organizationId scoping). Tables page is a new route with drawer for create/edit. Settings page gets two new sections (logo + hours) inserted before the existing theme picker. QR codes generated client-side with `qrcode.react`.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Cloudinary, qrcode.react, framer-motion

---

### Task 1: Install qrcode.react

**Files:**
- Modify: `package.json`

**Step 1: Install the dependency**

Run: `npm install qrcode.react`

**Step 2: Verify installation**

Run: `npm ls qrcode.react`
Expected: `qrcode.react@4.x.x`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add qrcode.react dependency"
```

---

### Task 2: Tables API — GET + POST

**Files:**
- Create: `src/app/api/tables/route.ts`

**Context:** Follow the exact pattern from `src/app/api/menu/categories/route.ts` — getServerSession auth, organizationId scoping, drizzle queries.

**Step 1: Create the API route**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tables, restaurants } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const result = await db
    .select()
    .from(tables)
    .where(eq(tables.organizationId, session.user.organizationId))
    .orderBy(asc(tables.number));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId || !session?.user?.branchId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { number, zone, capacity, count: bulkCount } = body;

  // Bulk create: "Agregar mesas 1-10"
  if (bulkCount && bulkCount > 0) {
    // Find the highest existing table number
    const existing = await db
      .select({ number: tables.number })
      .from(tables)
      .where(eq(tables.organizationId, session.user.organizationId))
      .orderBy(asc(tables.number));

    const maxNumber = existing.length > 0 ? Math.max(...existing.map((t) => t.number)) : 0;

    // Get restaurant slug for QR URL
    const [restaurant] = await db
      .select({ slug: restaurants.slug })
      .from(restaurants)
      .where(eq(restaurants.organizationId, session.user.organizationId))
      .limit(1);

    const slug = restaurant?.slug ?? "unknown";

    const newTables = Array.from({ length: Math.min(bulkCount, 50) }, (_, i) => {
      const num = maxNumber + i + 1;
      return {
        organizationId: session.user.organizationId!,
        branchId: session.user.branchId!,
        number: num,
        zone: zone?.trim() || null,
        capacity: capacity || 4,
        qrCode: `${process.env.NEXTAUTH_URL ?? "https://gastrocloud.vercel.app"}/r/${slug}/menu?table=${num}`,
      };
    });

    const created = await db.insert(tables).values(newTables).returning();
    return NextResponse.json(created, { status: 201 });
  }

  // Single create
  if (!number || !capacity) {
    return NextResponse.json(
      { error: "Número y capacidad son requeridos" },
      { status: 400 },
    );
  }

  // Check duplicate number
  const duplicate = await db
    .select({ id: tables.id })
    .from(tables)
    .where(
      and(
        eq(tables.organizationId, session.user.organizationId),
        eq(tables.number, number),
      ),
    )
    .limit(1);

  if (duplicate.length > 0) {
    return NextResponse.json(
      { error: `Ya existe una mesa con el número ${number}` },
      { status: 409 },
    );
  }

  const [restaurant] = await db
    .select({ slug: restaurants.slug })
    .from(restaurants)
    .where(eq(restaurants.organizationId, session.user.organizationId))
    .limit(1);

  const slug = restaurant?.slug ?? "unknown";
  const qrUrl = `${process.env.NEXTAUTH_URL ?? "https://gastrocloud.vercel.app"}/r/${slug}/menu?table=${number}`;

  const [created] = await db
    .insert(tables)
    .values({
      organizationId: session.user.organizationId,
      branchId: session.user.branchId,
      number,
      zone: zone?.trim() || null,
      capacity,
      qrCode: qrUrl,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/api/tables/route.ts
git commit -m "feat(tables): add GET and POST API routes with bulk create"
```

---

### Task 3: Tables API — PUT + DELETE

**Files:**
- Create: `src/app/api/tables/[id]/route.ts`

**Context:** Follow pattern from `src/app/api/menu/categories/[id]/route.ts` — params are `Promise<{ id: string }>`.

**Step 1: Create the API route**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tables } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { number, zone, capacity, status } = body;

  const [updated] = await db
    .update(tables)
    .set({
      ...(number !== undefined && { number }),
      ...(zone !== undefined && { zone: zone?.trim() || null }),
      ...(capacity !== undefined && { capacity }),
      ...(status !== undefined && { status }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tables.id, id),
        eq(tables.organizationId, session.user.organizationId),
      ),
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const [deleted] = await db
    .delete(tables)
    .where(
      and(
        eq(tables.id, id),
        eq(tables.organizationId, session.user.organizationId),
      ),
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/api/tables/[id]/route.ts
git commit -m "feat(tables): add PUT and DELETE API routes"
```

---

### Task 4: Logo Upload API

**Files:**
- Create: `src/app/api/restaurant/logo/route.ts`

**Context:** Reuse the Cloudinary upload pattern from `src/app/api/menu/upload/route.ts`. This route uploads to `gastrocloud/{orgId}/brand` folder, saves `secure_url` to `restaurants.logoUrl`, and also has a GET to fetch current logo.

**Step 1: Create the API route**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { restaurants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [restaurant] = await db
    .select({ logoUrl: restaurants.logoUrl, name: restaurants.name })
    .from(restaurants)
    .where(eq(restaurants.organizationId, session.user.organizationId))
    .limit(1);

  return NextResponse.json({ logoUrl: restaurant?.logoUrl ?? null, name: restaurant?.name ?? "" });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo no puede superar 5MB" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `gastrocloud/${session.user.organizationId}/brand`,
            transformation: [
              { width: 400, height: 400, crop: "pad", background: "transparent" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error || !result) reject(error);
            else resolve({ secure_url: result.secure_url, public_id: result.public_id });
          },
        )
        .end(buffer);
    },
  );

  // Save to DB
  await db
    .update(restaurants)
    .set({ logoUrl: result.secure_url, updatedAt: new Date() })
    .where(eq(restaurants.organizationId, session.user.organizationId!));

  return NextResponse.json(result);
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/api/restaurant/logo/route.ts
git commit -m "feat(settings): add logo upload API with Cloudinary"
```

---

### Task 5: Operating Hours API

**Files:**
- Create: `src/app/api/branch/operating-hours/route.ts`

**Context:** The `branches` table has a JSONB `operatingHours` column. This route reads/writes it.

**Step 1: Create the API route**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { branches } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId || !session?.user?.branchId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [branch] = await db
    .select({ operatingHours: branches.operatingHours })
    .from(branches)
    .where(eq(branches.id, session.user.branchId))
    .limit(1);

  return NextResponse.json({ operatingHours: branch?.operatingHours ?? null });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId || !session?.user?.branchId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { operatingHours } = body;

  if (!operatingHours || typeof operatingHours !== "object") {
    return NextResponse.json({ error: "Horarios inválidos" }, { status: 400 });
  }

  const [updated] = await db
    .update(branches)
    .set({ operatingHours, updatedAt: new Date() })
    .where(eq(branches.id, session.user.branchId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ success: true, operatingHours: updated.operatingHours });
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/api/branch/operating-hours/route.ts
git commit -m "feat(settings): add operating hours GET/PUT API"
```

---

### Task 6: Settings Page — Add Logo + Operating Hours Sections

**Files:**
- Modify: `src/app/(restaurant-admin)/settings/page.tsx`

**Context:** The current settings page has 2 sections: Theme Picker and Custom Domain. Insert 2 new sections BEFORE the theme picker: Logo Upload and Operating Hours.

**Step 1: Rewrite settings page with all 4 sections**

The page needs new state for logo and hours. Reuse the existing `ImageUpload` component pattern but point it to `/api/restaurant/logo`. For hours, build a day-grid with selects at 15-min intervals and support 2 ranges per day.

The full implementation should:
- Fetch logo from `GET /api/restaurant/logo` on mount
- Fetch hours from `GET /api/branch/operating-hours` on mount
- Logo section: use same drop zone pattern as `ImageUpload` component, but POST to `/api/restaurant/logo`
- Hours section: 7-day grid with toggle, 2 time range rows per day, 15-min select dropdowns, "Copiar a todos" button
- Keep existing theme picker and domain sections unchanged below

**Key UI patterns:**
- Each section uses the existing glass card: `bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6`
- Section headers with icon + title + description (same as theme section)
- Save buttons per section with loading/success states
- Time selects: generate options from "00:00" to "23:45" in 15-min steps
- Day names in Spanish: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo
- Default hours when first enabled: 09:00 - 22:00

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/(restaurant-admin)/settings/page.tsx
git commit -m "feat(settings): add logo upload and operating hours sections"
```

---

### Task 7: Table Drawer Component

**Files:**
- Create: `src/components/table-drawer.tsx`

**Context:** Follow the exact pattern from `src/components/menu-item-drawer.tsx` — slide-in drawer with AnimatePresence, form fields, save/loading state. This drawer handles both single create and bulk create modes.

**Step 1: Create the drawer component**

The drawer should have:
- Props: `open, onClose, onSaved, table?: TableData | null` (null = create mode)
- Fields: Número (number input), Zona (text input with suggestions: "Salón", "Terraza", "Barra"), Capacidad (number input, default 4)
- Bulk mode toggle: when enabled, shows "Cantidad" field instead of "Número", creates N tables starting from highest existing + 1
- Submit: POST/PUT to `/api/tables`
- Same glass card styling, X close button, overlay backdrop

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/table-drawer.tsx
git commit -m "feat(tables): add table drawer component for create/edit"
```

---

### Task 8: Table QR Modal Component

**Files:**
- Create: `src/components/table-qr-modal.tsx`

**Context:** Modal that shows a QR code for a table and lets the user download it as SVG.

**Step 1: Create the QR modal**

```typescript
// Key implementation details:
// - Import { QRCodeSVG } from "qrcode.react"
// - Props: open, onClose, table: { number, zone, qrCode }
// - Render QRCodeSVG with value={table.qrCode}, size={256}, level="H"
// - Download button: use XMLSerializer to serialize the SVG element,
//   create Blob with type "image/svg+xml", trigger download as "mesa-{number}-qr.svg"
// - Copy URL button: navigator.clipboard.writeText(table.qrCode)
// - Show the URL text below the QR
// - Modal overlay with glass card styling
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/table-qr-modal.tsx
git commit -m "feat(tables): add QR code modal with SVG download"
```

---

### Task 9: Tables Page

**Files:**
- Create: `src/app/(restaurant-admin)/tables/page.tsx`

**Context:** This is the main tables management page. Grid of table cards with status badges, drawer for create/edit, QR modal.

**Step 1: Create the tables page**

The page should:
- Fetch tables from `GET /api/tables` on mount
- Display grid of cards (2 cols mobile, 3 cols tablet, 4 cols desktop)
- Each card shows: table number (large), zone tag, capacity icon with count, status badge
- Status badge colors: available=slate, occupied=amber, reserved=red, cleaning=blue
- Action buttons per card: Edit (opens drawer), QR (opens modal), Delete (confirm dialog)
- Top bar: title "Mesas", "Nueva Mesa" button, "Agregar Múltiples" button
- Both buttons open the TableDrawer (single vs bulk mode)
- Empty state when no tables: icon + "Agrega tu primera mesa" + button
- Use framer-motion fadeUp animations matching existing admin pages
- After any CRUD operation, refetch the table list

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/(restaurant-admin)/tables/page.tsx
git commit -m "feat(tables): add tables management page with grid, drawer, QR"
```

---

### Task 10: Fix Setup Checklist Link

**Files:**
- Modify: `src/components/setup-checklist.tsx:69`

**Step 1: Change the "Agrega tus mesas" href**

Change line 69 from:
```typescript
      href: "/settings",
```
to:
```typescript
      href: "/tables",
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/setup-checklist.tsx
git commit -m "fix(checklist): point tables link to /tables instead of /settings"
```

---

### Task 11: Build Verification

**Step 1: Full build**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds with 0 TypeScript errors. The `/tables` route should appear in the output.

**Step 2: Verify all new routes appear**

Expected routes in build output:
- `/tables` (static or dynamic)
- API routes are handled by the catch-all

**Step 3: Final commit if any fixes needed**
