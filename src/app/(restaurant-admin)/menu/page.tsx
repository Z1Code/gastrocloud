"use client";

import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Tag,
  Flame,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/* ── Types ─────────────────────────────────────────────── */
interface MenuItem {
  id: number;
  name: string;
  price: string;
  category: string;
  station: string;
  available: boolean;
  emoji: string;
}

/* ── Data ──────────────────────────────────────────────── */
const categories = [
  { name: "Entradas", count: 4, emoji: "\ud83e\udd5f" },
  { name: "Platos de Fondo", count: 4, emoji: "\ud83c\udf56" },
  { name: "Ensaladas", count: 3, emoji: "\ud83e\udd57" },
  { name: "Postres", count: 3, emoji: "\ud83c\udf70" },
  { name: "Bebidas", count: 4, emoji: "\ud83e\uddc3" },
  { name: "C\u00f3cteles", count: 3, emoji: "\ud83c\udf78" },
];

const menuItems: MenuItem[] = [
  // Entradas
  { id: 1, name: "Empanadas de Pino", price: "$4.500", category: "Entradas", station: "Cocina", available: true, emoji: "\ud83e\udd5f" },
  { id: 2, name: "Machas a la Parmesana", price: "$8.900", category: "Entradas", station: "Cocina", available: true, emoji: "\ud83e\uddaa" },
  { id: 3, name: "Ceviche Chileno", price: "$7.200", category: "Entradas", station: "Cocina Fr\u00eda", available: true, emoji: "\ud83e\udd63" },
  { id: 4, name: "Tabla de Quesos", price: "$9.800", category: "Entradas", station: "Cocina Fr\u00eda", available: false, emoji: "\ud83e\uddc0" },
  // Platos de Fondo
  { id: 5, name: "Pastel de Choclo", price: "$12.500", category: "Platos de Fondo", station: "Cocina", available: true, emoji: "\ud83c\udf3d" },
  { id: 6, name: "Cazuela de Vacuno", price: "$11.800", category: "Platos de Fondo", station: "Cocina", available: true, emoji: "\ud83c\udf72" },
  { id: 7, name: "Lomo a lo Pobre", price: "$15.900", category: "Platos de Fondo", station: "Parrilla", available: true, emoji: "\ud83e\udd69" },
  { id: 8, name: "Curanto en Olla", price: "$14.200", category: "Platos de Fondo", station: "Cocina", available: true, emoji: "\ud83c\udf73" },
  // Ensaladas
  { id: 9, name: "Ensalada Chilena", price: "$5.500", category: "Ensaladas", station: "Cocina Fr\u00eda", available: true, emoji: "\ud83e\udd57" },
  { id: 10, name: "Ensalada C\u00e9sar", price: "$7.800", category: "Ensaladas", station: "Cocina Fr\u00eda", available: true, emoji: "\ud83e\udd57" },
  { id: 11, name: "Ensalada Mediterr\u00e1nea", price: "$8.200", category: "Ensaladas", station: "Cocina Fr\u00eda", available: false, emoji: "\ud83e\udd57" },
  // Postres
  { id: 12, name: "Leche Asada", price: "$4.800", category: "Postres", station: "Pasteler\u00eda", available: true, emoji: "\ud83c\udf6e" },
  { id: 13, name: "Torta Mil Hojas", price: "$5.500", category: "Postres", station: "Pasteler\u00eda", available: true, emoji: "\ud83c\udf70" },
  { id: 14, name: "Mote con Huesillo", price: "$3.500", category: "Postres", station: "Pasteler\u00eda", available: true, emoji: "\ud83c\udf53" },
  // Bebidas
  { id: 15, name: "Jugo Natural", price: "$3.200", category: "Bebidas", station: "Bar", available: true, emoji: "\ud83e\uddc3" },
  { id: 16, name: "Cerveza Artesanal", price: "$4.500", category: "Bebidas", station: "Bar", available: true, emoji: "\ud83c\udf7a" },
  { id: 17, name: "Vino Carmenere", price: "$6.800", category: "Bebidas", station: "Bar", available: true, emoji: "\ud83c\udf77" },
  { id: 18, name: "Agua Mineral", price: "$1.800", category: "Bebidas", station: "Bar", available: true, emoji: "\ud83d\udca7" },
  // Cocteles
  { id: 19, name: "Pisco Sour", price: "$5.500", category: "C\u00f3cteles", station: "Bar", available: true, emoji: "\ud83c\udf78" },
  { id: 20, name: "Terremoto", price: "$4.800", category: "C\u00f3cteles", station: "Bar", available: true, emoji: "\ud83c\udf7b" },
  { id: 21, name: "Borgo\u00f1a", price: "$5.200", category: "C\u00f3cteles", station: "Bar", available: false, emoji: "\ud83e\udd43" },
];

const stationColors: Record<string, string> = {
  Cocina: "bg-orange-500/20 text-orange-300",
  "Cocina Fr\u00eda": "bg-cyan-500/20 text-cyan-300",
  Parrilla: "bg-red-500/20 text-red-300",
  "Pasteler\u00eda": "bg-pink-500/20 text-pink-300",
  Bar: "bg-violet-500/20 text-violet-300",
};

/* ── Component ─────────────────────────────────────────── */
export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("Entradas");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState(menuItems);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  const toggleAvailability = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, available: !item.available } : item
      )
    );
  };

  const filtered = items.filter((item) => {
    if (item.category !== activeCategory) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div ref={ref}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 flex-wrap gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Menu</h1>
          <p className="text-sm text-slate-400 mt-1">
            Administra los platos y precios de tu restaurante
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow">
          <Plus size={16} />
          Agregar Plato
        </button>
      </motion.div>

      {/* Search Bar */}
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
          placeholder="Buscar en el men\u00fa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
        />
      </motion.div>

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
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  activeCategory === cat.name
                    ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-white border border-indigo-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <span className="text-lg">{cat.emoji}</span>
                <span className="flex-1">{cat.name}</span>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-md",
                    activeCategory === cat.name
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "bg-white/5 text-slate-500"
                  )}
                >
                  {cat.count}
                </span>
              </button>
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
                  animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className={cn(
                    "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden group",
                    !item.available && "opacity-60"
                  )}
                >
                  {/* Image placeholder */}
                  <div className="h-36 bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-purple-500/10 flex items-center justify-center relative">
                    <span className="text-5xl">{item.emoji}</span>
                    {!item.available && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-xs font-medium text-white bg-red-500/80 px-2.5 py-1 rounded-md">
                          No disponible
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-white leading-tight">
                        {item.name}
                      </h3>
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0 flex items-center gap-1",
                          stationColors[item.station] || "bg-white/10 text-slate-300"
                        )}
                      >
                        <Flame size={10} />
                        {item.station}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Tag size={12} className="text-slate-500" />
                        <span className="text-lg font-bold text-white">
                          {item.price}
                        </span>
                      </div>

                      {/* Availability Toggle */}
                      <button
                        onClick={() => toggleAvailability(item.id)}
                        className={cn(
                          "relative w-10 h-5 rounded-full transition-colors",
                          item.available
                            ? "bg-gradient-to-r from-indigo-500 to-violet-500"
                            : "bg-white/10"
                        )}
                      >
                        <motion.div
                          animate={{ x: item.available ? 20 : 2 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md"
                        />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <Search size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No se encontraron platos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
