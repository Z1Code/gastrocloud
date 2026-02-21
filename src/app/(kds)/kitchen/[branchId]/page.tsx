'use client';

import { useMemo, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useKDSStore } from '@/stores/kdsStore';
import { OrderCard } from '@/components/kds/OrderCard';
import { StationTabs } from '@/components/kds/StationTabs';
import { KDSStats } from '@/components/kds/KDSStats';

function CurrentClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('es-CL', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-lg text-white/60 tabular-nums tracking-wider">
      {time}
    </span>
  );
}

export default function KDSPage() {
  const { orders, activeStation } = useKDSStore();

  const filteredOrders = useMemo(() => {
    const visible = orders.filter((o) => o.status !== 'ready');
    if (activeStation === 'all') return visible;
    return visible.filter((o) =>
      o.items.some((item) => item.station === activeStation)
    );
  }, [orders, activeStation]);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h1 className="text-xl font-bold text-white tracking-tight">
            GastroCloud
            <span className="text-orange-400 ml-1.5 font-normal text-sm">KDS</span>
          </h1>
        </div>

        <StationTabs />

        <CurrentClock />
      </div>

      {/* Orders grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </AnimatePresence>
        </div>

        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-white/20">
            <p className="text-6xl mb-4">&#127860;</p>
            <p className="text-lg font-medium">No hay pedidos activos</p>
            <p className="text-sm mt-1">Los nuevos pedidos apareceran aqui</p>
          </div>
        )}
      </div>

      {/* Bottom stats */}
      <div className="px-6 py-3 flex justify-center">
        <KDSStats />
      </div>
    </div>
  );
}
