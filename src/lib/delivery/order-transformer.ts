import type {
  UberEatsExternalOrder,
  RappiExternalOrder,
  WhatsAppCartData,
  OrderSource,
  OrderType,
} from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransformedOrderData {
  source: OrderSource;
  type: OrderType;
  customerName?: string;
  customerPhone?: string;
  externalOrderId?: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

interface TransformedOrderItemData {
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  modifiers: { name: string; price: number }[];
  station: string;
  notes?: string;
}

export interface TransformResult {
  orderData: TransformedOrderData;
  orderItemsData: TransformedOrderItemData[];
}

interface MenuItemMapEntry {
  id: string;
  price: number;
  station: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a number as Chilean Pesos with dot separator.
 * e.g. 4500 -> "$4.500"
 */
export function formatCLP(amount: number): string {
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${formatted}`;
}

/**
 * Creates a lookup map keyed by lowercase item name for fast matching
 * when transforming external orders.
 */
export function buildMenuItemsMap(
  menuItems: { id: string; name: string; price: string; station: string | null }[],
): Map<string, MenuItemMapEntry> {
  const map = new Map<string, MenuItemMapEntry>();

  for (const item of menuItems) {
    map.set(item.name.toLowerCase(), {
      id: item.id,
      price: parseInt(item.price, 10) || 0,
      station: item.station ?? 'kitchen',
    });
  }

  return map;
}

/**
 * Look up a menu item by name (case-insensitive). Returns the entry or
 * a placeholder with menuItemId 'UNMATCHED'.
 */
function findMenuItem(
  name: string,
  menuItemsMap: Map<string, MenuItemMapEntry>,
): MenuItemMapEntry {
  const key = name.toLowerCase();
  const found = menuItemsMap.get(key);

  if (found) return found;

  return { id: 'UNMATCHED', price: 0, station: 'kitchen' };
}

/**
 * Look up a menu item by name first, then by an external reference ID.
 * Iterates the map values only when name lookup fails and externalRef is provided.
 */
function findMenuItemByNameOrExternal(
  name: string,
  externalRef: string | undefined,
  menuItemsMap: Map<string, MenuItemMapEntry>,
): MenuItemMapEntry {
  // Try name match first
  const byName = menuItemsMap.get(name.toLowerCase());
  if (byName) return byName;

  // Try matching by external_data / external_id against the map entry IDs
  if (externalRef) {
    for (const entry of menuItemsMap.values()) {
      if (entry.id === externalRef) return entry;
    }
  }

  return { id: 'UNMATCHED', price: 0, station: 'kitchen' };
}

// ---------------------------------------------------------------------------
// Transformers
// ---------------------------------------------------------------------------

/**
 * Transforms an Uber Eats external order into GastroCloud internal format.
 *
 * Uber amounts come in the smallest currency unit (centavos). For CLP this is
 * already an integer so no conversion is needed, but we round to be safe.
 */
export function transformUberEatsOrder(
  uberOrder: UberEatsExternalOrder,
  menuItemsMap: Map<string, MenuItemMapEntry>,
): TransformResult {
  const orderItemsData: TransformedOrderItemData[] = uberOrder.cart.items.map(
    (item) => {
      const matched = findMenuItemByNameOrExternal(
        item.title,
        item.external_data,
        menuItemsMap,
      );

      const modifiers: { name: string; price: number }[] = [];
      if (item.selected_modifier_groups) {
        for (const group of item.selected_modifier_groups) {
          for (const mod of group.items) {
            modifiers.push({
              name: mod.title,
              price: Math.round(mod.price.unit_price.amount),
            });
          }
        }
      }

      return {
        menuItemId: matched.id,
        quantity: item.quantity,
        unitPrice: Math.round(item.price.unit_price.amount),
        modifiers,
        station: matched.station,
      };
    },
  );

  const orderData: TransformedOrderData = {
    source: 'uber_eats',
    type: 'delivery',
    customerName: uberOrder.eater.first_name,
    customerPhone: uberOrder.eater.phone,
    externalOrderId: uberOrder.id,
    subtotal: Math.round(uberOrder.payment.charges.sub_total.amount),
    tax: Math.round(uberOrder.payment.charges.tax.amount),
    total: Math.round(uberOrder.payment.charges.total.amount),
    notes: uberOrder.estimated_ready_for_pickup_at
      ? `Uber pickup: ${uberOrder.estimated_ready_for_pickup_at}`
      : undefined,
  };

  return { orderData, orderItemsData };
}

/**
 * Transforms a Rappi external order into GastroCloud internal format.
 *
 * Rappi prices for Chile are already in CLP integers.
 */
export function transformRappiOrder(
  rappiOrder: RappiExternalOrder,
  menuItemsMap: Map<string, MenuItemMapEntry>,
): TransformResult {
  const orderItemsData: TransformedOrderItemData[] = rappiOrder.items.map(
    (item) => {
      const matched = findMenuItemByNameOrExternal(
        item.name,
        item.external_id,
        menuItemsMap,
      );

      const modifiers: { name: string; price: number }[] = [];
      if (item.toppings) {
        for (const topping of item.toppings) {
          modifiers.push({
            name: topping.name,
            price: Math.round(topping.price),
          });
        }
      }

      return {
        menuItemId: matched.id,
        quantity: item.quantity,
        unitPrice: Math.round(item.unit_price),
        modifiers,
        station: matched.station,
      };
    },
  );

  const orderData: TransformedOrderData = {
    source: 'rappi',
    type: 'delivery',
    customerName: rappiOrder.client.name,
    customerPhone: rappiOrder.client.phone,
    externalOrderId: rappiOrder.order_id,
    subtotal: Math.round(rappiOrder.subtotal),
    tax: Math.round(rappiOrder.taxes),
    total: Math.round(rappiOrder.total_value),
  };

  return { orderData, orderItemsData };
}

/**
 * Transforms a WhatsApp cart into GastroCloud internal format.
 *
 * Unlike external platform orders, WhatsApp cart items already contain
 * `menuItemId` references from the bot conversation flow.
 */
export function transformWhatsAppOrder(
  cartData: WhatsAppCartData,
  customerPhone: string,
): TransformResult {
  const orderItemsData: TransformedOrderItemData[] = cartData.items.map(
    (item) => {
      const modifiers: { name: string; price: number }[] = item.modifiers ?? [];
      const modifierTotal = modifiers.reduce((sum, m) => sum + m.price, 0);

      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: Math.round(item.unitPrice),
        modifiers,
        station: 'kitchen', // WhatsApp orders default to kitchen; routed by KDS
        notes: undefined,
      };
    },
  );

  // Calculate totals from items (WhatsApp orders have no platform-level fees)
  const subtotal = orderItemsData.reduce((sum, item) => {
    const itemModTotal = item.modifiers.reduce((ms, m) => ms + m.price, 0);
    return sum + (item.unitPrice + itemModTotal) * item.quantity;
  }, 0);

  const orderType: OrderType =
    cartData.orderType === 'delivery' ? 'delivery' : 'takeaway';

  const orderData: TransformedOrderData = {
    source: 'whatsapp',
    type: orderType,
    customerName: cartData.customerName,
    customerPhone: customerPhone,
    subtotal: Math.round(subtotal),
    tax: 0, // Tax included in price for Chilean restaurants
    total: Math.round(subtotal),
    notes: cartData.notes,
  };

  return { orderData, orderItemsData };
}
