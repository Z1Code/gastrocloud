// src/components/order-detail-drawer.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer, User, Phone, Clock } from "lucide-react";
import { OrderPrint } from "./order-print";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: string;
  modifiers: any;
  station: string | null;
  notes: string | null;
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
  payments: { method: string; status: string; amount: string }[];
}

interface OrderDetailDrawerProps {
  order: Order | null;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
  onCancel: (orderId: string, reason: string) => void;
}

const sourceLabels: Record<string, string> = {
  web: "Web",
  qr_table: "Mesa QR",
  uber_eats: "Uber Eats",
  rappi: "Rappi",
  whatsapp: "WhatsApp",
  pos_inhouse: "POS",
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

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  accepted: "bg-blue-500/20 text-blue-400",
  preparing: "bg-orange-500/20 text-orange-400",
  ready: "bg-emerald-500/20 text-emerald-400",
  served: "bg-cyan-500/20 text-cyan-400",
  completed: "bg-slate-500/20 text-slate-400",
  cancelled: "bg-red-500/20 text-red-400",
};

const sourceColors: Record<string, string> = {
  web: "bg-blue-500/20 text-blue-400",
  qr_table: "bg-purple-500/20 text-purple-400",
  uber_eats: "bg-green-500/20 text-green-400",
  rappi: "bg-orange-500/20 text-orange-400",
  whatsapp: "bg-emerald-500/20 text-emerald-400",
  pos_inhouse: "bg-slate-500/20 text-slate-400",
};

const stationLabels: Record<string, string> = {
  kitchen: "Cocina",
  bar: "Barra",
  grill: "Parrilla",
  dessert: "Postres",
};

const nextStatusMap: Record<string, { label: string; status: string; color: string }> = {
  pending: { label: "Aceptar Pedido", status: "accepted", color: "from-emerald-500 to-emerald-600" },
  accepted: { label: "Iniciar Preparacion", status: "preparing", color: "from-amber-500 to-amber-600" },
  preparing: { label: "Marcar Listo", status: "ready", color: "from-blue-500 to-blue-600" },
  ready: { label: "Entregar/Completar", status: "served", color: "from-orange-500 to-orange-600" },
  served: { label: "Completar", status: "completed", color: "from-emerald-500 to-emerald-600" },
};

const formatCLP = (value: string) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value));

const cancellableStatuses = new Set(["pending", "accepted", "preparing"]);

export function OrderDetailDrawer({
  order,
  onClose,
  onStatusChange,
  onCancel,
}: OrderDetailDrawerProps) {
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showPrint, setShowPrint] = useState(false);

  const open = !!order;

  function handleClose() {
    setShowCancelForm(false);
    setCancelReason("");
    onClose();
  }

  function handleStatusAdvance() {
    if (!order) return;
    const next = nextStatusMap[order.status];
    if (next) {
      onStatusChange(order.id, next.status);
    }
  }

  function handleCancel() {
    if (!order || !cancelReason.trim()) return;
    onCancel(order.id, cancelReason.trim());
    setShowCancelForm(false);
    setCancelReason("");
  }

  return (
    <>
      <AnimatePresence>
        {open && order && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-lg z-50 bg-[#0a0a1a] border-l border-white/10 flex flex-col"
            >
              {/* Header - sticky */}
              <div className="flex items-center justify-between px-6 h-16 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-white font-mono">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${sourceColors[order.source] ?? "bg-slate-500/20 text-slate-400"}`}
                  >
                    {sourceLabels[order.source] ?? order.source}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColors[order.status] ?? "bg-slate-500/20 text-slate-400"}`}
                  >
                    {statusLabels[order.status] ?? order.status}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowPrint(true)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Imprimir"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Customer Info */}
                <div className="rounded-xl bg-white/5 border border-white/[0.06] p-4 space-y-2.5">
                  {order.customerName && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <User size={14} className="text-slate-500" />
                      <span>{order.customerName}</span>
                    </div>
                  )}
                  {order.customerPhone && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Phone size={14} className="text-slate-500" />
                      <span>{order.customerPhone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Clock size={14} className="text-slate-500" />
                    <span>
                      {new Date(order.createdAt).toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      {new Date(order.createdAt).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3">
                    Items ({order.items.length})
                  </h3>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl bg-white/5 border border-white/[0.06] p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-medium text-white">
                              {item.quantity}x
                            </span>
                            <div>
                              {item.station && (
                                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                                  {stationLabels[item.station] ?? item.station}
                                </span>
                              )}
                              {item.modifiers &&
                                typeof item.modifiers === "object" &&
                                Object.keys(item.modifiers).length > 0 && (
                                  <p className="text-xs text-amber-400 mt-0.5">
                                    {Array.isArray(item.modifiers)
                                      ? item.modifiers.join(", ")
                                      : JSON.stringify(item.modifiers)}
                                  </p>
                                )}
                              {item.notes && (
                                <p className="text-xs text-rose-400 italic mt-0.5">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-white font-medium">
                            {formatCLP(item.unitPrice)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Subtotal</span>
                    <span>{formatCLP(order.subtotal)}</span>
                  </div>
                  {Number(order.tip) > 0 && (
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>Propina</span>
                      <span>{formatCLP(order.tip)}</span>
                    </div>
                  )}
                  {Number(order.discount) > 0 && (
                    <div className="flex justify-between text-sm text-emerald-400">
                      <span>Descuento</span>
                      <span>-{formatCLP(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-white/10">
                    <span>Total</span>
                    <span>{formatCLP(order.total)}</span>
                  </div>
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4">
                    <p className="text-sm text-rose-300">{order.notes}</p>
                  </div>
                )}

                {/* Payments */}
                {order.payments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-2">Pagos</h3>
                    <div className="space-y-1.5">
                      {order.payments.map((payment, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-sm text-slate-300"
                        >
                          <span className="capitalize">{payment.method}</span>
                          <span>{formatCLP(payment.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions - sticky bottom */}
              <div className="px-6 py-4 border-t border-white/[0.06] shrink-0 space-y-3">
                {/* Status advance button */}
                {nextStatusMap[order.status] && (
                  <button
                    onClick={handleStatusAdvance}
                    className={`w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${nextStatusMap[order.status].color} shadow-lg transition-all hover:opacity-90`}
                  >
                    {nextStatusMap[order.status].label}
                  </button>
                )}

                {/* Cancel section */}
                {cancellableStatuses.has(order.status) && !showCancelForm && (
                  <button
                    onClick={() => setShowCancelForm(true)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
                  >
                    Cancelar Pedido
                  </button>
                )}

                {showCancelForm && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Motivo de cancelacion..."
                      className="w-full h-11 px-4 rounded-xl bg-white/5 border border-red-500/30 text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowCancelForm(false);
                          setCancelReason("");
                        }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-white/10 hover:bg-white/5 transition-all"
                      >
                        Volver
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={!cancelReason.trim()}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-all"
                      >
                        Confirmar Cancelacion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Print overlay */}
      {showPrint && order && (
        <OrderPrint order={order} onClose={() => setShowPrint(false)} />
      )}
    </>
  );
}
