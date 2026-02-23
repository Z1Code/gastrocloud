"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Grid3X3,
  Plus,
  Users,
  Pencil,
  QrCode,
  Trash2,
  Loader2,
  Layers,
} from "lucide-react";
import { TableDrawer } from "@/components/table-drawer";
import { TableQRModal } from "@/components/table-qr-modal";

/* ── Animation variants ───────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/* ── Types ────────────────────────────────────────────── */
interface TableData {
  id: string;
  number: number;
  zone: string | null;
  capacity: number;
  status: string;
  qrCode: string;
}

/* ── Status config ────────────────────────────────────── */
const statusStyles: Record<string, string> = {
  available: "bg-slate-500/20 text-slate-400",
  occupied: "bg-amber-500/20 text-amber-400",
  reserved: "bg-red-500/20 text-red-400",
  cleaning: "bg-blue-500/20 text-blue-400",
};

const statusLabels: Record<string, string> = {
  available: "Libre",
  occupied: "Ocupada",
  reserved: "Reservada",
  cleaning: "Limpieza",
};

/* ── Component ────────────────────────────────────────── */
export default function TablesPage() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTable, setDrawerTable] = useState<TableData | null>(null);
  const [bulkMode, setBulkMode] = useState(false);

  // QR Modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTable, setQrTable] = useState<TableData | null>(null);

  /* ── Fetch tables ─────────────────────────────────────── */
  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch("/api/tables");
      if (res.ok) {
        const data: TableData[] = await res.json();
        setTables(data);
      }
    } catch (err) {
      console.error("Error fetching tables:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  /* ── Delete handler ───────────────────────────────────── */
  async function handleDelete(id: string) {
    if (!window.confirm("¿Eliminar esta mesa?")) return;
    try {
      const res = await fetch(`/api/tables/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTables();
      }
    } catch {
      alert("Error al eliminar la mesa");
    }
  }

  return (
    <div ref={ref}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500">
            <Grid3X3 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Mesas</h1>
            <p className="text-sm text-slate-400 mt-1">
              Administra las mesas y códigos QR de tu restaurante
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDrawerTable(null);
              setBulkMode(true);
              setDrawerOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <Layers size={16} />
            Agregar Múltiples
          </button>
          <button
            onClick={() => {
              setDrawerTable(null);
              setBulkMode(false);
              setDrawerOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-shadow"
          >
            <Plus size={16} />
            Nueva Mesa
          </button>
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-slate-500" />
        </div>
      )}

      {/* Tables Grid */}
      {!loading && tables.length > 0 && (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          {tables.map((table) => (
            <motion.div
              key={table.id}
              variants={fadeUp}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 relative group hover:border-white/20 transition-colors"
            >
              {/* Status badge — top right */}
              <span
                className={`absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-md ${
                  statusStyles[table.status] ?? "bg-slate-500/20 text-slate-400"
                }`}
              >
                {statusLabels[table.status] ?? table.status}
              </span>

              {/* Table number */}
              <div className="text-center pt-2 pb-3">
                <p className="text-3xl font-bold text-white">{table.number}</p>

                {/* Zone tag */}
                {table.zone && (
                  <span className="inline-block mt-1.5 bg-white/10 text-slate-300 px-2 py-0.5 rounded-md text-xs">
                    {table.zone}
                  </span>
                )}
              </div>

              {/* Capacity */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mb-3">
                <Users size={12} />
                <span>{table.capacity}</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-1 border-t border-white/[0.06] pt-3">
                <button
                  onClick={() => {
                    setDrawerTable(table);
                    setBulkMode(false);
                    setDrawerOpen(true);
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-white/10 transition-colors"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => {
                    setQrTable(table);
                    setQrModalOpen(true);
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-white/10 transition-colors"
                  title="Código QR"
                >
                  <QrCode size={14} />
                </button>
                <button
                  onClick={() => handleDelete(table.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && tables.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center"
        >
          <Grid3X3 size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1">
            Agrega tu primera mesa
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Configura las mesas de tu restaurante y genera códigos QR
          </p>
          <button
            onClick={() => {
              setDrawerTable(null);
              setBulkMode(false);
              setDrawerOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-semibold shadow-lg shadow-orange-500/25"
          >
            <Plus size={16} />
            Nueva Mesa
          </button>
        </motion.div>
      )}

      {/* Table Drawer */}
      <TableDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={fetchTables}
        table={drawerTable}
        bulkMode={bulkMode}
      />

      {/* Table QR Modal */}
      <TableQRModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        table={qrTable}
      />
    </div>
  );
}
