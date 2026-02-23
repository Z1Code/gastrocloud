# Order Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect the entire order lifecycle — from admin receiving orders to kitchen preparing them to customer tracking — with real-time SSE updates, urgency timers, station bumping, and notification sounds.

**Architecture:** API routes query the `orders` and `orderItems` tables (already populated by the existing checkout flow). An SSE endpoint streams order events to admin, KDS, and customer tracking pages. The admin orders page and KDS page are rewritten to use real DB data instead of mock. A new public tracking page lets customers see their order status in real time.

**Tech Stack:** Next.js 16 API routes, Drizzle ORM (Neon Postgres), Server-Sent Events (ReadableStream), Framer Motion, Zustand (KDS local state), Web Audio API (notification sounds)

---

## Task 1: Orders List API (GET /api/orders)

**Files:**
- Create: `src/app/api/orders/route.ts`

**Context:** This is the core API that the admin orders page will use. Follow the same auth pattern as `src/app/api/menu/items/route.ts` — use `getServerSession(authOptions)` and check `session.user.organizationId`. The `orders` table has columns: id, organizationId, branchId, source, type, status, customerName, customerPhone, subtotal, tax, tip, discount, total, notes, createdAt, etc. The `orderItems` table has: id, orderId, menuItemId, quantity, unitPrice, modifiers (jsonb), station, notes. The `payments` table has: id, orderId, amount, method, status.

**Step 1: Create the API route**

```typescript
// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems, payments } from "@/db/schema";
import { eq, and, desc, gte, lte, SQL } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const conditions: SQL[] = [eq(orders.organizationId, session.user.organizationId)];
  if (status) conditions.push(eq(orders.status, status as any));
  if (source) conditions.push(eq(orders.source, source as any));
  if (from) conditions.push(gte(orders.createdAt, new Date(from)));
  if (to) conditions.push(lte(orders.createdAt, new Date(to)));

  const orderList = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(100);

  // Fetch items and payments for all orders
  const orderIds = orderList.map((o) => o.id);

  let allItems: (typeof orderItems.$inferSelect)[] = [];
  let allPayments: (typeof payments.$inferSelect)[] = [];

  if (orderIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    [allItems, allPayments] = await Promise.all([
      db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
      db.select().from(payments).where(inArray(payments.orderId, orderIds)),
    ]);
  }

  const itemsByOrder = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const existing = itemsByOrder.get(item.orderId) ?? [];
    existing.push(item);
    itemsByOrder.set(item.orderId, existing);
  }

  const paymentsByOrder = new Map<string, typeof allPayments>();
  for (const p of allPayments) {
    const existing = paymentsByOrder.get(p.orderId) ?? [];
    existing.push(p);
    paymentsByOrder.set(p.orderId, existing);
  }

  const result = orderList.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
    payments: paymentsByOrder.get(order.id) ?? [],
  }));

  return NextResponse.json(result);
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 3: Commit**

```bash
git add src/app/api/orders/route.ts
git commit -m "feat(orders): add GET /api/orders with filters"
```

---

## Task 2: Order Detail, Status Update, Cancel, and Bump APIs

**Files:**
- Create: `src/app/api/orders/[id]/route.ts`
- Create: `src/app/api/orders/[id]/status/route.ts`
- Create: `src/app/api/orders/[id]/cancel/route.ts`
- Create: `src/app/api/orders/[id]/items/[itemId]/bump/route.ts`

**Context:** Status transitions must follow the valid flow: pending→accepted→preparing→ready→served→completed. For takeaway/delivery orders, skip "served" (ready→completed). Cancel is allowed only before "ready". Bump marks an individual order item as done at its station; when ALL items in an order are bumped, auto-transition the order to "ready". The `orderItems.modifiers` jsonb field can hold a `bumped: true` flag.

**Step 1: Create order detail route**

```typescript
// src/app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems, payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.organizationId, session.user.organizationId)));

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  const [items, orderPayments] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(payments).where(eq(payments.orderId, id)),
  ]);

  return NextResponse.json({ ...order, items, payments: orderPayments });
}
```

**Step 2: Create status update route**

```typescript
// src/app/api/orders/[id]/status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const validTransitions: Record<string, string[]> = {
  pending: ["accepted"],
  accepted: ["preparing"],
  preparing: ["ready"],
  ready: ["served", "completed"], // served for dine_in, completed for takeaway/delivery
  served: ["completed"],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status: newStatus } = body;

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.organizationId, session.user.organizationId)));

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  const allowed = validTransitions[order.status];
  if (!allowed?.includes(newStatus)) {
    return NextResponse.json(
      { error: `Transición inválida: ${order.status} → ${newStatus}` },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(orders)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning();

  return NextResponse.json(updated);
}
```

**Step 3: Create cancel route**

```typescript
// src/app/api/orders/[id]/cancel/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const cancellableStatuses = ["pending", "accepted", "preparing"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { reason } = body as { reason?: string };

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.organizationId, session.user.organizationId)));

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  if (!cancellableStatuses.includes(order.status)) {
    return NextResponse.json(
      { error: `No se puede cancelar una orden en estado "${order.status}"` },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(orders)
    .set({
      status: "cancelled",
      notes: reason ? `${order.notes ? order.notes + " | " : ""}CANCELADA: ${reason}` : order.notes,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id))
    .returning();

  return NextResponse.json(updated);
}
```

**Step 4: Create bump route**

```typescript
// src/app/api/orders/[id]/items/[itemId]/bump/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id: orderId, itemId } = await params;

  // Verify order belongs to org
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.organizationId, session.user.organizationId)));

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  // Get the item
  const [item] = await db
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)));

  if (!item) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }

  // Toggle bump
  const currentModifiers = (item.modifiers as Record<string, unknown>) || {};
  const isBumped = !currentModifiers.bumped;

  const [updatedItem] = await db
    .update(orderItems)
    .set({ modifiers: { ...currentModifiers, bumped: isBumped } })
    .where(eq(orderItems.id, itemId))
    .returning();

  // Check if ALL items in this order are now bumped → auto-transition to ready
  if (isBumped) {
    const allItems = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const allBumped = allItems.every(
      (i) => (i.modifiers as Record<string, unknown>)?.bumped === true
    );

    if (allBumped && (order.status === "preparing" || order.status === "accepted")) {
      await db
        .update(orders)
        .set({ status: "ready", updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    }
  }

  return NextResponse.json(updatedItem);
}
```

**Step 5: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 6: Commit**

```bash
git add src/app/api/orders/[id]/route.ts src/app/api/orders/[id]/status/route.ts src/app/api/orders/[id]/cancel/route.ts src/app/api/orders/[id]/items/[itemId]/bump/route.ts
git commit -m "feat(orders): add detail, status, cancel, and bump APIs"
```

---

## Task 3: Orders Stats and Estimate APIs

**Files:**
- Create: `src/app/api/orders/stats/route.ts`
- Create: `src/app/api/orders/estimate/route.ts`

**Context:** Stats provides a real-time dashboard summary (active orders, avg prep time, completed today). Estimate calculates dynamic wait time for the customer tracking page using the formula: `(pending + preparing orders) × average_prep_time_of_last_20_orders`, clamped between 10-60 minutes.

**Step 1: Create stats route**

```typescript
// src/app/api/orders/stats/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/db/schema";
import { eq, and, gte, sql, inArray } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [activeResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, orgId),
        inArray(orders.status, ["pending", "accepted", "preparing", "ready"])
      )
    );

  const [completedResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, orgId),
        eq(orders.status, "completed"),
        gte(orders.createdAt, todayStart)
      )
    );

  // Avg prep time: diff between createdAt and updatedAt for completed orders today
  const [avgResult] = await db
    .select({
      avg: sql<number>`coalesce(avg(extract(epoch from (updated_at - created_at)) / 60)::int, 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, orgId),
        eq(orders.status, "completed"),
        gte(orders.createdAt, todayStart)
      )
    );

  return NextResponse.json({
    activeOrders: activeResult.count,
    completedToday: completedResult.count,
    avgPrepTime: avgResult.avg || 0,
  });
}
```

**Step 2: Create estimate route**

```typescript
// src/app/api/orders/estimate/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/db/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "orgId requerido" }, { status: 400 });
  }

  // Count pending + preparing orders
  const [queueResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, orgId),
        inArray(orders.status, ["pending", "accepted", "preparing"])
      )
    );

  // Average prep time of last 20 completed orders
  const [avgResult] = await db
    .select({
      avg: sql<number>`coalesce(avg(extract(epoch from (updated_at - created_at)) / 60), 15)`,
    })
    .from(orders)
    .where(
      and(eq(orders.organizationId, orgId), eq(orders.status, "completed"))
    )
    .orderBy(desc(orders.updatedAt))
    .limit(20);

  const queueSize = queueResult.count;
  const avgMinutes = Math.round(avgResult.avg);
  const rawEstimate = queueSize * avgMinutes;
  const estimate = Math.max(10, Math.min(60, rawEstimate));

  return NextResponse.json({ estimatedMinutes: estimate, queueSize, avgPrepTime: avgMinutes });
}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 4: Commit**

```bash
git add src/app/api/orders/stats/route.ts src/app/api/orders/estimate/route.ts
git commit -m "feat(orders): add stats and estimate APIs"
```

---

## Task 4: SSE Stream Endpoint and useOrderStream Hook

**Files:**
- Create: `src/app/api/orders/stream/route.ts`
- Create: `src/hooks/useOrderStream.ts`

**Context:** The SSE endpoint polls the DB every 3 seconds for orders updated since the last check, and sends events to connected clients. The hook connects to this endpoint and provides callbacks for `onOrderCreated`, `onStatusChanged`, etc. This is used by both the admin orders page and the KDS page.

**Step 1: Create SSE endpoint**

```typescript
// src/app/api/orders/stream/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return new Response("No autenticado", { status: 401 });
  }

  const orgId = session.user.organizationId;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let lastCheck = new Date();
      let closed = false;

      function send(data: string) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          closed = true;
        }
      }

      // Send heartbeat immediately
      send(JSON.stringify({ type: "connected", timestamp: new Date().toISOString() }));

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }

        try {
          const updatedOrders = await db
            .select()
            .from(orders)
            .where(
              and(
                eq(orders.organizationId, orgId),
                gte(orders.updatedAt, lastCheck)
              )
            );

          if (updatedOrders.length > 0) {
            const orderIds = updatedOrders.map((o) => o.id);
            const items = await db
              .select()
              .from(orderItems)
              .where(inArray(orderItems.orderId, orderIds));

            const itemsByOrder = new Map<string, (typeof orderItems.$inferSelect)[]>();
            for (const item of items) {
              const existing = itemsByOrder.get(item.orderId) ?? [];
              existing.push(item);
              itemsByOrder.set(item.orderId, existing);
            }

            for (const order of updatedOrders) {
              const isNew = order.createdAt >= lastCheck;
              send(
                JSON.stringify({
                  type: isNew ? "order_created" : order.status === "cancelled" ? "order_cancelled" : "status_changed",
                  orderId: order.id,
                  data: { ...order, items: itemsByOrder.get(order.id) ?? [] },
                  timestamp: new Date().toISOString(),
                })
              );
            }
          }

          lastCheck = new Date();
        } catch {
          // DB error, skip this cycle
        }
      }, 3000);

      // Cleanup when client disconnects
      const cleanup = () => {
        closed = true;
        clearInterval(interval);
      };

      // Store cleanup for abort
      (controller as any)._cleanup = cleanup;
    },
    cancel() {
      // Client disconnected
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

**Step 2: Create useOrderStream hook**

```typescript
// src/hooks/useOrderStream.ts
"use client";

import { useEffect, useRef, useCallback } from "react";

export interface OrderEvent {
  type: "connected" | "order_created" | "status_changed" | "order_cancelled" | "item_bumped";
  orderId?: string;
  data?: any;
  timestamp: string;
}

interface UseOrderStreamOptions {
  onEvent?: (event: OrderEvent) => void;
  onOrderCreated?: (data: any) => void;
  onStatusChanged?: (data: any) => void;
  onOrderCancelled?: (data: any) => void;
  enabled?: boolean;
}

export function useOrderStream(options: UseOrderStreamOptions = {}) {
  const { onEvent, onOrderCreated, onStatusChanged, onOrderCancelled, enabled = true } = options;
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (eventSourceRef.current) return;

    const es = new EventSource("/api/orders/stream");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const parsed: OrderEvent = JSON.parse(event.data);
        onEvent?.(parsed);

        switch (parsed.type) {
          case "order_created":
            onOrderCreated?.(parsed.data);
            break;
          case "status_changed":
            onStatusChanged?.(parsed.data);
            break;
          case "order_cancelled":
            onOrderCancelled?.(parsed.data);
            break;
        }
      } catch {
        // Invalid JSON, skip
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    };
  }, [enabled, onEvent, onOrderCreated, onStatusChanged, onOrderCancelled]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);
}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 4: Commit**

```bash
git add src/app/api/orders/stream/route.ts src/hooks/useOrderStream.ts
git commit -m "feat(orders): add SSE stream endpoint and useOrderStream hook"
```

---

## Task 5: Public Order Tracking API and Page

**Files:**
- Create: `src/app/api/orders/track/[id]/route.ts`
- Create: `src/app/(storefront)/r/[slug]/track/[orderId]/page.tsx`

**Context:** The tracking page is a public page (no auth required) that shows order status, items, and estimated time. The API returns limited data (no payment details). The page uses SSE for real-time updates. The storefront uses a light theme. The checkout already returns `orderId` on success, so the customer can be redirected to `/r/{slug}/track/{orderId}`.

**Step 1: Create public tracking API**

```typescript
// src/app/api/orders/track/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      type: orders.type,
      customerName: orders.customerName,
      total: orders.total,
      notes: orders.notes,
      createdAt: orders.createdAt,
      estimatedReadyAt: orders.estimatedReadyAt,
      organizationId: orders.organizationId,
    })
    .from(orders)
    .where(eq(orders.id, id));

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  const items = await db
    .select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      modifiers: orderItems.modifiers,
      notes: orderItems.notes,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, id));

  return NextResponse.json({ ...order, items });
}
```

**Step 2: Create tracking page**

Create a client-side page at `src/app/(storefront)/r/[slug]/track/[orderId]/page.tsx` with:
- Progress steps: Recibido → Aceptado → Preparando → Listo → Entregado/Completado
- Estimated time (fetched from `/api/orders/estimate?orgId=...`)
- Order items list
- Total
- Auto-refresh via polling every 5 seconds (simpler than SSE for public page)
- Light theme matching the existing storefront design
- Animated step transitions with Framer Motion

```typescript
// src/app/(storefront)/r/[slug]/track/[orderId]/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, ChefHat, Package, Utensils } from "lucide-react";

interface TrackingOrder {
  id: string;
  status: string;
  type: string;
  customerName: string;
  total: string;
  notes: string | null;
  createdAt: string;
  organizationId: string;
  items: { id: string; quantity: number; unitPrice: string; modifiers: any; notes: string | null }[];
}

const steps = [
  { key: "pending", label: "Recibido", icon: Package },
  { key: "accepted", label: "Aceptado", icon: CheckCircle2 },
  { key: "preparing", label: "Preparando", icon: ChefHat },
  { key: "ready", label: "Listo", icon: Utensils },
  { key: "completed", label: "Entregado", icon: CheckCircle2 },
];

const statusIndex: Record<string, number> = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  served: 3,
  completed: 4,
};

function formatCLP(value: string | number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(value));
}

export default function TrackingPage({ params }: { params: Promise<{ slug: string; orderId: string }> }) {
  const { slug, orderId } = use(params);
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/track/${orderId}`);
        if (!res.ok) { setError(true); return; }
        const data = await res.json();
        if (active) setOrder(data);

        // Fetch estimate
        if (data.organizationId && !["completed", "cancelled", "ready", "served"].includes(data.status)) {
          const estRes = await fetch(`/api/orders/estimate?orgId=${data.organizationId}`);
          if (estRes.ok) {
            const estData = await estRes.json();
            if (active) setEstimate(estData.estimatedMinutes);
          }
        }
      } catch {
        if (active) setError(true);
      }
    }

    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [orderId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Orden no encontrada</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (order.status === "cancelled") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="text-6xl mb-4">😔</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Orden Cancelada</h1>
        <p className="text-gray-500">Tu orden ha sido cancelada.</p>
      </div>
    );
  }

  const currentStep = statusIndex[order.status] ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Tu Pedido</h1>
          <p className="text-sm text-gray-500 mt-1">
            Orden #{order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Estimated time */}
        {estimate && currentStep < 3 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 text-center"
          >
            <div className="flex items-center justify-center gap-2 text-orange-600">
              <Clock size={18} />
              <span className="font-semibold">Tiempo estimado</span>
            </div>
            <p className="text-3xl font-bold text-orange-600 mt-1">~{estimate} min</p>
          </motion.div>
        )}

        {/* Progress steps */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="space-y-0">
            {steps.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = i === currentStep;
              const isDone = i < currentStep;
              const isFuture = i > currentStep;

              return (
                <div key={step.key} className="flex items-start gap-4">
                  {/* Icon + line */}
                  <div className="flex flex-col items-center">
                    <motion.div
                      animate={{
                        scale: isActive ? 1.1 : 1,
                        backgroundColor: isDone || isActive ? "#f97316" : "#e5e7eb",
                      }}
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                    >
                      <StepIcon size={18} className={isDone || isActive ? "text-white" : "text-gray-400"} />
                    </motion.div>
                    {i < steps.length - 1 && (
                      <div className={`w-0.5 h-8 ${isDone ? "bg-orange-500" : "bg-gray-200"}`} />
                    )}
                  </div>

                  {/* Label */}
                  <div className="pt-2">
                    <p className={`font-semibold text-sm ${isActive ? "text-orange-600" : isDone ? "text-gray-800" : "text-gray-400"}`}>
                      {step.label}
                    </p>
                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-orange-500 mt-0.5"
                      >
                        En progreso...
                      </motion.p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-3">Detalle del pedido</h2>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantity}x ítem</span>
                <span className="text-gray-800 font-medium">{formatCLP(Number(item.unitPrice) * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
            <span className="font-semibold text-gray-800">Total</span>
            <span className="font-bold text-lg text-gray-800">{formatCLP(order.total)}</span>
          </div>
        </div>

        {/* Customer name */}
        {order.customerName && (
          <p className="text-center text-sm text-gray-400 mt-6">
            Pedido de {order.customerName}
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 4: Commit**

```bash
git add src/app/api/orders/track/[id]/route.ts "src/app/(storefront)/r/[slug]/track/[orderId]/page.tsx"
git commit -m "feat(orders): add public tracking API and customer tracking page"
```

---

## Task 6: Notification Sounds

**Files:**
- Create: `public/sounds/order-urgent.mp3`
- Create: `public/sounds/order-normal.mp3`
- Create: `public/sounds/order-soft.mp3`
- Create: `src/hooks/useNotificationSound.ts`

**Context:** We need 3 notification sounds: urgent (delivery orders), normal (dine-in/takeaway), and soft (QR table). Since we can't create real MP3 files in code, we'll use the Web Audio API to generate tones programmatically. This is simpler, has zero file size, and works everywhere.

**Step 1: Create notification sound hook**

```typescript
// src/hooks/useNotificationSound.ts
"use client";

import { useCallback, useRef } from "react";

type SoundType = "urgent" | "normal" | "soft";

const soundConfigs: Record<SoundType, { frequency: number; duration: number; repeat: number; gap: number }> = {
  urgent: { frequency: 880, duration: 0.15, repeat: 3, gap: 0.1 },  // High-pitched triple beep
  normal: { frequency: 660, duration: 0.2, repeat: 2, gap: 0.15 },   // Medium double beep
  soft: { frequency: 440, duration: 0.3, repeat: 1, gap: 0 },        // Low single tone
};

const sourceToSound: Record<string, SoundType> = {
  uber_eats: "urgent",
  rappi: "urgent",
  delivery: "urgent",
  web: "normal",
  pos_inhouse: "normal",
  whatsapp: "normal",
  qr_table: "soft",
  dine_in: "soft",
};

export function useNotificationSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playSound = useCallback(
    (type: SoundType) => {
      const ctx = getContext();
      const config = soundConfigs[type];

      for (let i = 0; i < config.repeat; i++) {
        const startTime = ctx.currentTime + i * (config.duration + config.gap);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.value = config.frequency;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gain.gain.linearRampToValueAtTime(0, startTime + config.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + config.duration);
      }
    },
    [getContext]
  );

  const playSoundForSource = useCallback(
    (source: string) => {
      const type = sourceToSound[source] || "normal";
      playSound(type);
    },
    [playSound]
  );

  return { playSound, playSoundForSource };
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 3: Commit**

```bash
git add src/hooks/useNotificationSound.ts
git commit -m "feat(orders): add Web Audio notification sounds hook"
```

---

## Task 7: Order Detail Drawer and Print Component

**Files:**
- Create: `src/components/order-detail-drawer.tsx`
- Create: `src/components/order-print.tsx`

**Context:** The drawer follows the same pattern as `src/components/menu-item-drawer.tsx` — slides in from the right with a backdrop. It shows full order details (customer info, items, payment, status history) with action buttons. The print component renders a thermal-receipt-style ticket using `window.print()` with `@media print` CSS.

**Step 1: Create order detail drawer**

```typescript
// src/components/order-detail-drawer.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer, Clock, User, Phone, MapPin, ChefHat, Ban } from "lucide-react";
import { OrderPrint } from "./order-print";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: string;
  modifiers: any;
  station: string | null;
  notes: string | null;
}

interface Order {
  id: string;
  source: string;
  type: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  total: string;
  subtotal: string;
  tip: string;
  discount: string;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
  payments: { method: string; status: string; amount: string }[];
}

interface OrderDetailDrawerProps {
  order: Order | null;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
  onCancel: (orderId: string, reason: string) => void;
}

function formatCLP(value: string | number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency", currency: "CLP", maximumFractionDigits: 0,
  }).format(Number(value));
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptado",
  preparing: "Preparando",
  ready: "Listo",
  served: "Servido",
  completed: "Completado",
  cancelled: "Cancelado",
};

const sourceLabels: Record<string, string> = {
  web: "Web",
  qr_table: "Mesa QR",
  uber_eats: "Uber Eats",
  rappi: "Rappi",
  whatsapp: "WhatsApp",
  pos_inhouse: "POS",
};

const stationLabels: Record<string, string> = {
  kitchen: "Cocina",
  bar: "Barra",
  grill: "Parrilla",
  dessert: "Postres",
};

const nextAction: Record<string, { label: string; next: string; className: string } | null> = {
  pending: { label: "Aceptar Pedido", next: "accepted", className: "bg-emerald-500 hover:bg-emerald-400" },
  accepted: { label: "Iniciar Preparación", next: "preparing", className: "bg-amber-500 hover:bg-amber-400" },
  preparing: { label: "Marcar Listo", next: "ready", className: "bg-blue-500 hover:bg-blue-400" },
  ready: { label: "Entregar / Completar", next: "completed", className: "bg-orange-500 hover:bg-orange-400" },
  served: { label: "Completar", next: "completed", className: "bg-emerald-500 hover:bg-emerald-400" },
  completed: null,
  cancelled: null,
};

export function OrderDetailDrawer({ order, onClose, onStatusChange, onCancel }: OrderDetailDrawerProps) {
  const [showPrint, setShowPrint] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  if (!order) return null;

  const action = nextAction[order.status];
  const canCancel = ["pending", "accepted", "preparing"].includes(order.status);

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
        <motion.div
          key="drawer"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#0a0a1a] border-l border-white/10 z-50 overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-[#0a0a1a]/95 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-lg font-bold text-white">
                Orden #{order.id.slice(0, 8).toUpperCase()}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70">
                  {sourceLabels[order.source] || order.source}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70">
                  {statusLabels[order.status] || order.status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrint(true)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <Printer size={18} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Customer info */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              {order.customerName && (
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <User size={14} />
                  <span>{order.customerName}</span>
                </div>
              )}
              {order.customerPhone && (
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Phone size={14} />
                  <span>{order.customerPhone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Clock size={14} />
                <span>{new Date(order.createdAt).toLocaleString("es-CL")}</span>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="text-sm font-semibold text-white/50 mb-3">ÍTEMS</h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="bg-white/5 rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-white text-sm font-medium">
                          {item.quantity}x Ítem
                        </span>
                        {item.station && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                            {stationLabels[item.station] || item.station}
                          </span>
                        )}
                      </div>
                      <span className="text-white/70 text-sm">
                        {formatCLP(Number(item.unitPrice) * item.quantity)}
                      </span>
                    </div>
                    {item.modifiers?.customerModifiers?.length > 0 && (
                      <div className="mt-1">
                        {item.modifiers.customerModifiers.map((m: any, i: number) => (
                          <p key={i} className="text-xs text-amber-400">+ {m.name}</p>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <p className="mt-1 text-xs text-rose-400 italic">{item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-white/60">
                <span>Subtotal</span>
                <span>{formatCLP(order.subtotal)}</span>
              </div>
              {Number(order.tip) > 0 && (
                <div className="flex justify-between text-sm text-white/60">
                  <span>Propina</span>
                  <span>{formatCLP(order.tip)}</span>
                </div>
              )}
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>Descuento</span>
                  <span>-{formatCLP(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-white border-t border-white/10 pt-2">
                <span>Total</span>
                <span>{formatCLP(order.total)}</span>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                <p className="text-sm text-rose-400">{order.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {action && (
                <button
                  onClick={() => onStatusChange(order.id, action.next)}
                  className={`w-full py-3 rounded-xl text-white font-bold text-sm tracking-wide transition-colors ${action.className}`}
                >
                  {action.label}
                </button>
              )}
              {canCancel && !showCancel && (
                <button
                  onClick={() => setShowCancel(true)}
                  className="w-full py-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Ban size={16} />
                  Cancelar Orden
                </button>
              )}
              {showCancel && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Motivo de cancelación..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-500/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onCancel(order.id, cancelReason); setShowCancel(false); }}
                      className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-medium text-sm"
                    >
                      Confirmar Cancelación
                    </button>
                    <button
                      onClick={() => setShowCancel(false)}
                      className="px-4 py-2 rounded-lg bg-white/5 text-white/60 text-sm"
                    >
                      No
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Print dialog */}
      {showPrint && (
        <OrderPrint order={order} onClose={() => setShowPrint(false)} />
      )}
    </>
  );
}
```

**Step 2: Create print component**

```typescript
// src/components/order-print.tsx
"use client";

import { useEffect } from "react";

interface PrintableOrder {
  id: string;
  source: string;
  type: string;
  customerName: string | null;
  customerPhone: string | null;
  total: string;
  subtotal: string;
  tip: string;
  createdAt: string;
  items: { id: string; quantity: number; unitPrice: string; modifiers: any; notes: string | null }[];
  notes: string | null;
}

function formatCLP(value: string | number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(value));
}

const sourceLabels: Record<string, string> = {
  web: "Web", qr_table: "Mesa QR", uber_eats: "Uber Eats", rappi: "Rappi", whatsapp: "WhatsApp", pos_inhouse: "POS",
};

export function OrderPrint({ order, onClose }: { order: PrintableOrder; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
      onClose();
    }, 200);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-white print:bg-white">
      {/* Screen overlay with close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 print:hidden bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-2 text-sm font-medium"
      >
        Cerrar
      </button>

      {/* Printable content */}
      <div className="max-w-[300px] mx-auto p-4 font-mono text-xs text-black">
        <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
          <p className="font-bold text-sm">GASTROCLOUD</p>
          <p className="text-gray-600">Comanda</p>
        </div>

        <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
          <p><strong>Orden:</strong> #{order.id.slice(0, 8).toUpperCase()}</p>
          <p><strong>Origen:</strong> {sourceLabels[order.source] || order.source}</p>
          <p><strong>Fecha:</strong> {new Date(order.createdAt).toLocaleString("es-CL")}</p>
          {order.customerName && <p><strong>Cliente:</strong> {order.customerName}</p>}
          {order.customerPhone && <p><strong>Teléfono:</strong> {order.customerPhone}</p>}
        </div>

        <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
          {order.items.map((item) => (
            <div key={item.id} className="mb-1">
              <div className="flex justify-between">
                <span>{item.quantity}x Ítem</span>
                <span>{formatCLP(Number(item.unitPrice) * item.quantity)}</span>
              </div>
              {item.modifiers?.customerModifiers?.map((m: any, i: number) => (
                <p key={i} className="pl-2 text-gray-600">+ {m.name}</p>
              ))}
              {item.notes && <p className="pl-2 italic">** {item.notes}</p>}
            </div>
          ))}
        </div>

        <div className="mb-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCLP(order.subtotal)}</span>
          </div>
          {Number(order.tip) > 0 && (
            <div className="flex justify-between">
              <span>Propina</span>
              <span>{formatCLP(order.tip)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm border-t border-gray-400 pt-1 mt-1">
            <span>TOTAL</span>
            <span>{formatCLP(order.total)}</span>
          </div>
        </div>

        {order.notes && (
          <div className="border-t border-dashed border-gray-400 pt-2 mt-2">
            <p className="font-bold">NOTAS:</p>
            <p>{order.notes}</p>
          </div>
        )}

        <div className="text-center mt-4 border-t border-dashed border-gray-400 pt-2">
          <p className="text-gray-500">--- Gracias ---</p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .fixed.inset-0.z-\\[100\\], .fixed.inset-0.z-\\[100\\] * { visibility: visible; }
          .fixed.inset-0.z-\\[100\\] { position: absolute; inset: 0; }
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>
    </div>
  );
}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 4: Commit**

```bash
git add src/components/order-detail-drawer.tsx src/components/order-print.tsx
git commit -m "feat(orders): add order detail drawer and print component"
```

---

## Task 8: Rewrite Admin Orders Page

**Files:**
- Modify: `src/app/(restaurant-admin)/orders/page.tsx`

**Context:** Replace all 263 lines of mock data with real data fetched from `/api/orders`. Keep the same visual design (dark theme, glassmorphism, status tabs, source chips, grid cards). Add: SSE real-time updates via `useOrderStream`, notification sounds via `useNotificationSound`, order detail drawer, stats mini-dashboard. The existing page uses Framer Motion, clsx, twMerge, and lucide-react icons — keep these.

**Step 1: Rewrite the page**

Replace the entire file. The new page should:
- Fetch orders from `/api/orders` with filters
- Fetch stats from `/api/orders/stats`
- Use `useOrderStream` for real-time updates
- Use `useNotificationSound` for new order sounds
- Show stats bar (active orders, avg prep time, completed today)
- Status tabs with real counts
- Source chips filter
- Date display (dynamic)
- Grid of order cards with: order ID (first 8 chars), source badge, customer name, items summary (quantity × item), total (formatCLP), status badge with icon, elapsed time (calculated from createdAt), action button (advances status)
- Click card to open `OrderDetailDrawer`
- Animate new orders in, animate status changes

The page structure should be a `"use client"` component that calls the APIs on mount and when filters change.

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 3: Commit**

```bash
git add "src/app/(restaurant-admin)/orders/page.tsx"
git commit -m "feat(orders): rewrite admin orders page with real data and SSE"
```

---

## Task 9: Rewrite KDS Page with Real Data

**Files:**
- Modify: `src/stores/kdsStore.ts`
- Modify: `src/app/(kds)/kitchen/[branchId]/page.tsx`
- Modify: `src/components/kds/OrderCard.tsx`
- Modify: `src/components/kds/KDSStats.tsx`
- Modify: `src/components/kds/StationTabs.tsx`

**Context:** The KDS currently uses Zustand with 8 mock orders. Replace mock data with SSE-driven real data. Keep the existing visual design (dark theme, countdown timer, station tabs, animated cards). Add: urgency-colored timers (green <10min, yellow 10-20min, red >20min — the CountdownTimer component ALREADY has this via the `useCountdown` hook), individual item bumping (PATCH `/api/orders/[id]/items/[itemId]/bump`), notification sounds, real stats from `/api/orders/stats`.

Key changes:
- `kdsStore.ts`: Remove all mock data. Store starts empty. Add actions to set orders from SSE, bump items.
- `KDS page`: Fetch initial orders from `/api/orders?status=pending&status=accepted&status=preparing` on mount. Connect to SSE for real-time updates. Play notification sound on new orders.
- `OrderCard.tsx`: Remove hardcoded emoji map. Add bump checkmarks per item. Replace Zustand status update with API call.
- `KDSStats.tsx`: Fetch from `/api/orders/stats` instead of Zustand mock.
- `StationTabs.tsx`: Works with real data (just reads from store, no changes needed if store structure stays the same).

**Step 1: Rewrite kdsStore**

Remove all mock data. Keep the same interface but start with empty orders. Add `setOrders`, `upsertOrder`, `bumpItem` actions.

**Step 2: Rewrite KDS page**

Fetch initial orders, connect SSE, add sound notifications.

**Step 3: Update OrderCard**

Add per-item bump UI (checkbox or strikethrough) that calls the bump API. Remove hardcoded emoji map.

**Step 4: Update KDSStats**

Fetch from API instead of store mock data.

**Step 5: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 6: Commit**

```bash
git add src/stores/kdsStore.ts "src/app/(kds)/kitchen/[branchId]/page.tsx" src/components/kds/OrderCard.tsx src/components/kds/KDSStats.tsx src/components/kds/StationTabs.tsx
git commit -m "feat(kds): rewrite kitchen display with real data, SSE, and item bumping"
```

---

## Task 10: Wire Checkout to Tracking Page

**Files:**
- Modify: `src/app/(storefront)/r/[slug]/order/page.tsx`
- Modify: `src/app/api/checkout/mercadopago/callback/route.ts`
- Modify: `src/app/api/checkout/transbank/callback/route.ts`

**Context:** The checkout API already returns `orderId`. The storefront order page shows a hardcoded success screen with "#0234". Wire it to redirect to `/r/{slug}/track/{orderId}` after payment. Also update the MercadoPago and Transbank callbacks to redirect to the tracking page instead of the old success/failure URLs.

**Step 1: Update storefront order page**

In the success handler, instead of showing a hardcoded confirmation, redirect to `/r/${slug}/track/${orderId}`.

**Step 2: Update MercadoPago callback**

Change the redirect URL from `/r/{slug}/track?payment=success` to `/r/{slug}/track/{orderId}`.

**Step 3: Update Transbank callback**

Change the redirect URL similarly.

**Step 4: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Compiled successfully

**Step 5: Commit**

```bash
git add "src/app/(storefront)/r/[slug]/order/page.tsx" src/app/api/checkout/mercadopago/callback/route.ts src/app/api/checkout/transbank/callback/route.ts
git commit -m "feat(orders): wire checkout flow to tracking page"
```

---

## Task 11: Build Verification

**Step 1: Run full build**

Run: `npx next build 2>&1`
Expected: Compiled successfully, 0 errors

**Step 2: Verify all new routes appear**

Check that these routes appear in the build output:
- `/api/orders`
- `/api/orders/[id]`
- `/api/orders/[id]/status`
- `/api/orders/[id]/cancel`
- `/api/orders/[id]/items/[itemId]/bump`
- `/api/orders/stream`
- `/api/orders/track/[id]`
- `/api/orders/stats`
- `/api/orders/estimate`
- `/r/[slug]/track/[orderId]`

**Step 3: If errors, fix and re-build**

Fix any TypeScript or import errors. Re-run build until clean.
