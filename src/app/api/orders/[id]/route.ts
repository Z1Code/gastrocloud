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
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const organizationId = session.user.organizationId;

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.organizationId, organizationId)),
    with: {
      items: true,
      payments: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  return NextResponse.json(order);
}
