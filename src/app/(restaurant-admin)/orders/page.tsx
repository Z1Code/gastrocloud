"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Clock,
  ChefHat,
  CheckCircle2,
  CircleDot,
  Package,
  Filter,
  Calendar,
  Utensils,
  Loader2,
  TrendingUp,
  Timer,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useOrderStream } from "@/hooks/useOrderStream";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { OrderDetailDrawer } from "@/components/order-detail-drawer";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/* ── Types ─────────────────────────────────────────────── */
interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: string;
  modifiers: any;
  station: string | null;
  notes: string | null;
  menuItemName: string | null;
}

interface Payment {
  method: string;
  status: string;
  amount: string;
}

interface Order {
  id: string;
  source: string;
  type: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  total: string;
  subtotal: string;
  tip: string;
  discount: string;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
  payments: Payment[];
}

interface Stats {
  activeOrders: number;
  completedToday: number;
  avgPrepTime: number;
}

/* ── Constants ────────────────────────────────────────── */
const statusTabs: { label: string; value: string | null }[] = [
  { label: "Todos", value: null },
  { label: "Pendientes", value: "pending" },
  { label: "Preparando", value: "preparing" },
  { label: "Listos", value: "ready" },
  { label: "Completados", value: "completed" },
];

const sourceFilters: { label: string; value: string | null }[] = [
  { label: "Todos", value: null },
  { label: "Web", value: "web" },
  { label: "Uber Eats", value: "uber_eats" },
  { label: "Rappi", value: "rappi" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "POS", value: "pos_inhouse" },
];

const sourceColors: Record<string, string> = {
  web: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  uber_eats: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  rappi: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  whatsapp: "bg-green-500/20 text-green-300 border-green-500/30",
  pos_inhouse: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  qr_table: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

const sourceLabels: Record<string, string> = {
  web: "Web",
  uber_eats: "Uber Eats",
  rappi: "Rappi",
  whatsapp: "WhatsApp",
  pos_inhouse: "POS",
  qr_table: "Mesa QR",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptado",
  preparing: "Preparando",
  ready: "Listo",
  served: "Servido",
  completed: "Completado",
  cancelled: "Cancelado",
};

const statusIcons: Record<string, React.ElementType> = {
  pending: CircleDot,
  accepted: CheckCircle2,
  preparing: ChefHat,
  ready: Package,
  served: Utensils,
  completed: CheckCircle2,
  cancelled: CircleDot,
};

const statusStyles: Record<string, string> = {
  pending: "bg-slate-500/20 text-slate-300",
  accepted: "bg-blue-500/20 text-blue-300",
  preparing: "bg-amber-500/20 text-amber-300",
  ready: "bg-blue-500/20 text-blue-300",
  served: "bg-cyan-500/20 text-cyan-300",
  completed: "bg-emerald-500/20 text-emerald-300",
  cancelled: "bg-red-500/20 text-red-300",
};

const nextStatusMap: Record<string, { label: string; status: string; style: string }> = {
  pending: {
    label: "Aceptar Pedido",
    status: "accepted",
    style: "bg-gradient-to-r from-orange-500 to-rose-500 text-white",
  },
  accepted: {
    label: "Iniciar Preparacion",
    status: "preparing",
    style: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
  },
  preparing: {
    label: "Marcar Listo",
    status: "ready",
    style: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white",
  },
  ready: {
    label: "Entregar",
    status: "served",
    style: "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
  },
  served: {
    label: "Completar",
    status: "completed",
    style: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white",
  },
};

/* ── Helpers ──────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  return `hace ${hrs}h`;
}

function formatCLP(value: string | number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

/* ── Component ────────────────────────────────────────── */
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  const { playSoundForSource } = useNotificationSound();

  /* ── Fetch orders ──────────────────────────────────── */
  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeStatus) params.set("status", activeStatus);
      if (activeSource) params.set("source", activeSource);
      const qs = params.toString();
      const res = await fetch(`/api/orders${qs ? `?${qs}` : ""}`);
      if (res.ok) {
        const data: Order[] = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, activeSource]);

  /* ── Fetch stats ───────────────────────────────────── */
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/stats");
      if (res.ok) {
        const data: Stats = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  /* ── Initial + filter-change fetch ─────────────────── */
  useEffect(() => {
    setLoading(true);
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  /* ── SSE real-time updates ─────────────────────────── */
  const handleOrderCreated = useCallback(
    (event: { data?: Record<string, unknown> }) => {
      const newOrder = event.data as unknown as Order | undefined;
      if (newOrder) {
        setOrders((prev) => [newOrder, ...prev]);
        playSoundForSource(newOrder.source);
      }
      fetchStats();
    },
    [playSoundForSource, fetchStats]
  );

  const handleStatusChanged = useCallback(
    (event: { orderId?: string; data?: Record<string, unknown> }) => {
      if (event.orderId) {
        const newStatus = (event.data as any)?.status as string | undefined;
        if (newStatus) {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === event.orderId ? { ...o, status: newStatus } : o
            )
          );
        }
      }
      fetchStats();
    },
    [fetchStats]
  );

  const handleOrderCancelled = useCallback(
    (event: { orderId?: string }) => {
      if (event.orderId) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === event.orderId ? { ...o, status: "cancelled" } : o
          )
        );
      }
      fetchStats();
    },
    [fetchStats]
  );

  useOrderStream({
    onOrderCreated: handleOrderCreated,
    onStatusChanged: handleStatusChanged,
    onOrderCancelled: handleOrderCancelled,
  });

  /* ── Action handlers ───────────────────────────────── */
  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: string) => {
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: newStatus } : prev
        );
      }

      try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          // Revert on error
          fetchOrders();
        } else {
          fetchStats();
        }
      } catch {
        fetchOrders();
      }
    },
    [selectedOrder, fetchOrders, fetchStats]
  );

  const handleCancel = useCallback(
    async (orderId: string, reason: string) => {
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "cancelled" } : o
        )
      );
      setSelectedOrder(null);

      try {
        const res = await fetch(`/api/orders/${orderId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
        if (!res.ok) {
          fetchOrders();
        } else {
          fetchStats();
        }
      } catch {
        fetchOrders();
      }
    },
    [fetchOrders, fetchStats]
  );

  /* ── Computed counts per status ────────────────────── */
  const statusCounts: Record<string, number> = {};
  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  }

  /* ── Today's date ──────────────────────────────────── */
  const todayStr = new Date().toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div ref={ref}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-white">Pedidos</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gestiona todos los pedidos de tu restaurante
        </p>
      </motion.div>

      {/* Stats Mini-Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/20">
            <TrendingUp size={18} className="text-orange-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Activas</p>
            <p className="text-xl font-bold text-orange-400">
              {stats?.activeOrders ?? "--"}
            </p>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/10">
            <Timer size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Tiempo Prom.</p>
            <p className="text-xl font-bold text-white">
              {stats ? `${stats.avgPrepTime} min` : "--"}
            </p>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <CheckCircle2 size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Completadas Hoy</p>
            <p className="text-xl font-bold text-emerald-400">
              {stats?.completedToday ?? "--"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Status Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-1 p-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl mb-4 overflow-x-auto max-w-full"
      >
        {statusTabs.map((tab) => {
          const count =
            tab.value === null
              ? orders.length
              : statusCounts[tab.value] ?? 0;
          return (
            <button
              key={tab.label}
              onClick={() => setActiveStatus(tab.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5",
                activeStatus === tab.value
                  ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "text-[11px] px-1.5 py-0.5 rounded-md font-mono",
                  activeStatus === tab.value
                    ? "bg-white/20"
                    : "bg-white/5"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* Source Chips + Date */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-3 mb-6 flex-wrap"
      >
        <div className="flex items-center gap-1.5 text-slate-400 text-sm">
          <Filter size={14} />
          <span>Origen:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {sourceFilters.map((src) => (
            <button
              key={src.label}
              onClick={() => setActiveSource(src.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                activeSource === src.value
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:border-white/15"
              )}
            >
              {src.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
          <Calendar size={14} />
          <span>{todayStr}</span>
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-slate-500" />
        </div>
      )}

      {/* Orders Grid */}
      {!loading && (
        <AnimatePresence mode="popLayout">
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {orders.map((order, i) => {
              const StatusIcon =
                statusIcons[order.status] ?? CircleDot;
              const next = nextStatusMap[order.status];

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={
                    inView
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.95 }
                  }
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-3 cursor-pointer hover:border-white/20 transition-colors"
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <span className="text-white font-mono text-sm font-bold">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-md border font-medium",
                        sourceColors[order.source] ??
                          "bg-slate-500/20 text-slate-300 border-slate-500/30"
                      )}
                    >
                      {sourceLabels[order.source] ?? order.source}
                    </span>
                  </div>

                  {/* Customer */}
                  <p className="text-white font-medium text-sm">
                    {order.customerName ?? "Cliente"}
                  </p>

                  {/* Items */}
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {order.items.length > 0
                      ? order.items
                          .map((item) => `${item.quantity}x ${item.menuItemName ?? "Item"}`)
                          .join(", ")
                      : "Sin items"}
                  </p>

                  {/* Total + Status */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-lg font-bold text-white">
                      {formatCLP(order.total)}
                    </span>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium",
                        statusStyles[order.status] ??
                          "bg-slate-500/20 text-slate-300"
                      )}
                    >
                      <StatusIcon size={13} />
                      {statusLabels[order.status] ?? order.status}
                    </div>
                  </div>

                  {/* Time + Action */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={12} />
                      {timeAgo(order.createdAt)}
                    </span>
                    {next && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(order.id, next.status);
                        }}
                        className={cn(
                          "text-xs font-medium px-3 py-1.5 rounded-lg transition-all",
                          next.style
                        )}
                      >
                        {next.label}
                      </button>
                    )}
                    {!next && order.status === "completed" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 text-slate-300 hover:bg-white/15 transition-all"
                      >
                        Ver Detalle
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <Package size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay pedidos con estos filtros</p>
        </div>
      )}

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={handleStatusChange}
        onCancel={handleCancel}
      />
    </div>
  );
}
