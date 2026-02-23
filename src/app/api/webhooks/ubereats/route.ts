import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  deliveryPlatformConfigs,
  orders,
  orderItems,
  menuItems,
  menuCategories,
  restaurants,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { verifyUberWebhookSignature } from '@/lib/delivery/ubereats';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('X-Uber-Signature');

    if (!signature) {
      console.error('[UberEats Webhook] Missing X-Uber-Signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Find the matching Uber Eats config by verifying the signature against all active configs
    const configs = await db
      .select()
      .from(deliveryPlatformConfigs)
      .where(
        and(
          eq(deliveryPlatformConfigs.platform, 'uber_eats'),
          eq(deliveryPlatformConfigs.isActive, true),
        ),
      );

    let matchedConfig: (typeof configs)[0] | null = null;

    for (const config of configs) {
      const secret = config.webhookSecret ? decrypt(config.webhookSecret) : null;
      if (secret && verifyUberWebhookSignature(rawBody, signature, secret)) {
        matchedConfig = config;
        break;
      }
    }

    if (!matchedConfig) {
      console.error('[UberEats Webhook] No matching config found for signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventType: string = body.event_type;

    if (eventType === 'orders.notification') {
      await handleNewOrder(body, matchedConfig);
    } else if (eventType === 'orders.cancel') {
      await handleCancelOrder(body);
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('[UberEats Webhook] Error processing webhook:', error);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }
}

async function handleNewOrder(
  body: Record<string, unknown>,
  config: {
    organizationId: string;
    externalStoreId: string | null;
  },
) {
  const meta = body.meta as Record<string, unknown> | undefined;
  const orderData = meta?.resource as Record<string, unknown> | undefined;
  if (!orderData) {
    console.error('[UberEats Webhook] No order data in notification');
    return;
  }

  const uberOrderId = orderData.id as string;
  const eater = orderData.eater as { first_name?: string; last_name?: string } | undefined;
  const cart = orderData.cart as {
    items?: Array<{
      title: string;
      quantity: number;
      price: { unit_price: { amount: number }; total_price: { amount: number } };
    }>;
  } | undefined;
  const payment = orderData.payment as {
    charges?: { total?: { amount?: number } };
  } | undefined;

  // Find the restaurant associated with this config
  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.organizationId, config.organizationId))
    .limit(1);

  if (!restaurant) {
    console.error('[UberEats Webhook] No restaurant found for org:', config.organizationId);
    return;
  }

  // Get a branch for the restaurant to associate the order with
  const { branches } = await import('@/db/schema');
  const [branch] = await db
    .select()
    .from(branches)
    .where(eq(branches.restaurantId, restaurant.id))
    .limit(1);

  if (!branch) {
    console.error('[UberEats Webhook] No branch found for restaurant:', restaurant.id);
    return;
  }

  // Get menu items for name matching
  const restaurantCategories = await db
    .select()
    .from(menuCategories)
    .where(eq(menuCategories.restaurantId, restaurant.id));

  const categoryIds = restaurantCategories.map((c) => c.id);

  let restaurantMenuItems: Array<{
    id: string;
    name: string;
    price: string;
    categoryId: string;
  }> = [];

  if (categoryIds.length > 0) {
    const { inArray } = await import('drizzle-orm');
    restaurantMenuItems = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        price: menuItems.price,
        categoryId: menuItems.categoryId,
      })
      .from(menuItems)
      .where(inArray(menuItems.categoryId, categoryIds));
  }

  const customerName = eater
    ? `${eater.first_name ?? ''} ${eater.last_name ?? ''}`.trim()
    : 'Cliente Uber Eats';

  const totalAmount = payment?.charges?.total?.amount
    ? String(payment.charges.total.amount)
    : '0';

  // Check for duplicate order
  const existingOrder = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.externalOrderId, uberOrderId))
    .limit(1);

  if (existingOrder.length > 0) {
    console.log(`[UberEats Webhook] Duplicate order skipped: ${uberOrderId}`);
    return;
  }

  // Create the order
  const [newOrder] = await db
    .insert(orders)
    .values({
      organizationId: config.organizationId,
      branchId: branch.id,
      source: 'uber_eats',
      type: 'delivery',
      status: 'pending',
      customerName,
      externalOrderId: uberOrderId,
      total: totalAmount,
      subtotal: totalAmount,
    })
    .returning();

  // Create order items by matching names
  if (cart?.items && newOrder) {
    const itemsToInsert: Array<{
      orderId: string;
      menuItemId: string;
      quantity: number;
      unitPrice: string;
    }> = [];

    for (const cartItem of cart.items) {
      const matchedItem = restaurantMenuItems.find(
        (mi) => mi.name.toLowerCase() === cartItem.title.toLowerCase(),
      );

      if (matchedItem) {
        itemsToInsert.push({
          orderId: newOrder.id,
          menuItemId: matchedItem.id,
          quantity: cartItem.quantity,
          unitPrice: String(cartItem.price.unit_price.amount),
        });
      } else {
        console.error(
          `[UberEats Webhook] No matching menu item for: ${cartItem.title}`,
        );
      }
    }

    if (itemsToInsert.length > 0) {
      await db.insert(orderItems).values(itemsToInsert);
    }
  }
}

async function handleCancelOrder(body: Record<string, unknown>) {
  const meta = body.meta as Record<string, unknown> | undefined;
  const orderData = meta?.resource as Record<string, unknown> | undefined;
  const uberOrderId = (orderData?.id ?? body.resource_id) as string | undefined;

  if (!uberOrderId) {
    console.error('[UberEats Webhook] No order ID in cancel event');
    return;
  }

  const [existingOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.externalOrderId, uberOrderId));

  if (existingOrder) {
    await db
      .update(orders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(orders.id, existingOrder.id));
  } else {
    console.error('[UberEats Webhook] Order not found for cancel:', uberOrderId);
  }
}
