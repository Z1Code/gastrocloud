'use client';

import { motion } from 'framer-motion';
import { useKDSStore, type Station } from '@/stores/kdsStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const stations: { key: Station | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'TODOS', emoji: '📋' },
  { key: 'kitchen', label: 'COCINA', emoji: '🔵' },
  { key: 'bar', label: 'BARRA', emoji: '🟠' },
  { key: 'grill', label: 'PARRILLA', emoji: '🟣' },
  { key: 'dessert', label: 'POSTRES', emoji: '🍰' },
];

export function StationTabs() {
  const { activeStation, setActiveStation, orders } = useKDSStore();

  function countForStation(key: Station | 'all'): number {
    if (key === 'all') return orders.filter((o) => o.status !== 'ready').length;
    return orders.filter(
      (o) => o.status !== 'ready' && o.items.some((i) => i.station === key)
    ).length;
  }

  return (
    <div className="flex items-center gap-1 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-1.5">
      {stations.map((s) => {
        const isActive = activeStation === s.key;
        const count = countForStation(s.key);

        return (
          <button
            key={s.key}
            onClick={() => setActiveStation(s.key)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-colors',
              isActive ? 'text-white' : 'text-white/50 hover:text-white/70'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="station-tab-bg"
                className="absolute inset-0 rounded-xl bg-white/10 border border-white/[0.12]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <span>{s.emoji}</span>
              <span>{s.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold',
                    isActive
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white/10 text-white/60'
                  )}
                >
                  {count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
