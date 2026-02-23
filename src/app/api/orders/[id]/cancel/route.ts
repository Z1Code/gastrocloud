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

  return NextResponse.json(updated);
}
