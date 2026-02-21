"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  totalSeconds: number;
  remainingSeconds: number;
  large?: boolean;
  onExpire?: () => void;
  className?: string;
}

function CountdownTimer({
  totalSeconds,
  remainingSeconds,
  large = false,
  onExpire,
  className,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(remainingSeconds);

  useEffect(() => {
    setRemaining(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const timer = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining <= 0]);

  const percentage = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isCritical = percentage < 25;
  const isWarning = percentage < 50 && percentage >= 25;

  const colorClass = isCritical
    ? "text-red-400"
    : isWarning
    ? "text-amber-400"
    : "text-emerald-400";

  const bgClass = isCritical
    ? "bg-red-500/10 border-red-500/30"
    : isWarning
    ? "bg-amber-500/10 border-amber-500/30"
    : "bg-emerald-500/10 border-emerald-500/30";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isCritical ? "critical" : isWarning ? "warning" : "normal"}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{
          scale: isCritical ? [1, 1.03, 1] : 1,
          opacity: 1,
        }}
        transition={
          isCritical
            ? { scale: { duration: 0.8, repeat: Infinity } }
            : { duration: 0.2 }
        }
        className={cn(
          "inline-flex items-center justify-center font-mono font-bold rounded-xl border",
          bgClass,
          colorClass,
          large ? "text-4xl px-6 py-4" : "text-lg px-3 py-1.5",
          className
        )}
      >
        {display}
      </motion.div>
    </AnimatePresence>
  );
}

export { CountdownTimer, type CountdownTimerProps };
