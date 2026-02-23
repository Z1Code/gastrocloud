// src/components/order-print.tsx
"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface PrintableOrderItem {
  id: string;
  quantity: number;
  unitPrice: string;
  modifiers: any;
  station: string | null;
  notes: string | null;
}

interface PrintableOrder {
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
  items: PrintableOrderItem[];
  payments: { method: string; status: string; amount: string }[];
}

const sourceLabels: Record<string, string> = {
  web: "Web",
  qr_table: "Mesa QR",
  uber_eats: "Uber Eats",
  rappi: "Rappi",
  whatsapp: "WhatsApp",
  pos_inhouse: "POS",
};

interface OrderPrintProps {
  order: PrintableOrder;
  onClose: () => void;
}

export function OrderPrint({ order, onClose }: OrderPrintProps) {
  useEffect(() => {
    const timeout = setTimeout(() => {
      window.print();
      onClose();
    }, 200);
    return () => clearTimeout(timeout);
  }, [onClose]);

  const formatCLP = (value: string) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Number(value));

  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <style jsx global>{`
        @media print {
          body > *:not(.print-overlay) {
            display: none !important;
          }
          .print-overlay {
            position: static !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>

      <div className="print-overlay fixed inset-0 z-[100] bg-white flex items-start justify-center overflow-auto">
        {/* Close button - hidden in print */}
        <button
          onClick={onClose}
          className="no-print fixed top-4 right-4 z-[101] flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
        >
          <X size={16} />
          Cerrar
        </button>

        {/* Receipt content */}
        <div className="max-w-[300px] w-full mx-auto p-4 font-mono text-xs text-black">
          {/* Header */}
          <div className="text-center mb-2">
            <p className="text-sm font-bold">GASTROCLOUD</p>
            <p className="text-[10px]">Comanda</p>
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Order info */}
          <div className="space-y-0.5 mb-2">
            <p>Pedido: #{order.id.slice(0, 8).toUpperCase()}</p>
            <p>Origen: {sourceLabels[order.source] ?? order.source}</p>
            <p>Fecha: {dateStr} {timeStr}</p>
            {order.customerName && <p>Cliente: {order.customerName}</p>}
            {order.customerPhone && <p>Tel: {order.customerPhone}</p>}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Items */}
          <div className="space-y-1.5 mb-2">
            {order.items.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between">
                  <span>{item.quantity} x Item</span>
                  <span>{formatCLP(item.unitPrice)}</span>
                </div>
                {item.modifiers &&
                  typeof item.modifiers === "object" &&
                  Object.keys(item.modifiers).length > 0 && (
                    <p className="pl-2 text-[10px]">
                      Mod:{" "}
                      {Array.isArray(item.modifiers)
                        ? item.modifiers.join(", ")
                        : JSON.stringify(item.modifiers)}
                    </p>
                  )}
                {item.notes && (
                  <p className="pl-2 text-[10px] italic">
                    Nota: {item.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Totals */}
          <div className="space-y-0.5 mb-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCLP(order.subtotal)}</span>
            </div>
            {Number(order.tip) > 0 && (
              <div className="flex justify-between">
                <span>Propina</span>
                <span>{formatCLP(order.tip)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <span>TOTAL</span>
              <span>{formatCLP(order.total)}</span>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <p className="text-[10px]">Nota: {order.notes}</p>
            </>
          )}

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Footer */}
          <p className="text-center text-[10px]">--- Gracias ---</p>
        </div>
      </div>
    </>
  );
}
