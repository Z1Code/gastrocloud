"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  Users,
  TrendingUp,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "@/hooks/useAuth";
import { SetupChecklist } from "@/components/setup-checklist";
import type { SetupProgress } from "@/lib/setup-progress";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function DashboardPage() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "Usuario";

  const [progress, setProgress] = useState<SetupProgress | null>(null);

  useEffect(() => {
    fetch("/api/setup-progress")
      .then((r) => r.json())
      .then(setProgress)
      .catch(() => {});
  }, []);

  const showChecklist = progress && progress.completedSteps < progress.totalSteps;

  const kpis = [
    {
      label: "Ingresos Hoy",
      value: "$0",
      unit: "CLP",
      icon: DollarSign,
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/25",
    },
    {
      label: "Pedidos",
      value: "0",
      unit: "",
      icon: ShoppingBag,
      gradient: "from-orange-500 to-rose-500",
      shadow: "shadow-orange-500/25",
    },
    {
      label: "Tiempo Promedio",
      value: "--",
      unit: "min",
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      shadow: "shadow-amber-500/25",
    },
    {
      label: "Mesas Activas",
      value: "0/0",
      unit: "",
      icon: Users,
      gradient: "from-pink-500 to-rose-500",
      shadow: "shadow-pink-500/25",
    },
  ];

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
          Bienvenido, {firstName}. Aquí tienes el resumen de hoy.
        </p>
      </motion.div>

      {/* Setup Checklist (shown until all steps done) */}
      {showChecklist && (
        <div className="mb-6">
          <SetupChecklist progress={progress} />
        </div>
      )}

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
                  kpi.shadow,
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
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Empty state when no orders */}
      {!showChecklist && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center"
        >
          <TrendingUp size={40} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1">
            Sin pedidos aún
          </h3>
          <p className="text-sm text-slate-400">
            Los datos aparecerán aquí cuando empieces a recibir pedidos.
          </p>
        </motion.div>
      )}
    </div>
  );
}
