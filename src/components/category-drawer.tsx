"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface CategoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  category?: Category | null;
}

export function CategoryDrawer({ open, onClose, onSaved, category }: CategoryDrawerProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!category;

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description ?? "");
    } else {
      setName("");
      setDescription("");
    }
    setError("");
  }, [category, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError("");

    try {
      const url = isEditing
        ? `/api/menu/categories/${category.id}`
        : "/api/menu/categories";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al guardar");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

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
            <div className="flex items-center justify-between px-6 h-16 border-b border-white/[0.06] shrink-0">
              <h2 className="text-lg font-semibold text-white">
                {isEditing ? "Editar Categoría" : "Nueva Categoría"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Entradas"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descripción <span className="text-slate-500">(opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Platos para empezar"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </form>

            <div className="px-6 py-4 border-t border-white/[0.06] shrink-0">
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={saving || !name.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : isEditing ? (
                  "Guardar Cambios"
                ) : (
                  "Crear Categoría"
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
