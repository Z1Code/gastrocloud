import { create } from "zustand";

export type OrderSource = "WEB" | "UBER" | "RAPPI" | "PEDIDOSYA" | "MESA";
export type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  source: OrderSource;
  status: OrderStatus;
  customerName: string;
  items: OrderItem[];
  total: number;
  tableNumber?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderStore {
  orders: Order[];
  updateStatus: (id: string, status: OrderStatus) => void;
  getOrdersByStatus: (status: OrderStatus) => Order[];
}

const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

const mockOrders: Order[] = [
  {
    id: "o1",
    orderNumber: "0147",
    source: "MESA",
    status: "preparing",
    customerName: "María González",
    tableNumber: 3,
    items: [
      { id: "i1", name: "Lomo a lo Pobre", quantity: 1, price: 12990 },
      { id: "i2", name: "Pisco Sour", quantity: 2, price: 5490 },
    ],
    total: 23970,
    createdAt: minutesAgo(8),
    updatedAt: minutesAgo(5),
  },
  {
    id: "o2",
    orderNumber: "0148",
    source: "UBER",
    status: "pending",
    customerName: "Carlos Rodríguez",
    items: [
      { id: "i3", name: "Pastel de Choclo", quantity: 2, price: 9990 },
      { id: "i4", name: "Empanadas de Pino", quantity: 3, price: 3490 },
    ],
    total: 30450,
    createdAt: minutesAgo(3),
    updatedAt: minutesAgo(3),
  },
  {
    id: "o3",
    orderNumber: "0149",
    source: "WEB",
    status: "ready",
    customerName: "Ana Martínez",
    items: [
      { id: "i5", name: "César Salad", quantity: 1, price: 8990 },
      { id: "i6", name: "Salmón Grillé", quantity: 1, price: 15990 },
    ],
    total: 24980,
    createdAt: minutesAgo(22),
    updatedAt: minutesAgo(2),
  },
  {
    id: "o4",
    orderNumber: "0150",
    source: "MESA",
    status: "preparing",
    customerName: "Roberto Soto",
    tableNumber: 7,
    items: [
      { id: "i7", name: "Cazuela de Vacuno", quantity: 2, price: 8990 },
      { id: "i8", name: "Pan Amasado", quantity: 1, price: 2490 },
      { id: "i9", name: "Vino Tinto Copa", quantity: 2, price: 4990 },
    ],
    total: 30450,
    createdAt: minutesAgo(15),
    updatedAt: minutesAgo(10),
  },
  {
    id: "o5",
    orderNumber: "0151",
    source: "RAPPI",
    status: "pending",
    customerName: "Valentina Reyes",
    items: [
      { id: "i10", name: "Lomo a lo Pobre", quantity: 1, price: 12990 },
      { id: "i11", name: "Brownie con Helado", quantity: 1, price: 6490 },
    ],
    total: 19480,
    createdAt: minutesAgo(1),
    updatedAt: minutesAgo(1),
  },
  {
    id: "o6",
    orderNumber: "0152",
    source: "WEB",
    status: "completed",
    customerName: "Diego Fuentes",
    items: [
      { id: "i12", name: "Empanadas de Pino", quantity: 6, price: 3490 },
      { id: "i13", name: "Bebida 1.5L", quantity: 1, price: 2490 },
    ],
    total: 23430,
    createdAt: minutesAgo(45),
    updatedAt: minutesAgo(20),
  },
  {
    id: "o7",
    orderNumber: "0153",
    source: "MESA",
    status: "preparing",
    customerName: "Camila Herrera",
    tableNumber: 1,
    items: [
      { id: "i14", name: "Salmón Grillé", quantity: 2, price: 15990 },
      { id: "i15", name: "Risotto de Champiñones", quantity: 1, price: 11990 },
      { id: "i16", name: "Vino Blanco Botella", quantity: 1, price: 18990 },
    ],
    total: 62960,
    createdAt: minutesAgo(12),
    updatedAt: minutesAgo(8),
  },
  {
    id: "o8",
    orderNumber: "0154",
    source: "PEDIDOSYA",
    status: "ready",
    customerName: "Felipe Araya",
    items: [
      { id: "i17", name: "Hamburguesa Clásica", quantity: 2, price: 9990 },
      { id: "i18", name: "Papas Fritas", quantity: 2, price: 3990 },
    ],
    total: 27960,
    createdAt: minutesAgo(25),
    updatedAt: minutesAgo(3),
  },
  {
    id: "o9",
    orderNumber: "0155",
    source: "UBER",
    status: "completed",
    customerName: "Sofía Contreras",
    items: [
      { id: "i19", name: "Pastel de Choclo", quantity: 1, price: 9990 },
      { id: "i20", name: "Empanadas de Pino", quantity: 2, price: 3490 },
    ],
    total: 16970,
    createdAt: minutesAgo(55),
    updatedAt: minutesAgo(30),
  },
  {
    id: "o10",
    orderNumber: "0156",
    source: "MESA",
    status: "pending",
    customerName: "Andrés Vega",
    tableNumber: 5,
    items: [
      { id: "i21", name: "Ceviche Mixto", quantity: 1, price: 11990 },
      { id: "i22", name: "Pulpo a la Parrilla", quantity: 1, price: 16990 },
      { id: "i23", name: "Pisco Sour", quantity: 2, price: 5490 },
    ],
    total: 39960,
    createdAt: minutesAgo(2),
    updatedAt: minutesAgo(2),
  },
  {
    id: "o11",
    orderNumber: "0157",
    source: "WEB",
    status: "preparing",
    customerName: "Isidora Pizarro",
    items: [
      { id: "i24", name: "César Salad", quantity: 2, price: 8990 },
      { id: "i25", name: "Limonada Natural", quantity: 2, price: 3490 },
    ],
    total: 24960,
    createdAt: minutesAgo(10),
    updatedAt: minutesAgo(7),
  },
  {
    id: "o12",
    orderNumber: "0158",
    source: "RAPPI",
    status: "completed",
    customerName: "Matías Bravo",
    items: [
      { id: "i26", name: "Hamburguesa Clásica", quantity: 1, price: 9990 },
      { id: "i27", name: "Papas Fritas", quantity: 1, price: 3990 },
      { id: "i28", name: "Brownie con Helado", quantity: 1, price: 6490 },
    ],
    total: 20470,
    createdAt: minutesAgo(60),
    updatedAt: minutesAgo(35),
  },
  {
    id: "o13",
    orderNumber: "0159",
    source: "MESA",
    status: "ready",
    customerName: "Javiera Muñoz",
    tableNumber: 10,
    items: [
      { id: "i29", name: "Risotto de Champiñones", quantity: 1, price: 11990 },
      { id: "i30", name: "Tiramisú", quantity: 1, price: 6990 },
    ],
    total: 18980,
    createdAt: minutesAgo(30),
    updatedAt: minutesAgo(4),
  },
  {
    id: "o14",
    orderNumber: "0160",
    source: "UBER",
    status: "pending",
    customerName: "Tomás Espinoza",
    items: [
      { id: "i31", name: "Lomo a lo Pobre", quantity: 2, price: 12990 },
      { id: "i32", name: "Bebida 1.5L", quantity: 1, price: 2490 },
    ],
    total: 28470,
    createdAt: minutesAgo(1),
    updatedAt: minutesAgo(1),
  },
  {
    id: "o15",
    orderNumber: "0161",
    source: "MESA",
    status: "completed",
    customerName: "Francisca Lagos",
    tableNumber: 2,
    items: [
      { id: "i33", name: "Cazuela de Vacuno", quantity: 1, price: 8990 },
      { id: "i34", name: "Pan Amasado", quantity: 1, price: 2490 },
      { id: "i35", name: "Flan Casero", quantity: 2, price: 4990 },
    ],
    total: 21460,
    createdAt: minutesAgo(90),
    updatedAt: minutesAgo(50),
  },
  {
    id: "o16",
    orderNumber: "0162",
    source: "WEB",
    status: "preparing",
    customerName: "Ignacio Paredes",
    items: [
      { id: "i36", name: "Ceviche Mixto", quantity: 1, price: 11990 },
      { id: "i37", name: "Salmón Grillé", quantity: 1, price: 15990 },
    ],
    total: 27980,
    createdAt: minutesAgo(6),
    updatedAt: minutesAgo(4),
  },
  {
    id: "o17",
    orderNumber: "0163",
    source: "PEDIDOSYA",
    status: "pending",
    customerName: "Constanza Riquelme",
    items: [
      { id: "i38", name: "Empanadas de Pino", quantity: 4, price: 3490 },
      { id: "i39", name: "Pastel de Choclo", quantity: 1, price: 9990 },
    ],
    total: 23950,
    createdAt: minutesAgo(0),
    updatedAt: minutesAgo(0),
  },
];

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: mockOrders,
  updateStatus: (id, status) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === id ? { ...o, status, updatedAt: new Date() } : o
      ),
    })),
  getOrdersByStatus: (status) => get().orders.filter((o) => o.status === status),
}));
