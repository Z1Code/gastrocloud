"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

function formatCLP(amount: number) {
  return "$" + amount.toLocaleString("es-CL");
}

/* ── Status Steps ──────────────────────────────────────── */

interface Step {
  label: string;
  time?: string;
  status: "done" | "current" | "pending";
}

const steps: Step[] = [
  { label: "Pedido Recibido", time: "12:30", status: "done" },
  { label: "Aceptado por cocina", time: "12:32", status: "done" },
  { label: "Preparando...", status: "current" },
  { label: "Listo para retiro", status: "pending" },
  { label: "Entregado", status: "pending" },
];

const orderItems = [
  { name: "Lomo a lo Pobre", qty: 1, price: 13980 },
  { name: "Empanadas de Pino", qty: 2, price: 6980 },
  { name: "Pisco Sour", qty: 1, price: 5990 },
];

const subtotal = orderItems.reduce((s, i) => s + i.price, 0);
const tip = Math.round(subtotal * 0.1);
const total = subtotal + tip;

/* ── Countdown Hook ────────────────────────────────────── */

function useCountdown(initialMinutes: number) {
  const [seconds, setSeconds] = useState(initialMinutes * 60);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return { mins, secs, display: `${mins}:${secs.toString().padStart(2, "0")}` };
}

/* ── Icons ─────────────────────────────────────────────── */

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export default function TrackPage() {
  const params = useParams();
  const slug = params.slug as string;
  const countdown = useCountdown(12);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 pt-6 pb-8"
    >
      {/* Order number */}
      <div className="text-center mb-8">
        <p className="text-sm text-gray-500">Orden</p>
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-bold text-gray-900 mt-1"
        >
          #0234
        </motion.h1>
      </div>

      {/* Estimated time */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-5 text-white text-center mb-6 shadow-lg shadow-orange-500/20"
      >
        <p className="text-sm text-white/80">Tu pedido estará listo en</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-4xl font-bold tabular-nums">{countdown.display}</span>
        </div>
        <p className="text-sm text-white/70 mt-2">~{countdown.mins} minutos restantes</p>
      </motion.div>

      {/* Status stepper */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 p-5 mb-6"
      >
        <h2 className="font-semibold text-gray-900 mb-5">Estado del pedido</h2>
        <div className="relative">
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            return (
              <div key={step.label} className="flex gap-4 relative">
                {/* Vertical line */}
                {!isLast && (
                  <div className="absolute left-[15px] top-8 bottom-0 w-0.5">
                    <div
                      className={cn(
                        "w-full h-full",
                        step.status === "done" ? "bg-orange-600" : "bg-gray-200"
                      )}
                    />
                  </div>
                )}

                {/* Dot */}
                <div className="relative z-10 shrink-0">
                  {step.status === "done" && (
                    <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </div>
                  )}
                  {step.status === "current" && (
                    <div className="relative">
                      <motion.div
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" as const }}
                        className="absolute inset-0 rounded-full bg-orange-400/30"
                      />
                      <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center relative">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                      </div>
                    </div>
                  )}
                  {step.status === "pending" && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                    </div>
                  )}
                </div>

                {/* Label */}
                <div className={cn("pb-8", isLast && "pb-0")}>
                  <p
                    className={cn(
                      "font-medium text-sm leading-8",
                      step.status === "done" && "text-gray-900",
                      step.status === "current" && "text-orange-600 font-semibold",
                      step.status === "pending" && "text-gray-400"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.time && (
                    <p className="text-xs text-gray-400 -mt-1">{step.time}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Order summary */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 p-5 mb-6"
      >
        <h2 className="font-semibold text-gray-900 mb-3">Detalle del pedido</h2>
        <div className="space-y-2.5">
          {orderItems.map((item) => (
            <div key={item.name} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.qty}x {item.name}
              </span>
              <span className="font-medium text-gray-900">{formatCLP(item.price)}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">{formatCLP(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Propina (10%)</span>
            <span className="text-gray-900">{formatCLP(tip)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-gray-900">{formatCLP(total)}</span>
          </div>
        </div>
      </motion.div>

      {/* Help button */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="w-full h-14 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors"
        >
          <ChatIcon className="w-5 h-5" />
          Necesitas ayuda?
        </motion.button>
      </motion.div>

      {/* Back to menu */}
      <div className="text-center mt-4">
        <Link href={`/r/${slug}/menu`} className="text-sm text-orange-600 font-medium">
          Volver al menú
        </Link>
      </div>
    </motion.div>
  );
}
