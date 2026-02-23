// src/components/menu-item-drawer.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Plus, Trash2 } from "lucide-react";
import { ImageUpload } from "./image-upload";

const stationOptions = [
  { value: "kitchen", label: "Cocina" },
  { value: "bar", label: "Bar" },
  { value: "grill", label: "Parrilla" },
  { value: "dessert", label: "Pastelería" },
];

interface Category {
  id: string;
  name: string;
}

interface Modifier {
  name: string;
  priceAdjustment: number;
  isDefault: boolean;
}

interface MenuItemData {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  prepTimeMinutes: number | null;
  ingredients: string[] | null;
  allergens: string[] | null;
  station: string | null;
  modifiers: { name: string; priceAdjustment: string; isDefault: boolean }[];
}

interface MenuItemDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  item?: MenuItemData | null;
}

export function MenuItemDrawer({
  open,
  onClose,
  onSaved,
  categories,
  item,
}: MenuItemDrawerProps) {
  const isEditing = !!item;

  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [prepTime, setPrepTime] = useState("");
  const [station, setStation] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [allergensText, setAllergensText] = useState("");
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setCategoryId(item.categoryId);
      setName(item.name);
      setDescription(item.description ?? "");
      setPrice(item.price);
      setImageUrl(item.imageUrl);
      setPrepTime(item.prepTimeMinutes?.toString() ?? "");
      setStation(item.station ?? "");
      setIngredientsText(
        Array.isArray(item.ingredients) ? item.ingredients.join(", ") : "",
      );
      setAllergensText(
        Array.isArray(item.allergens) ? item.allergens.join(", ") : "",
      );
      setModifiers(
        item.modifiers?.map((m) => ({
          name: m.name,
          priceAdjustment: Number(m.priceAdjustment),
          isDefault: m.isDefault,
        })) ?? [],
      );
    } else {
      setCategoryId(categories[0]?.id ?? "");
      setName("");
      setDescription("");
      setPrice("");
      setImageUrl(null);
      setPrepTime("");
      setStation("");
      setIngredientsText("");
      setAllergensText("");
      setModifiers([]);
    }
    setError("");
  }, [item, open, categories]);

  function addModifier() {
    setModifiers([...modifiers, { name: "", priceAdjustment: 0, isDefault: false }]);
  }

  function removeModifier(index: number) {
    setModifiers(modifiers.filter((_, i) => i !== index));
  }

  function updateModifier(index: number, field: keyof Modifier, value: string | number | boolean) {
    setModifiers(
      modifiers.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price || !categoryId) return;

    setSaving(true);
    setError("");

    const parseList = (text: string) =>
      text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    const payload = {
      categoryId,
      name,
      description,
      price: Number(price),
      imageUrl,
      prepTimeMinutes: prepTime ? Number(prepTime) : null,
      station: station || null,
      ingredients: ingredientsText ? parseList(ingredientsText) : null,
      allergens: allergensText ? parseList(allergensText) : null,
      modifiers: modifiers.filter((m) => m.name.trim()),
    };

    try {
      const url = isEditing ? `/api/menu/items/${item.id}` : "/api/menu/items";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
            className="fixed right-0 top-0 h-full w-full max-w-lg z-50 bg-[#0a0a1a] border-l border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-16 border-b border-white/[0.06] shrink-0">
              <h2 className="text-lg font-semibold text-white">
                {isEditing ? "Editar Plato" : "Nuevo Plato"}
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
              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Imagen
                </label>
                <ImageUpload value={imageUrl} onChange={setImageUrl} />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre del plato
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Pastel de Choclo"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>

              {/* Category + Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Categoría
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Precio (CLP)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="12500"
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descripción <span className="text-slate-500">(opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Preparado con choclo fresco..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all resize-none"
                />
              </div>

              {/* Station + Prep Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Estación
                  </label>
                  <select
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  >
                    <option value="" className="bg-slate-900">Sin asignar</option>
                    {stationOptions.map((s) => (
                      <option key={s.value} value={s.value} className="bg-slate-900">
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tiempo prep (min)
                  </label>
                  <input
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    placeholder="15"
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Ingredients + Allergens */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Ingredientes <span className="text-slate-500">(separados por coma)</span>
                </label>
                <input
                  type="text"
                  value={ingredientsText}
                  onChange={(e) => setIngredientsText(e.target.value)}
                  placeholder="Choclo, carne, cebolla, huevo"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Alérgenos <span className="text-slate-500">(separados por coma)</span>
                </label>
                <input
                  type="text"
                  value={allergensText}
                  onChange={(e) => setAllergensText(e.target.value)}
                  placeholder="Gluten, lácteos"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                />
              </div>

              {/* Modifiers Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-300">
                    Modificadores
                  </label>
                  <button
                    type="button"
                    onClick={addModifier}
                    className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    <Plus size={14} />
                    Agregar
                  </button>
                </div>
                {modifiers.length === 0 && (
                  <p className="text-xs text-slate-500">
                    Ej: Tamaño grande (+$2.000), Sin cebolla, Extra queso (+$1.500)
                  </p>
                )}
                <div className="space-y-2">
                  {modifiers.map((mod, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={mod.name}
                        onChange={(e) => updateModifier(i, "name", e.target.value)}
                        placeholder="Nombre"
                        className="flex-1 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 transition-all"
                      />
                      <input
                        type="number"
                        value={mod.priceAdjustment}
                        onChange={(e) =>
                          updateModifier(i, "priceAdjustment", Number(e.target.value))
                        }
                        placeholder="± Precio"
                        className="w-24 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => removeModifier(i)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] shrink-0">
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={saving || !name.trim() || !price || !categoryId}
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
                  "Crear Plato"
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
