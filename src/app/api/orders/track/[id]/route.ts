import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, menuItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID format to prevent enumeration
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

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
      })
      .from(orders)
      .where(eq(orders.id, id));

    if (!order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // Join with menuItems to get item names
    const items = await db
      .select({
        id: orderItems.id,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        modifiers: orderItems.modifiers,
        notes: orderItems.notes,
        menuItemName: menuItems.name,
      })
      .from(orderItems)
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(eq(orderItems.orderId, id));

    return NextResponse.json({ ...order, items });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener la orden" },
      { status: 500 }
    );
  }
}
