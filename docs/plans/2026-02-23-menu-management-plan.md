# Menu Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace mock menu page with full CRUD for categories, items, and modifiers, with image upload via Cloudinary.

**Architecture:** RESTful API routes using Drizzle ORM queries scoped by `organizationId` from session. Drawer-based UI for create/edit forms. Cloudinary server-side signed uploads via dedicated API route. The menu page fetches data on mount and updates optimistically.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Cloudinary (server SDK), Framer Motion, Tailwind CSS 4

---

## Task 1: Install Cloudinary and create upload API route

**Files:**
- Create: `src/app/api/menu/upload/route.ts`

**Step 1: Install cloudinary**

```bash
cd /c/restpro/gastrocloud && npm install cloudinary
```

**Step 2: Create the upload route**

```typescript
// src/app/api/menu/upload/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `gastrocloud/${session.user.organizationId}/menu`,
            transformation: [
              { width: 800, crop: "limit" },
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

  return NextResponse.json(result);
}
```

**Step 3: Commit**

```bash
git add src/app/api/menu/upload/route.ts package.json package-lock.json
git commit -m "feat: add Cloudinary image upload API route for menu"
```

---

## Task 2: Create categories API routes

**Files:**
- Create: `src/app/api/menu/categories/route.ts`
- Create: `src/app/api/menu/categories/[id]/route.ts`

**Step 1: Create GET/POST for categories**

```typescript
// src/app/api/menu/categories/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuCategories, menuItems, restaurants } from "@/db/schema";
import { eq, and, count, asc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const orgId = session.user.organizationId;

  // Get restaurant for this org
  const [restaurant] = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.organizationId, orgId))
    .limit(1);

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 });
  }

  // Get categories with item counts
  const cats = await db
    .select({
      id: menuCategories.id,
      name: menuCategories.name,
      description: menuCategories.description,
      displayOrder: menuCategories.displayOrder,
      imageUrl: menuCategories.imageUrl,
      isActive: menuCategories.isActive,
    })
    .from(menuCategories)
    .where(eq(menuCategories.restaurantId, restaurant.id))
    .orderBy(asc(menuCategories.displayOrder));

  // Get item counts per category
  const counts = await db
    .select({
      categoryId: menuItems.categoryId,
      count: count(),
    })
    .from(menuItems)
    .where(eq(menuItems.organizationId, orgId))
    .groupBy(menuItems.categoryId);

  const countMap = new Map(counts.map((c) => [c.categoryId, Number(c.count)]));

  const result = cats.map((cat) => ({
    ...cat,
    itemCount: countMap.get(cat.id) ?? 0,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const body = await request.json();
  const { name, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 });
  }

  const [restaurant] = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.organizationId, orgId))
    .limit(1);

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 });
  }

  // Get max displayOrder
  const existing = await db
    .select({ displayOrder: menuCategories.displayOrder })
    .from(menuCategories)
    .where(eq(menuCategories.restaurantId, restaurant.id))
    .orderBy(asc(menuCategories.displayOrder));

  const nextOrder = existing.length > 0 ? existing[existing.length - 1].displayOrder + 1 : 0;

  const [category] = await db
    .insert(menuCategories)
    .values({
      organizationId: orgId,
      restaurantId: restaurant.id,
      name: name.trim(),
      description: description?.trim() || null,
      displayOrder: nextOrder,
    })
    .returning();

  return NextResponse.json(category, { status: 201 });
}
```

**Step 2: Create PUT/DELETE for single category**

```typescript
// src/app/api/menu/categories/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuCategories, menuItems } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

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
  const { name, description, isActive } = body;

  const [updated] = await db
    .update(menuCategories)
    .set({
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(menuCategories.id, id),
        eq(menuCategories.organizationId, session.user.organizationId),
      ),
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
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

  // Check if category has items
  const [itemCount] = await db
    .select({ count: count() })
    .from(menuItems)
    .where(eq(menuItems.categoryId, id));

  if (Number(itemCount.count) > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar una categoría con platos. Mueve o elimina los platos primero." },
      { status: 409 },
    );
  }

  const [deleted] = await db
    .delete(menuCategories)
    .where(
      and(
        eq(menuCategories.id, id),
        eq(menuCategories.organizationId, session.user.organizationId),
      ),
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 3: Commit**

```bash
git add src/app/api/menu/categories/
git commit -m "feat: add CRUD API routes for menu categories"
```

---

## Task 3: Create menu items API routes

**Files:**
- Create: `src/app/api/menu/items/route.ts`
- Create: `src/app/api/menu/items/[id]/route.ts`
- Create: `src/app/api/menu/items/[id]/availability/route.ts`

**Step 1: Create GET/POST for items**

```typescript
// src/app/api/menu/items/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuItems, menuModifiers } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");

  const conditions = [eq(menuItems.organizationId, session.user.organizationId)];
  if (categoryId) {
    conditions.push(eq(menuItems.categoryId, categoryId));
  }

  const items = await db
    .select()
    .from(menuItems)
    .where(and(...conditions))
    .orderBy(asc(menuItems.displayOrder));

  // Fetch modifiers for all items
  const itemIds = items.map((i) => i.id);
  let modifiers: (typeof menuModifiers.$inferSelect)[] = [];
  if (itemIds.length > 0) {
    modifiers = await db
      .select()
      .from(menuModifiers)
      .where(eq(menuModifiers.organizationId, session.user.organizationId));
  }

  const modifiersByItem = new Map<string, typeof modifiers>();
  for (const mod of modifiers) {
    const existing = modifiersByItem.get(mod.menuItemId) ?? [];
    existing.push(mod);
    modifiersByItem.set(mod.menuItemId, existing);
  }

  const result = items.map((item) => ({
    ...item,
    modifiers: modifiersByItem.get(item.id) ?? [],
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const body = await request.json();
  const {
    categoryId,
    name,
    description,
    price,
    imageUrl,
    prepTimeMinutes,
    ingredients,
    allergens,
    station,
    modifiers: modifiersList,
  } = body;

  if (!categoryId || !name?.trim() || price === undefined) {
    return NextResponse.json(
      { error: "Categoría, nombre y precio son requeridos" },
      { status: 400 },
    );
  }

  const [item] = await db
    .insert(menuItems)
    .values({
      organizationId: orgId,
      categoryId,
      name: name.trim(),
      description: description?.trim() || null,
      price: String(price),
      imageUrl: imageUrl || null,
      prepTimeMinutes: prepTimeMinutes || null,
      ingredients: ingredients || null,
      allergens: allergens || null,
      station: station || null,
    })
    .returning();

  // Create modifiers if provided
  if (modifiersList?.length > 0) {
    await db.insert(menuModifiers).values(
      modifiersList.map((m: { name: string; priceAdjustment: number; isDefault?: boolean }) => ({
        organizationId: orgId,
        menuItemId: item.id,
        name: m.name.trim(),
        priceAdjustment: String(m.priceAdjustment ?? 0),
        isDefault: m.isDefault ?? false,
      })),
    );
  }

  return NextResponse.json(item, { status: 201 });
}
```

**Step 2: Create PUT/DELETE for single item**

```typescript
// src/app/api/menu/items/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuItems, menuModifiers } from "@/db/schema";
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
  const orgId = session.user.organizationId;
  const body = await request.json();
  const {
    categoryId,
    name,
    description,
    price,
    imageUrl,
    prepTimeMinutes,
    ingredients,
    allergens,
    station,
    isAvailable,
    modifiers: modifiersList,
  } = body;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (categoryId !== undefined) updateData.categoryId = categoryId;
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (price !== undefined) updateData.price = String(price);
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
  if (prepTimeMinutes !== undefined) updateData.prepTimeMinutes = prepTimeMinutes || null;
  if (ingredients !== undefined) updateData.ingredients = ingredients;
  if (allergens !== undefined) updateData.allergens = allergens;
  if (station !== undefined) updateData.station = station || null;
  if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

  const [updated] = await db
    .update(menuItems)
    .set(updateData)
    .where(and(eq(menuItems.id, id), eq(menuItems.organizationId, orgId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Plato no encontrado" }, { status: 404 });
  }

  // Replace modifiers if provided
  if (modifiersList !== undefined) {
    await db
      .delete(menuModifiers)
      .where(eq(menuModifiers.menuItemId, id));

    if (modifiersList.length > 0) {
      await db.insert(menuModifiers).values(
        modifiersList.map((m: { name: string; priceAdjustment: number; isDefault?: boolean }) => ({
          organizationId: orgId,
          menuItemId: id,
          name: m.name.trim(),
          priceAdjustment: String(m.priceAdjustment ?? 0),
          isDefault: m.isDefault ?? false,
        })),
      );
    }
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
    .delete(menuItems)
    .where(
      and(
        eq(menuItems.id, id),
        eq(menuItems.organizationId, session.user.organizationId),
      ),
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Plato no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 3: Create availability toggle**

```typescript
// src/app/api/menu/items/[id]/availability/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuItems } from "@/db/schema";
import { eq, and, not } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  // Toggle: set isAvailable = NOT isAvailable
  const [item] = await db
    .select({ isAvailable: menuItems.isAvailable })
    .from(menuItems)
    .where(and(eq(menuItems.id, id), eq(menuItems.organizationId, session.user.organizationId)))
    .limit(1);

  if (!item) {
    return NextResponse.json({ error: "Plato no encontrado" }, { status: 404 });
  }

  const [updated] = await db
    .update(menuItems)
    .set({ isAvailable: !item.isAvailable, updatedAt: new Date() })
    .where(and(eq(menuItems.id, id), eq(menuItems.organizationId, session.user.organizationId)))
    .returning();

  return NextResponse.json(updated);
}
```

**Step 4: Commit**

```bash
git add src/app/api/menu/items/
git commit -m "feat: add CRUD API routes for menu items with modifiers"
```

---

## Task 4: Create ImageUpload component

**Files:**
- Create: `src/components/image-upload.tsx`

**Step 1: Create the drag & drop image upload component**

```typescript
// src/components/image-upload.tsx
"use client";

import { useState, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 5 * 1024 * 1024) {
        alert("La imagen no puede superar 5MB");
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/menu/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();
        onChange(data.secure_url);
      } catch {
        alert("Error al subir la imagen");
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  if (value) {
    return (
      <div className="relative group rounded-xl overflow-hidden border border-white/10">
        <img
          src={value}
          alt="Preview"
          className="w-full h-40 object-cover"
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
        dragOver
          ? "border-orange-500 bg-orange-500/10"
          : "border-white/10 hover:border-white/20 bg-white/[0.02]"
      }`}
    >
      {uploading ? (
        <Loader2 size={24} className="text-orange-400 animate-spin" />
      ) : (
        <>
          <ImageIcon size={24} className="text-slate-500 mb-2" />
          <span className="text-xs text-slate-400">
            Arrastra una imagen o haz clic
          </span>
          <span className="text-xs text-slate-600 mt-0.5">
            JPG, PNG. Máx 5MB.
          </span>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
        disabled={uploading}
      />
    </label>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/image-upload.tsx
git commit -m "feat: add ImageUpload component with drag & drop and Cloudinary"
```

---

## Task 5: Create CategoryDrawer component

**Files:**
- Create: `src/components/category-drawer.tsx`

**Step 1: Create the category create/edit drawer**

```typescript
// src/components/category-drawer.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface CategoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  category?: Category | null;
}

export function CategoryDrawer({ open, onClose, onSaved, category }: CategoryDrawerProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!category;

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description ?? "");
    } else {
      setName("");
      setDescription("");
    }
    setError("");
  }, [category, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError("");

    try {
      const url = isEditing
        ? `/api/menu/categories/${category.id}`
        : "/api/menu/categories";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al guardar");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-[#0a0a1a] border-l border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-16 border-b border-white/[0.06] shrink-0">
              <h2 className="text-lg font-semibold text-white">
                {isEditing ? "Editar Categoría" : "Nueva Categoría"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Entradas"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descripción <span className="text-slate-500">(opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Platos para empezar"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] shrink-0">
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={saving || !name.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : isEditing ? (
                  "Guardar Cambios"
                ) : (
                  "Crear Categoría"
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/category-drawer.tsx
git commit -m "feat: add CategoryDrawer component for create/edit categories"
```

---

## Task 6: Create MenuItemDrawer component

**Files:**
- Create: `src/components/menu-item-drawer.tsx`

**Step 1: Create the menu item create/edit drawer**

This is the largest component - includes all fields plus modifiers section.

```typescript
// src/components/menu-item-drawer.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Plus, Trash2 } from "lucide-react";
import { ImageUpload } from "./image-upload";

const stationOptions = [
  { value: "kitchen", label: "Cocina" },
  { value: "bar", label: "Bar" },
  { value: "grill", label: "Parrilla" },
  { value: "dessert", label: "Pastelería" },
];

interface Category {
  id: string;
  name: string;
}

interface Modifier {
  name: string;
  priceAdjustment: number;
  isDefault: boolean;
}

interface MenuItemData {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  prepTimeMinutes: number | null;
  ingredients: string[] | null;
  allergens: string[] | null;
  station: string | null;
  modifiers: { name: string; priceAdjustment: string; isDefault: boolean }[];
}

interface MenuItemDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  item?: MenuItemData | null;
}

export function MenuItemDrawer({
  open,
  onClose,
  onSaved,
  categories,
  item,
}: MenuItemDrawerProps) {
  const isEditing = !!item;

  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [prepTime, setPrepTime] = useState("");
  const [station, setStation] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [allergensText, setAllergensText] = useState("");
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setCategoryId(item.categoryId);
      setName(item.name);
      setDescription(item.description ?? "");
      setPrice(item.price);
      setImageUrl(item.imageUrl);
      setPrepTime(item.prepTimeMinutes?.toString() ?? "");
      setStation(item.station ?? "");
      setIngredientsText(
        Array.isArray(item.ingredients) ? item.ingredients.join(", ") : "",
      );
      setAllergensText(
        Array.isArray(item.allergens) ? item.allergens.join(", ") : "",
      );
      setModifiers(
        item.modifiers?.map((m) => ({
          name: m.name,
          priceAdjustment: Number(m.priceAdjustment),
          isDefault: m.isDefault,
        })) ?? [],
      );
    } else {
      setCategoryId(categories[0]?.id ?? "");
      setName("");
      setDescription("");
      setPrice("");
      setImageUrl(null);
      setPrepTime("");
      setStation("");
      setIngredientsText("");
      setAllergensText("");
      setModifiers([]);
    }
    setError("");
  }, [item, open, categories]);

  function addModifier() {
    setModifiers([...modifiers, { name: "", priceAdjustment: 0, isDefault: false }]);
  }

  function removeModifier(index: number) {
    setModifiers(modifiers.filter((_, i) => i !== index));
  }

  function updateModifier(index: number, field: keyof Modifier, value: string | number | boolean) {
    setModifiers(
      modifiers.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price || !categoryId) return;

    setSaving(true);
    setError("");

    const parseList = (text: string) =>
      text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    const payload = {
      categoryId,
      name,
      description,
      price: Number(price),
      imageUrl,
      prepTimeMinutes: prepTime ? Number(prepTime) : null,
      station: station || null,
      ingredients: ingredientsText ? parseList(ingredientsText) : null,
      allergens: allergensText ? parseList(allergensText) : null,
      modifiers: modifiers.filter((m) => m.name.trim()),
    };

    try {
      const url = isEditing ? `/api/menu/items/${item.id}` : "/api/menu/items";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al guardar");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg z-50 bg-[#0a0a1a] border-l border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-16 border-b border-white/[0.06] shrink-0">
              <h2 className="text-lg font-semibold text-white">
                {isEditing ? "Editar Plato" : "Nuevo Plato"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Imagen
                </label>
                <ImageUpload value={imageUrl} onChange={setImageUrl} />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre del plato
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Pastel de Choclo"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>

              {/* Category + Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Categoría
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Precio (CLP)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="12500"
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descripción <span className="text-slate-500">(opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Preparado con choclo fresco..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all resize-none"
                />
              </div>

              {/* Station + Prep Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Estación
                  </label>
                  <select
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  >
                    <option value="" className="bg-slate-900">Sin asignar</option>
                    {stationOptions.map((s) => (
                      <option key={s.value} value={s.value} className="bg-slate-900">
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tiempo prep (min)
                  </label>
                  <input
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    placeholder="15"
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Ingredients + Allergens */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Ingredientes <span className="text-slate-500">(separados por coma)</span>
                </label>
                <input
                  type="text"
                  value={ingredientsText}
                  onChange={(e) => setIngredientsText(e.target.value)}
                  placeholder="Choclo, carne, cebolla, huevo"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Alérgenos <span className="text-slate-500">(separados por coma)</span>
                </label>
                <input
                  type="text"
                  value={allergensText}
                  onChange={(e) => setAllergensText(e.target.value)}
                  placeholder="Gluten, lácteos"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>

              {/* Modifiers Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-300">
                    Modificadores
                  </label>
                  <button
                    type="button"
                    onClick={addModifier}
                    className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    <Plus size={14} />
                    Agregar
                  </button>
                </div>
                {modifiers.length === 0 && (
                  <p className="text-xs text-slate-500">
                    Ej: Tamaño grande (+$2.000), Sin cebolla, Extra queso (+$1.500)
                  </p>
                )}
                <div className="space-y-2">
                  {modifiers.map((mod, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={mod.name}
                        onChange={(e) => updateModifier(i, "name", e.target.value)}
                        placeholder="Nombre"
                        className="flex-1 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 transition-all"
                      />
                      <input
                        type="number"
                        value={mod.priceAdjustment}
                        onChange={(e) =>
                          updateModifier(i, "priceAdjustment", Number(e.target.value))
                        }
                        placeholder="± Precio"
                        className="w-24 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => removeModifier(i)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] shrink-0">
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={saving || !name.trim() || !price || !categoryId}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : isEditing ? (
                  "Guardar Cambios"
                ) : (
                  "Crear Plato"
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/menu-item-drawer.tsx
git commit -m "feat: add MenuItemDrawer component with modifiers and image upload"
```

---

## Task 7: Rewrite the Menu page with real data

**Files:**
- Modify: `src/app/(restaurant-admin)/menu/page.tsx`

**Step 1: Replace the entire menu page**

Replace with a version that:
- Fetches categories from `/api/menu/categories` and items from `/api/menu/items`
- Uses `CategoryDrawer` and `MenuItemDrawer` for create/edit
- Calls `PATCH /api/menu/items/[id]/availability` for toggle
- Calls `DELETE` for remove actions
- Keeps the same visual design (grid cards, sidebar categories, search, station badges)

```typescript
// src/app/(restaurant-admin)/menu/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Tag,
  Flame,
  Pencil,
  Trash2,
  FolderPlus,
  MoreVertical,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CategoryDrawer } from "@/components/category-drawer";
import { MenuItemDrawer } from "@/components/menu-item-drawer";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const stationLabels: Record<string, string> = {
  kitchen: "Cocina",
  bar: "Bar",
  grill: "Parrilla",
  dessert: "Pastelería",
};

const stationColors: Record<string, string> = {
  kitchen: "bg-orange-500/20 text-orange-300",
  bar: "bg-rose-500/20 text-rose-300",
  grill: "bg-red-500/20 text-red-300",
  dessert: "bg-pink-500/20 text-pink-300",
};

interface Category {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
}

interface Modifier {
  name: string;
  priceAdjustment: string;
  isDefault: boolean;
}

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  prepTimeMinutes: number | null;
  ingredients: string[] | null;
  allergens: string[] | null;
  station: string | null;
  isAvailable: boolean;
  modifiers: Modifier[];
}

function formatCLP(price: string | number): string {
  return "$" + Number(price).toLocaleString("es-CL");
}

export default function MenuPage() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Drawer states
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemMenuOpen, setItemMenuOpen] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [catsRes, itemsRes] = await Promise.all([
        fetch("/api/menu/categories"),
        fetch("/api/menu/items"),
      ]);
      const cats = await catsRes.json();
      const allItems = await itemsRes.json();

      if (Array.isArray(cats)) setCategories(cats);
      if (Array.isArray(allItems)) setItems(allItems);

      if (!activeCategory && cats.length > 0) {
        setActiveCategory(cats[0].id);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleAvailability(itemId: string) {
    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, isAvailable: !i.isAvailable } : i,
      ),
    );

    try {
      await fetch(`/api/menu/items/${itemId}/availability`, { method: "PATCH" });
    } catch {
      // Revert on failure
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, isAvailable: !i.isAvailable } : i,
        ),
      );
    }
  }

  async function deleteItem(itemId: string) {
    if (!confirm("¿Eliminar este plato?")) return;

    try {
      const res = await fetch(`/api/menu/items/${itemId}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        fetchData(); // Refresh counts
      }
    } catch {
      alert("Error al eliminar");
    }
  }

  async function deleteCategory(catId: string) {
    if (!confirm("¿Eliminar esta categoría?")) return;

    try {
      const res = await fetch(`/api/menu/categories/${catId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        if (activeCategory === catId) {
          setActiveCategory(categories.find((c) => c.id !== catId)?.id ?? null);
        }
      } else {
        const data = await res.json();
        alert(data.error ?? "Error al eliminar");
      }
    } catch {
      alert("Error al eliminar");
    }
  }

  const filtered = items.filter((item) => {
    if (activeCategory && item.categoryId !== activeCategory) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={ref}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 flex-wrap gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Menú</h1>
          <p className="text-sm text-slate-400 mt-1">
            Administra los platos y precios de tu restaurante
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryDrawerOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <FolderPlus size={16} />
            Categoría
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setItemDrawerOpen(true);
            }}
            disabled={categories.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-shadow disabled:opacity-50"
          >
            <Plus size={16} />
            Agregar Plato
          </button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative mb-6"
      >
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="text"
          placeholder="Buscar en el menú..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
        />
      </motion.div>

      {categories.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center"
        >
          <FolderPlus size={40} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1">
            Crea tu primera categoría
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Empieza organizando tu menú en categorías (ej: Entradas, Platos de Fondo, Postres)
          </p>
          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryDrawerOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-semibold"
          >
            <FolderPlus size={16} />
            Nueva Categoría
          </button>
        </motion.div>
      ) : (
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Categories Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:w-56 shrink-0"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 space-y-1">
              {categories.map((cat) => (
                <div key={cat.id} className="group relative">
                  <button
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                      activeCategory === cat.id
                        ? "bg-gradient-to-r from-orange-500/20 to-rose-500/20 text-white border border-orange-500/20"
                        : "text-slate-400 hover:text-white hover:bg-white/5",
                    )}
                  >
                    <span className="flex-1 truncate">{cat.name}</span>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-md",
                        activeCategory === cat.id
                          ? "bg-orange-500/20 text-orange-300"
                          : "bg-white/5 text-slate-500",
                      )}
                    >
                      {cat.itemCount}
                    </span>
                  </button>
                  {/* Category actions */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCategory(cat);
                        setCategoryDrawerOpen(true);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-orange-400"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCategory(cat.id);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Menu Items Grid */}
          <div className="flex-1">
            <AnimatePresence mode="popLayout">
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {filtered.map((item, i) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={
                      inView
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0, scale: 0.95 }
                    }
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    className={cn(
                      "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden group relative",
                      !item.isAvailable && "opacity-60",
                    )}
                  >
                    {/* Image */}
                    <div className="h-36 bg-gradient-to-br from-orange-500/10 via-rose-500/10 to-amber-500/10 flex items-center justify-center relative overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl opacity-30">🍽️</span>
                      )}
                      {!item.isAvailable && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-xs font-medium text-white bg-red-500/80 px-2.5 py-1 rounded-md">
                            No disponible
                          </span>
                        </div>
                      )}
                      {/* Item actions */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setItemDrawerOpen(true);
                          }}
                          className="w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-white hover:bg-orange-500 transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-white leading-tight">
                          {item.name}
                        </h3>
                        {item.station && (
                          <span
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0 flex items-center gap-1",
                              stationColors[item.station] ??
                                "bg-white/10 text-slate-300",
                            )}
                          >
                            <Flame size={10} />
                            {stationLabels[item.station] ?? item.station}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Tag size={12} className="text-slate-500" />
                          <span className="text-lg font-bold text-white">
                            {formatCLP(item.price)}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleAvailability(item.id)}
                          className={cn(
                            "relative w-10 h-5 rounded-full transition-colors",
                            item.isAvailable
                              ? "bg-gradient-to-r from-orange-500 to-rose-500"
                              : "bg-white/10",
                          )}
                        >
                          <motion.div
                            animate={{ x: item.isAvailable ? 20 : 2 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                            }}
                            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md"
                          />
                        </button>
                      </div>

                      {item.modifiers.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.modifiers.slice(0, 3).map((m, j) => (
                            <span
                              key={j}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500"
                            >
                              {m.name}
                            </span>
                          ))}
                          {item.modifiers.length > 3 && (
                            <span className="text-[10px] text-slate-600">
                              +{item.modifiers.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {filtered.length === 0 && !loading && (
              <div className="text-center py-20 text-slate-500">
                <Search size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No se encontraron platos</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawers */}
      <CategoryDrawer
        open={categoryDrawerOpen}
        onClose={() => setCategoryDrawerOpen(false)}
        onSaved={fetchData}
        category={editingCategory}
      />
      <MenuItemDrawer
        open={itemDrawerOpen}
        onClose={() => setItemDrawerOpen(false)}
        onSaved={fetchData}
        categories={categories}
        item={editingItem}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add "src/app/(restaurant-admin)/menu/page.tsx"
git commit -m "feat: rewrite menu page with real CRUD, drawers, and Cloudinary images"
```

---

## Task 8: Build verification

**Step 1: Run build**

```bash
cd /c/restpro/gastrocloud && npm run build
```

**Step 2: Fix any errors found and commit fixes**

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Cloudinary upload route | `src/app/api/menu/upload/route.ts` |
| 2 | Categories CRUD API | `src/app/api/menu/categories/` |
| 3 | Items CRUD API + availability toggle | `src/app/api/menu/items/` |
| 4 | ImageUpload component | `src/components/image-upload.tsx` |
| 5 | CategoryDrawer component | `src/components/category-drawer.tsx` |
| 6 | MenuItemDrawer component | `src/components/menu-item-drawer.tsx` |
| 7 | Rewrite menu page | `src/app/(restaurant-admin)/menu/page.tsx` |
| 8 | Build verification | - |
