import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  date,
  time,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccountType } from '@auth/core/adapters';

// ─── Enums ──────────────────────────────────────────────────────────────────

export const orderSourceEnum = pgEnum('order_source', [
  'web',
  'qr_table',
  'uber_eats',
  'rappi',
  'whatsapp',
  'pos_inhouse',
]);

export const orderTypeEnum = pgEnum('order_type', [
  'dine_in',
  'takeaway',
  'pickup_scheduled',
  'delivery',
]);

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'served',
  'completed',
  'cancelled',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'refunded',
]);

export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'owner',
  'admin',
  'chef',
  'waiter',
  'cashier',
]);

export const stationEnum = pgEnum('station', [
  'kitchen',
  'bar',
  'grill',
  'dessert',
]);

export const invoiceTypeEnum = pgEnum('invoice_type', [
  'boleta',
  'factura',
  'nota_credito',
  'nota_debito',
]);

export const siiStatusEnum = pgEnum('sii_status', [
  'pending',
  'sent',
  'accepted',
  'rejected',
]);

export const subscriptionPlanEnum = pgEnum('subscription_plan', [
  'starter',
  'pro',
  'enterprise',
]);

export const tableStatusEnum = pgEnum('table_status', [
  'available',
  'occupied',
  'reserved',
  'cleaning',
]);

export const reservationStatusEnum = pgEnum('reservation_status', [
  'pending',
  'confirmed',
  'seated',
  'completed',
  'cancelled',
  'no_show',
]);

export const paymentGatewayEnum = pgEnum('payment_gateway', [
  'mercadopago',
  'transbank',
]);

export const storefrontEventTypeEnum = pgEnum('storefront_event_type', [
  'page_view',
  'menu_view',
  'item_click',
  'order_placed',
  'checkout_started',
]);

export const deliveryPlatformEnum = pgEnum('delivery_platform', [
  'uber_eats',
  'rappi',
  'whatsapp',
]);

export const whatsappSessionStateEnum = pgEnum('whatsapp_session_state', [
  'greeting',
  'browsing_menu',
  'adding_items',
  'checkout',
  'confirmed',
  'tracking',
]);

// ─── Public: Organizations & Subscriptions ──────────────────────────────────

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    logoUrl: text('logo_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('organizations_slug_idx').on(t.slug)],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    plan: subscriptionPlanEnum('plan').notNull(),
    status: text('status').notNull().default('active'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('subscriptions_org_idx').on(t.organizationId)],
);

// ─── NextAuth.js Tables ─────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('email_verified', { mode: 'date', withTimezone: true }),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ─── Tenant: Restaurants & Branches ─────────────────────────────────────────

export const restaurants = pgTable(
  'restaurants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    logoUrl: text('logo_url'),
    bannerUrl: text('banner_url'),
    theme: text('theme'),
    primaryColor: text('primary_color'),
    secondaryColor: text('secondary_color'),
    address: text('address'),
    phone: text('phone'),
    email: text('email'),
    website: text('website'),
    currency: text('currency').notNull().default('CLP'),
    timezone: text('timezone').notNull().default('America/Santiago'),
    customDomain: text('custom_domain'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('restaurants_slug_idx').on(t.slug),
    uniqueIndex('restaurants_custom_domain_idx').on(t.customDomain),
    index('restaurants_org_idx').on(t.organizationId),
  ],
);

export const branches = pgTable(
  'branches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    address: text('address'),
    phone: text('phone'),
    isActive: boolean('is_active').notNull().default(true),
    operatingHours: jsonb('operating_hours'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('branches_org_idx').on(t.organizationId),
    index('branches_restaurant_idx').on(t.restaurantId),
  ],
);

// ─── Tenant: Staff ──────────────────────────────────────────────────────────

export const staffMembers = pgTable(
  'staff_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('staff_org_idx').on(t.organizationId),
    index('staff_branch_idx').on(t.branchId),
    index('staff_user_idx').on(t.userId),
  ],
);

// ─── Tenant: Menu ───────────────────────────────────────────────────────────

export const menuCategories = pgTable(
  'menu_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    displayOrder: integer('display_order').notNull().default(0),
    imageUrl: text('image_url'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('menu_categories_org_idx').on(t.organizationId),
    index('menu_categories_restaurant_idx').on(t.restaurantId),
  ],
);

export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => menuCategories.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    imageUrl: text('image_url'),
    prepTimeMinutes: integer('prep_time_minutes'),
    ingredients: jsonb('ingredients'),
    allergens: jsonb('allergens'),
    station: stationEnum('station'),
    isAvailable: boolean('is_available').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('menu_items_org_idx').on(t.organizationId),
    index('menu_items_category_idx').on(t.categoryId),
  ],
);

export const menuModifiers = pgTable(
  'menu_modifiers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    menuItemId: uuid('menu_item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    priceAdjustment: decimal('price_adjustment', { precision: 10, scale: 2 }).notNull().default('0'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('menu_modifiers_org_idx').on(t.organizationId),
    index('menu_modifiers_item_idx').on(t.menuItemId),
  ],
);

// ─── Tenant: Tables ─────────────────────────────────────────────────────────

export const tables = pgTable(
  'tables',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    zone: text('zone'),
    capacity: integer('capacity').notNull(),
    status: tableStatusEnum('status').notNull().default('available'),
    qrCode: text('qr_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('tables_org_idx').on(t.organizationId),
    index('tables_branch_idx').on(t.branchId),
  ],
);

// ─── Tenant: Orders ─────────────────────────────────────────────────────────

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    source: orderSourceEnum('source').notNull(),
    type: orderTypeEnum('type').notNull(),
    status: orderStatusEnum('status').notNull().default('pending'),
    customerName: text('customer_name'),
    customerPhone: text('customer_phone'),
    customerEmail: text('customer_email'),
    pickupTime: timestamp('pickup_time', { withTimezone: true }),
    tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
    externalOrderId: text('external_order_id'),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
    paymentMethod: text('payment_method'),
    subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
    tax: decimal('tax', { precision: 10, scale: 2 }).notNull().default('0'),
    tip: decimal('tip', { precision: 10, scale: 2 }).notNull().default('0'),
    discount: decimal('discount', { precision: 10, scale: 2 }).notNull().default('0'),
    total: decimal('total', { precision: 10, scale: 2 }).notNull().default('0'),
    notes: text('notes'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    estimatedReadyAt: timestamp('estimated_ready_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('orders_org_idx').on(t.organizationId),
    index('orders_branch_idx').on(t.branchId),
    index('orders_status_idx').on(t.status),
    index('orders_created_idx').on(t.createdAt),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    menuItemId: uuid('menu_item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
    modifiers: jsonb('modifiers'),
    station: stationEnum('station'),
    notes: text('notes'),
  },
  (t) => [
    index('order_items_order_idx').on(t.orderId),
    index('order_items_station_idx').on(t.station),
  ],
);

// ─── Tenant: Reservations ───────────────────────────────────────────────────

export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone'),
    customerEmail: text('customer_email'),
    partySize: integer('party_size').notNull(),
    date: date('date').notNull(),
    time: time('time').notNull(),
    status: reservationStatusEnum('status').notNull().default('pending'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('reservations_org_idx').on(t.organizationId),
    index('reservations_branch_idx').on(t.branchId),
    index('reservations_date_idx').on(t.date),
  ],
);

// ─── Tenant: Inventory ──────────────────────────────────────────────────────

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    unit: text('unit').notNull(),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('0'),
    minQuantity: decimal('min_quantity', { precision: 10, scale: 2 }).notNull().default('0'),
    cost: decimal('cost', { precision: 10, scale: 2 }),
    supplier: text('supplier'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('inventory_items_org_idx').on(t.organizationId),
    index('inventory_items_branch_idx').on(t.branchId),
  ],
);

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    inventoryItemId: uuid('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
    reason: text('reason'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('inventory_movements_org_idx').on(t.organizationId),
    index('inventory_movements_item_idx').on(t.inventoryItemId),
  ],
);

// ─── Tenant: Payments ───────────────────────────────────────────────────────

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    method: text('method').notNull(),
    externalReference: text('external_reference'),
    gatewayData: jsonb('gateway_data'),
    status: paymentStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('payments_org_idx').on(t.organizationId),
    index('payments_order_idx').on(t.orderId),
  ],
);

// ─── Tenant: Invoices (SII Chile) ───────────────────────────────────────────

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    type: invoiceTypeEnum('type').notNull(),
    folio: text('folio'),
    xmlContent: text('xml_content'),
    pdfUrl: text('pdf_url'),
    siiStatus: siiStatusEnum('sii_status').notNull().default('pending'),
    siiTrackId: text('sii_track_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('invoices_org_idx').on(t.organizationId),
    index('invoices_order_idx').on(t.orderId),
  ],
);

// ─── Tenant: Reports ────────────────────────────────────────────────────────

export const dailyReports = pgTable(
  'daily_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    totalRevenue: decimal('total_revenue', { precision: 10, scale: 2 }).notNull().default('0'),
    totalOrders: integer('total_orders').notNull().default(0),
    avgPrepTime: decimal('avg_prep_time', { precision: 10, scale: 2 }),
    topItems: jsonb('top_items'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('daily_reports_org_idx').on(t.organizationId),
    index('daily_reports_branch_idx').on(t.branchId),
    index('daily_reports_date_idx').on(t.date),
  ],
);

// ─── Tenant: Audit Log ──────────────────────────────────────────────────────

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    details: jsonb('details'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('audit_log_org_idx').on(t.organizationId),
    index('audit_log_user_idx').on(t.userId),
    index('audit_log_created_idx').on(t.createdAt),
  ],
);

// ─── Tenant: Payment Gateway Configs ─────────────────────────────────────────

export const paymentGatewayConfigs = pgTable(
  'payment_gateway_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    gateway: paymentGatewayEnum('gateway').notNull(),
    credentials: text('credentials').notNull(),
    isActive: boolean('is_active').notNull().default(false),
    isSandbox: boolean('is_sandbox').notNull().default(true),
    lastTestedAt: timestamp('last_tested_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('payment_gateway_configs_org_gateway_idx').on(t.organizationId, t.gateway),
    index('payment_gateway_configs_org_idx').on(t.organizationId),
  ],
);

// ─── Tenant: Delivery Platform Configs ─────────────────────────────────────

export const deliveryPlatformConfigs = pgTable(
  'delivery_platform_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    platform: deliveryPlatformEnum('platform').notNull(),
    credentials: text('credentials').notNull(),
    externalStoreId: text('external_store_id'),
    webhookSecret: text('webhook_secret'),
    isActive: boolean('is_active').notNull().default(false),
    isSandbox: boolean('is_sandbox').notNull().default(true),
    metadata: jsonb('metadata'),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('delivery_platform_configs_org_platform_idx').on(t.organizationId, t.platform),
    index('delivery_platform_configs_org_idx').on(t.organizationId),
  ],
);

// ─── Tenant: WhatsApp Sessions ─────────────────────────────────────────────

export const whatsappSessions = pgTable(
  'whatsapp_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    customerPhone: text('customer_phone').notNull(),
    state: whatsappSessionStateEnum('state').notNull().default('greeting'),
    cartData: jsonb('cart_data'),
    customerName: text('customer_name'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('whatsapp_sessions_restaurant_phone_idx').on(t.restaurantId, t.customerPhone),
    index('whatsapp_sessions_last_message_idx').on(t.lastMessageAt),
  ],
);

// ─── Tenant: Storefront Events (Analytics) ───────────────────────────────────

export const storefrontEvents = pgTable(
  'storefront_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    eventType: storefrontEventTypeEnum('event_type').notNull(),
    metadata: jsonb('metadata'),
    sessionId: text('session_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('storefront_events_restaurant_idx').on(t.restaurantId),
    index('storefront_events_type_idx').on(t.eventType),
    index('storefront_events_created_idx').on(t.createdAt),
  ],
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const organizationsRelations = relations(organizations, ({ many }) => ({
  subscriptions: many(subscriptions),
  restaurants: many(restaurants),
  branches: many(branches),
  staffMembers: many(staffMembers),
  menuCategories: many(menuCategories),
  menuItems: many(menuItems),
  orders: many(orders),
  tables: many(tables),
  reservations: many(reservations),
  inventoryItems: many(inventoryItems),
  payments: many(payments),
  invoices: many(invoices),
  dailyReports: many(dailyReports),
  auditLog: many(auditLog),
  paymentGatewayConfigs: many(paymentGatewayConfigs),
  deliveryPlatformConfigs: many(deliveryPlatformConfigs),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  staffMembers: many(staffMembers),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [restaurants.organizationId],
    references: [organizations.id],
  }),
  branches: many(branches),
  menuCategories: many(menuCategories),
  storefrontEvents: many(storefrontEvents),
  whatsappSessions: many(whatsappSessions),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [branches.organizationId],
    references: [organizations.id],
  }),
  restaurant: one(restaurants, {
    fields: [branches.restaurantId],
    references: [restaurants.id],
  }),
  staffMembers: many(staffMembers),
  tables: many(tables),
  orders: many(orders),
  reservations: many(reservations),
  inventoryItems: many(inventoryItems),
  dailyReports: many(dailyReports),
}));

export const staffMembersRelations = relations(staffMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [staffMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [staffMembers.userId],
    references: [users.id],
  }),
  branch: one(branches, {
    fields: [staffMembers.branchId],
    references: [branches.id],
  }),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [menuCategories.organizationId],
    references: [organizations.id],
  }),
  restaurant: one(restaurants, {
    fields: [menuCategories.restaurantId],
    references: [restaurants.id],
  }),
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [menuItems.organizationId],
    references: [organizations.id],
  }),
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
  modifiers: many(menuModifiers),
  orderItems: many(orderItems),
}));

export const menuModifiersRelations = relations(menuModifiers, ({ one }) => ({
  organization: one(organizations, {
    fields: [menuModifiers.organizationId],
    references: [organizations.id],
  }),
  menuItem: one(menuItems, {
    fields: [menuModifiers.menuItemId],
    references: [menuItems.id],
  }),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tables.organizationId],
    references: [organizations.id],
  }),
  branch: one(branches, {
    fields: [tables.branchId],
    references: [branches.id],
  }),
  orders: many(orders),
  reservations: many(reservations),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [orders.organizationId],
    references: [organizations.id],
  }),
  branch: one(branches, {
    fields: [orders.branchId],
    references: [branches.id],
  }),
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  items: many(orderItems),
  payments: many(payments),
  invoices: many(invoices),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  organization: one(organizations, {
    fields: [reservations.organizationId],
    references: [organizations.id],
  }),
  branch: one(branches, {
    fields: [reservations.branchId],
    references: [branches.id],
  }),
  table: one(tables, {
    fields: [reservations.tableId],
    references: [tables.id],
  }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [inventoryItems.organizationId],
    references: [organizations.id],
  }),
  branch: one(branches, {
    fields: [inventoryItems.branchId],
    references: [branches.id],
  }),
  movements: many(inventoryMovements),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  organization: one(organizations, {
    fields: [inventoryMovements.organizationId],
    references: [organizations.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [inventoryMovements.inventoryItemId],
    references: [inventoryItems.id],
  }),
  createdByUser: one(users, {
    fields: [inventoryMovements.createdBy],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  organization: one(organizations, {
    fields: [payments.organizationId],
    references: [organizations.id],
  }),
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  order: one(orders, {
    fields: [invoices.orderId],
    references: [orders.id],
  }),
}));

export const dailyReportsRelations = relations(dailyReports, ({ one }) => ({
  organization: one(organizations, {
    fields: [dailyReports.organizationId],
    references: [organizations.id],
  }),
  branch: one(branches, {
    fields: [dailyReports.branchId],
    references: [branches.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLog.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

export const paymentGatewayConfigsRelations = relations(paymentGatewayConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [paymentGatewayConfigs.organizationId],
    references: [organizations.id],
  }),
}));

export const storefrontEventsRelations = relations(storefrontEvents, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [storefrontEvents.restaurantId],
    references: [restaurants.id],
  }),
}));

export const deliveryPlatformConfigsRelations = relations(deliveryPlatformConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [deliveryPlatformConfigs.organizationId],
    references: [organizations.id],
  }),
}));

export const whatsappSessionsRelations = relations(whatsappSessions, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [whatsappSessions.restaurantId],
    references: [restaurants.id],
  }),
}));
