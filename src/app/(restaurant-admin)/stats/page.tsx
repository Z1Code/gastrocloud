"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Eye, BarChart3, MousePointerClick, ShoppingCart } from "lucide-react";

/* ── Mock Data ──────────────────────────────────────────── */
// TODO: Replace with real fetch from analytics API once slug is available from session
const mockData = {
  views: { today: 47, week: 312, month: 1248 },
  eventBreakdown: [
    { eventType: "page_view", count: 1248 },
    { eventType: "menu_view", count: 834 },
    { eventType: "checkout_started", count: 156 },
    { eventType: "order_placed", count: 89 },
  ],
};

/* ── Funnel Config ──────────────────────────────────────── */
const funnelConfig: Record<string, { label: string; color: string; icon: typeof Eye }> = {
  page_view: { label: "Visitas", color: "from-orange-500 to-rose-500", icon: Eye },
  menu_view: { label: "Menu visto", color: "from-blue-500 to-cyan-500", icon: BarChart3 },
  checkout_started: { label: "Checkout iniciado", color: "from-amber-500 to-orange-500", icon: MousePointerClick },
  order_placed: { label: "Pedidos", color: "from-emerald-500 to-teal-500", icon: ShoppingCart },
};

/* ── Animated Counter ───────────────────────────────────── */
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value, duration]);

  return <span ref={ref}>{display.toLocaleString("es-CL")}</span>;
}

/* ── Animation Variants ─────────────────────────────────── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

/* ── Component ─────────────────────────────────────────── */
export default function StatsPage() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  const { views, eventBreakdown } = mockData;
  const totalVisits = eventBreakdown[0].count;

  const statsCards = [
    { label: "Visitas Hoy", value: views.today, border: "border-l-orange-500", icon: Eye },
    { label: "Visitas esta Semana", value: views.week, border: "border-l-blue-500", icon: Eye },
    { label: "Visitas este Mes", value: views.month, border: "border-l-rose-500", icon: Eye },
  ];

  return (
    <div ref={ref}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-white">
          Estadisticas del Storefront
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Analiticas de tu tienda online
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
      >
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              variants={fadeUp}
              className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 border-l-4 ${card.border}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon size={18} className="text-slate-400" />
                <p className="text-xs text-slate-400 font-medium">{card.label}</p>
              </div>
              <p className="text-3xl font-bold text-white">
                <AnimatedNumber value={card.value} />
              </p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Funnel Section */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
      >
        <h2 className="text-base font-semibold text-white mb-1">
          Embudo de Conversion
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Desde la visita hasta el pedido completado
        </p>

        <div className="space-y-4">
          {eventBreakdown.map((event, i) => {
            const config = funnelConfig[event.eventType];
            if (!config) return null;
            const percentage = ((event.count / totalVisits) * 100).toFixed(1);
            const widthPct = (event.count / totalVisits) * 100;
            const Icon = config.icon;

            return (
              <motion.div
                key={event.eventType}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-slate-400" />
                    <span className="text-sm text-white font-medium">
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">
                      {event.count.toLocaleString("es-CL")}
                    </span>
                    <span className="text-xs text-slate-400 w-14 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${widthPct}%` } : { width: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 + i * 0.12, ease: "easeOut" }}
                    className={`h-full rounded-lg bg-gradient-to-r ${config.color} flex items-center pl-3`}
                    style={{ minWidth: widthPct > 5 ? undefined : "2rem" }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Event Breakdown Table */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white">
            Desglose de Eventos
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Evento</th>
                <th className="text-right px-5 py-3 font-medium">Cantidad</th>
                <th className="text-right px-5 py-3 font-medium">% del Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {eventBreakdown.map((event, i) => {
                const config = funnelConfig[event.eventType];
                const percentage = ((event.count / totalVisits) * 100).toFixed(1);
                return (
                  <motion.tr
                    key={event.eventType}
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${config?.color ?? "from-slate-500 to-slate-600"}`} />
                        <span className="text-white font-medium">
                          {config?.label ?? event.eventType}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {event.eventType}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-white font-semibold tabular-nums">
                      {event.count.toLocaleString("es-CL")}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-400 tabular-nums">
                      {percentage}%
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Note about mock data */}
        <div className="px-5 py-3 border-t border-white/[0.06] bg-amber-500/5">
          <p className="text-xs text-amber-400/80">
            Datos de ejemplo. La informacion real requiere conectar con el endpoint de analytics del storefront.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
