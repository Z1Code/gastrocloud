"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronLeft, X } from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  badge?: string | number;
  onClick?: () => void;
}

interface SidebarProps {
  items: SidebarItem[];
  activeId?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onItemClick?: (item: SidebarItem) => void;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function SidebarContent({
  items,
  activeId,
  collapsed,
  onToggle,
  onItemClick,
  header,
  footer,
  className,
}: SidebarProps) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "h-full flex flex-col",
        "bg-white/5 backdrop-blur-xl border-r border-white/10",
        className
      )}
    >
      {header && (
        <div className={cn("px-4 py-5 border-b border-white/5", collapsed && "px-3")}>
          {header}
        </div>
      )}

      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto px-2">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <motion.button
              key={item.id}
              onClick={() => {
                item.onClick?.();
                onItemClick?.(item);
              }}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-white border border-indigo-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5",
                collapsed && "justify-center px-2"
              )}
            >
              {item.icon && (
                <span
                  className={cn(
                    "shrink-0",
                    isActive && "text-indigo-400"
                  )}
                >
                  {item.icon}
                </span>
              )}
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-auto text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </motion.button>
          );
        })}
      </nav>

      {onToggle && (
        <div className="px-3 py-3 border-t border-white/5">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <motion.span animate={{ rotate: collapsed ? 180 : 0 }}>
              <ChevronLeft className="h-4 w-4" />
            </motion.span>
          </button>
        </div>
      )}

      {footer && (
        <div className={cn("px-4 py-4 border-t border-white/5", collapsed && "px-3")}>
          {footer}
        </div>
      )}
    </motion.aside>
  );
}

function Sidebar(props: SidebarProps) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block h-full">
        <SidebarContent {...props} />
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {props.mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={props.onMobileClose}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative h-full w-[260px]"
            >
              <button
                onClick={props.onMobileClose}
                className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent {...props} collapsed={false} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export { Sidebar, type SidebarProps, type SidebarItem };
