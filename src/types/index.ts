// Organization & Auth
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  organizationId?: string;
}

export type UserRole =
  | "super_admin"
  | "owner"
  | "admin"
  | "chef"
  | "waiter"
  | "cashier";

// Menu
export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  prepTimeMinutes: number;
  ingredients: string[];
  allergens: string[];
  station: Station;
  isAvailable: boolean;
  modifiers?: MenuModifier[];
}

export interface MenuModifier {
  id: string;
  name: string;
  priceAdjustment: number;
  isDefault: boolean;
}

export type Station = "kitchen" | "bar" | "grill" | "dessert";

// Orders
export interface Order {
  id: string;
  organizationId: string;
  branchId: string;
  source: OrderSource;
  type: OrderType;
  status: OrderStatus;
  customerName?: string;
  customerPhone?: string;
  pickupTime?: Date;
  tableId?: string;
  tableName?: string;
  externalOrderId?: string;
  paymentStatus: PaymentStatus;
  subtotal: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
  notes?: string;
  scheduledAt?: Date;
  estimatedReadyAt?: Date;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export type OrderSource =
  | "web"
  | "qr_table"
  | "uber_eats"
  | "rappi"
  | "whatsapp"
  | "pos_inhouse";

export type OrderType =
  | "dine_in"
  | "takeaway"
  | "pickup_scheduled"
  | "delivery";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "refunded";

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers: { name: string; price: number }[];
  station: Station;
  notes?: string;
  ingredients?: string[];
}

// Tables
export interface Table {
  id: string;
  branchId: string;
  number: number;
  zone: string;
  capacity: number;
  status: TableStatus;
  qrCode?: string;
}

export type TableStatus = "available" | "occupied" | "reserved" | "cleaning";

// Inventory
export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  cost: number;
  supplier?: string;
}

// KDS specific
export interface KDSOrder extends Order {
  countdownSeconds: number;
  totalSeconds: number;
  percentRemaining: number;
}

// Cart
export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedModifiers: MenuModifier[];
  notes?: string;
  totalPrice: number;
}

// Dashboard stats
export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  avgPrepTime: number;
  revenueChange: number;
  ordersChange: number;
  prepTimeChange: number;
}

// Restaurant
export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  theme: string;
  primaryColor: string;
  secondaryColor: string;
  address?: string;
  phone?: string;
  currency: string;
  customDomain?: string;
}

// Payment Gateway
export type PaymentGateway = 'mercadopago' | 'transbank';

export interface PaymentGatewayConfig {
  id: string;
  organizationId: string;
  gateway: PaymentGateway;
  credentials: Record<string, string>;
  isActive: boolean;
  isSandbox: boolean;
  lastTestedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Storefront Config (public, no secrets)
export interface StorefrontConfig {
  restaurantName: string;
  theme: {
    key: string;
    name: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      bg: string;
      surface: string;
      text: string;
      textMuted: string;
    };
    font: string;
    radius: string;
  };
  availableGateways: PaymentGateway[];
  currency: string;
}

// Storefront Analytics
export type StorefrontEventType = 'page_view' | 'menu_view' | 'item_click' | 'order_placed' | 'checkout_started';

export interface StorefrontEvent {
  id: string;
  restaurantId: string;
  eventType: StorefrontEventType;
  metadata?: Record<string, unknown>;
  sessionId?: string;
  createdAt: Date;
}

// Delivery Platforms
export type DeliveryPlatform = 'uber_eats' | 'rappi' | 'whatsapp';

export interface DeliveryPlatformConfig {
  id: string;
  organizationId: string;
  platform: DeliveryPlatform;
  credentials: Record<string, string>;
  externalStoreId?: string;
  webhookSecret?: string;
  isActive: boolean;
  isSandbox: boolean;
  metadata?: Record<string, unknown>;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// WhatsApp Session
export type WhatsAppSessionState = 'greeting' | 'browsing_menu' | 'adding_items' | 'checkout' | 'confirmed' | 'tracking';

export interface WhatsAppSession {
  id: string;
  restaurantId: string;
  customerPhone: string;
  state: WhatsAppSessionState;
  cartData?: WhatsAppCartData;
  customerName?: string;
  lastMessageAt: Date;
  createdAt: Date;
}

export interface WhatsAppCartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers?: { name: string; price: number }[];
}

export interface WhatsAppCartData {
  items: WhatsAppCartItem[];
  orderType?: 'pickup' | 'delivery';
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  notes?: string;
}

// External order structures
export interface UberEatsExternalOrder {
  id: string;
  display_id: string;
  store: { id: string; name: string };
  eater: { first_name: string; phone: string };
  cart: {
    items: {
      title: string;
      quantity: number;
      price: { unit_price: { amount: number; currency_code: string } };
      selected_modifier_groups?: {
        items: { title: string; price: { unit_price: { amount: number } }; quantity: number }[];
      }[];
      external_data?: string;
    }[];
  };
  payment: { charges: { total: { amount: number }; sub_total: { amount: number }; tax: { amount: number } } };
  type: string;
  estimated_ready_for_pickup_at?: string;
}

export interface RappiExternalOrder {
  order_id: string;
  store_id: string;
  client: { name: string; phone: string };
  items: {
    name: string;
    quantity: number;
    unit_price: number;
    toppings?: { name: string; price: number }[];
    external_id?: string;
  }[];
  total_value: number;
  subtotal: number;
  taxes: number;
  delivery_type: string;
  created_at: string;
}
