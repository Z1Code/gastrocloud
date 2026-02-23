// src/app/(restaurant-admin)/menu/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Tag,
  Flame,
  Pencil,
  Trash2,
  FolderPlus,
  MoreVertical,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CategoryDrawer } from "@/components/category-drawer";
import { MenuItemDrawer } from "@/components/menu-item-drawer";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const stationLabels: Record<string, string> = {
  kitchen: "Cocina",
  bar: "Bar",
  grill: "Parrilla",
  dessert: "Pastelería",
};

const stationColors: Record<string, string> = {
  kitchen: "bg-orange-500/20 text-orange-300",
  bar: "bg-rose-500/20 text-rose-300",
  grill: "bg-red-500/20 text-red-300",
  dessert: "bg-pink-500/20 text-pink-300",
};

interface Category {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
}

interface Modifier {
  name: string;
  priceAdjustment: string;
  isDefault: boolean;
}

interface MenuItem {
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
  isAvailable: boolean;
  modifiers: Modifier[];
}

function formatCLP(price: string | number): string {
  return "$" + Number(price).toLocaleString("es-CL");
}

export default function MenuPage() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Drawer states
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemMenuOpen, setItemMenuOpen] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [catsRes, itemsRes] = await Promise.all([
        fetch("/api/menu/categories"),
        fetch("/api/menu/items"),
      ]);
      const cats = await catsRes.json();
      const allItems = await itemsRes.json();

      if (Array.isArray(cats)) setCategories(cats);
      if (Array.isArray(allItems)) setItems(allItems);

      if (!activeCategory && cats.length > 0) {
        setActiveCategory(cats[0].id);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleAvailability(itemId: string) {
    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, isAvailable: !i.isAvailable } : i,
      ),
    );

    try {
      await fetch(`/api/menu/items/${itemId}/availability`, { method: "PATCH" });
    } catch {
      // Revert on failure
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, isAvailable: !i.isAvailable } : i,
        ),
      );
    }
  }

  async function deleteItem(itemId: string) {
    if (!confirm("¿Eliminar este plato?")) return;

    try {
      const res = await fetch(`/api/menu/items/${itemId}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        fetchData(); // Refresh counts
      }
    } catch {
      alert("Error al eliminar");
    }
  }

  async function deleteCategory(catId: string) {
    if (!confirm("¿Eliminar esta categoría?")) return;

    try {
      const res = await fetch(`/api/menu/categories/${catId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        if (activeCategory === catId) {
          setActiveCategory(categories.find((c) => c.id !== catId)?.id ?? null);
        }
      } else {
        const data = await res.json();
        alert(data.error ?? "Error al eliminar");
      }
    } catch {
      alert("Error al eliminar");
    }
  }

  const filtered = items.filter((item) => {
    if (activeCategory && item.categoryId !== activeCategory) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={ref}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 flex-wrap gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Menú</h1>
          <p className="text-sm text-slate-400 mt-1">
            Administra los platos y precios de tu restaurante
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryDrawerOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <FolderPlus size={16} />
            Categoría
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setItemDrawerOpen(true);
            }}
            disabled={categories.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-shadow disabled:opacity-50"
          >
            <Plus size={16} />
            Agregar Plato
          </button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative mb-6"
      >
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="text"
          placeholder="Buscar en el menú..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
        />
      </motion.div>

      {categories.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center"
        >
          <FolderPlus size={40} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1">
            Crea tu primera categoría
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Empieza organizando tu menú en categorías (ej: Entradas, Platos de Fondo, Postres)
          </p>
          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryDrawerOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-semibold"
          >
            <FolderPlus size={16} />
            Nueva Categoría
          </button>
        </motion.div>
      ) : (
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Categories Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:w-56 shrink-0"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 space-y-1">
              {categories.map((cat) => (
                <div key={cat.id} className="group relative">
                  <button
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                      activeCategory === cat.id
                        ? "bg-gradient-to-r from-orange-500/20 to-rose-500/20 text-white border border-orange-500/20"
                        : "text-slate-400 hover:text-white hover:bg-white/5",
                    )}
                  >
                    <span className="flex-1 truncate">{cat.name}</span>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-md",
                        activeCategory === cat.id
                          ? "bg-orange-500/20 text-orange-300"
                          : "bg-white/5 text-slate-500",
                      )}
                    >
                      {cat.itemCount}
                    </span>
                  </button>
                  {/* Category actions */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCategory(cat);
                        setCategoryDrawerOpen(true);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-orange-400"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCategory(cat.id);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Menu Items Grid */}
          <div className="flex-1">
            <AnimatePresence mode="popLayout">
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {filtered.map((item, i) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={
                      inView
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0, scale: 0.95 }
                    }
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    className={cn(
                      "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden group relative",
                      !item.isAvailable && "opacity-60",
                    )}
                  >
                    {/* Image */}
                    <div className="h-36 bg-gradient-to-br from-orange-500/10 via-rose-500/10 to-amber-500/10 flex items-center justify-center relative overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl opacity-30">🍽️</span>
                      )}
                      {!item.isAvailable && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-xs font-medium text-white bg-red-500/80 px-2.5 py-1 rounded-md">
                            No disponible
                          </span>
                        </div>
                      )}
                      {/* Item actions */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setItemDrawerOpen(true);
                          }}
                          className="w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-white hover:bg-orange-500 transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-white leading-tight">
                          {item.name}
                        </h3>
                        {item.station && (
                          <span
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0 flex items-center gap-1",
                              stationColors[item.station] ??
                                "bg-white/10 text-slate-300",
                            )}
                          >
                            <Flame size={10} />
                            {stationLabels[item.station] ?? item.station}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Tag size={12} className="text-slate-500" />
                          <span className="text-lg font-bold text-white">
                            {formatCLP(item.price)}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleAvailability(item.id)}
                          className={cn(
                            "relative w-10 h-5 rounded-full transition-colors",
                            item.isAvailable
                              ? "bg-gradient-to-r from-orange-500 to-rose-500"
                              : "bg-white/10",
                          )}
                        >
                          <motion.div
                            animate={{ x: item.isAvailable ? 20 : 2 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                            }}
                            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md"
                          />
                        </button>
                      </div>

                      {item.modifiers.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.modifiers.slice(0, 3).map((m, j) => (
                            <span
                              key={j}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500"
                            >
                              {m.name}
                            </span>
                          ))}
                          {item.modifiers.length > 3 && (
                            <span className="text-[10px] text-slate-600">
                              +{item.modifiers.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {filtered.length === 0 && !loading && (
              <div className="text-center py-20 text-slate-500">
                <Search size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No se encontraron platos</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawers */}
      <CategoryDrawer
        open={categoryDrawerOpen}
        onClose={() => setCategoryDrawerOpen(false)}
        onSaved={fetchData}
        category={editingCategory}
      />
      <MenuItemDrawer
        open={itemDrawerOpen}
        onClose={() => setItemDrawerOpen(false)}
        onSaved={fetchData}
        categories={categories}
        item={editingItem}
      />
    </div>
  );
}
