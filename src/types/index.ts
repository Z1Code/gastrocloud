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
}
