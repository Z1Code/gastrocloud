// src/components/table-drawer.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";

interface TableData {
  id: string;
  number: number;
  zone: string | null;
  capacity: number;
  status: string;
}

interface TableDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  table?: TableData | null;
  bulkMode?: boolean;
}

export function TableDrawer({
  open,
  onClose,
  onSaved,
  table,
  bulkMode,
}: TableDrawerProps) {
  const isEditing = !!table && !bulkMode;

  const [number, setNumber] = useState("");
  const [zone, setZone] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [count, setCount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (table && !bulkMode) {
      setNumber(table.number.toString());
      setZone(table.zone ?? "");
      setCapacity(table.capacity.toString());
    } else {
      setNumber("");
      setZone("");
      setCapacity("4");
      setCount("");
    }
    setError("");
  }, [table, open, bulkMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (bulkMode) {
      if (!count || Number(count) < 1) return;
    } else {
      if (!number) return;
    }

    setSaving(true);
    setError("");

    try {
      if (isEditing) {
        const res = await fetch(`/api/tables/${table.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: Number(number),
            zone: zone || null,
            capacity: Number(capacity),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Error al guardar");
          return;
        }
      } else if (bulkMode) {
        const res = await fetch("/api/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            count: Number(count),
            zone: zone || null,
            capacity: Number(capacity),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Error al guardar");
          return;
        }
      } else {
        const res = await fetch("/api/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: Number(number),
            zone: zone || null,
            capacity: Number(capacity),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Error al guardar");
          return;
        }
      }

      onSaved();
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = bulkMode
    ? !!count && Number(count) >= 1
    : !!number;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-[#0a0a1a] border-l border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-16 border-b border-white/[0.06] shrink-0">
              <h2 className="text-lg font-semibold text-white">
                {bulkMode
                  ? "Agregar Múltiples Mesas"
                  : isEditing
                    ? "Editar Mesa"
                    : "Nueva Mesa"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {bulkMode ? (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    placeholder="¿Cuántas mesas crear?"
                    min={1}
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Número
                  </label>
                  <input
                    type="number"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="1"
                    min={1}
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Zona
                </label>
                <input
                  type="text"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="Ej: Salón, Terraza, Barra"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Capacidad
                </label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="4"
                  min={1}
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] shrink-0">
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={saving || !canSubmit}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : isEditing ? (
                  "Guardar Cambios"
                ) : bulkMode ? (
                  "Crear Mesas"
                ) : (
                  "Crear Mesa"
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
