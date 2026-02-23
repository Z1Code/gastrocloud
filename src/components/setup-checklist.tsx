"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Image,
  Clock,
  UtensilsCrossed,
  CreditCard,
  Truck,
  Grid3X3,
  Rocket,
  Check,
  ArrowRight,
  Lock,
} from "lucide-react";
import type { SetupProgress } from "@/lib/setup-progress";

interface ChecklistItem {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  done: boolean;
  optional?: boolean;
}

export function SetupChecklist({ progress }: { progress: SetupProgress }) {
  const items: ChecklistItem[] = [
    {
      label: "Sube tu logo y colores",
      description: "Personaliza la marca de tu restaurante",
      href: "/settings",
      icon: Image,
      done: progress.hasLogo,
    },
    {
      label: "Agrega horarios de operación",
      description: "Define cuándo abre y cierra tu local",
      href: "/settings",
      icon: Clock,
      done: progress.hasOperatingHours,
    },
    {
      label: "Crea tu menú",
      description: "Agrega categorías y platos a tu carta",
      href: "/menu",
      icon: UtensilsCrossed,
      done: progress.hasMenu,
    },
    {
      label: "Configura método de pago",
      description: "Mercadopago o Transbank para cobrar online",
      href: "/integrations",
      icon: CreditCard,
      done: progress.hasPayment,
    },
    {
      label: "Conecta delivery",
      description: "Uber Eats, Rappi o WhatsApp Business",
      href: "/integrations",
      icon: Truck,
      done: progress.hasDelivery,
      optional: true,
    },
    {
      label: "Agrega tus mesas",
      description: "Configura mesas y genera códigos QR",
      href: "/settings",
      icon: Grid3X3,
      done: progress.hasTables,
    },
  ];

  const pct = Math.round((progress.completedSteps / progress.totalSteps) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Configura tu restaurante
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {progress.completedSteps} de {progress.totalSteps} pasos completados
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-white">{pct}%</span>
        </div>
      </div>

      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-6">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500"
        />
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all group ${
                item.done
                  ? "bg-emerald-500/5 border border-emerald-500/10"
                  : "hover:bg-white/5 border border-transparent"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  item.done
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/5 text-slate-400 group-hover:text-orange-400 group-hover:bg-orange-500/10"
                }`}
              >
                {item.done ? <Check size={18} /> : <Icon size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    item.done ? "text-emerald-300 line-through" : "text-white"
                  }`}
                >
                  {item.label}
                  {item.optional && (
                    <span className="text-xs text-slate-500 ml-2 font-normal">
                      (opcional)
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {item.description}
                </p>
              </div>
              {!item.done && (
                <ArrowRight
                  size={16}
                  className="text-slate-600 group-hover:text-orange-400 shrink-0"
                />
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-white/5">
        {progress.canActivateStorefront ? (
          <Link
            href="/settings"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
          >
            <Rocket size={16} />
            Activar Storefront
          </Link>
        ) : (
          <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium bg-white/5 text-slate-500 border border-white/5">
            <Lock size={14} />
            Completa menú y pago para activar tu tienda
          </div>
        )}
      </div>
    </motion.div>
  );
}
