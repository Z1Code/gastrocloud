"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: number;
  trendLabel?: string;
  format?: (value: number) => string;
  className?: string;
}

function useCountUp(target: number, duration = 1000) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const startVal = current;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [target, duration]);

  return current;
}

function StatCard({
  icon,
  label,
  value,
  prefix = "",
  suffix = "",
  trend,
  trendLabel,
  format,
  className,
}: StatCardProps) {
  const animatedValue = useCountUp(value);
  const displayValue = format ? format(animatedValue) : animatedValue.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "rounded-2xl p-5",
        "bg-white/5 backdrop-blur-xl border border-white/10",
        "shadow-xl shadow-black/10",
        "hover:shadow-2xl hover:shadow-orange-500/5 hover:border-white/15 transition-all duration-200",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-500/20 text-orange-400">
            {icon}
          </div>
        )}
        {trend !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg",
              trend >= 0
                ? "text-emerald-400 bg-emerald-500/10"
                : "text-red-400 bg-red-500/10"
            )}
          >
            {trend >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">
        {prefix}
        {displayValue}
        {suffix}
      </p>
      {trendLabel && (
        <p className="text-xs text-gray-500 mt-1">{trendLabel}</p>
      )}
    </motion.div>
  );
}

export { StatCard, type StatCardProps };
