# Onboarding Progresivo - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the auto-setup with a 3-step onboarding wizard and add a progressive setup checklist to the dashboard.

**Architecture:** New `/onboarding` route under `(auth)` group with a multi-step form. New `/api/onboarding` API route that creates org+restaurant+branch+staff in a single DB transaction. Dashboard gets a `<SetupChecklist>` component that queries real DB state. A `getSetupProgress()` server helper computes checklist status.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (Neon Postgres), Framer Motion, Tailwind CSS 4, next-auth v4 JWT

---

## Task 1: Create `getSetupProgress` server helper

**Files:**
- Create: `src/lib/setup-progress.ts`

**Step 1: Create the setup progress helper**

This function queries the DB to determine which onboarding steps are complete for an organization.

```typescript
// src/lib/setup-progress.ts
import { db } from "./db";
import {
  restaurants,
  branches,
  menuCategories,
  menuItems,
  paymentGatewayConfigs,
  deliveryPlatformConfigs,
  tables,
} from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

export interface SetupProgress {
  hasLogo: boolean;
  hasOperatingHours: boolean;
  hasMenu: boolean;
  hasPayment: boolean;
  hasDelivery: boolean;
  hasTables: boolean;
  menuItemCount: number;
  completedSteps: number;
  totalSteps: number;
  canActivateStorefront: boolean;
  canReceiveDelivery: boolean;
}

export async function getSetupProgress(organizationId: string): Promise<SetupProgress> {
  // Run queries in parallel
  const [restaurantRows, branchRows, menuItemRows, paymentRows, deliveryRows, tableRows] =
    await Promise.all([
      db
        .select({ logoUrl: restaurants.logoUrl })
        .from(restaurants)
        .where(eq(restaurants.organizationId, organizationId))
        .limit(1),
      db
        .select({ operatingHours: branches.operatingHours })
        .from(branches)
        .where(eq(branches.organizationId, organizationId))
        .limit(1),
      db
        .select({ id: menuItems.id })
        .from(menuItems)
        .where(eq(menuItems.organizationId, organizationId))
        .limit(1),
      db
        .select({ id: paymentGatewayConfigs.id })
        .from(paymentGatewayConfigs)
        .where(
          and(
            eq(paymentGatewayConfigs.organizationId, organizationId),
            eq(paymentGatewayConfigs.isActive, true),
          ),
        )
        .limit(1),
      db
        .select({ id: deliveryPlatformConfigs.id })
        .from(deliveryPlatformConfigs)
        .where(
          and(
            eq(deliveryPlatformConfigs.organizationId, organizationId),
            eq(deliveryPlatformConfigs.isActive, true),
          ),
        )
        .limit(1),
      db
        .select({ id: tables.id })
        .from(tables)
        .where(eq(tables.organizationId, organizationId))
        .limit(1),
    ]);

  const hasLogo = !!restaurantRows[0]?.logoUrl;
  const hasOperatingHours = !!branchRows[0]?.operatingHours;
  const hasMenu = menuItemRows.length > 0;
  const hasPayment = paymentRows.length > 0;
  const hasDelivery = deliveryRows.length > 0;
  const hasTables = tableRows.length > 0;

  const steps = [hasLogo, hasOperatingHours, hasMenu, hasPayment, hasTables];
  const completedSteps = steps.filter(Boolean).length;

  return {
    hasLogo,
    hasOperatingHours,
    hasMenu,
    hasPayment,
    hasDelivery,
    hasTables,
    menuItemCount: menuItemRows.length,
    completedSteps,
    totalSteps: steps.length,
    canActivateStorefront: hasMenu && hasPayment,
    canReceiveDelivery: hasMenu && hasPayment && hasDelivery,
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/setup-progress.ts
git commit -m "feat: add getSetupProgress helper for onboarding checklist"
```

---

## Task 2: Create `POST /api/onboarding` API route

**Files:**
- Create: `src/app/api/onboarding/route.ts`

**Step 1: Create the onboarding API route**

This route creates org + restaurant + branch + staff in a transaction. It replaces the old `assignAdminRole` approach.

```typescript
// src/app/api/onboarding/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  organizations,
  restaurants,
  branches,
  staffMembers,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Check if user already has a staff record
  const existing = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.userId, session.user.id))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Ya tienes una organización configurada" },
      { status: 409 },
    );
  }

  const body = await request.json();
  const { orgName, restaurantName, cuisineType, address } = body;

  if (!orgName || !restaurantName) {
    return NextResponse.json(
      { error: "Nombre de organización y restaurante son requeridos" },
      { status: 400 },
    );
  }

  // Generate slug from name
  const slug = orgName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Date.now().toString(36);

  const restaurantSlug = restaurantName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Date.now().toString(36);

  // Create everything in sequence (Neon doesn't support true transactions via HTTP)
  const [org] = await db
    .insert(organizations)
    .values({ name: orgName, slug })
    .returning();

  const [restaurant] = await db
    .insert(restaurants)
    .values({
      organizationId: org.id,
      name: restaurantName,
      slug: restaurantSlug,
      description: cuisineType ? `Cocina ${cuisineType}` : undefined,
      address: address || undefined,
    })
    .returning();

  const [branch] = await db
    .insert(branches)
    .values({
      organizationId: org.id,
      restaurantId: restaurant.id,
      name: "Sucursal Principal",
      address: address || undefined,
    })
    .returning();

  const [staff] = await db
    .insert(staffMembers)
    .values({
      organizationId: org.id,
      userId: session.user.id,
      branchId: branch.id,
      role: "owner",
    })
    .returning();

  return NextResponse.json({
    organization: org,
    restaurant,
    branch,
    staff,
  });
}
```

**Step 2: Commit**

```bash
git add src/app/api/onboarding/route.ts
git commit -m "feat: add POST /api/onboarding to create org+restaurant+branch"
```

---

## Task 3: Create the Onboarding Wizard page

**Files:**
- Create: `src/app/(auth)/onboarding/page.tsx`

**Step 1: Create the 3-step onboarding wizard**

This is a client component with 3 steps: Org name, Restaurant details, Confirmation. Uses the same dark theme as login. Calls `POST /api/onboarding` on submit.

```typescript
// src/app/(auth)/onboarding/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  UtensilsCrossed,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
} from "lucide-react";

const cuisineTypes = [
  "Chilena",
  "Peruana",
  "Japonesa",
  "Italiana",
  "Mexicana",
  "China",
  "Francesa",
  "Americana",
  "Fusión",
  "Mariscos",
  "Parrilla",
  "Vegana",
  "Otra",
];

const steps = [
  { title: "Tu Negocio", icon: Building2 },
  { title: "Tu Restaurante", icon: UtensilsCrossed },
  { title: "Confirmación", icon: Check },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [orgName, setOrgName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [address, setAddress] = useState("");

  const canNext =
    step === 0
      ? orgName.trim().length >= 2
      : step === 1
        ? restaurantName.trim().length >= 2
        : true;

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName, restaurantName, cuisineType, address }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al crear el restaurante");
        setLoading(false);
        return;
      }

      // Force session refresh to pick up new role
      window.location.href = "/dashboard";
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`w-8 h-0.5 rounded-full transition-colors ${
                    isDone ? "bg-orange-500" : "bg-white/10"
                  }`}
                />
              )}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25"
                    : isDone
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-white/5 text-slate-500"
                }`}
              >
                {isDone ? <Check size={18} /> : <Icon size={18} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Nombre de tu negocio
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  El nombre de tu empresa o razón social. Puedes cambiarlo después.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre de la organización
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Ej: Restaurantes López SpA"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Datos del restaurante
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Información básica. Podrás completar el resto desde el panel.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre del restaurante
                </label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Ej: Sushi Express"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tipo de cocina
                </label>
                <div className="flex flex-wrap gap-2">
                  {cuisineTypes.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCuisineType(c === cuisineType ? "" : c)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        cuisineType === c
                          ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                          : "bg-white/5 text-slate-400 border border-white/10 hover:border-white/20"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Dirección <span className="text-slate-500">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Av. Providencia 1234, Santiago"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25">
                  <Sparkles size={28} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  Todo listo para empezar
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Revisa los datos y confirma para crear tu restaurante.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-sm text-slate-400">Organización</span>
                  <span className="text-sm text-white font-medium">{orgName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-sm text-slate-400">Restaurante</span>
                  <span className="text-sm text-white font-medium">{restaurantName}</span>
                </div>
                {cuisineType && (
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-sm text-slate-400">Cocina</span>
                    <span className="text-sm text-white font-medium">{cuisineType}</span>
                  </div>
                )}
                {address && (
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-sm text-slate-400">Dirección</span>
                    <span className="text-sm text-white font-medium">{address}</span>
                  </div>
                )}
              </div>
              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-0 disabled:pointer-events-none"
        >
          <ArrowLeft size={16} />
          Atrás
        </button>

        {step < 2 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creando...
              </>
            ) : (
              <>
                Crear mi restaurante
                <Sparkles size={16} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/(auth)/onboarding/page.tsx
git commit -m "feat: add 3-step onboarding wizard page"
```

---

## Task 4: Update redirect page to route to onboarding

**Files:**
- Modify: `src/app/(auth)/redirect/page.tsx`

**Step 1: Update the redirect logic**

Change the `!role` case to redirect to `/onboarding` instead of `/cuenta`, so new users without a staff record go to the wizard.

Replace the existing redirect logic:

```typescript
// OLD (line 21-24):
if (!role) {
  router.replace("/cuenta");
  return;
}

// NEW:
if (!role) {
  router.replace("/onboarding");
  return;
}
```

**Step 2: Commit**

```bash
git add src/app/(auth)/redirect/page.tsx
git commit -m "feat: redirect new users to /onboarding instead of /cuenta"
```

---

## Task 5: Create the `<SetupChecklist>` component

**Files:**
- Create: `src/components/setup-checklist.tsx`

**Step 1: Create the checklist component**

A server-friendly component that receives `SetupProgress` as props and renders the checklist UI.

```typescript
// src/components/setup-checklist.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Image,
  Clock,
  UtensilsCrossed,
  CreditCard,
  Truck,
  Grid3X3,
  Rocket,
  Check,
  ArrowRight,
  Lock,
} from "lucide-react";
import type { SetupProgress } from "@/lib/setup-progress";

interface ChecklistItem {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  done: boolean;
  optional?: boolean;
}

export function SetupChecklist({ progress }: { progress: SetupProgress }) {
  const items: ChecklistItem[] = [
    {
      label: "Sube tu logo y colores",
      description: "Personaliza la marca de tu restaurante",
      href: "/settings",
      icon: Image,
      done: progress.hasLogo,
    },
    {
      label: "Agrega horarios de operación",
      description: "Define cuándo abre y cierra tu local",
      href: "/settings",
      icon: Clock,
      done: progress.hasOperatingHours,
    },
    {
      label: "Crea tu menú",
      description: "Agrega categorías y platos a tu carta",
      href: "/menu",
      icon: UtensilsCrossed,
      done: progress.hasMenu,
    },
    {
      label: "Configura método de pago",
      description: "Mercadopago o Transbank para cobrar online",
      href: "/integrations",
      icon: CreditCard,
      done: progress.hasPayment,
    },
    {
      label: "Conecta delivery",
      description: "Uber Eats, Rappi o WhatsApp Business",
      href: "/integrations",
      icon: Truck,
      done: progress.hasDelivery,
      optional: true,
    },
    {
      label: "Agrega tus mesas",
      description: "Configura mesas y genera códigos QR",
      href: "/settings",
      icon: Grid3X3,
      done: progress.hasTables,
    },
  ];

  const pct = Math.round((progress.completedSteps / progress.totalSteps) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Configura tu restaurante
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {progress.completedSteps} de {progress.totalSteps} pasos completados
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-white">{pct}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-6">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500"
        />
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all group ${
                item.done
                  ? "bg-emerald-500/5 border border-emerald-500/10"
                  : "hover:bg-white/5 border border-transparent"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  item.done
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/5 text-slate-400 group-hover:text-orange-400 group-hover:bg-orange-500/10"
                }`}
              >
                {item.done ? <Check size={18} /> : <Icon size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    item.done ? "text-emerald-300 line-through" : "text-white"
                  }`}
                >
                  {item.label}
                  {item.optional && (
                    <span className="text-xs text-slate-500 ml-2 font-normal">
                      (opcional)
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {item.description}
                </p>
              </div>
              {!item.done && (
                <ArrowRight
                  size={16}
                  className="text-slate-600 group-hover:text-orange-400 shrink-0"
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Activate storefront CTA */}
      <div className="mt-6 pt-4 border-t border-white/5">
        {progress.canActivateStorefront ? (
          <Link
            href="/settings"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
          >
            <Rocket size={16} />
            Activar Storefront
          </Link>
        ) : (
          <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium bg-white/5 text-slate-500 border border-white/5">
            <Lock size={14} />
            Completa menú y pago para activar tu tienda
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/setup-checklist.tsx
git commit -m "feat: add SetupChecklist component for dashboard"
```

---

## Task 6: Create setup progress API route

**Files:**
- Create: `src/app/api/setup-progress/route.ts`

**Step 1: Create the API route**

Since the dashboard is a client component, we need an API to fetch setup progress.

```typescript
// src/app/api/setup-progress/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSetupProgress } from "@/lib/setup-progress";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const progress = await getSetupProgress(session.user.organizationId);
  return NextResponse.json(progress);
}
```

**Step 2: Commit**

```bash
git add src/app/api/setup-progress/route.ts
git commit -m "feat: add GET /api/setup-progress endpoint"
```

---

## Task 7: Update Dashboard with SetupChecklist

**Files:**
- Modify: `src/app/(restaurant-admin)/dashboard/page.tsx`

**Step 1: Update the dashboard**

Replace the hardcoded mock data dashboard with one that:
- Fetches setup progress from `/api/setup-progress`
- Shows `<SetupChecklist>` if not all required steps are done
- Still shows KPI cards (but with "Sin datos" placeholders when no orders exist)

The key changes:
1. Add state for setup progress and fetch it on mount
2. Show `<SetupChecklist>` above the KPI cards when `completedSteps < totalSteps`
3. Keep the existing KPI/chart/table UI but make it show real states (zeros instead of fake data)

This is a significant rewrite of the page. Replace the entire content with:

```typescript
// src/app/(restaurant-admin)/dashboard/page.tsx
"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  Users,
  TrendingUp,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "@/hooks/useAuth";
import { SetupChecklist } from "@/components/setup-checklist";
import type { SetupProgress } from "@/lib/setup-progress";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function DashboardPage() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "Usuario";

  const [progress, setProgress] = useState<SetupProgress | null>(null);

  useEffect(() => {
    fetch("/api/setup-progress")
      .then((r) => r.json())
      .then(setProgress)
      .catch(() => {});
  }, []);

  const showChecklist = progress && progress.completedSteps < progress.totalSteps;

  const kpis = [
    {
      label: "Ingresos Hoy",
      value: "$0",
      unit: "CLP",
      icon: DollarSign,
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/25",
    },
    {
      label: "Pedidos",
      value: "0",
      unit: "",
      icon: ShoppingBag,
      gradient: "from-orange-500 to-rose-500",
      shadow: "shadow-orange-500/25",
    },
    {
      label: "Tiempo Promedio",
      value: "--",
      unit: "min",
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      shadow: "shadow-amber-500/25",
    },
    {
      label: "Mesas Activas",
      value: "0/0",
      unit: "",
      icon: Users,
      gradient: "from-pink-500 to-rose-500",
      shadow: "shadow-pink-500/25",
    },
  ];

  return (
    <div ref={ref}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Bienvenido, {firstName}. Aquí tienes el resumen de hoy.
        </p>
      </motion.div>

      {/* Setup Checklist (shown until all steps done) */}
      {showChecklist && (
        <div className="mb-6">
          <SetupChecklist progress={progress} />
        </div>
      )}

      {/* KPI Cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
      >
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              variants={fadeUp}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-start gap-4"
            >
              <div
                className={cn(
                  "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg",
                  kpi.gradient,
                  kpi.shadow,
                )}
              >
                <Icon size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 font-medium">{kpi.label}</p>
                <p className="text-2xl font-bold text-white mt-0.5 leading-tight">
                  {kpi.value}
                  {kpi.unit && (
                    <span className="text-xs text-slate-500 ml-1 font-medium">
                      {kpi.unit}
                    </span>
                  )}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Empty state when no orders */}
      {!showChecklist && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center"
        >
          <TrendingUp size={40} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1">
            Sin pedidos aún
          </h3>
          <p className="text-sm text-slate-400">
            Los datos aparecerán aquí cuando empieces a recibir pedidos.
          </p>
        </motion.div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/(restaurant-admin)/dashboard/page.tsx
git commit -m "feat: replace mock dashboard with setup checklist and real state"
```

---

## Task 8: Update cuenta page and cleanup

**Files:**
- Modify: `src/app/(customer)/cuenta/page.tsx`

**Step 1: Update the cuenta page**

Remove the admin setup CTA (the `handleSetup` button), since new users now go through `/onboarding`. Keep the page as a customer profile page.

Remove:
- The `setupLoading` and `setupDone` state
- The `handleSetup` function
- The entire admin setup CTA section (the gradient card with "Tienes un restaurante?")

Replace with a simpler link:

```typescript
// Replace the admin setup CTA section (lines 142-183) with:
{!user?.role && (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    className="bg-gradient-to-r from-orange-500 to-rose-500 rounded-2xl p-6 text-white shadow-lg"
  >
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <Sparkles size={24} />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold">¿Tienes un restaurante?</h3>
        <p className="text-white/80 text-sm mt-1 mb-4">
          Crea tu cuenta de administrador y gestiona tu negocio con GastroCloud.
        </p>
        <a
          href="/onboarding"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-orange-600 font-semibold rounded-xl hover:bg-white/90 transition-colors"
        >
          <Shield size={18} />
          Crear mi restaurante
        </a>
      </div>
    </div>
  </motion.div>
)}
```

Also remove the `useState` import for `setupLoading`/`setupDone` since they're no longer needed.

**Step 2: Commit**

```bash
git add src/app/(customer)/cuenta/page.tsx
git commit -m "refactor: replace auto-setup in cuenta with link to onboarding wizard"
```

---

## Task 9: Add /onboarding to middleware matcher

**Files:**
- Modify: `src/middleware.ts`

**Step 1: Ensure /onboarding is accessible**

The `/onboarding` route is under `(auth)` group. Currently it's not in the middleware matcher, so unauthenticated users could access it. We need to add it to the matcher so only authenticated users can reach it, but we should NOT require a role (since new users won't have one yet).

Add `/onboarding` to the matcher array and add a special case in the middleware that allows authenticated users without a role to access `/onboarding`.

```typescript
// Add to the matcher array (line 59-74):
"/onboarding/:path*",

// Add after the "Not authenticated" check (after line 17), before role checks:
// Allow authenticated users to access onboarding regardless of role
if (pathname.startsWith("/onboarding")) {
  // If user already has a role, redirect to dashboard (already onboarded)
  if (role) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}
```

**Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add /onboarding route to middleware with role guard"
```

---

## Task 10: Run the app and verify end-to-end

**Step 1: Install dependencies and run dev**

```bash
cd /c/restpro/gastrocloud && npm install && npm run dev
```

**Step 2: Verify the flow**

1. Visit http://localhost:3000 → Landing page
2. Click login → Google OAuth
3. After login → Redirect to /onboarding (if no role)
4. Fill wizard → Org name → Restaurant details → Confirm
5. After submit → Lands on /dashboard with setup checklist
6. Checklist shows all items as incomplete
7. Already-onboarded users → Redirect to /dashboard (skip onboarding)

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any issues found during e2e verification"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Setup progress helper | `src/lib/setup-progress.ts` |
| 2 | Onboarding API route | `src/app/api/onboarding/route.ts` |
| 3 | Onboarding wizard page | `src/app/(auth)/onboarding/page.tsx` |
| 4 | Update redirect logic | `src/app/(auth)/redirect/page.tsx` |
| 5 | SetupChecklist component | `src/components/setup-checklist.tsx` |
| 6 | Setup progress API | `src/app/api/setup-progress/route.ts` |
| 7 | Update dashboard | `src/app/(restaurant-admin)/dashboard/page.tsx` |
| 8 | Update cuenta page | `src/app/(customer)/cuenta/page.tsx` |
| 9 | Update middleware | `src/middleware.ts` |
| 10 | End-to-end verification | - |
