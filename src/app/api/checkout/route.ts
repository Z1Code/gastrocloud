import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { restaurants, orders, orderItems, payments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getGatewayConfig } from '@/lib/payment';
import { createCheckoutPreference } from '@/lib/payment/mercadopago';
import { createTransbankTransaction } from '@/lib/payment/transbank';

interface CheckoutItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers?: { name: string; price: number }[];
}

interface CheckoutBody {
  slug: string;
  gateway: 'mercadopago' | 'transbank';
  items: CheckoutItem[];
  customerName: string;
  customerPhone: string;
  notes?: string;
  orderType: 'takeaway' | 'dine_in' | 'pickup_scheduled';
  tipAmount?: number;
  scheduledAt?: string;
}

export async function POST(request: NextRequest) {
  const body: CheckoutBody = await request.json();
  const { slug, gateway, items, customerName, customerPhone, notes, orderType, tipAmount, scheduledAt } = body;

  if (!slug || !gateway || !items?.length || !customerName) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  // Look up restaurant by slug
  const [restaurant] = await db.select().from(restaurants)
    .where(eq(restaurants.slug, slug));

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
  }

  // Get gateway config
  const config = await getGatewayConfig(restaurant.organizationId, gateway);
  if (!config) {
    return NextResponse.json({ error: 'Pasarela de pago no configurada' }, { status: 400 });
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tip = tipAmount || 0;
  const total = subtotal + tip;

  // Get the first branch for the restaurant
  const { branches } = await import('@/db/schema');
  const [branch] = await db.select().from(branches)
    .where(eq(branches.restaurantId, restaurant.id));

  if (!branch) {
    return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 });
  }

  // Create order
  const [order] = await db.insert(orders).values({
    organizationId: restaurant.organizationId,
    branchId: branch.id,
    source: 'web',
    type: orderType === 'dine_in' ? 'dine_in' : orderType === 'pickup_scheduled' ? 'pickup_scheduled' : 'takeaway',
    status: 'pending',
    customerName,
    customerPhone,
    notes,
    subtotal: subtotal.toString(),
    tip: tip.toString(),
    total: total.toString(),
    paymentMethod: gateway,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
  }).returning();

  // Create order items — enrich with ingredients from menuItems for KDS display
  const { menuItems: menuItemsTable } = await import('@/db/schema');
  const { inArray } = await import('drizzle-orm');
  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItemsData = menuItemIds.length > 0
    ? await db.select({ id: menuItemsTable.id, ingredients: menuItemsTable.ingredients, station: menuItemsTable.station })
        .from(menuItemsTable).where(inArray(menuItemsTable.id, menuItemIds))
    : [];
  const menuItemMap = new Map(menuItemsData.map((mi) => [mi.id, mi]));

  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId);
    await db.insert(orderItems).values({
      orderId: order.id,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      station: menuItem?.station || null,
      modifiers: {
        ingredients: menuItem?.ingredients || [],
        customerModifiers: item.modifiers || [],
      },
    });
  }

  // Create payment record
  const [payment] = await db.insert(payments).values({
    organizationId: restaurant.organizationId,
    orderId: order.id,
    amount: total.toString(),
    method: gateway,
    status: 'pending',
  }).returning();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    let redirectUrl: string;

    if (gateway === 'mercadopago') {
      const initPoint = await createCheckoutPreference({
        accessToken: config.credentials.accessToken,
        items: items.map((item) => ({
          title: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          currency_id: 'CLP',
        })),
        orderId: order.id,
        backUrls: {
          success: `${appUrl}/api/checkout/mercadopago/callback?slug=${slug}&orderId=${order.id}`,
          failure: `${appUrl}/api/checkout/mercadopago/callback?slug=${slug}&orderId=${order.id}&status=failure`,
          pending: `${appUrl}/api/checkout/mercadopago/callback?slug=${slug}&orderId=${order.id}&status=pending`,
        },
        isSandbox: config.isSandbox,
      });
      redirectUrl = initPoint;
    } else {
      const result = await createTransbankTransaction({
        credentials: {
          commerceCode: config.credentials.commerceCode,
          apiKey: config.credentials.apiKey,
        },
        isSandbox: config.isSandbox,
        buyOrder: order.id.slice(0, 26),
        sessionId: payment.id.slice(0, 26),
        amount: total,
        returnUrl: `${appUrl}/api/checkout/transbank/callback?slug=${slug}&orderId=${order.id}`,
      });
      redirectUrl = `${result.url}?token_ws=${result.token}`;
    }

    return NextResponse.json({ redirectUrl, orderId: order.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: `Error al crear pago: ${message}` }, { status: 500 });
  }
}
