"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

function Switch({ checked = false, onChange, label, disabled = false, className }: SwitchProps) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-3 cursor-pointer select-none",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      <button
        role="switch"
        aria-checked={checked}
        type="button"
        onClick={() => onChange?.(!checked)}
        disabled={disabled}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors duration-200",
          checked
            ? "bg-gradient-to-r from-indigo-500 to-violet-500"
            : "bg-white/10 border border-white/10"
        )}
      >
        <motion.span
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "absolute top-1 block h-4 w-4 rounded-full shadow-sm",
            checked ? "bg-white" : "bg-gray-400"
          )}
        />
      </button>
      {label && <span className="text-sm text-gray-300">{label}</span>}
    </label>
  );
}

export { Switch, type SwitchProps };
