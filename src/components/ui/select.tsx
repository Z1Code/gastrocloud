"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, X, Check } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  searchable?: boolean;
  multiple?: boolean;
  className?: string;
}

function Select({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  error,
  searchable = false,
  multiple = false,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const selectedOptions = options.filter((o) => selectedValues.includes(o.value));

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = (optValue: string) => {
    if (multiple) {
      const next = selectedValues.includes(optValue)
        ? selectedValues.filter((v) => v !== optValue)
        : [...selectedValues, optValue];
      onChange?.(next);
    } else {
      onChange?.(optValue);
      setOpen(false);
      setSearch("");
    }
  };

  const removeTag = (optValue: string) => {
    onChange?.(selectedValues.filter((v) => v !== optValue));
  };

  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      {label && (
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm",
          "bg-white/5 backdrop-blur-sm border border-white/10",
          "hover:bg-white/10 transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
          open && "ring-2 ring-indigo-500/50 border-indigo-500/50",
          error && "border-red-500/50",
          "min-h-[44px]"
        )}
      >
        <div className="flex-1 flex flex-wrap gap-1 text-left">
          {selectedOptions.length === 0 && (
            <span className="text-gray-400">{placeholder}</span>
          )}
          {multiple
            ? selectedOptions.map((opt) => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-xs"
                >
                  {opt.label}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(opt.value);
                    }}
                  />
                </span>
              ))
            : selectedOptions[0] && (
                <span className="text-white flex items-center gap-2">
                  {selectedOptions[0].icon}
                  {selectedOptions[0].label}
                </span>
              )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform shrink-0",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/20 overflow-hidden"
          >
            {searchable && (
              <div className="p-2 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-white/5 rounded-lg text-white placeholder-gray-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
            )}
            <div className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-500">No results</p>
              )}
              {filtered.map((opt) => {
                const selected = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors",
                      selected
                        ? "text-indigo-300 bg-indigo-500/10"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="flex-1 text-left">{opt.label}</span>
                    {selected && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export { Select, type SelectProps, type SelectOption };
