"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const positions = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

const arrows = {
  top: "top-full left-1/2 -translate-x-1/2 border-t-gray-800",
  bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-gray-800",
  left: "left-full top-1/2 -translate-y-1/2 border-l-gray-800",
  right: "right-full top-1/2 -translate-y-1/2 border-r-gray-800",
};

const motionOrigin = {
  top: { y: 4 },
  bottom: { y: -4 },
  left: { x: 4 },
  right: { x: -4 },
};

function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, ...motionOrigin[side] }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, ...motionOrigin[side] }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 px-3 py-1.5 text-xs font-medium text-white whitespace-nowrap rounded-lg",
              "bg-gray-800/95 backdrop-blur-sm border border-white/10",
              "shadow-lg shadow-black/20",
              positions[side],
              className
            )}
          >
            {content}
            <span
              className={cn(
                "absolute w-0 h-0 border-4 border-transparent",
                arrows[side]
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { Tooltip, type TooltipProps };
