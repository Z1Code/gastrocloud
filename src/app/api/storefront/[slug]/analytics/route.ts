import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { restaurants, storefrontEvents, orders } from '@/db/schema';
import { eq, and, gte, sql, count } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST: record event (from storefront)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await request.json();
  const { eventType, metadata, sessionId } = body;

  // Whitelist allowed event types
  const ALLOWED_EVENTS = ['page_view', 'menu_view', 'item_view', 'add_to_cart', 'remove_from_cart', 'checkout_start', 'checkout_complete', 'search'];
  if (!eventType || !ALLOWED_EVENTS.includes(eventType)) {
    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
  }

  const [restaurant] = await db.select().from(restaurants)
    .where(eq(restaurants.slug, slug));

  if (!restaurant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Limit metadata size
  const safeMetadata = metadata ? JSON.stringify(metadata).slice(0, 2048) : null;

  await db.insert(storefrontEvents).values({
    restaurantId: restaurant.id,
    eventType,
    metadata: safeMetadata ? JSON.parse(safeMetadata) : null,
    sessionId: sessionId ? String(sessionId).slice(0, 64) : null,
  });

  return NextResponse.json({ ok: true });
}

// GET: aggregated stats (for admin)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { slug } = await params;

  const [restaurant] = await db.select().from(restaurants)
    .where(eq(restaurants.slug, slug));

  if (!restaurant || restaurant.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setMonth(monthStart.getMonth() - 1);

  // Count events by period
  const [todayViews] = await db.select({ count: count() }).from(storefrontEvents)
    .where(and(
      eq(storefrontEvents.restaurantId, restaurant.id),
      eq(storefrontEvents.eventType, 'page_view'),
      gte(storefrontEvents.createdAt, todayStart),
    ));

  const [weekViews] = await db.select({ count: count() }).from(storefrontEvents)
    .where(and(
      eq(storefrontEvents.restaurantId, restaurant.id),
      eq(storefrontEvents.eventType, 'page_view'),
      gte(storefrontEvents.createdAt, weekStart),
    ));

  const [monthViews] = await db.select({ count: count() }).from(storefrontEvents)
    .where(and(
      eq(storefrontEvents.restaurantId, restaurant.id),
      eq(storefrontEvents.eventType, 'page_view'),
      gte(storefrontEvents.createdAt, monthStart),
    ));

  // Event type breakdown for the month
  const eventBreakdown = await db.select({
    eventType: storefrontEvents.eventType,
    count: count(),
  }).from(storefrontEvents)
    .where(and(
      eq(storefrontEvents.restaurantId, restaurant.id),
      gte(storefrontEvents.createdAt, monthStart),
    ))
    .groupBy(storefrontEvents.eventType);

  return NextResponse.json({
    views: {
      today: todayViews?.count || 0,
      week: weekViews?.count || 0,
      month: monthViews?.count || 0,
    },
    eventBreakdown,
  });
}
