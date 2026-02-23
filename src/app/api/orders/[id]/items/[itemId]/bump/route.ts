import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { syncOrderStatusToDeliveryPlatform } from "@/lib/delivery/status-sync";
import { sendOrderStatusUpdate } from "@/lib/delivery/whatsapp";
import { getDeliveryConfig } from "@/lib/delivery";
import type { OrderSource } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id, itemId } = await params;
  const organizationId = session.user.organizationId;

  // Verify order belongs to org
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.organizationId, organizationId)),
    with: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  const item = order.items.find((i) => i.id === itemId);
  if (!item) {
    return NextResponse.json(
      { error: "Item no encontrado en esta orden" },
      { status: 404 }
    );
  }

  // Toggle bumped in modifiers jsonb
  const currentModifiers = (item.modifiers as Record<string, unknown>) || {};
  const updatedModifiers = { ...currentModifiers, bumped: true };

  const [updatedItem] = await db
    .update(orderItems)
    .set({ modifiers: updatedModifiers })
    .where(eq(orderItems.id, itemId))
    .returning();

  // Check if ALL items are now bumped
  const allBumped = order.items.every((i) => {
    if (i.id === itemId) return true; // just bumped this one
    const mods = (i.modifiers as Record<string, unknown>) || {};
    return mods.bumped === true;
  });

  // Auto-set order to "ready" if all bumped and status is preparing or accepted
  if (allBumped && (order.status === "preparing" || order.status === "accepted")) {
    await db
      .update(orders)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(orders.id, id));

    // Sync "ready" status to delivery platform
    const deliverySources = ['uber_eats', 'rappi', 'whatsapp'];
    if (deliverySources.includes(order.source)) {
      void syncOrderStatusToDeliveryPlatform({
        orderId: order.id,
        organizationId: order.organizationId,
        source: order.source as OrderSource,
        externalOrderId: order.externalOrderId ?? undefined,
        newStatus: 'ready',
        customerPhone: order.customerPhone ?? undefined,
      });
    }

    // WhatsApp "ready" notification
    if (order.customerPhone) {
      void (async () => {
        try {
          const waConfig = await getDeliveryConfig(order.organizationId, 'whatsapp');
          if (waConfig) {
            await sendOrderStatusUpdate(
              waConfig.credentials.phone_number_id,
              waConfig.credentials.access_token,
              order.customerPhone!,
              order.id.slice(-6),
              'ready',
            );
          }
        } catch (err) {
          console.error('[whatsapp-notify] Ready notification failed:', err);
        }
      })();
    }
  }

  return NextResponse.json(updatedItem);
}
