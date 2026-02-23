import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems, payments } from "@/db/schema";
import { eq, and, desc, gte, lte, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

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

  const conditions: SQL[] = [
    eq(orders.organizationId, session.user.organizationId),
  ];

  if (status) {
    conditions.push(eq(orders.status, status as any));
  }
  if (source) {
    conditions.push(eq(orders.source, source as any));
  }
  if (from) {
    conditions.push(gte(orders.createdAt, new Date(from)));
  }
  if (to) {
    conditions.push(lte(orders.createdAt, new Date(to)));
  }

  const orderRows = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(100);

  if (orderRows.length === 0) {
    return NextResponse.json([]);
  }

  const orderIds = orderRows.map((o) => o.id);

  const [items, pays] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
    db.select().from(payments).where(inArray(payments.orderId, orderIds)),
  ]);

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  const paysByOrder = new Map<string, typeof pays>();
  for (const pay of pays) {
    const list = paysByOrder.get(pay.orderId) ?? [];
    list.push(pay);
    paysByOrder.set(pay.orderId, list);
  }

  const result = orderRows.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
    payments: paysByOrder.get(order.id) ?? [],
  }));

  return NextResponse.json(result);
}
