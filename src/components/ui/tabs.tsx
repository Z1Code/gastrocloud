"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange?: (id: string) => void;
  variant?: "underline" | "pill";
  className?: string;
  children?: ReactNode;
}

function Tabs({
  tabs,
  activeTab: controlledActive,
  onChange,
  variant = "pill",
  className,
}: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id);
  const activeTab = controlledActive ?? internalActive;

  const handleChange = (id: string) => {
    setInternalActive(id);
    onChange?.(id);
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 p-1 rounded-xl",
        variant === "pill" && "bg-white/5 backdrop-blur-sm border border-white/10",
        variant === "underline" && "border-b border-white/10 rounded-none p-0 gap-0",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={cn(
              "relative px-4 py-2 text-sm font-medium transition-colors duration-200",
              variant === "pill" && "rounded-lg",
              variant === "underline" && "px-5 py-3",
              isActive ? "text-white" : "text-gray-400 hover:text-gray-200"
            )}
          >
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </span>
            {isActive && variant === "pill" && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 rounded-lg"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            )}
            {isActive && variant === "underline" && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs, type TabsProps, type Tab };
