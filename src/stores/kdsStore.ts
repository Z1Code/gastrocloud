import { create } from 'zustand';

export type OrderSource = 'web' | 'qr_table' | 'uber_eats' | 'rappi' | 'whatsapp' | 'pos_inhouse';
export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready';
export type Station = 'kitchen' | 'bar' | 'grill' | 'dessert';

export interface KDSOrderItem {
  id: string;
  name: string;
  quantity: number;
  ingredients: string[];
  modifiers: { name: string; highlighted: boolean }[];
  station: Station;
  notes?: string;
}

export interface KDSOrder {
  id: string;
  orderNumber: string;
  source: OrderSource;
  status: OrderStatus;
  customerName?: string;
  type: 'dine_in' | 'takeaway' | 'pickup_scheduled' | 'delivery';
  tableNumber?: number;
  pickupInfo?: string;
  items: KDSOrderItem[];
  notes?: string;
  createdAt: Date;
  estimatedReadyAt: Date;
  totalSeconds: number;
}

interface KDSStore {
  orders: KDSOrder[];
  activeStation: Station | 'all';
  stats: { avgPrepTime: number; activeOrders: number; completedToday: number };
  setActiveStation: (station: Station | 'all') => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  addOrder: (order: KDSOrder) => void;
  removeOrder: (orderId: string) => void;
}

function minutesFromNow(min: number): Date {
  return new Date(Date.now() + min * 60 * 1000);
}

function minutesAgo(min: number): Date {
  return new Date(Date.now() - min * 60 * 1000);
}

const mockOrders: KDSOrder[] = [
  {
    id: 'ord-001',
    orderNumber: '#0234',
    source: 'uber_eats',
    status: 'pending',
    customerName: 'Carlos M.',
    type: 'delivery',
    pickupInfo: 'Delivery UberEats',
    items: [
      {
        id: 'item-001',
        name: 'Lomo a lo Pobre',
        quantity: 1,
        ingredients: ['Lomo vetado 250g', 'Papas fritas', 'Huevos fritos x2', 'Cebolla caramelizada'],
        modifiers: [{ name: 'Punto medio', highlighted: true }],
        station: 'grill',
      },
      {
        id: 'item-002',
        name: 'Bebida Cola',
        quantity: 2,
        ingredients: [],
        modifiers: [],
        station: 'bar',
      },
    ],
    createdAt: minutesAgo(2),
    estimatedReadyAt: minutesFromNow(18),
    totalSeconds: 1200,
  },
  {
    id: 'ord-002',
    orderNumber: '#0235',
    source: 'qr_table',
    status: 'accepted',
    customerName: 'Mesa 4',
    type: 'dine_in',
    tableNumber: 4,
    pickupInfo: 'Mesa #4',
    items: [
      {
        id: 'item-003',
        name: 'Pastel de Choclo',
        quantity: 2,
        ingredients: ['Choclo molido', 'Pino de carne', 'Huevo duro', 'Aceituna'],
        modifiers: [],
        station: 'kitchen',
      },
      {
        id: 'item-004',
        name: 'Ensalada Chilena',
        quantity: 1,
        ingredients: ['Tomate', 'Cebolla', 'Cilantro', 'Aceite de oliva'],
        modifiers: [{ name: 'Sin cilantro', highlighted: true }],
        station: 'kitchen',
      },
    ],
    createdAt: minutesAgo(8),
    estimatedReadyAt: minutesFromNow(7),
    totalSeconds: 900,
  },
  {
    id: 'ord-003',
    orderNumber: '#0236',
    source: 'web',
    status: 'preparing',
    customerName: 'Valentina R.',
    type: 'pickup_scheduled',
    pickupInfo: 'Viene en 20 min',
    items: [
      {
        id: 'item-005',
        name: 'Empanadas de Pino',
        quantity: 3,
        ingredients: ['Masa', 'Pino de carne', 'Huevo', 'Aceituna', 'Pasas'],
        modifiers: [{ name: 'Sin pasas x1', highlighted: true }],
        station: 'kitchen',
      },
    ],
    createdAt: minutesAgo(12),
    estimatedReadyAt: minutesFromNow(3),
    totalSeconds: 900,
  },
  {
    id: 'ord-004',
    orderNumber: '#0237',
    source: 'rappi',
    status: 'pending',
    customerName: 'Diego F.',
    type: 'delivery',
    pickupInfo: 'Delivery Rappi',
    items: [
      {
        id: 'item-006',
        name: 'Churrasco Italiano',
        quantity: 1,
        ingredients: ['Pan', 'Lomo de res', 'Tomate', 'Palta', 'Mayo'],
        modifiers: [{ name: 'Extra palta', highlighted: true }],
        station: 'grill',
      },
      {
        id: 'item-007',
        name: 'Papas Fritas',
        quantity: 1,
        ingredients: ['Papas', 'Sal'],
        modifiers: [],
        station: 'kitchen',
      },
    ],
    createdAt: minutesAgo(1),
    estimatedReadyAt: minutesFromNow(14),
    totalSeconds: 900,
  },
  {
    id: 'ord-005',
    orderNumber: '#0238',
    source: 'whatsapp',
    status: 'accepted',
    customerName: 'Francisca L.',
    type: 'takeaway',
    pickupInfo: 'Retira en local',
    items: [
      {
        id: 'item-008',
        name: 'Cesar Salad con Pollo',
        quantity: 1,
        ingredients: ['Lechuga romana', 'Pollo grillado', 'Crutones', 'Parmesano', 'Salsa cesar'],
        modifiers: [
          { name: 'Sin cebolla', highlighted: true },
          { name: 'Extra limon', highlighted: true },
        ],
        station: 'kitchen',
        notes: 'Alergica a frutos secos',
      },
    ],
    notes: 'Alergica a frutos secos - IMPORTANTE',
    createdAt: minutesAgo(5),
    estimatedReadyAt: minutesFromNow(10),
    totalSeconds: 900,
  },
  {
    id: 'ord-006',
    orderNumber: '#0239',
    source: 'qr_table',
    status: 'preparing',
    type: 'dine_in',
    tableNumber: 7,
    pickupInfo: 'Mesa #7',
    items: [
      {
        id: 'item-009',
        name: 'Pisco Sour',
        quantity: 2,
        ingredients: ['Pisco', 'Limon de pica', 'Jarabe de goma', 'Clara de huevo'],
        modifiers: [],
        station: 'bar',
      },
      {
        id: 'item-010',
        name: 'Michelada',
        quantity: 1,
        ingredients: ['Cerveza', 'Limon', 'Salsa picante', 'Sal'],
        modifiers: [{ name: 'Extra picante', highlighted: true }],
        station: 'bar',
      },
    ],
    createdAt: minutesAgo(4),
    estimatedReadyAt: minutesFromNow(4),
    totalSeconds: 480,
  },
  {
    id: 'ord-007',
    orderNumber: '#0240',
    source: 'pos_inhouse',
    status: 'pending',
    type: 'dine_in',
    tableNumber: 12,
    pickupInfo: 'Mesa #12',
    items: [
      {
        id: 'item-011',
        name: 'Tres Leches',
        quantity: 2,
        ingredients: ['Bizcocho', 'Leche condensada', 'Leche evaporada', 'Crema', 'Merengue'],
        modifiers: [],
        station: 'dessert',
      },
      {
        id: 'item-012',
        name: 'Flan Casero',
        quantity: 1,
        ingredients: ['Huevos', 'Leche', 'Azucar', 'Caramelo'],
        modifiers: [{ name: 'Con helado', highlighted: true }],
        station: 'dessert',
      },
    ],
    createdAt: minutesAgo(1),
    estimatedReadyAt: minutesFromNow(9),
    totalSeconds: 600,
  },
  {
    id: 'ord-008',
    orderNumber: '#0241',
    source: 'web',
    status: 'accepted',
    customerName: 'Andres P.',
    type: 'pickup_scheduled',
    pickupInfo: 'Viene en 30 min',
    items: [
      {
        id: 'item-013',
        name: 'Cazuela de Vacuno',
        quantity: 1,
        ingredients: ['Carne de vacuno', 'Papa', 'Choclo', 'Zapallo', 'Arroz', 'Cilantro'],
        modifiers: [],
        station: 'kitchen',
      },
      {
        id: 'item-014',
        name: 'Pan Amasado',
        quantity: 2,
        ingredients: ['Harina', 'Manteca', 'Sal'],
        modifiers: [],
        station: 'kitchen',
      },
    ],
    createdAt: minutesAgo(3),
    estimatedReadyAt: minutesFromNow(22),
    totalSeconds: 1500,
  },
];

export const useKDSStore = create<KDSStore>((set) => ({
  orders: mockOrders,
  activeStation: 'all',
  stats: { avgPrepTime: 14, activeOrders: mockOrders.length, completedToday: 47 },

  setActiveStation: (station) => set({ activeStation: station }),

  updateOrderStatus: (orderId, status) =>
    set((state) => {
      const orders = state.orders.map((o) =>
        o.id === orderId ? { ...o, status } : o
      );
      const active = orders.filter((o) => o.status !== 'ready');
      return {
        orders,
        stats: {
          ...state.stats,
          activeOrders: active.length,
          completedToday: state.stats.completedToday + (status === 'ready' ? 1 : 0),
        },
      };
    }),

  addOrder: (order) =>
    set((state) => ({
      orders: [order, ...state.orders],
      stats: { ...state.stats, activeOrders: state.stats.activeOrders + 1 },
    })),

  removeOrder: (orderId) =>
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== orderId),
      stats: { ...state.stats, activeOrders: state.stats.activeOrders - 1 },
    })),
}));
