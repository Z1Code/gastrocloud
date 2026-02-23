import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  deliveryPlatformConfigs,
  orders,
  orderItems,
  menuItems,
  menuCategories,
  restaurants,
  whatsappSessions,
} from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { verifyWhatsAppSignature, sendOrderConfirmation, markMessageAsRead } from '@/lib/delivery/whatsapp';
import { handleWhatsAppMessage } from '@/lib/delivery/whatsapp-bot';

// ---------------------------------------------------------------------------
// GET — Webhook verification (Meta challenge handshake)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token) {
    // Try matching against all whatsapp configs' metadata.verify_token
    const configs = await db
      .select()
      .from(deliveryPlatformConfigs)
      .where(
        and(
          eq(deliveryPlatformConfigs.platform, 'whatsapp'),
          eq(deliveryPlatformConfigs.isActive, true),
        ),
      );

    const envToken = process.env.WHATSAPP_VERIFY_TOKEN;

    const isValid = configs.some((config) => {
      const metadata = config.metadata as Record<string, unknown> | null;
      return metadata?.verify_token === token;
    }) || (envToken && envToken === token);

    if (isValid) {
      return new NextResponse(challenge, { status: 200 });
    }
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ---------------------------------------------------------------------------
// POST — Incoming messages and status updates
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('X-Hub-Signature-256');

    if (!signature) {
      console.error('[WhatsApp Webhook] Missing X-Hub-Signature-256 header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Find the matching WhatsApp config by verifying signature
    const configs = await db
      .select()
      .from(deliveryPlatformConfigs)
      .where(
        and(
          eq(deliveryPlatformConfigs.platform, 'whatsapp'),
          eq(deliveryPlatformConfigs.isActive, true),
        ),
      );

    let matchedConfig: (typeof configs)[0] | null = null;

    for (const config of configs) {
      const secret = config.webhookSecret ? decrypt(config.webhookSecret) : null;
      if (secret && verifyWhatsAppSignature(rawBody, signature, secret)) {
        matchedConfig = config;
        break;
      }
    }

    if (!matchedConfig) {
      console.error('[WhatsApp Webhook] No matching config found for signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // WhatsApp webhook structure: body.entry[0].changes[0].value
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    const phoneNumberId: string | undefined = value.metadata?.phone_number_id;

    if (!phoneNumberId) {
      console.error('[WhatsApp Webhook] No phone_number_id in metadata');
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // Find the restaurant by looking up whatsapp config where externalStoreId matches
    const [whatsappConfig] = await db
      .select()
      .from(deliveryPlatformConfigs)
      .where(
        and(
          eq(deliveryPlatformConfigs.platform, 'whatsapp'),
          eq(deliveryPlatformConfigs.externalStoreId, phoneNumberId),
          eq(deliveryPlatformConfigs.isActive, true),
        ),
      );

    if (!whatsappConfig) {
      console.error(
        '[WhatsApp Webhook] No config found for phone_number_id:',
        phoneNumberId,
      );
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // Find the restaurant for this org
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.organizationId, whatsappConfig.organizationId))
      .limit(1);

    if (!restaurant) {
      console.error(
        '[WhatsApp Webhook] No restaurant found for org:',
        whatsappConfig.organizationId,
      );
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // Process messages
    const messages = value.messages as Array<Record<string, unknown>> | undefined;
    if (!messages || messages.length === 0) {
      // Could be a status update, not a message - just acknowledge
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    const message = messages[0];
    const customerPhone = message.from as string;
    const messageType = message.type as 'text' | 'interactive';

    // Extract message body based on type
    let messageBody = '';

    if (messageType === 'text') {
      const textData = message.text as { body: string } | undefined;
      messageBody = textData?.body ?? '';
    } else if (messageType === 'interactive') {
      const interactive = message.interactive as Record<string, unknown> | undefined;
      if (interactive) {
        const buttonReply = interactive.button_reply as {
          id: string;
          title: string;
        } | undefined;
        const listReply = interactive.list_reply as {
          id: string;
          title: string;
          description?: string;
        } | undefined;

        if (buttonReply) {
          messageBody = buttonReply.title;
        } else if (listReply) {
          messageBody = listReply.title;
        }
      }
    }

    // Load or create session
    const [existingSession] = await db
      .select()
      .from(whatsappSessions)
      .where(
        and(
          eq(whatsappSessions.restaurantId, restaurant.id),
          eq(whatsappSessions.customerPhone, customerPhone),
        ),
      );

    const session = existingSession ?? null;

    // Load restaurant menu categories with items
    const categories = await db
      .select()
      .from(menuCategories)
      .where(
        and(
          eq(menuCategories.restaurantId, restaurant.id),
          eq(menuCategories.isActive, true),
        ),
      );

    const categoryIds = categories.map((c) => c.id);

    let allMenuItems: Array<{
      id: string;
      name: string;
      description: string | null;
      price: string;
      categoryId: string;
      isAvailable: boolean;
    }> = [];

    if (categoryIds.length > 0) {
      const { inArray } = await import('drizzle-orm');
      allMenuItems = await db
        .select({
          id: menuItems.id,
          name: menuItems.name,
          description: menuItems.description,
          price: menuItems.price,
          categoryId: menuItems.categoryId,
          isAvailable: menuItems.isAvailable,
        })
        .from(menuItems)
        .where(
          and(
            inArray(menuItems.categoryId, categoryIds),
            eq(menuItems.isAvailable, true),
          ),
        );
    }

    // Build menu data structure for the bot
    const menuData = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      items: allMenuItems
        .filter((item) => item.categoryId === cat.id)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? '',
          price: parseFloat(item.price),
        })),
    }));

    // Parse credentials for API access
    const credentials = JSON.parse(
      decrypt(whatsappConfig.credentials),
    ) as Record<string, string>;

    // Handle the message through the bot
    const accessToken = credentials.access_token ?? credentials.accessToken ?? '';
    const result = await handleWhatsAppMessage({
      phoneNumberId,
      accessToken,
      customerPhone,
      messageType,
      messageBody,
      interactiveData: messageType === 'interactive'
        ? (message.interactive as { type: 'button_reply' | 'list_reply'; id: string; title: string })
        : undefined,
      session: session
        ? {
            id: session.id,
            state: session.state,
            cartData: (session.cartData ?? null) as import('@/types').WhatsAppCartData | null,
            customerName: session.customerName,
          }
        : {
            id: '',
            state: 'greeting' as const,
            cartData: null,
            customerName: null,
          },
      restaurantName: restaurant.name,
      restaurantId: restaurant.id,
      menuCategories: menuData,
    });

    // Update or create session
    if (existingSession) {
      await db
        .update(whatsappSessions)
        .set({
          state: result.newState,
          cartData: result.newCartData ?? existingSession.cartData,
          customerName: result.newCustomerName ?? existingSession.customerName,
          lastMessageAt: new Date(),
        })
        .where(eq(whatsappSessions.id, existingSession.id));
    } else {
      await db.insert(whatsappSessions).values({
        restaurantId: restaurant.id,
        customerPhone,
        state: result.newState,
        cartData: result.newCartData ?? null,
        customerName: result.newCustomerName ?? null,
      });
    }

    // If the bot says to create an order, do it
    if (result.createOrder && result.newCartData) {
      await createOrderFromCart({
        organizationId: whatsappConfig.organizationId,
        restaurantId: restaurant.id,
        customerPhone,
        customerName: result.newCustomerName ?? 'Cliente WhatsApp',
        cartData: result.newCartData.items,
        menuItems: allMenuItems,
        accessToken: credentials.access_token ?? credentials.accessToken ?? '',
        phoneNumberId,
      });
    }

    // Mark message as read
    try {
      const messageId = message.id as string | undefined;
      if (messageId) {
        await markMessageAsRead(
          phoneNumberId,
          messageId,
          credentials.access_token ?? credentials.accessToken ?? '',
        );
      }
    } catch (readError) {
      console.error('[WhatsApp Webhook] Error marking message as read:', readError);
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing webhook:', error);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }
}

// ---------------------------------------------------------------------------
// Helper — Create order from WhatsApp cart
// ---------------------------------------------------------------------------

async function createOrderFromCart({
  organizationId,
  restaurantId,
  customerPhone,
  customerName,
  cartData,
  menuItems: availableMenuItems,
  accessToken,
  phoneNumberId,
}: {
  organizationId: string;
  restaurantId: string;
  customerPhone: string;
  customerName: string;
  cartData: Array<{
    menuItemId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  menuItems: Array<{
    id: string;
    name: string;
    price: string;
  }>;
  accessToken: string;
  phoneNumberId: string;
}) {
  try {
    // Find a branch for this restaurant
    const { branches } = await import('@/db/schema');
    const [branch] = await db
      .select()
      .from(branches)
      .where(eq(branches.restaurantId, restaurantId))
      .limit(1);

    if (!branch) {
      console.error('[WhatsApp Webhook] No branch found for restaurant:', restaurantId);
      return;
    }

    // Calculate totals
    let subtotal = 0;
    const resolvedItems: Array<{
      menuItemId: string;
      quantity: number;
      unitPrice: string;
    }> = [];

    for (const cartItem of cartData) {
      // Resolve menu item ID: use provided ID or match by name
      let menuItemId = cartItem.menuItemId;
      if (!menuItemId) {
        const matched = availableMenuItems.find(
          (mi) => mi.name.toLowerCase() === cartItem.name.toLowerCase(),
        );
        menuItemId = matched?.id;
      }

      if (!menuItemId) {
        console.error(
          `[WhatsApp Webhook] No matching menu item for cart item: ${cartItem.name}`,
        );
        continue;
      }

      const itemTotal = cartItem.quantity * cartItem.unitPrice;
      subtotal += itemTotal;

      resolvedItems.push({
        menuItemId,
        quantity: cartItem.quantity,
        unitPrice: String(cartItem.unitPrice),
      });
    }

    if (resolvedItems.length === 0) {
      console.error('[WhatsApp Webhook] No valid items to create order');
      return;
    }

    // Check for duplicate order (same phone, same source, within last 1 minute)
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recentOrder = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.customerPhone, customerPhone),
          eq(orders.source, 'whatsapp'),
          eq(orders.organizationId, organizationId),
          gte(orders.createdAt, oneMinuteAgo),
        ),
      )
      .limit(1);

    if (recentOrder.length > 0) {
      console.log(`[WhatsApp Webhook] Duplicate order skipped for phone: ${customerPhone}`);
      return;
    }

    // Create the order
    const [newOrder] = await db
      .insert(orders)
      .values({
        organizationId,
        branchId: branch.id,
        source: 'whatsapp',
        type: 'delivery',
        status: 'pending',
        customerName,
        customerPhone,
        subtotal: String(subtotal),
        total: String(subtotal),
      })
      .returning();

    if (!newOrder) return;

    // Create order items
    await db.insert(orderItems).values(
      resolvedItems.map((item) => ({
        orderId: newOrder.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))
    );

    // Send confirmation message
    try {
      await sendOrderConfirmation(
        phoneNumberId,
        accessToken,
        customerPhone,
        {
          orderNumber: newOrder.id.slice(0, 8).toUpperCase(),
          items: resolvedItems.map((ri) => {
            const mi = availableMenuItems.find((m) => m.id === ri.menuItemId);
            return {
              name: mi?.name ?? 'Item',
              qty: ri.quantity,
              price: parseFloat(ri.unitPrice),
            };
          }),
          total: subtotal,
          estimatedMinutes: 25,
        },
      );
    } catch (confirmError) {
      console.error(
        '[WhatsApp Webhook] Error sending order confirmation:',
        confirmError,
      );
    }
  } catch (error) {
    console.error('[WhatsApp Webhook] Error creating order from cart:', error);
  }
}
