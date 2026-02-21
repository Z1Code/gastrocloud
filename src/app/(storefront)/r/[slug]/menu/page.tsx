"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/stores/cartStore";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatCLP(amount: number) {
  return "$" + amount.toLocaleString("es-CL");
}

/* ── Icons ─────────────────────────────────────────────── */

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function ShoppingCartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
  );
}

/* ── Menu Data ─────────────────────────────────────────── */

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  category: string;
}

const categories = [
  "Entradas",
  "Platos de Fondo",
  "Ensaladas",
  "Postres",
  "Bebidas",
  "Cócteles",
];

const menuItems: MenuItem[] = [
  // Entradas
  { id: "e1", name: "Empanadas de Pino", description: "Masa crocante rellena de pino tradicional con pasas, huevo y aceituna", price: 3490, emoji: "🥟", category: "Entradas" },
  { id: "e2", name: "Provoleta", description: "Queso provolone fundido a la parrilla con orégano y tomate cherry", price: 7990, emoji: "🧀", category: "Entradas" },
  { id: "e3", name: "Ceviche", description: "Pescado fresco marinado en limón con cebolla morada, cilantro y ají", price: 9990, emoji: "🐟", category: "Entradas" },
  { id: "e4", name: "Tabla de Quesos", description: "Selección de quesos artesanales con frutos secos, miel y crackers", price: 12990, emoji: "🧀", category: "Entradas" },
  // Platos de Fondo
  { id: "p1", name: "Lomo a lo Pobre", description: "Lomo vetado grillado con papas fritas, cebolla caramelizada y huevos", price: 12990, emoji: "🥩", category: "Platos de Fondo" },
  { id: "p2", name: "Pastel de Choclo", description: "Receta tradicional chilena con pino, pollo, huevo y aceitunas", price: 9990, emoji: "🌽", category: "Platos de Fondo" },
  { id: "p3", name: "Salmón Grillé", description: "Filete de salmón austral a la parrilla con puré de coliflor y espárragos", price: 15990, emoji: "🐟", category: "Platos de Fondo" },
  { id: "p4", name: "Risotto de Hongos", description: "Arroz arborio cremoso con mix de hongos silvestres y parmesano", price: 11990, emoji: "🍄", category: "Platos de Fondo" },
  // Ensaladas
  { id: "s1", name: "César con Pollo", description: "Lechuga romana, pollo grillado, crutones, parmesano y aderezo césar", price: 8990, emoji: "🥗", category: "Ensaladas" },
  { id: "s2", name: "Quinoa & Palta", description: "Quinoa, palta, tomate cherry, pepino, mix de hojas y vinagreta cítrica", price: 7990, emoji: "🥑", category: "Ensaladas" },
  { id: "s3", name: "Caprese", description: "Tomate, mozzarella fresca, albahaca, aceite de oliva y reducción de balsámico", price: 6990, emoji: "🍅", category: "Ensaladas" },
  // Postres
  { id: "d1", name: "Tiramisú", description: "Clásico italiano con mascarpone, café espresso y cacao amargo", price: 5990, emoji: "🍰", category: "Postres" },
  { id: "d2", name: "Brownie con Helado", description: "Brownie tibio de chocolate belga con helado de vainilla y salsa toffee", price: 6490, emoji: "🍫", category: "Postres" },
  { id: "d3", name: "Crème Brûlée", description: "Crema de vainilla con costra de caramelo crocante", price: 5490, emoji: "🍮", category: "Postres" },
  // Bebidas
  { id: "b1", name: "Jugo Natural", description: "Jugo recién exprimido del día: naranja, piña o frutilla", price: 3490, emoji: "🧃", category: "Bebidas" },
  { id: "b2", name: "Agua Mineral", description: "Agua mineral con o sin gas 500ml", price: 1990, emoji: "💧", category: "Bebidas" },
  { id: "b3", name: "Café", description: "Espresso, americano o cortado con granos de especialidad", price: 2490, emoji: "☕", category: "Bebidas" },
  { id: "b4", name: "Limonada", description: "Limonada casera con menta fresca y jengibre", price: 2990, emoji: "🍋", category: "Bebidas" },
  // Cócteles
  { id: "c1", name: "Pisco Sour", description: "Pisco, limón de pica, jarabe de goma, clara de huevo y amargo de angostura", price: 5990, emoji: "🍸", category: "Cócteles" },
  { id: "c2", name: "Mojito", description: "Ron blanco, hierba buena, limón, azúcar y soda", price: 6990, emoji: "🍹", category: "Cócteles" },
  { id: "c3", name: "Aperol Spritz", description: "Aperol, prosecco, soda y rodaja de naranja", price: 7490, emoji: "🥂", category: "Cócteles" },
];

/* ── Component ─────────────────────────────────────────── */

export default function MenuPage() {
  const params = useParams();
  const slug = params.slug as string;
  const base = `/r/${slug}`;
  const addItem = useCartStore((s) => s.addItem);
  const itemCount = useCartStore((s) => s.getItemCount());
  const getTotal = useCartStore((s) => s.getTotal);

  const [activeCategory, setActiveCategory] = useState("Entradas");
  const [search, setSearch] = useState("");
  const [addedId, setAddedId] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const filtered = menuItems.filter((item) => {
    const matchesCategory = item.category === activeCategory;
    const matchesSearch =
      search === "" ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return search ? matchesSearch : matchesCategory;
  });

  const handleAdd = (item: MenuItem) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      modifiers: [],
    });
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 600);
  };

  return (
    <div className="pb-28">
      {/* Search */}
      <div className="sticky top-14 z-30 bg-white/80 backdrop-blur-xl px-4 pt-3 pb-2">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en el menú..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-100 text-gray-900 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="sticky top-[7.25rem] z-30 bg-white/80 backdrop-blur-xl">
          <div
            ref={tabsRef}
            className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "relative shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors",
                  activeCategory === cat
                    ? "text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {activeCategory === cat && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-indigo-50 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{cat}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items grid */}
      <div className="px-4 mt-3">
        {search && filtered.length === 0 && (
          <div className="text-center py-16">
            <span className="text-4xl">🔍</span>
            <p className="text-gray-500 mt-4 text-sm">No se encontraron resultados para &ldquo;{search}&rdquo;</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="bg-white rounded-2xl shadow-lg shadow-black/5 border border-gray-100 overflow-hidden"
              >
                {/* Image area */}
                <div className="h-40 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                  <span className="text-5xl">{item.emoji}</span>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCLP(item.price)}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleAdd(item)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
                        addedId === item.id
                          ? "bg-emerald-500 text-white"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      )}
                    >
                      {addedId === item.id ? "Agregado ✓" : "Agregar"}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky cart bar */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-20 left-0 right-0 z-40 px-4 md:bottom-4"
          >
            <Link href={`${base}/order`}>
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="max-w-lg mx-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-500/30 px-5 py-4 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <ShoppingCartIcon className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatCLP(getTotal())}</span>
                  <span className="text-white/80">Ver Carrito →</span>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
