"use client";

import { type HTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  danger: "bg-red-500/20 text-red-300 border-red-500/30",
  web: "bg-green-500/20 text-green-300 border-green-500/30",
  uber: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  rappi: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  qr: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  whatsapp: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  pos: "bg-gray-500/20 text-gray-300 border-gray-500/30",
} as const;

type BadgeVariant = keyof typeof badgeVariants;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  pulse?: boolean;
}

function Badge({ variant = "default", pulse = false, className, children }: BadgeProps) {
  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full border",
        badgeVariants[variant],
        pulse && "animate-pulse",
        className
      )}
    >
      {children}
    </motion.span>
  );
}

export { Badge, badgeVariants, type BadgeProps, type BadgeVariant };
