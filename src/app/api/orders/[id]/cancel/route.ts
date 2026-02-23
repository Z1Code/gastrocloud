import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { syncOrderStatusToDeliveryPlatform } from "@/lib/delivery/status-sync";
import { sendOrderStatusUpdate } from "@/lib/delivery/whatsapp";
import { getDeliveryConfig } from "@/lib/delivery";
import type { OrderSource } from "@/types";

const cancellableStatuses = ["pending", "accepted", "preparing"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const organizationId = session.user.organizationId;

  const body = await request.json().catch(() => ({}));
  const { reason } = body as { reason?: string };

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.organizationId, organizationId)),
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  if (!cancellableStatuses.includes(order.status)) {
    return NextResponse.json(
      {
        error: `No se puede cancelar una orden con estado '${order.status}'. Solo se pueden cancelar ordenes en estado: ${cancellableStatuses.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  const notes = reason
    ? order.notes
      ? `${order.notes}\n[Cancelada] ${reason}`
      : `[Cancelada] ${reason}`
    : order.notes;

  const [updated] = await db
    .update(orders)
    .set({ status: "cancelled", notes, updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.organizationId, organizationId)))
    .returning();

  // Fire-and-forget sync cancellation to delivery platform
  const deliverySources = ['uber_eats', 'rappi', 'whatsapp'];
  if (deliverySources.includes(order.source)) {
    void syncOrderStatusToDeliveryPlatform({
      orderId: order.id,
      organizationId: order.organizationId,
      source: order.source as OrderSource,
      externalOrderId: order.externalOrderId ?? undefined,
      newStatus: 'cancelled',
      customerPhone: order.customerPhone ?? undefined,
    });
  }

  // WhatsApp cancellation notification
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
            'cancelled',
          );
        }
      } catch (err) {
        console.error('[whatsapp-notify] Cancel notification failed:', err);
      }
    })();
  }

  return NextResponse.json(updated);
}
