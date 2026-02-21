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
import { verifyRappiWebhookSignature } from '@/lib/delivery/rappi';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('Rappi-Signature');

    if (!signature) {
      console.error('[Rappi Webhook] Missing Rappi-Signature header');
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // Find the matching Rappi config by verifying signature against all active configs
    const configs = await db
      .select()
      .from(deliveryPlatformConfigs)
      .where(
        and(
          eq(deliveryPlatformConfigs.platform, 'rappi'),
          eq(deliveryPlatformConfigs.isActive, true),
        ),
      );

    let matchedConfig: (typeof configs)[0] | null = null;

    for (const config of configs) {
      const secret = config.webhookSecret ? decrypt(config.webhookSecret) : null;
      if (secret && verifyRappiWebhookSignature(rawBody, signature, secret)) {
        matchedConfig = config;
        break;
      }
    }

    if (!matchedConfig) {
      console.error('[Rappi Webhook] No matching config found for signature');
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    const body = JSON.parse(rawBody);
    const eventType: string = body.event ?? body.event_type ?? '';

    switch (eventType) {
      case 'NEW_ORDER':
        await handleNewOrder(body, matchedConfig);
        break;

      case 'ORDER_EVENT_CANCEL':
        await handleCancelOrder(body);
        break;

      case 'PING':
        // Health check - just return 200
        break;

      case 'MENU_APPROVED':
        await handleMenuStatus(matchedConfig, 'approved');
        break;

      case 'MENU_REJECTED':
        await handleMenuStatus(matchedConfig, 'rejected');
        break;

      default:
        console.error('[Rappi Webhook] Unknown event type:', eventType);
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('[Rappi Webhook] Error processing webhook:', error);
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
  const orderData = body.order as Record<string, unknown> | undefined;
  if (!orderData) {
    console.error('[Rappi Webhook] No order data in NEW_ORDER event');
    return;
  }

  const rappiOrderId = String(orderData.id ?? orderData.order_id ?? '');
  const customer = orderData.customer as {
    first_name?: string;
    last_name?: string;
    phone?: string;
  } | undefined;
  const items = orderData.items as Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }> | undefined;
  const totals = orderData.totals as {
    total?: number;
    subtotal?: number;
  } | undefined;

  // Find the restaurant for this config
  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.organizationId, config.organizationId))
    .limit(1);

  if (!restaurant) {
    console.error('[Rappi Webhook] No restaurant found for org:', config.organizationId);
    return;
  }

  // Get a branch for the restaurant
  const { branches } = await import('@/db/schema');
  const [branch] = await db
    .select()
    .from(branches)
    .where(eq(branches.restaurantId, restaurant.id))
    .limit(1);

  if (!branch) {
    console.error('[Rappi Webhook] No branch found for restaurant:', restaurant.id);
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

  const customerName = customer
    ? `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim()
    : 'Cliente Rappi';

  const totalAmount = totals?.total ? String(totals.total) : '0';
  const subtotalAmount = totals?.subtotal ? String(totals.subtotal) : totalAmount;

  // Create the order
  const [newOrder] = await db
    .insert(orders)
    .values({
      organizationId: config.organizationId,
      branchId: branch.id,
      source: 'rappi',
      type: 'delivery',
      status: 'pending',
      customerName,
      customerPhone: customer?.phone ?? null,
      externalOrderId: rappiOrderId,
      total: totalAmount,
      subtotal: subtotalAmount,
    })
    .returning();

  // Create order items by matching names
  if (items && newOrder) {
    for (const item of items) {
      const matchedItem = restaurantMenuItems.find(
        (mi) => mi.name.toLowerCase() === item.name.toLowerCase(),
      );

      if (matchedItem) {
        await db.insert(orderItems).values({
          orderId: newOrder.id,
          menuItemId: matchedItem.id,
          quantity: item.quantity,
          unitPrice: String(item.unit_price),
        });
      } else {
        console.error(`[Rappi Webhook] No matching menu item for: ${item.name}`);
      }
    }
  }
}

async function handleCancelOrder(body: Record<string, unknown>) {
  const orderData = body.order as Record<string, unknown> | undefined;
  const rappiOrderId = String(
    orderData?.id ?? orderData?.order_id ?? body.order_id ?? '',
  );

  if (!rappiOrderId) {
    console.error('[Rappi Webhook] No order ID in cancel event');
    return;
  }

  const [existingOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.externalOrderId, rappiOrderId));

  if (existingOrder) {
    await db
      .update(orders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(orders.id, existingOrder.id));
  } else {
    console.error('[Rappi Webhook] Order not found for cancel:', rappiOrderId);
  }
}

async function handleMenuStatus(
  config: { id: string; metadata: unknown },
  status: 'approved' | 'rejected',
) {
  const currentMetadata = (config.metadata as Record<string, unknown>) ?? {};

  await db
    .update(deliveryPlatformConfigs)
    .set({
      metadata: {
        ...currentMetadata,
        menuStatus: status,
        menuStatusUpdatedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(eq(deliveryPlatformConfigs.id, config.id));
}
