import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/db/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json(
      { error: "orgId es requerido" },
      { status: 400 }
    );
  }

  const [queueResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, orgId),
        inArray(orders.status, ["pending", "accepted", "preparing"])
      )
    );

  const [avgResult] = await db
    .select({
      avg: sql<number>`coalesce(avg(extract(epoch from (updated_at - created_at)) / 60)::int, 0)`,
    })
    .from(
      db
        .select({
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        })
        .from(orders)
        .where(
          and(
            eq(orders.organizationId, orgId),
            eq(orders.status, "completed")
          )
        )
        .orderBy(desc(orders.createdAt))
        .limit(20)
        .as("recent")
    );

  const queueSize = queueResult.count;
  const avgPrepTime = avgResult.avg;
  const raw = queueSize * avgPrepTime;
  const estimatedMinutes = Math.max(10, Math.min(60, raw));

  return NextResponse.json({
    estimatedMinutes,
    queueSize,
    avgPrepTime,
  });
}
