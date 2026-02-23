"use client";

import { use, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Package,
  CheckCircle2,
  ChefHat,
  Utensils,
  Clock,
  Loader2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: string;
  modifiers: unknown;
  notes: string | null;
}

interface Order {
  id: string;
  status: string;
  type: string;
  customerName: string | null;
  total: string;
  notes: string | null;
  createdAt: string;
  estimatedReadyAt: string | null;
  organizationId: string;
  items: OrderItem[];
}

interface EstimateData {
  estimatedMinutes: number;
}

// ── Constants ────────────────────────────────────────────

const STATUS_TO_STEP: Record<string, number> = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  served: 3,
  completed: 4,
};

const STEPS = [
  { label: "Recibido", icon: Package },
  { label: "Aceptado", icon: CheckCircle2 },
  { label: "Preparando", icon: ChefHat },
  { label: "Listo", icon: Utensils },
  { label: "Entregado", icon: CheckCircle2 },
];

// ── Helpers ──────────────────────────────────────────────

function formatCLP(value: string | number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

// ── Page Component ───────────────────────────────────────

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug, orderId } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/track/${orderId}`);
      if (!res.ok) {
        setError("Orden no encontrada");
        setLoading(false);
        return null;
      }
      const data: Order = await res.json();
      setOrder(data);
      setLoading(false);
      setError(null);
      return data;
    } catch {
      setError("Error al cargar la orden");
      setLoading(false);
      return null;
    }
  }, [orderId]);

  const fetchEstimate = useCallback(
    async (orgId: string) => {
      try {
        const res = await fetch(`/api/orders/estimate?orgId=${orgId}`);
        if (res.ok) {
          const data: EstimateData = await res.json();
          setEstimate(data);
        }
      } catch {
        // Estimate is non-critical; silently ignore
      }
    },
    []
  );

  // Initial fetch
  useEffect(() => {
    fetchOrder().then((data) => {
      if (data && isPreReady(data.status)) {
        fetchEstimate(data.organizationId);
      }
    });
  }, [fetchOrder, fetchEstimate]);

  // Poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetchOrder();
      if (data && isPreReady(data.status)) {
        fetchEstimate(data.organizationId);
      } else {
        setEstimate(null);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchOrder, fetchEstimate]);

  // ── Loading State ──────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <p className="text-4xl mb-4">😕</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Orden no encontrada
          </h2>
          <p className="text-gray-500 text-sm">
            No pudimos encontrar la orden solicitada. Verifica el enlace e
            intenta nuevamente.
          </p>
        </div>
      </div>
    );
  }

  // ── Cancelled State ────────────────────────────────────

  if (order.status === "cancelled") {
    return (
      <div className="min-h-screen bg-gray-50 px-4 pt-6 pb-8">
        <div className="max-w-md mx-auto">
          <Header orderId={order.id} />
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <p className="text-5xl mb-4">😞</p>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Orden Cancelada
            </h2>
            <p className="text-gray-500 text-sm">
              Lo sentimos, tu orden ha sido cancelada. Si tienes dudas,
              contacta al restaurante.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Tracking View ─────────────────────────────────

  const currentStep = STATUS_TO_STEP[order.status] ?? 0;
  const showEstimate = isPreReady(order.status);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 px-4 pt-6 pb-8"
    >
      <div className="max-w-md mx-auto">
        <Header orderId={order.id} />

        {/* Estimated Time Card */}
        {showEstimate && (estimate || order.estimatedReadyAt) && (
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-orange-700 font-medium">
                  Tiempo estimado
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {estimate
                    ? `~${estimate.estimatedMinutes} min`
                    : formatEstimatedTime(order.estimatedReadyAt)}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Progress Steps */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 p-5 mb-6"
        >
          <h2 className="font-semibold text-gray-900 mb-5">
            Estado del pedido
          </h2>
          <div className="relative">
            {STEPS.map((step, i) => {
              const isLast = i === STEPS.length - 1;
              const isDone = i < currentStep;
              const isCurrent = i === currentStep;
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.label}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.25 + i * 0.08 }}
                  className="flex gap-4 relative"
                >
                  {/* Vertical line */}
                  {!isLast && (
                    <div className="absolute left-[19px] top-10 bottom-0 w-0.5">
                      <div
                        className={
                          isDone ? "w-full h-full bg-orange-500" : "w-full h-full bg-gray-200"
                        }
                      />
                    </div>
                  )}

                  {/* Icon circle */}
                  <div className="relative z-10 shrink-0">
                    {isDone && (
                      <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {isCurrent && (
                      <div className="relative">
                        <motion.div
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{
                            repeat: Infinity,
                            duration: 2,
                            ease: "easeInOut",
                          }}
                          className="absolute inset-0 rounded-full bg-orange-400/30"
                        />
                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center relative">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}
                    {!isDone && !isCurrent && (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <div className={isLast ? "pb-0" : "pb-8"}>
                    <p
                      className={`font-medium text-sm leading-10 ${
                        isDone
                          ? "text-gray-900"
                          : isCurrent
                            ? "text-orange-600 font-semibold"
                            : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-orange-500 -mt-2"
                      >
                        En progreso...
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Order Items */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 p-5 mb-6"
        >
          <h2 className="font-semibold text-gray-900 mb-3">
            Detalle del pedido
          </h2>
          <div className="space-y-2.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.quantity}x Item
                </span>
                <span className="font-medium text-gray-900">
                  {formatCLP(
                    Number(item.unitPrice) * item.quantity
                  )}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100 flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-gray-900">
                {formatCLP(order.total)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Customer name footer */}
        {order.customerName && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-center text-sm text-gray-400"
          >
            Pedido para{" "}
            <span className="font-medium text-gray-600">
              {order.customerName}
            </span>
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

// ── Sub-components & utilities ───────────────────────────

function Header({ orderId }: { orderId: string }) {
  const shortId = orderId.slice(0, 8).toUpperCase();
  return (
    <div className="text-center mb-8">
      <p className="text-sm text-gray-500">Tu Pedido</p>
      <motion.h1
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-3xl font-bold text-gray-900 mt-1"
      >
        #{shortId}
      </motion.h1>
    </div>
  );
}

function isPreReady(status: string): boolean {
  return ["pending", "accepted", "preparing"].includes(status);
}

function formatEstimatedTime(isoDate: string | null): string {
  if (!isoDate) return "";
  const target = new Date(isoDate);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));
  return `~${diffMin} min`;
}
