import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/db/schema";
import { eq, and, gte, sql, inArray } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
    avgPrepTime: avgResult.avg,
  });
}
