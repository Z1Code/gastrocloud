"use client";

import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, iconLeft, iconRight, className, id, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const hasValue = !!props.value || !!props.defaultValue;

    return (
      <div className="w-full">
        <div className="relative">
          {iconLeft && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
              {iconLeft}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "peer w-full h-12 px-4 pt-4 pb-1 text-sm text-white rounded-xl transition-all duration-200",
              "bg-white/5 backdrop-blur-sm border border-white/10",
              "placeholder-transparent",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-white/10",
              error &&
                "border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50",
              iconLeft && "pl-10",
              iconRight && "pr-10",
              className
            )}
            placeholder={label || " "}
            {...props}
          />
          {label && (
            <label
              htmlFor={id}
              className={cn(
                "absolute left-4 transition-all duration-200 pointer-events-none",
                iconLeft && "left-10",
                focused || hasValue
                  ? "top-1.5 text-[10px] font-medium text-indigo-400"
                  : "top-1/2 -translate-y-1/2 text-sm text-gray-400"
              )}
            >
              {label}
            </label>
          )}
          {iconRight && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {iconRight}
            </div>
          )}
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-1.5 text-xs text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input, type InputProps };
