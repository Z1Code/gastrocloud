import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, restaurants } from "@/db/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  // Keep backward compatibility with orgId for now
  const orgIdParam = searchParams.get("orgId");

  let organizationId: string | null = null;

  if (slug) {
    const [restaurant] = await db
      .select({ organizationId: restaurants.organizationId })
      .from(restaurants)
      .where(eq(restaurants.slug, slug));
    organizationId = restaurant?.organizationId ?? null;
  } else if (orgIdParam) {
    organizationId = orgIdParam;
  }

  if (!organizationId) {
    return NextResponse.json(
      { error: "slug o orgId es requerido" },
      { status: 400 }
    );
  }

  const [queueResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, organizationId),
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
            eq(orders.organizationId, organizationId),
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
