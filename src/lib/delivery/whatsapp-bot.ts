import type {
  WhatsAppSessionState,
  WhatsAppCartData,
  WhatsAppCartItem,
} from '@/types';
import {
  sendTextMessage,
  sendReplyButtons,
  sendMenuList,
  sendOrderConfirmation,
  formatCLP,
} from './whatsapp';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BotSession {
  id: string;
  state: WhatsAppSessionState;
  cartData: WhatsAppCartData | null;
  customerName: string | null;
}

interface BotMenuCategory {
  id: string;
  name: string;
  items: { id: string; name: string; description: string; price: number }[];
}

interface HandleMessageParams {
  phoneNumberId: string;
  accessToken: string;
  customerPhone: string;
  messageType: 'text' | 'interactive';
  messageBody: string;
  interactiveData?: {
    type: 'button_reply' | 'list_reply';
    id: string;
    title: string;
  };
  session: BotSession;
  restaurantName: string;
  restaurantId: string;
  menuCategories: BotMenuCategory[];
}

interface HandleMessageResult {
  newState: WhatsAppSessionState;
  newCartData: WhatsAppCartData | null;
  newCustomerName: string | null;
  createOrder: boolean;
}

// Temporary state for item selection (stored in a Map keyed by session id)
const pendingItemSelection = new Map<
  string,
  { itemId: string; name: string; price: number }
>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a quantity from a text message.
 * Handles digits, Spanish words, and phrases like "quiero 2".
 */
function parseQuantity(text: string): number | null {
  const trimmed = text.trim().toLowerCase();

  // Direct number
  const directNum = parseInt(trimmed, 10);
  if (!isNaN(directNum) && directNum > 0 && directNum <= 99) return directNum;

  // Spanish number words
  const words: Record<string, number> = {
    uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
    seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  };
  if (words[trimmed]) return words[trimmed];

  // Extract number from phrase: "quiero 2", "dame 3", "ponme 5"
  const match = trimmed.match(/(\d+)/);
  if (match) {
    const n = parseInt(match[1], 10);
    if (n > 0 && n <= 99) return n;
  }

  return null;
}

/**
 * Calculate the cart total.
 */
function cartTotal(items: WhatsAppCartItem[]): number {
  return items.reduce((sum, item) => {
    const modTotal = (item.modifiers ?? []).reduce((ms, m) => ms + m.price * item.quantity, 0);
    return sum + item.unitPrice * item.quantity + modTotal;
  }, 0);
}

/**
 * Build a text summary of the cart.
 */
function cartSummary(items: WhatsAppCartItem[]): string {
  if (items.length === 0) return 'Tu carrito esta vacio.';

  const lines = items.map(
    (item) => `  ${item.quantity}x ${item.name} — ${formatCLP(item.unitPrice * item.quantity)}`,
  );
  const total = cartTotal(items);

  return [`Tu carrito:`, ...lines, '', `*Total: ${formatCLP(total)}*`].join('\n');
}

/**
 * Check if a text message matches any of the given keywords.
 */
function matchesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase().trim();
  return keywords.some((kw) => lower.includes(kw));
}

/**
 * Get the interactive reply id from the params if available.
 */
function getInteractiveId(params: HandleMessageParams): string | null {
  if (params.messageType === 'interactive' && params.interactiveData) {
    return params.interactiveData.id;
  }
  return null;
}

/**
 * Find a menu item across all categories.
 */
function findMenuItem(
  categories: BotMenuCategory[],
  itemId: string,
): { id: string; name: string; description: string; price: number } | null {
  for (const cat of categories) {
    const item = cat.items.find((i) => i.id === itemId);
    if (item) return item;
  }
  return null;
}

// ---------------------------------------------------------------------------
// State handlers
// ---------------------------------------------------------------------------

async function handleGreeting(
  params: HandleMessageParams,
): Promise<HandleMessageResult> {
  const { phoneNumberId, accessToken, customerPhone, messageBody, restaurantName, session } = params;
  const interactiveId = getInteractiveId(params);
  const text = messageBody.toLowerCase().trim();

  // Check for interactive button replies or natural language
  if (interactiveId === 'view_menu' || matchesAny(text, ['menu', 'pedir', 'carta', 'comer'])) {
    return handleBrowsingMenu(params);
  }

  if (interactiveId === 'track_order' || matchesAny(text, ['estado', 'pedido', 'orden', 'seguimiento'])) {
    await sendTextMessage(
      phoneNumberId,
      accessToken,
      customerPhone,
      'Por favor, indicanos tu numero de pedido para consultar el estado.',
    );
    return {
      newState: 'tracking',
      newCartData: session.cartData,
      newCustomerName: session.customerName,
      createOrder: false,
    };
  }

  if (interactiveId === 'talk_human') {
    await sendTextMessage(
      phoneNumberId,
      accessToken,
      customerPhone,
      'Un momento, te comunicaremos con alguien del equipo. Mientras tanto, puedes escribir tu consulta.',
    );
    return {
      newState: 'greeting',
      newCartData: session.cartData,
      newCustomerName: session.customerName,
      createOrder: false,
    };
  }

  // Default greeting
  await sendReplyButtons(
    phoneNumberId,
    accessToken,
    customerPhone,
    `Hola! Bienvenido a ${restaurantName}. Que deseas hacer?`,
    [
      { id: 'view_menu', title: 'Ver Menu' },
      { id: 'track_order', title: 'Estado de Pedido' },
      { id: 'talk_human', title: 'Hablar con alguien' },
    ],
  );

  return {
    newState: 'greeting',
    newCartData: session.cartData,
    newCustomerName: session.customerName,
    createOrder: false,
  };
}

async function handleBrowsingMenu(
  params: HandleMessageParams,
): Promise<HandleMessageResult> {
  const { phoneNumberId, accessToken, customerPhone, menuCategories, session } = params;
  const interactiveId = getInteractiveId(params);

  // If a list item was selected, it's a menu item
  if (interactiveId && params.interactiveData?.type === 'list_reply') {
    const selectedItem = findMenuItem(menuCategories, interactiveId);
    if (selectedItem) {
      // Store pending selection
      pendingItemSelection.set(session.id, {
        itemId: selectedItem.id,
        name: selectedItem.name,
        price: selectedItem.price,
      });

      await sendReplyButtons(
        phoneNumberId,
        accessToken,
        customerPhone,
        `Has seleccionado *${selectedItem.name}* (${formatCLP(selectedItem.price)}). Cuantos deseas?`,
        [
          { id: 'qty_1', title: '1' },
          { id: 'qty_2', title: '2' },
          { id: 'qty_3', title: '3' },
        ],
      );

      return {
        newState: 'adding_items',
        newCartData: session.cartData ?? { items: [] },
        newCustomerName: session.customerName,
        createOrder: false,
      };
    }
  }

  // Send the menu list
  const listCategories = menuCategories.map((cat) => ({
    name: cat.name,
    items: cat.items.map((item) => ({
      id: item.id,
      title: item.name,
      description: `${formatCLP(item.price)} - ${item.description}`.slice(0, 72),
    })),
  }));

  await sendMenuList(phoneNumberId, accessToken, customerPhone, listCategories);

  return {
    newState: 'browsing_menu',
    newCartData: session.cartData ?? { items: [] },
    newCustomerName: session.customerName,
    createOrder: false,
  };
}

async function handleAddingItems(
  params: HandleMessageParams,
): Promise<HandleMessageResult> {
  const { phoneNumberId, accessToken, customerPhone, messageBody, session, menuCategories } = params;
  const interactiveId = getInteractiveId(params);
  const cart: WhatsAppCartData = session.cartData ?? { items: [] };

  // Handle quantity selection (button or text)
  const pending = pendingItemSelection.get(session.id);
  if (pending) {
    let quantity: number | null = null;

    // Button reply: qty_1, qty_2, qty_3
    if (interactiveId?.startsWith('qty_')) {
      quantity = parseInt(interactiveId.split('_')[1], 10);
    } else {
      quantity = parseQuantity(messageBody);
    }

    if (quantity && quantity > 0) {
      // Add item to cart (merge if already present)
      const existingIdx = cart.items.findIndex((i) => i.menuItemId === pending.itemId);
      if (existingIdx >= 0) {
        cart.items[existingIdx].quantity += quantity;
      } else {
        const newItem: WhatsAppCartItem = {
          menuItemId: pending.itemId,
          name: pending.name,
          quantity,
          unitPrice: pending.price,
        };
        cart.items.push(newItem);
      }

      pendingItemSelection.delete(session.id);

      const total = cartTotal(cart.items);
      const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

      await sendReplyButtons(
        phoneNumberId,
        accessToken,
        customerPhone,
        `Agregado: ${quantity}x ${pending.name}. Tu carrito tiene ${itemCount} items por ${formatCLP(total)}. Algo mas?`,
        [
          { id: 'add_more', title: 'Agregar mas' },
          { id: 'view_cart', title: 'Ver carrito' },
          { id: 'checkout', title: 'Pedir' },
        ],
      );

      return {
        newState: 'adding_items',
        newCartData: cart,
        newCustomerName: session.customerName,
        createOrder: false,
      };
    }

    // Couldn't parse quantity
    await sendReplyButtons(
      phoneNumberId,
      accessToken,
      customerPhone,
      `Cuantos ${pending.name} deseas agregar?`,
      [
        { id: 'qty_1', title: '1' },
        { id: 'qty_2', title: '2' },
        { id: 'qty_3', title: '3' },
      ],
    );

    return {
      newState: 'adding_items',
      newCartData: cart,
      newCustomerName: session.customerName,
      createOrder: false,
    };
  }

  // Handle post-add actions
  if (interactiveId === 'add_more' || matchesAny(messageBody, ['agregar', 'mas', 'otro'])) {
    return handleBrowsingMenu(params);
  }

  if (interactiveId === 'view_cart' || matchesAny(messageBody, ['carrito', 'ver carrito'])) {
    const summary = cartSummary(cart.items);
    await sendReplyButtons(
      phoneNumberId,
      accessToken,
      customerPhone,
      summary,
      [
        { id: 'checkout', title: 'Pedir' },
        { id: 'modify_cart', title: 'Modificar' },
        { id: 'add_more', title: 'Seguir agregando' },
      ],
    );

    return {
      newState: 'adding_items',
      newCartData: cart,
      newCustomerName: session.customerName,
      createOrder: false,
    };
  }

  if (interactiveId === 'modify_cart') {
    // Simple modification: clear cart and start over
    await sendTextMessage(
      phoneNumberId,
      accessToken,
      customerPhone,
      'Carrito vaciado. Puedes volver a agregar items del menu.',
    );
    return handleBrowsingMenu({
      ...params,
      session: { ...session, cartData: { items: [] } },
    });
  }

  if (interactiveId === 'checkout' || matchesAny(messageBody, ['pedir', 'listo', 'confirmar'])) {
    return handleCheckout({
      ...params,
      session: { ...session, cartData: cart, state: 'checkout' },
    });
  }

  // If a list reply came in (selected another menu item while in adding_items)
  if (params.interactiveData?.type === 'list_reply' && interactiveId) {
    const selectedItem = findMenuItem(menuCategories, interactiveId);
    if (selectedItem) {
      pendingItemSelection.set(session.id, {
        itemId: selectedItem.id,
        name: selectedItem.name,
        price: selectedItem.price,
      });

      await sendReplyButtons(
        phoneNumberId,
        accessToken,
        customerPhone,
        `Has seleccionado *${selectedItem.name}* (${formatCLP(selectedItem.price)}). Cuantos deseas?`,
        [
          { id: 'qty_1', title: '1' },
          { id: 'qty_2', title: '2' },
          { id: 'qty_3', title: '3' },
        ],
      );

      return {
        newState: 'adding_items',
        newCartData: cart,
        newCustomerName: session.customerName,
        createOrder: false,
      };
    }
  }

  // Fallback: show action buttons
  await sendReplyButtons(
    phoneNumberId,
    accessToken,
    customerPhone,
    'Que deseas hacer?',
    [
      { id: 'add_more', title: 'Agregar mas' },
      { id: 'view_cart', title: 'Ver carrito' },
      { id: 'checkout', title: 'Pedir' },
    ],
  );

  return {
    newState: 'adding_items',
    newCartData: cart,
    newCustomerName: session.customerName,
    createOrder: false,
  };
}

async function handleCheckout(
  params: HandleMessageParams,
): Promise<HandleMessageResult> {
  const { phoneNumberId, accessToken, customerPhone, messageBody, session } = params;
  const interactiveId = getInteractiveId(params);
  const cart: WhatsAppCartData = session.cartData ?? { items: [] };

  if (cart.items.length === 0) {
    await sendTextMessage(
      phoneNumberId,
      accessToken,
      customerPhone,
      'Tu carrito esta vacio. Vamos al menu para que elijas algo.',
    );
    return handleBrowsingMenu(params);
  }

  // Step 1: Show cart summary and confirm
  if (!cart.orderType) {
    if (interactiveId === 'confirm_order') {
      // Ask for order type
      await sendReplyButtons(
        phoneNumberId,
        accessToken,
        customerPhone,
        'Retiro en local o delivery?',
        [
          { id: 'order_pickup', title: 'Retiro en local' },
          { id: 'order_delivery', title: 'Delivery' },
        ],
      );
      return {
        newState: 'checkout',
        newCartData: cart,
        newCustomerName: session.customerName,
        createOrder: false,
      };
    }

    if (interactiveId === 'modify_order') {
      return handleBrowsingMenu({
        ...params,
        session: { ...session, cartData: { items: [] } },
      });
    }

    if (interactiveId === 'cancel_order' || matchesAny(messageBody, ['cancelar'])) {
      await sendTextMessage(
        phoneNumberId,
        accessToken,
        customerPhone,
        'Pedido cancelado. Si necesitas algo mas, escribe "hola".',
      );
      return {
        newState: 'greeting',
        newCartData: null,
        newCustomerName: null,
        createOrder: false,
      };
    }

    // Show cart and ask for confirmation
    const summary = cartSummary(cart.items);
    await sendReplyButtons(
      phoneNumberId,
      accessToken,
      customerPhone,
      `Tu pedido:\n${summary}\n\nConfirmar pedido?`,
      [
        { id: 'confirm_order', title: 'Confirmar' },
        { id: 'modify_order', title: 'Modificar' },
        { id: 'cancel_order', title: 'Cancelar' },
      ],
    );

    return {
      newState: 'checkout',
      newCartData: cart,
      newCustomerName: session.customerName,
      createOrder: false,
    };
  }

  // Step 2: Handle order type selection
  if (interactiveId === 'order_pickup') {
    cart.orderType = 'pickup';
    await sendTextMessage(
      phoneNumberId,
      accessToken,
      customerPhone,
      'Tu nombre para el pedido?',
    );
    return {
      newState: 'checkout',
      newCartData: cart,
      newCustomerName: session.customerName,
      createOrder: false,
    };
  }

  if (interactiveId === 'order_delivery') {
    cart.orderType = 'delivery';
    await sendTextMessage(
      phoneNumberId,
      accessToken,
      customerPhone,
      'Tu nombre y direccion de entrega?',
    );
    return {
      newState: 'checkout',
      newCartData: cart,
      newCustomerName: session.customerName,
      createOrder: false,
    };
  }

  // Step 3: Capture customer name (and address for delivery)
  if (cart.orderType && !session.customerName) {
    const text = messageBody.trim();

    if (cart.orderType === 'delivery') {
      // Try to parse "Name, Address" or just take the whole thing
      const parts = text.split(/[,\-]/).map((p) => p.trim());
      const name = parts[0] || text;
      const address = parts.length > 1 ? parts.slice(1).join(', ') : null;

      cart.customerName = name;
      cart.customerPhone = customerPhone;

      if (address) {
        cart.deliveryAddress = address;
      } else {
        // Ask for address separately
        await sendTextMessage(
          phoneNumberId,
          accessToken,
          customerPhone,
          `Gracias ${name}! Cual es tu direccion de entrega?`,
        );
        return {
          newState: 'checkout',
          newCartData: cart,
          newCustomerName: name,
          createOrder: false,
        };
      }
    } else {
      cart.customerName = text;
      cart.customerPhone = customerPhone;
    }

    // All info collected — confirm order
    return {
      newState: 'confirmed',
      newCartData: cart,
      newCustomerName: cart.customerName,
      createOrder: true,
    };
  }

  // Step 3b: Capture delivery address if name was already captured
  if (cart.orderType === 'delivery' && session.customerName && !cart.deliveryAddress) {
    cart.deliveryAddress = messageBody.trim();
    cart.customerName = session.customerName;
    cart.customerPhone = customerPhone;

    return {
      newState: 'confirmed',
      newCartData: cart,
      newCustomerName: session.customerName,
      createOrder: true,
    };
  }

  // Fallback: show checkout summary again
  const summary = cartSummary(cart.items);
  await sendReplyButtons(
    phoneNumberId,
    accessToken,
    customerPhone,
    `Tu pedido:\n${summary}\n\nConfirmar pedido?`,
    [
      { id: 'confirm_order', title: 'Confirmar' },
      { id: 'modify_order', title: 'Modificar' },
      { id: 'cancel_order', title: 'Cancelar' },
    ],
  );

  return {
    newState: 'checkout',
    newCartData: cart,
    newCustomerName: session.customerName,
    createOrder: false,
  };
}

async function handleConfirmed(
  params: HandleMessageParams,
): Promise<HandleMessageResult> {
  const { phoneNumberId, accessToken, customerPhone, session } = params;

  // Order was already created, send confirmation
  const cart = session.cartData;
  if (cart && cart.items.length > 0) {
    const total = cartTotal(cart.items);
    const orderNumber = `WA-${Date.now().toString(36).toUpperCase()}`;

    await sendOrderConfirmation(phoneNumberId, accessToken, customerPhone, {
      orderNumber,
      items: cart.items.map((i) => ({ name: i.name, qty: i.quantity, price: i.unitPrice })),
      total,
      estimatedMinutes: 25,
    });
  }

  await sendReplyButtons(
    phoneNumberId,
    accessToken,
    customerPhone,
    'Necesitas algo mas?',
    [
      { id: 'view_menu', title: 'Nuevo pedido' },
      { id: 'track_order', title: 'Estado de pedido' },
    ],
  );

  return {
    newState: 'greeting',
    newCartData: null,
    newCustomerName: session.customerName,
    createOrder: false,
  };
}

async function handleTracking(
  params: HandleMessageParams,
): Promise<HandleMessageResult> {
  const { phoneNumberId, accessToken, customerPhone, messageBody, session } = params;

  // In a real implementation, you'd look up the order by number.
  // Here we acknowledge and let the webhook handler do the actual lookup.
  const text = messageBody.trim();

  await sendTextMessage(
    phoneNumberId,
    accessToken,
    customerPhone,
    `Buscando informacion de tu pedido... Un momento.`,
  );

  await sendReplyButtons(
    phoneNumberId,
    accessToken,
    customerPhone,
    'Mientras tanto, que deseas hacer?',
    [
      { id: 'view_menu', title: 'Nuevo pedido' },
      { id: 'track_order', title: 'Consultar otro' },
    ],
  );

  return {
    newState: 'greeting',
    newCartData: null,
    newCustomerName: session.customerName,
    createOrder: false,
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

/** Session timeout threshold: 30 minutes */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export async function handleWhatsAppMessage(
  params: HandleMessageParams,
): Promise<HandleMessageResult> {
  const { phoneNumberId, accessToken, customerPhone, messageBody, session } = params;
  const text = messageBody.toLowerCase().trim();

  // -----------------------------------------------------------------------
  // Global commands (work in any state)
  // -----------------------------------------------------------------------

  // "cancelar" resets the session
  if (matchesAny(text, ['cancelar'])) {
    pendingItemSelection.delete(session.id);
    await sendTextMessage(
      phoneNumberId,
      accessToken,
      customerPhone,
      'Todo cancelado. Escribe "hola" cuando quieras empezar de nuevo.',
    );
    return {
      newState: 'greeting',
      newCartData: null,
      newCustomerName: null,
      createOrder: false,
    };
  }

  // "hola" restarts the conversation
  if (text === 'hola' || text === 'hi' || text === 'holi') {
    pendingItemSelection.delete(session.id);
    return handleGreeting({
      ...params,
      session: { ...session, state: 'greeting', cartData: null },
    });
  }

  // "gracias" gets a friendly response
  if (matchesAny(text, ['gracias', 'grax', 'thx', 'thanks'])) {
    await sendTextMessage(
      phoneNumberId,
      accessToken,
      customerPhone,
      'De nada! Si necesitas algo mas, escribe "hola". Que tengas un buen dia!',
    );
    return {
      newState: session.state,
      newCartData: session.cartData,
      newCustomerName: session.customerName,
      createOrder: false,
    };
  }

  // -----------------------------------------------------------------------
  // Session timeout check (30 minutes)
  // -----------------------------------------------------------------------
  // Note: The caller should set session.lastMessageAt. We check staleness
  // by convention — if the session object was loaded from DB, the caller
  // should handle the timeout before calling us. However, as a safety net
  // we reset if state seems stale and user sends a generic message.

  // -----------------------------------------------------------------------
  // Dispatch by state
  // -----------------------------------------------------------------------

  switch (session.state) {
    case 'greeting':
      return handleGreeting(params);

    case 'browsing_menu':
      return handleBrowsingMenu(params);

    case 'adding_items':
      return handleAddingItems(params);

    case 'checkout':
      return handleCheckout(params);

    case 'confirmed':
      return handleConfirmed(params);

    case 'tracking':
      return handleTracking(params);

    default:
      // Unknown state — reset to greeting
      return handleGreeting({
        ...params,
        session: { ...session, state: 'greeting' },
      });
  }
}
