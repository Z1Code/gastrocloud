"use client";

import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Clock,
  ChefHat,
  CheckCircle2,
  CircleDot,
  Package,
  Filter,
  Calendar,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/* ── Types ─────────────────────────────────────────────── */
type OrderStatus = "Pendiente" | "Preparando" | "Listo" | "Completado";
type OrderSource = "Web" | "Uber Eats" | "Rappi" | "WhatsApp" | "POS";

interface Order {
  id: string;
  source: OrderSource;
  customer: string;
  items: string;
  total: string;
  status: OrderStatus;
  timeAgo: string;
}

/* ── Data ──────────────────────────────────────────────── */
const statusTabs: { label: string; value: OrderStatus | "Todos" }[] = [
  { label: "Todos", value: "Todos" },
  { label: "Pendientes", value: "Pendiente" },
  { label: "Preparando", value: "Preparando" },
  { label: "Listos", value: "Listo" },
  { label: "Completados", value: "Completado" },
];

const sources: ("Todos" | OrderSource)[] = [
  "Todos",
  "Web",
  "Uber Eats",
  "Rappi",
  "WhatsApp",
  "POS",
];

const sourceColors: Record<OrderSource, string> = {
  Web: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Uber Eats": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Rappi: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  WhatsApp: "bg-green-500/20 text-green-300 border-green-500/30",
  POS: "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

const statusStyles: Record<OrderStatus, { bg: string; icon: React.ElementType }> = {
  Pendiente: { bg: "bg-slate-500/20 text-slate-300", icon: CircleDot },
  Preparando: { bg: "bg-amber-500/20 text-amber-300", icon: ChefHat },
  Listo: { bg: "bg-blue-500/20 text-blue-300", icon: Package },
  Completado: { bg: "bg-emerald-500/20 text-emerald-300", icon: CheckCircle2 },
};

const actionLabel: Record<OrderStatus, string> = {
  Pendiente: "Aceptar Pedido",
  Preparando: "Marcar Listo",
  Listo: "Entregar",
  Completado: "Ver Detalle",
};

const actionStyle: Record<OrderStatus, string> = {
  Pendiente: "bg-gradient-to-r from-orange-500 to-rose-500 text-white",
  Preparando: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
  Listo: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white",
  Completado: "bg-white/10 text-slate-300 hover:bg-white/15",
};

const orders: Order[] = [
  { id: "#1050", source: "Web", customer: "Catalina Morales", items: "2x Pastel de Choclo, 1x Pisco Sour", total: "$38.500", status: "Pendiente", timeAgo: "hace 2 min" },
  { id: "#1049", source: "Uber Eats", customer: "Andr\u00e9s Fuentes", items: "1x Cazuela, 1x Empanadas de Pino", total: "$22.800", status: "Preparando", timeAgo: "hace 8 min" },
  { id: "#1048", source: "Rappi", customer: "Mar\u00eda Jos\u00e9 Soto", items: "3x Completo Italiano", total: "$15.900", status: "Listo", timeAgo: "hace 15 min" },
  { id: "#1047", source: "POS", customer: "Felipe Araya", items: "1x Lomo a lo Pobre, 2x Cerveza Artesanal", total: "$28.200", status: "Completado", timeAgo: "hace 22 min" },
  { id: "#1046", source: "WhatsApp", customer: "Isidora Vega", items: "1x Curanto en Olla, 1x Vino Tinto", total: "$32.000", status: "Preparando", timeAgo: "hace 25 min" },
  { id: "#1045", source: "Web", customer: "Tom\u00e1s Henr\u00edquez", items: "2x Churrasco Italiano", total: "$19.400", status: "Pendiente", timeAgo: "hace 28 min" },
  { id: "#1044", source: "Uber Eats", customer: "Francisca Reyes", items: "1x Ceviche, 1x Pisco Sour", total: "$26.300", status: "Listo", timeAgo: "hace 32 min" },
  { id: "#1043", source: "POS", customer: "Benjam\u00edn Contreras", items: "1x Parrillada Mixta para 2", total: "$45.000", status: "Completado", timeAgo: "hace 40 min" },
  { id: "#1042", source: "Rappi", customer: "Valentina Rojas", items: "2x Empanadas, 1x Ensalada Chilena", total: "$14.200", status: "Preparando", timeAgo: "hace 45 min" },
  { id: "#1041", source: "WhatsApp", customer: "Sebasti\u00e1n Mu\u00f1oz", items: "1x Caldillo de Congrio", total: "$18.500", status: "Completado", timeAgo: "hace 52 min" },
  { id: "#1040", source: "Web", customer: "Constanza L\u00f3pez", items: "1x Pastel de Jaiba, 1x Copa de Vino", total: "$29.800", status: "Listo", timeAgo: "hace 58 min" },
  { id: "#1039", source: "POS", customer: "Mateo Silva", items: "2x Sopaipillas Pasadas, 1x T\u00e9", total: "$8.900", status: "Completado", timeAgo: "hace 1 hora" },
];

/* ── Component ─────────────────────────────────────────── */
export default function OrdersPage() {
  const [activeStatus, setActiveStatus] = useState<OrderStatus | "Todos">("Todos");
  const [activeSource, setActiveSource] = useState<"Todos" | OrderSource>("Todos");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  const filtered = orders.filter((o) => {
    if (activeStatus !== "Todos" && o.status !== activeStatus) return false;
    if (activeSource !== "Todos" && o.source !== activeSource) return false;
    return true;
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

      {/* Status Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-1 p-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl mb-4 overflow-x-auto w-fit"
      >
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveStatus(tab.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
              activeStatus === tab.value
                ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            {tab.label}
          </button>
        ))}
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
          {sources.map((src) => (
            <button
              key={src}
              onClick={() => setActiveSource(src)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                activeSource === src
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:border-white/15"
              )}
            >
              {src}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
          <Calendar size={14} />
          <span>Hoy, 20 Feb 2026</span>
        </div>
      </motion.div>

      {/* Orders Grid */}
      <AnimatePresence mode="popLayout">
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {filtered.map((order, i) => {
            const statusConfig = statusStyles[order.status];
            const StatusIcon = statusConfig.icon;
            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-3"
              >
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <span className="text-white font-mono text-sm font-bold">
                    {order.id}
                  </span>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-md border font-medium",
                      sourceColors[order.source]
                    )}
                  >
                    {order.source}
                  </span>
                </div>

                {/* Customer */}
                <p className="text-white font-medium text-sm">{order.customer}</p>

                {/* Items */}
                <p className="text-xs text-slate-400 leading-relaxed">
                  {order.items}
                </p>

                {/* Total + Status */}
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <span className="text-lg font-bold text-white">{order.total}</span>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium",
                      statusConfig.bg
                    )}
                  >
                    <StatusIcon size={13} />
                    {order.status}
                  </div>
                </div>

                {/* Time + Action */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={12} />
                    {order.timeAgo}
                  </span>
                  <button
                    className={cn(
                      "text-xs font-medium px-3 py-1.5 rounded-lg transition-all",
                      actionStyle[order.status]
                    )}
                  >
                    {actionLabel[order.status]}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <Package size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay pedidos con estos filtros</p>
        </div>
      )}
    </div>
  );
}
