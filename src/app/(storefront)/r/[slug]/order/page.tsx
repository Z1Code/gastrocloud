"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
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

/* ── Constants ────────────────────────────────────────── */

const tipOptions = [0, 10, 15, 20];

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

function generateScheduleTimes(): string[] {
  const times: string[] = [];
  const now = new Date();
  // Start from next 15-min slot
  const minutes = now.getMinutes();
  const nextSlot = Math.ceil((minutes + 30) / 15) * 15; // at least 30 min from now
  const start = new Date(now);
  start.setMinutes(nextSlot, 0, 0);

  for (let i = 0; i < 12; i++) {
    const t = new Date(start.getTime() + i * 15 * 60 * 1000);
    if (t.getHours() >= 23) break;
    times.push(t.toTimeString().slice(0, 5)); // "HH:MM"
  }
  return times;
}

/* ── Page ────────────────────────────────────────────── */

export default function OrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const getTotal = useCartStore((s) => s.getTotal);

  const [tipPercent, setTipPercent] = useState(10);
  const [orderType, setOrderType] = useState<"pickup" | "dinein" | "scheduled">("pickup");
  const [scheduledTime, setScheduledTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [availableGateways, setAvailableGateways] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"local" | "mercadopago" | "transbank">("local");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const scheduleTimes = generateScheduleTimes();

  // Check for payment return status
  const paymentStatus = searchParams.get("payment");

  // Fetch available gateways
  useEffect(() => {
    fetch(`/api/storefront/${slug}/config`)
      .then((res) => res.json())
      .then((data) => {
        if (data.availableGateways) {
          setAvailableGateways(data.availableGateways);
        }
      })
      .catch(() => {});
  }, [slug]);

  const subtotal = getTotal();
  const tip = Math.round(subtotal * tipPercent / 100);
  const grandTotal = subtotal + tip;

  const handleConfirm = async () => {
    const newErrors: Record<string, boolean> = {};
    if (!name.trim()) newErrors.name = true;
    if (!phone.trim()) newErrors.phone = true;
    if (orderType === "scheduled" && !scheduledTime) newErrors.scheduledTime = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setPaymentError(null);

    // If paying online, redirect to payment gateway
    if (paymentMethod !== "local") {
      setIsProcessing(true);
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            gateway: paymentMethod,
            items: items.map((item) => ({
              menuItemId: item.menuItemId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.price,
            })),
            customerName: name,
            customerPhone: phone,
            notes,
            orderType: orderType === "scheduled" ? "pickup_scheduled" : orderType === "dinein" ? "dine_in" : "takeaway",
            tipAmount: tip,
            scheduledAt: orderType === "scheduled" && scheduledTime
              ? new Date(`${new Date().toISOString().split("T")[0]}T${scheduledTime}:00`).toISOString()
              : undefined,
          }),
        });
        const data = await res.json();
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        }
        setPaymentError(data.error || "Error al procesar el pago");
      } catch {
        setPaymentError("Error de conexion");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setConfirmed(true);
  };

  // Payment return error
  if (paymentStatus === "failure" || paymentStatus === "error") {
    return (
      <div className="px-4 pt-12 text-center">
        <div className="w-24 h-24 mx-auto rounded-full bg-red-100 flex items-center justify-center">
          <XIcon className="w-14 h-14 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--sf-text)] mt-6">Error en el Pago</h1>
        <p className="text-[var(--sf-text-muted)] mt-2">No se pudo procesar tu pago. Intenta nuevamente.</p>
        <Link href={`/r/${slug}/order`}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="mt-8 h-14 px-8 text-white font-semibold rounded-2xl bg-[var(--sf-primary)]"
          >
            Intentar de Nuevo
          </motion.button>
        </Link>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-[var(--sf-text)] mt-6">Pedido Confirmado</h1>
          <p className="text-[var(--sf-text-muted)] mt-2">Tu orden ha sido recibida</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-2xl px-6 py-3 bg-[var(--sf-surface)]">
            <span className="text-sm text-[var(--sf-text-muted)]">Orden</span>
            <span className="text-xl font-bold text-[var(--sf-text)]">#0234</span>
          </div>
          {orderType === "scheduled" && scheduledTime && (
            <div className="mt-4 rounded-2xl px-6 py-4" style={{ background: `color-mix(in srgb, var(--sf-primary) 10%, var(--sf-bg))` }}>
              <p className="text-sm font-medium text-[var(--sf-primary)]">Hora programada</p>
              <p className="text-2xl font-bold text-[var(--sf-text)] mt-1">{scheduledTime} hrs</p>
            </div>
          )}
          <div className="mt-4 rounded-2xl px-6 py-4" style={{ background: `color-mix(in srgb, var(--sf-primary) 10%, var(--sf-bg))` }}>
            <p className="text-sm font-medium text-[var(--sf-primary)]">Tiempo estimado</p>
            <p className="text-2xl font-bold text-[var(--sf-text)] mt-1">~20 minutos</p>
          </div>
          <div className="mt-8 space-y-3">
            <Link href={`/r/${slug}/track`}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full h-14 text-white font-semibold rounded-2xl bg-[var(--sf-primary)]"
              >
                Seguir mi pedido
              </motion.button>
            </Link>
            <Link href={`/r/${slug}/menu`}>
              <button className="w-full h-12 font-medium text-[var(--sf-primary)]">
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
        <h2 className="text-xl font-bold text-[var(--sf-text)] mt-6">Tu carrito está vacío</h2>
        <p className="text-[var(--sf-text-muted)] mt-2">Agrega platos desde el menú para comenzar</p>
        <Link href={`/r/${slug}/menu`}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="mt-8 h-14 px-8 text-white font-semibold rounded-2xl bg-[var(--sf-primary)]"
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
      <Link href={`/r/${slug}/menu`} className="inline-flex items-center gap-1 text-sm font-medium mb-4 text-[var(--sf-primary)]">
        &larr; Volver al menú
      </Link>

      <h1 className="text-xl font-bold text-[var(--sf-text)] mb-4">Tu Pedido</h1>

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
                className="rounded-2xl shadow-lg shadow-black/5 border p-4 bg-[var(--sf-surface)] border-[var(--sf-text)]/10"
              >
                <div className="flex gap-3">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: `linear-gradient(135deg, color-mix(in srgb, var(--sf-primary) 10%, var(--sf-bg)), color-mix(in srgb, var(--sf-secondary) 10%, var(--sf-bg)))` }}
                  >
                    {itemEmojis[item.name] || "🍽️"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-[var(--sf-text)] text-sm">{item.name}</h3>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 -mr-1 text-[var(--sf-text-muted)] hover:text-red-500 transition-colors"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">
                        {item.modifiers.map((m) => m.name).join(", ")}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-[var(--sf-bg)] text-[var(--sf-text)]"
                        >
                          <MinusIcon className="w-4 h-4" />
                        </motion.button>
                        <span className="w-6 text-center font-semibold text-[var(--sf-text)] text-sm">
                          {item.quantity}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-[var(--sf-bg)] text-[var(--sf-text)]"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </motion.button>
                      </div>
                      <span className="font-semibold text-[var(--sf-text)] text-sm">{formatCLP(itemTotal)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Order summary */}
      <div className="rounded-2xl shadow-lg shadow-black/5 border p-4 mb-4 space-y-4 bg-[var(--sf-surface)] border-[var(--sf-text)]/10">
        <h2 className="font-semibold text-[var(--sf-text)]">Resumen</h2>

        <div className="flex justify-between text-sm">
          <span className="text-[var(--sf-text-muted)]">Subtotal</span>
          <span className="font-medium text-[var(--sf-text)]">{formatCLP(subtotal)}</span>
        </div>

        {/* Tip */}
        <div>
          <p className="text-sm text-[var(--sf-text-muted)] mb-2">Propina</p>
          <div className="flex gap-2">
            {tipOptions.map((pct) => (
              <motion.button
                key={pct}
                whileTap={{ scale: 0.93 }}
                onClick={() => setTipPercent(pct)}
                className={cn(
                  "flex-1 h-10 rounded-xl text-sm font-medium transition-colors",
                  tipPercent === pct
                    ? "text-white bg-[var(--sf-primary)]"
                    : "text-[var(--sf-text)] bg-[var(--sf-bg)] hover:opacity-80"
                )}
              >
                {pct}%
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex justify-between pt-3 border-t border-[var(--sf-text)]/10">
          <span className="font-semibold text-[var(--sf-text)]">Total</span>
          <span className="font-bold text-lg text-[var(--sf-text)]">{formatCLP(grandTotal)}</span>
        </div>
      </div>

      {/* Order type */}
      <div className="rounded-2xl shadow-lg shadow-black/5 border p-4 mb-4 space-y-3 bg-[var(--sf-surface)] border-[var(--sf-text)]/10">
        <h2 className="font-semibold text-[var(--sf-text)]">Tipo de pedido</h2>
        <div className="flex gap-2">
          {[
            { key: "pickup" as const, label: "Retiro" },
            { key: "dinein" as const, label: "Comer aquí" },
            { key: "scheduled" as const, label: "Vengo a las..." },
          ].map((opt) => (
            <label
              key={opt.key}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 h-12 rounded-xl border-2 cursor-pointer transition-colors text-sm font-medium",
                orderType === opt.key
                  ? "border-[var(--sf-primary)] text-[var(--sf-primary)]"
                  : "border-[var(--sf-text)]/20 text-[var(--sf-text-muted)] hover:border-[var(--sf-text)]/30"
              )}
              style={orderType === opt.key ? { backgroundColor: `color-mix(in srgb, var(--sf-primary) 10%, var(--sf-bg))` } : undefined}
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

        {/* Scheduled time picker */}
        {orderType === "scheduled" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <label className="block text-sm text-[var(--sf-text-muted)] mb-1">Vengo a las...</label>
            <select
              value={scheduledTime}
              onChange={(e) => { setScheduledTime(e.target.value); setErrors((p) => ({ ...p, scheduledTime: false })); }}
              className={cn(
                "w-full h-12 rounded-xl px-4 border-0 focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary)]/30 bg-[var(--sf-bg)] text-[var(--sf-text)]",
                errors.scheduledTime && "ring-2 ring-red-400"
              )}
            >
              <option value="">Selecciona una hora</option>
              {scheduleTimes.map((t) => (
                <option key={t} value={t}>{t} hrs</option>
              ))}
            </select>
            {errors.scheduledTime && <p className="text-xs text-red-500 mt-1">Selecciona una hora</p>}
          </motion.div>
        )}
      </div>

      {/* Payment method - only show if gateways are available */}
      {availableGateways.length > 0 && (
        <div className="rounded-2xl shadow-lg shadow-black/5 border p-4 mb-4 space-y-3 bg-[var(--sf-surface)] border-[var(--sf-text)]/10">
          <h2 className="font-semibold text-[var(--sf-text)]">Método de pago</h2>
          <div className="space-y-2">
            <label
              className={cn(
                "flex items-center gap-3 h-14 rounded-xl border-2 cursor-pointer px-4 transition-colors",
                paymentMethod === "local"
                  ? "border-[var(--sf-primary)]"
                  : "border-[var(--sf-text)]/20"
              )}
              style={paymentMethod === "local" ? { backgroundColor: `color-mix(in srgb, var(--sf-primary) 10%, var(--sf-bg))` } : undefined}
            >
              <input type="radio" name="payment" value="local" checked={paymentMethod === "local"} onChange={() => setPaymentMethod("local")} className="sr-only" />
              <span className="text-xl">💵</span>
              <span className="text-sm font-medium text-[var(--sf-text)]">Pagar en local</span>
            </label>

            {availableGateways.includes("mercadopago") && (
              <label
                className={cn(
                  "flex items-center gap-3 h-14 rounded-xl border-2 cursor-pointer px-4 transition-colors",
                  paymentMethod === "mercadopago"
                    ? "border-[var(--sf-primary)]"
                    : "border-[var(--sf-text)]/20"
                )}
                style={paymentMethod === "mercadopago" ? { backgroundColor: `color-mix(in srgb, var(--sf-primary) 10%, var(--sf-bg))` } : undefined}
              >
                <input type="radio" name="payment" value="mercadopago" checked={paymentMethod === "mercadopago"} onChange={() => setPaymentMethod("mercadopago")} className="sr-only" />
                <span className="text-xl">💳</span>
                <span className="text-sm font-medium text-[var(--sf-text)]">Pagar con MercadoPago</span>
              </label>
            )}

            {availableGateways.includes("transbank") && (
              <label
                className={cn(
                  "flex items-center gap-3 h-14 rounded-xl border-2 cursor-pointer px-4 transition-colors",
                  paymentMethod === "transbank"
                    ? "border-[var(--sf-primary)]"
                    : "border-[var(--sf-text)]/20"
                )}
                style={paymentMethod === "transbank" ? { backgroundColor: `color-mix(in srgb, var(--sf-primary) 10%, var(--sf-bg))` } : undefined}
              >
                <input type="radio" name="payment" value="transbank" checked={paymentMethod === "transbank"} onChange={() => setPaymentMethod("transbank")} className="sr-only" />
                <span className="text-xl">🏦</span>
                <span className="text-sm font-medium text-[var(--sf-text)]">Pagar con Webpay</span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Customer form */}
      <div className="rounded-2xl shadow-lg shadow-black/5 border p-4 mb-6 space-y-3 bg-[var(--sf-surface)] border-[var(--sf-text)]/10">
        <h2 className="font-semibold text-[var(--sf-text)]">Tus datos</h2>

        <div>
          <label className="block text-sm text-[var(--sf-text-muted)] mb-1">Nombre *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: false })); }}
            className={cn(
              "w-full h-12 rounded-xl px-4 border-0 focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary)]/30 bg-[var(--sf-bg)] text-[var(--sf-text)]",
              errors.name && "ring-2 ring-red-400"
            )}
            placeholder="Tu nombre"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">Nombre es requerido</p>}
        </div>

        <div>
          <label className="block text-sm text-[var(--sf-text-muted)] mb-1">Teléfono *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: false })); }}
            className={cn(
              "w-full h-12 rounded-xl px-4 border-0 focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary)]/30 bg-[var(--sf-bg)] text-[var(--sf-text)]",
              errors.phone && "ring-2 ring-red-400"
            )}
            placeholder="+56 9 1234 5678"
          />
          {errors.phone && <p className="text-xs text-red-500 mt-1">Teléfono es requerido</p>}
        </div>

        <div>
          <label className="block text-sm text-[var(--sf-text-muted)] mb-1">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl px-4 py-3 border-0 focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary)]/30 resize-none bg-[var(--sf-bg)] text-[var(--sf-text)]"
            placeholder="Alguna indicación especial..."
          />
        </div>
      </div>

      {/* Payment error */}
      {paymentError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {paymentError}
        </div>
      )}

      {/* Confirm button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleConfirm}
        disabled={isProcessing}
        className={cn(
          "w-full h-14 text-white font-bold text-lg rounded-2xl shadow-lg transition-all",
          isProcessing ? "opacity-60 cursor-not-allowed" : ""
        )}
        style={{ background: `linear-gradient(to right, var(--sf-primary), var(--sf-secondary))` }}
      >
        {isProcessing ? "Procesando..." : `Confirmar Pedido · ${formatCLP(grandTotal)}`}
      </motion.button>
    </motion.div>
  );
}
