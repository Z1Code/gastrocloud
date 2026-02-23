// src/components/table-qr-modal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface TableQRModalProps {
  open: boolean;
  onClose: () => void;
  table: { number: number; zone: string | null; qrCode: string } | null;
}

function downloadSVG(tableNumber: number) {
  const svg = document.getElementById("table-qr-svg");
  if (!svg) return;
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svg);
  const blob = new Blob([svgStr], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mesa-${tableNumber}-qr.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TableQRModal({ open, onClose, table }: TableQRModalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!table) return;
    await navigator.clipboard.writeText(table.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AnimatePresence>
      {open && table && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 pointer-events-none"
          >
            <div className="max-w-sm mx-auto mt-[15vh] bg-[#0a0a1a] border border-white/10 rounded-2xl p-6 pointer-events-auto relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>

              {/* Title */}
              <h2 className="text-lg font-semibold text-white mb-1">
                QR Mesa {table.number}
              </h2>
              {table.zone && (
                <p className="text-sm text-slate-400 mb-4">{table.zone}</p>
              )}
              {!table.zone && <div className="mb-4" />}

              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="bg-white rounded-xl p-4">
                  <QRCodeSVG
                    id="table-qr-svg"
                    value={table.qrCode}
                    size={256}
                    level="H"
                    bgColor="white"
                    fgColor="black"
                  />
                </div>
              </div>

              {/* URL */}
              <p className="text-xs text-slate-500 font-mono text-center break-all mb-5">
                {table.qrCode}
              </p>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => downloadSVG(table.number)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 transition-all"
                >
                  <Download size={16} />
                  Descargar SVG
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                >
                  {copied ? (
                    <>
                      <Check size={16} className="text-green-400" />
                      <span className="text-green-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copiar Link
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
