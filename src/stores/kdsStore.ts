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
  bumped?: boolean;
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
  setActiveStation: (station: Station | 'all') => void;
  setOrders: (orders: KDSOrder[]) => void;
  upsertOrder: (order: KDSOrder) => void;
  removeOrder: (orderId: string) => void;
  bumpItem: (orderId: string, itemId: string) => void;
}

export const useKDSStore = create<KDSStore>((set) => ({
  orders: [],
  activeStation: 'all',

  setActiveStation: (station) => set({ activeStation: station }),

  setOrders: (orders) => set({ orders }),

  upsertOrder: (order) =>
    set((state) => {
      const idx = state.orders.findIndex((o) => o.id === order.id);
      if (idx >= 0) {
        const updated = [...state.orders];
        updated[idx] = order;
        return { orders: updated };
      }
      return { orders: [order, ...state.orders] };
    }),

  removeOrder: (orderId) =>
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== orderId),
    })),

  bumpItem: (orderId, itemId) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              items: o.items.map((i) =>
                i.id === itemId ? { ...i, bumped: true } : i
              ),
            }
          : o
      ),
    })),
}));
