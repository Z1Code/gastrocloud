"use client";

import { cn } from "@/lib/utils";

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-amber-500", bg: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  preparing: { label: "Preparando", color: "bg-blue-500", bg: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
  ready: { label: "Listo", color: "bg-emerald-500", bg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  delivered: { label: "Entregado", color: "bg-gray-500", bg: "bg-gray-500/10 text-gray-300 border-gray-500/30" },
  cancelled: { label: "Cancelado", color: "bg-red-500", bg: "bg-red-500/10 text-red-300 border-red-500/30" },
} as const;

type OrderStatus = keyof typeof statusConfig;

interface StatusBadgeProps {
  status: OrderStatus;
  showLabel?: boolean;
  className?: string;
}

function StatusBadge({ status, showLabel = true, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border",
        config.bg,
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            config.color
          )}
        />
        <span
          className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            config.color
          )}
        />
      </span>
      {showLabel && config.label}
    </span>
  );
}

export { StatusBadge, statusConfig, type StatusBadgeProps, type OrderStatus };
