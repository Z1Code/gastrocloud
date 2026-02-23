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
  ready: ["served", "completed"],
  served: ["completed"],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const organizationId = session.user.organizationId;

  const body = await request.json();
  const { status: newStatus } = body;

  if (!newStatus) {
    return NextResponse.json(
      { error: "El campo 'status' es requerido" },
      { status: 400 }
    );
  }

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.organizationId, organizationId)),
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  const currentStatus = order.status;
  const allowed = validTransitions[currentStatus];

  if (!allowed || !allowed.includes(newStatus)) {
    return NextResponse.json(
      {
        error: `Transicion invalida: no se puede cambiar de '${currentStatus}' a '${newStatus}'`,
      },
      { status: 400 }
    );
  }

  // For "ready" -> check order type constraints
  if (currentStatus === "ready") {
    if (newStatus === "served" && order.type !== "dine_in") {
      return NextResponse.json(
        {
          error: "Solo pedidos dine_in pueden pasar a 'served'. Use 'completed' para takeaway/delivery.",
        },
        { status: 400 }
      );
    }
    if (newStatus === "completed" && order.type === "dine_in") {
      return NextResponse.json(
        {
          error: "Pedidos dine_in deben pasar a 'served' antes de 'completed'.",
        },
        { status: 400 }
      );
    }
  }

  const [updated] = await db
    .update(orders)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.organizationId, organizationId)))
    .returning();

  return NextResponse.json(updated);
}
