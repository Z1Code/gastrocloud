'use client';

import { motion } from 'framer-motion';
import { CountdownTimer } from './CountdownTimer';
import {
  useKDSStore,
  type KDSOrder,
  type OrderSource,
  type OrderStatus,
} from '@/stores/kdsStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Globe,
  QrCode,
  MessageCircle,
  Monitor,
  Check,
} from 'lucide-react';
import type { ReactNode } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const sourceConfig: Record<
  OrderSource,
  { label: string; bg: string; textColor: string; icon: ReactNode }
> = {
  web: {
    label: 'WEB',
    bg: 'bg-emerald-500/20 border-emerald-500/30',
    textColor: 'text-emerald-400',
    icon: <Globe className="w-3.5 h-3.5" />,
  },
  qr_table: {
    label: 'MESA',
    bg: 'bg-blue-500/20 border-blue-500/30',
    textColor: 'text-blue-400',
    icon: <QrCode className="w-3.5 h-3.5" />,
  },
  uber_eats: {
    label: 'UBER EATS',
    bg: 'bg-amber-500/20 border-amber-500/30',
    textColor: 'text-amber-400',
    icon: null,
  },
  rappi: {
    label: 'RAPPI',
    bg: 'bg-orange-500/20 border-orange-500/30',
    textColor: 'text-orange-400',
    icon: null,
  },
  whatsapp: {
    label: 'WHATSAPP',
    bg: 'bg-emerald-500/20 border-emerald-500/30',
    textColor: 'text-emerald-400',
    icon: <MessageCircle className="w-3.5 h-3.5" />,
  },
  pos_inhouse: {
    label: 'POS',
    bg: 'bg-slate-500/20 border-slate-500/30',
    textColor: 'text-slate-400',
    icon: <Monitor className="w-3.5 h-3.5" />,
  },
};

const statusActions: Record<
  Exclude<OrderStatus, 'ready'>,
  { label: string; next: OrderStatus; className: string }
> = {
  pending: {
    label: 'ACEPTAR',
    next: 'accepted',
    className: 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25',
  },
  accepted: {
    label: 'PREPARANDO',
    next: 'preparing',
    className: 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/25',
  },
  preparing: {
    label: 'LISTO \u2713',
    next: 'ready',
    className: 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/25',
  },
};

interface OrderCardProps {
  order: KDSOrder;
}

export function OrderCard({ order }: OrderCardProps) {
  const removeOrder = useKDSStore((s) => s.removeOrder);
  const bumpItem = useKDSStore((s) => s.bumpItem);
  const source = sourceConfig[order.source];
  const action = order.status !== 'ready' ? statusActions[order.status] : null;

  async function handleAction() {
    if (!action) return;
    try {
      await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action.next }),
      });
      if (action.next === 'ready') {
        setTimeout(() => removeOrder(order.id), 600);
      }
    } catch {
      // Network error - ignore, SSE will reconcile
    }
  }

  async function handleBump(itemId: string) {
    try {
      await fetch(`/api/orders/${order.id}/items/${itemId}/bump`, {
        method: 'PATCH',
      });
      bumpItem(order.id, itemId);
    } catch {
      // Network error - ignore
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={cn(
        'relative flex flex-col rounded-2xl border overflow-hidden',
        'bg-white/[0.04] backdrop-blur-xl',
        'border-white/[0.08]',
        'hover:border-white/[0.15] transition-colors duration-300'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border',
            source.bg,
            source.textColor
          )}
        >
          {source.icon}
          {source.label}
        </span>
        <span className="text-white/70 font-mono text-sm font-bold">
          {order.orderNumber}
        </span>
      </div>

      {/* Customer */}
      {order.customerName && (
        <div className="px-4 pb-1">
          <span className="text-white/40 text-xs">{order.customerName}</span>
        </div>
      )}

      {/* Countdown */}
      <div className="flex justify-center py-3">
        <CountdownTimer
          targetDate={order.estimatedReadyAt}
          totalSeconds={order.totalSeconds}
          size="lg"
        />
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-white/[0.06]" />

      {/* Items */}
      <div className="flex-1 px-4 py-3 space-y-2.5 max-h-[240px] overflow-y-auto">
        {order.items.map((item) => (
          <div key={item.id}>
            <button
              onClick={() => handleBump(item.id)}
              className={cn(
                'flex items-center gap-2 w-full text-left',
                item.bumped && 'opacity-50'
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0',
                  item.bumped
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-white/20'
                )}
              >
                {item.bumped && <Check size={12} className="text-white" />}
              </span>
              <span
                className={cn(
                  'text-white font-semibold text-sm flex-1',
                  item.bumped && 'line-through'
                )}
              >
                {item.name}
              </span>
              <span className="text-white/50 text-xs font-mono">x{item.quantity}</span>
            </button>

            {item.ingredients.length > 0 && (
              <div className="ml-7 mt-0.5 space-y-0">
                {item.ingredients.map((ing, i) => (
                  <p key={i} className="text-white/30 text-xs leading-relaxed">
                    - {ing}
                  </p>
                ))}
              </div>
            )}

            {item.modifiers.length > 0 && (
              <div className="ml-7 mt-0.5">
                {item.modifiers.map((mod, i) => (
                  <p
                    key={i}
                    className={cn(
                      'text-xs font-semibold leading-relaxed',
                      mod.highlighted ? 'text-amber-400' : 'text-white/50'
                    )}
                  >
                    * {mod.name}
                  </p>
                ))}
              </div>
            )}

            {item.notes && (
              <p className="ml-7 mt-0.5 text-xs text-rose-400/80 italic">
                {item.notes}
              </p>
            )}
          </div>
        ))}

        {order.notes && (
          <div className="mt-1 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <p className="text-xs text-rose-400 font-medium">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Pickup info */}
      {order.pickupInfo && (
        <div className="px-4 py-2 border-t border-white/[0.06]">
          <p className="text-xs text-white/40 text-center font-medium">
            {order.pickupInfo}
          </p>
        </div>
      )}

      {/* Action button */}
      {action && (
        <div className="p-3 pt-0">
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.01 }}
            onClick={handleAction}
            className={cn(
              'w-full py-3 rounded-xl font-bold text-sm tracking-wider transition-all',
              action.className
            )}
          >
            {action.label}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
