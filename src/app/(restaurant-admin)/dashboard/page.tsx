"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "@/hooks/useAuth";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/* ── KPI Data ──────────────────────────────────────────── */
const kpis = [
  {
    label: "Ingresos Hoy",
    value: "$1.234.500",
    unit: "CLP",
    change: +12.5,
    icon: DollarSign,
    gradient: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-500/25",
  },
  {
    label: "Pedidos",
    value: "47",
    unit: "",
    change: +8.3,
    icon: ShoppingBag,
    gradient: "from-indigo-500 to-violet-500",
    shadow: "shadow-indigo-500/25",
  },
  {
    label: "Tiempo Promedio",
    value: "14",
    unit: "min",
    change: -2.1,
    icon: Clock,
    gradient: "from-amber-500 to-orange-500",
    shadow: "shadow-amber-500/25",
  },
  {
    label: "Mesas Activas",
    value: "8/12",
    unit: "",
    change: null,
    icon: Users,
    gradient: "from-pink-500 to-rose-500",
    shadow: "shadow-pink-500/25",
  },
];

/* ── Revenue Chart Data ────────────────────────────────── */
const revenueData = [
  { day: "Lun", value: 820000 },
  { day: "Mar", value: 950000 },
  { day: "Mi\u00e9", value: 780000 },
  { day: "Jue", value: 1100000 },
  { day: "Vie", value: 1350000 },
  { day: "S\u00e1b", value: 1500000 },
  { day: "Dom", value: 1234500 },
];

/* ── Recent Orders ─────────────────────────────────────── */
const sourceColors: Record<string, string> = {
  Web: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "Uber Eats": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Rappi: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  WhatsApp: "bg-green-500/20 text-green-300 border-green-500/30",
  POS: "bg-violet-500/20 text-violet-300 border-violet-500/30",
};

const statusColors: Record<string, string> = {
  Completado: "bg-emerald-500/20 text-emerald-300",
  Preparando: "bg-amber-500/20 text-amber-300",
  Pendiente: "bg-slate-500/20 text-slate-300",
  Listo: "bg-blue-500/20 text-blue-300",
};

const recentOrders = [
  { id: "#1047", source: "Web", customer: "Catalina Morales", items: "2x Pastel de Choclo, 1x Pisco Sour", total: "$38.500", status: "Completado", time: "12:45" },
  { id: "#1046", source: "Uber Eats", customer: "Andr\u00e9s Fuentes", items: "1x Cazuela, 1x Empanadas", total: "$22.800", status: "Preparando", time: "12:38" },
  { id: "#1045", source: "Rappi", customer: "Mar\u00eda Jos\u00e9 Soto", items: "3x Completo Italiano", total: "$15.900", status: "Listo", time: "12:30" },
  { id: "#1044", source: "POS", customer: "Felipe Araya", items: "1x Lomo a lo Pobre, 2x Cerveza", total: "$28.200", status: "Completado", time: "12:22" },
  { id: "#1043", source: "WhatsApp", customer: "Isidora Vega", items: "1x Curanto, 1x Vino Tinto", total: "$32.000", status: "Preparando", time: "12:15" },
  { id: "#1042", source: "Web", customer: "Tom\u00e1s Henr\u00edquez", items: "2x Churrasco, 1x Jugo Natural", total: "$19.400", status: "Pendiente", time: "12:08" },
  { id: "#1041", source: "Uber Eats", customer: "Francisca Reyes", items: "1x Ceviche, 1x Pisco Sour", total: "$26.300", status: "Completado", time: "11:55" },
  { id: "#1040", source: "POS", customer: "Benjam\u00edn Contreras", items: "1x Parrillada Mixta", total: "$45.000", status: "Completado", time: "11:42" },
];

/* ── Popular Items ─────────────────────────────────────── */
const popularItems = [
  { name: "Pastel de Choclo", orders: 34, emoji: "\ud83c\udf3d" },
  { name: "Cazuela", orders: 28, emoji: "\ud83c\udf72" },
  { name: "Empanadas de Pino", orders: 25, emoji: "\ud83e\udd5f" },
  { name: "Lomo a lo Pobre", orders: 21, emoji: "\ud83e\udd69" },
  { name: "Pisco Sour", orders: 19, emoji: "\ud83c\udf78" },
];

/* ── Helpers ───────────────────────────────────────────── */
function buildAreaPath(data: typeof revenueData, w: number, h: number, padding = 40) {
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value)) * 0.8;
  const xStep = (w - padding * 2) / (data.length - 1);

  const points = data.map((d, i) => ({
    x: padding + i * xStep,
    y: padding + (1 - (d.value - min) / (max - min)) * (h - padding * 2),
  }));

  const line = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ");
  const area = `${line} L${points[points.length - 1].x},${h - padding} L${points[0].x},${h - padding} Z`;

  return { line, area, points };
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

/* ── Component ─────────────────────────────────────────── */
export default function DashboardPage() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "Usuario";

  const chartW = 700;
  const chartH = 280;
  const { line, area, points } = buildAreaPath(revenueData, chartW, chartH);

  return (
    <div ref={ref}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Bienvenido de vuelta, {firstName}. Aqui tienes el resumen de hoy.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
      >
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              variants={fadeUp}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-start gap-4"
            >
              <div
                className={cn(
                  "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg",
                  kpi.gradient,
                  kpi.shadow
                )}
              >
                <Icon size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 font-medium">{kpi.label}</p>
                <p className="text-2xl font-bold text-white mt-0.5 leading-tight">
                  {kpi.value}
                  {kpi.unit && (
                    <span className="text-xs text-slate-500 ml-1 font-medium">
                      {kpi.unit}
                    </span>
                  )}
                </p>
                {kpi.change !== null && (
                  <div
                    className={cn(
                      "flex items-center gap-1 mt-1 text-xs font-medium",
                      kpi.change > 0 ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {kpi.change > 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {kpi.change > 0 ? "+" : ""}
                    {kpi.change}%
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Revenue Chart + Popular Items */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        {/* Chart */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          className="xl:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Ingresos Semanal
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ultimos 7 dias
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
              <ArrowUpRight size={14} />
              +18.2%
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-auto min-w-[400px]"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient
                  id="areaGrad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="rgb(99,102,241)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(99,102,241)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((f) => (
                <line
                  key={f}
                  x1={40}
                  x2={chartW - 40}
                  y1={40 + f * (chartH - 80)}
                  y2={40 + f * (chartH - 80)}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Area */}
              <path d={area} fill="url(#areaGrad)" />

              {/* Line */}
              <path
                d={line}
                fill="none"
                stroke="rgb(99,102,241)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Dots & Labels */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill="rgb(99,102,241)"
                    stroke="#030014"
                    strokeWidth="2"
                  />
                  <text
                    x={p.x}
                    y={chartH - 16}
                    textAnchor="middle"
                    fill="rgba(148,163,184,0.7)"
                    fontSize="11"
                    fontFamily="Inter, sans-serif"
                  >
                    {revenueData[i].day}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </motion.div>

        {/* Popular Items */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5"
        >
          <h2 className="text-base font-semibold text-white mb-4">
            Platos Populares
          </h2>
          <div className="space-y-4">
            {popularItems.map((item, i) => {
              const pct = (item.orders / popularItems[0].orders) * 100;
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.emoji}</span>
                      <span className="text-sm text-white font-medium">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {item.orders} pedidos
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={inView ? { width: `${pct}%` } : { width: 0 }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Recent Orders Table */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white">
            Pedidos Recientes
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">#</th>
                <th className="text-left px-5 py-3 font-medium">Origen</th>
                <th className="text-left px-5 py-3 font-medium">Cliente</th>
                <th className="text-left px-5 py-3 font-medium hidden lg:table-cell">
                  Items
                </th>
                <th className="text-left px-5 py-3 font-medium">Total</th>
                <th className="text-left px-5 py-3 font-medium">Estado</th>
                <th className="text-left px-5 py-3 font-medium">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {recentOrders.map((order, i) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-5 py-3 text-slate-300 font-mono text-xs">
                    {order.id}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-md border font-medium",
                        sourceColors[order.source]
                      )}
                    >
                      {order.source}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-white font-medium">
                    {order.customer}
                  </td>
                  <td className="px-5 py-3 text-slate-400 hidden lg:table-cell max-w-[200px] truncate">
                    {order.items}
                  </td>
                  <td className="px-5 py-3 text-white font-medium">
                    {order.total}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-md font-medium",
                        statusColors[order.status]
                      )}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    {order.time}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
