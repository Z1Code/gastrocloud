"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/stores/cartStore";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

function formatCLP(amount: number) {
  return "$" + amount.toLocaleString("es-CL");
}

/* ── Icons ─────────────────────────────────────────────── */

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

/* ── Tip options ───────────────────────────────────────── */

const tipOptions = [0, 10, 15, 20];
const pickupTimes = ["15 min", "20 min", "30 min", "45 min", "1 hora"];

const itemEmojis: Record<string, string> = {
  "Lomo a lo Pobre": "🥩",
  "Pisco Sour": "🍸",
  "Tiramisú": "🍰",
  "Empanadas de Pino": "🥟",
  "Provoleta": "🧀",
  "Ceviche": "🐟",
  "Pastel de Choclo": "🌽",
  "Salmón Grillé": "🐟",
  "Risotto de Hongos": "🍄",
  "César con Pollo": "🥗",
  "Quinoa & Palta": "🥑",
  "Caprese": "🍅",
  "Brownie con Helado": "🍫",
  "Crème Brûlée": "🍮",
  "Mojito": "🍹",
  "Aperol Spritz": "🥂",
};

/* ── Mock initial cart ─────────────────────────────────── */

function useMockCart() {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const [seeded, setSeeded] = useState(false);

  if (!seeded && items.length === 0) {
    addItem({
      menuItemId: "p1",
      name: "Lomo a lo Pobre",
      price: 12990,
      quantity: 1,
      modifiers: [],
    });
    addItem({
      menuItemId: "c1",
      name: "Pisco Sour",
      price: 5990,
      quantity: 2,
      modifiers: [],
    });
    addItem({
      menuItemId: "d1",
      name: "Tiramisú",
      price: 5990,
      quantity: 1,
      modifiers: [],
    });
    setSeeded(true);
  }
}

/* ── Page ───────────────────────────────────────────────── */

export default function OrderPage() {
  const params = useParams();
  const slug = params.slug as string;
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const getTotal = useCartStore((s) => s.getTotal);

  useMockCart();

  const [tipPercent, setTipPercent] = useState(10);
  const [orderType, setOrderType] = useState<"pickup" | "dinein">("pickup");
  const [pickupTime, setPickupTime] = useState("20 min");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const subtotal = getTotal();
  const tip = Math.round(subtotal * tipPercent / 100);
  const grandTotal = subtotal + tip;

  const handleConfirm = () => {
    const newErrors: Record<string, boolean> = {};
    if (!name.trim()) newErrors.name = true;
    if (!phone.trim()) newErrors.phone = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setConfirmed(true);
  };

  // Success overlay
  if (confirmed) {
    return (
      <div className="px-4 pt-12 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <div className="w-24 h-24 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircleIcon className="w-14 h-14 text-emerald-600" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 mt-6">Pedido Confirmado</h1>
          <p className="text-gray-500 mt-2">Tu orden ha sido recibida</p>
          <div className="mt-6 inline-flex items-center gap-2 bg-gray-100 rounded-2xl px-6 py-3">
            <span className="text-sm text-gray-500">Orden</span>
            <span className="text-xl font-bold text-gray-900">#0234</span>
          </div>
          <div className="mt-4 bg-indigo-50 rounded-2xl px-6 py-4">
            <p className="text-sm text-indigo-600 font-medium">Tiempo estimado</p>
            <p className="text-2xl font-bold text-indigo-700 mt-1">~20 minutos</p>
          </div>
          <div className="mt-8 space-y-3">
            <Link href={`/r/${slug}/track`}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full h-14 bg-indigo-600 text-white font-semibold rounded-2xl"
              >
                Seguir mi pedido
              </motion.button>
            </Link>
            <Link href={`/r/${slug}/menu`}>
              <button className="w-full h-12 text-indigo-600 font-medium">
                Volver al menú
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="px-4 pt-16 text-center">
        <span className="text-6xl">🛒</span>
        <h2 className="text-xl font-bold text-gray-900 mt-6">Tu carrito está vacío</h2>
        <p className="text-gray-500 mt-2">Agrega platos desde el menú para comenzar</p>
        <Link href={`/r/${slug}/menu`}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="mt-8 h-14 px-8 bg-indigo-600 text-white font-semibold rounded-2xl"
          >
            Ver Menú
          </motion.button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 pt-4 pb-8"
    >
      {/* Back button */}
      <Link href={`/r/${slug}/menu`} className="inline-flex items-center gap-1 text-sm text-indigo-600 font-medium mb-4">
        &larr; Volver al menú
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-4">Tu Pedido</h1>

      {/* Cart items */}
      <div className="space-y-3 mb-6">
        <AnimatePresence>
          {items.map((item) => {
            const itemTotal = (item.price + item.modifiers.reduce((s, m) => s + m.price, 0)) * item.quantity;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
                className="bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 p-4"
              >
                <div className="flex gap-3">
                  {/* Placeholder */}
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-2xl shrink-0">
                    {itemEmojis[item.name] || "🍽️"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 -mr-1 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.modifiers.map((m) => m.name).join(", ")}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          <MinusIcon className="w-4 h-4" />
                        </motion.button>
                        <span className="w-6 text-center font-semibold text-gray-900 text-sm">
                          {item.quantity}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </motion.button>
                      </div>

                      <span className="font-semibold text-gray-900 text-sm">{formatCLP(itemTotal)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 p-4 mb-4 space-y-4">
        <h2 className="font-semibold text-gray-900">Resumen</h2>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium text-gray-900">{formatCLP(subtotal)}</span>
        </div>

        {/* Tip */}
        <div>
          <p className="text-sm text-gray-500 mb-2">Propina</p>
          <div className="flex gap-2">
            {tipOptions.map((pct) => (
              <motion.button
                key={pct}
                whileTap={{ scale: 0.93 }}
                onClick={() => setTipPercent(pct)}
                className={cn(
                  "flex-1 h-10 rounded-xl text-sm font-medium transition-colors",
                  tipPercent === pct
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {pct}%
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex justify-between pt-3 border-t border-gray-100">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="font-bold text-lg text-gray-900">{formatCLP(grandTotal)}</span>
        </div>
      </div>

      {/* Order type */}
      <div className="bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 p-4 mb-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Tipo de pedido</h2>
        <div className="flex gap-3">
          {[
            { key: "pickup" as const, label: "Retiro en Local" },
            { key: "dinein" as const, label: "Comer aquí" },
          ].map((opt) => (
            <label
              key={opt.key}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border-2 cursor-pointer transition-colors text-sm font-medium",
                orderType === opt.key
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              <input
                type="radio"
                name="orderType"
                value={opt.key}
                checked={orderType === opt.key}
                onChange={() => setOrderType(opt.key)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>

        {/* Pickup time */}
        {orderType === "pickup" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <label className="block text-sm text-gray-500 mb-1">Tiempo de retiro</label>
            <select
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="w-full h-12 rounded-xl bg-gray-100 px-4 text-gray-900 border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              {pickupTimes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </motion.div>
        )}
      </div>

      {/* Customer form */}
      <div className="bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 p-4 mb-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Tus datos</h2>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Nombre *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: false })); }}
            className={cn(
              "w-full h-12 rounded-xl bg-gray-100 px-4 text-gray-900 border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
              errors.name && "ring-2 ring-red-400"
            )}
            placeholder="Tu nombre"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">Nombre es requerido</p>}
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Teléfono *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: false })); }}
            className={cn(
              "w-full h-12 rounded-xl bg-gray-100 px-4 text-gray-900 border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
              errors.phone && "ring-2 ring-red-400"
            )}
            placeholder="+56 9 1234 5678"
          />
          {errors.phone && <p className="text-xs text-red-500 mt-1">Teléfono es requerido</p>}
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-gray-100 px-4 py-3 text-gray-900 border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
            placeholder="Alguna indicación especial..."
          />
        </div>
      </div>

      {/* Confirm button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleConfirm}
        className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-indigo-500/30 transition-all"
      >
        Confirmar Pedido · {formatCLP(grandTotal)}
      </motion.button>
    </motion.div>
  );
}
