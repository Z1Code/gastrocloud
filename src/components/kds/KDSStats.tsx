'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Stats {
  avgPrepTime: number;
  activeOrders: number;
  completedToday: number;
}

function AnimatedNumber({ value }: { value: number }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={value}
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="inline-block tabular-nums"
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

export function KDSStats() {
  const [stats, setStats] = useState<Stats>({
    avgPrepTime: 0,
    activeOrders: 0,
    completedToday: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/orders/stats');
      if (!res.ok) return;
      const data = await res.json();
      setStats({
        avgPrepTime: data.avgPrepTime ?? 0,
        activeOrders: data.activeOrders ?? 0,
        completedToday: data.completedToday ?? 0,
      });
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30000);
    return () => clearInterval(id);
  }, [fetchStats]);

  return (
    <div className="flex items-center justify-center gap-8 px-6 py-3 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08]">
      <div className="flex items-center gap-2 text-sm text-white/60">
        <span className="text-white/30">Tiempo promedio:</span>
        <span className="font-bold text-white/90">
          <AnimatedNumber value={stats.avgPrepTime} />
          <span className="text-white/40 ml-0.5">min</span>
        </span>
      </div>

      <div className="w-px h-4 bg-white/10" />

      <div className="flex items-center gap-2 text-sm text-white/60">
        <span className="text-white/30">Pedidos activos:</span>
        <span className="font-bold text-orange-400">
          <AnimatedNumber value={stats.activeOrders} />
        </span>
      </div>

      <div className="w-px h-4 bg-white/10" />

      <div className="flex items-center gap-2 text-sm text-white/60">
        <span className="text-white/30">Completados hoy:</span>
        <span className="font-bold text-emerald-400">
          <AnimatedNumber value={stats.completedToday} />
        </span>
      </div>
    </div>
  );
}
