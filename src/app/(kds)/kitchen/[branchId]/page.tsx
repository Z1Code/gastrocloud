'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useKDSStore, type KDSOrder, type Station } from '@/stores/kdsStore';
import { OrderCard } from '@/components/kds/OrderCard';
import { StationTabs } from '@/components/kds/StationTabs';
import { KDSStats } from '@/components/kds/KDSStats';
import { useOrderStream, type OrderEvent } from '@/hooks/useOrderStream';
import { useNotificationSound } from '@/hooks/useNotificationSound';

const ACTIVE_STATUSES = ['pending', 'accepted', 'preparing'];

function apiOrderToKDS(order: Record<string, unknown>): KDSOrder {
  const items = (order.items as Record<string, unknown>[]) || [];
  const createdAt = new Date(order.createdAt as string);
  const estimatedReadyAt = order.estimatedReadyAt
    ? new Date(order.estimatedReadyAt as string)
    : new Date(Date.now() + 15 * 60000);
  const totalSeconds = Math.max(
    Math.round((estimatedReadyAt.getTime() - createdAt.getTime()) / 1000),
    60
  );

  const orderType = order.type as string;

  return {
    id: order.id as string,
    orderNumber: `#${(order.id as string).slice(0, 4).toUpperCase()}`,
    source: order.source as KDSOrder['source'],
    status: order.status as KDSOrder['status'],
    customerName: (order.customerName as string) || undefined,
    type: orderType as KDSOrder['type'],
    tableNumber: undefined,
    pickupInfo:
      orderType === 'delivery'
        ? `Delivery ${order.source}`
        : orderType === 'takeaway'
          ? 'Retira en local'
          : orderType === 'pickup_scheduled'
            ? 'Retiro programado'
            : orderType === 'dine_in'
              ? 'Comer aqui'
              : undefined,
    items: items.map((item) => {
      const mods = (item.modifiers as Record<string, unknown>) || {};
      const customerModifiers = (mods.customerModifiers as Record<string, unknown>[]) || [];
      return {
        id: item.id as string,
        name: (mods.itemName as string) || 'Item',
        quantity: (item.quantity as number) || 1,
        ingredients: (mods.ingredients as string[]) || [],
        modifiers: customerModifiers.map((m) => ({
          name: m.name as string,
          highlighted: true,
        })),
        station: ((item.station as string) || 'kitchen') as Station,
        notes: (item.notes as string) || undefined,
        bumped: (mods.bumped as boolean) || false,
      };
    }),
    notes: (order.notes as string) || undefined,
    createdAt,
    estimatedReadyAt,
    totalSeconds,
  };
}

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
  const setOrders = useKDSStore((s) => s.setOrders);
  const upsertOrder = useKDSStore((s) => s.upsertOrder);
  const removeOrder = useKDSStore((s) => s.removeOrder);
  const { playSoundForSource } = useNotificationSound();

  // Initial fetch
  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch('/api/orders');
        if (!res.ok) return;
        const data = await res.json();
        const active = data
          .filter((o: Record<string, unknown>) =>
            ACTIVE_STATUSES.includes(o.status as string)
          )
          .map(apiOrderToKDS);
        setOrders(active);
      } catch {
        // Silently fail - SSE will catch up
      }
    }
    loadOrders();
  }, [setOrders]);

  // SSE handlers
  const handleOrderCreated = useCallback(
    (event: OrderEvent) => {
      const data = event.data as Record<string, unknown> | undefined;
      if (!data) return;
      const status = data.status as string;
      if (ACTIVE_STATUSES.includes(status)) {
        upsertOrder(apiOrderToKDS(data));
        playSoundForSource((data.source as string) || 'web');
      }
    },
    [upsertOrder, playSoundForSource]
  );

  const handleStatusChanged = useCallback(
    (event: OrderEvent) => {
      const data = event.data as Record<string, unknown> | undefined;
      if (!data) return;
      const status = data.status as string;
      const orderId = (event.orderId || data.id) as string;
      if (ACTIVE_STATUSES.includes(status)) {
        upsertOrder(apiOrderToKDS(data));
      } else if (orderId) {
        removeOrder(orderId);
      }
    },
    [upsertOrder, removeOrder]
  );

  const handleOrderCancelled = useCallback(
    (event: OrderEvent) => {
      const orderId = (event.orderId || (event.data as Record<string, unknown>)?.id) as string;
      if (orderId) {
        removeOrder(orderId);
      }
    },
    [removeOrder]
  );

  useOrderStream({
    onOrderCreated: handleOrderCreated,
    onStatusChanged: handleStatusChanged,
    onOrderCancelled: handleOrderCancelled,
  });

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
