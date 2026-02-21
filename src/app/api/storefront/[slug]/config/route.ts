import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { restaurants, paymentGatewayConfigs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTheme } from '@/lib/themes';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const [restaurant] = await db.select().from(restaurants)
    .where(eq(restaurants.slug, slug));

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
  }

  // Get active gateways (no secrets)
  const gateways = await db.select({
    gateway: paymentGatewayConfigs.gateway,
  }).from(paymentGatewayConfigs)
    .where(and(
      eq(paymentGatewayConfigs.organizationId, restaurant.organizationId),
      eq(paymentGatewayConfigs.isActive, true),
    ));

  const theme = getTheme(restaurant.theme);

  return NextResponse.json({
    restaurantName: restaurant.name,
    theme: theme,
    availableGateways: gateways.map((g) => g.gateway),
    currency: restaurant.currency,
  });
}
