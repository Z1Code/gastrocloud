"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Inbox } from "lucide-react";
import { Skeleton } from "./skeleton";

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  loadingRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
  keyExtractor?: (row: T, index: number) => string;
}

type SortDir = "asc" | "desc";

function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  loadingRows = 5,
  emptyTitle = "No data",
  emptyDescription = "There are no records to display.",
  onRowClick,
  className,
  keyExtractor,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null || bv == null) return 0;
        const cmp = av > bv ? 1 : av < bv ? -1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data;

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden",
        "bg-white/5 backdrop-blur-xl border border-white/10",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={cn(
                    "px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider",
                    col.sortable && "cursor-pointer select-none hover:text-white transition-colors",
                    col.className
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-orange-400">
                        {sortDir === "asc" ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {loading ? (
                Array.from({ length: loadingRows }).map((_, i) => (
                  <tr key={`skel-${i}`} className="border-b border-white/5">
                    {columns.map((col) => (
                      <td key={col.key} className="px-5 py-3">
                        <Skeleton variant="text" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-16 text-center">
                    <Inbox className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-400">{emptyTitle}</p>
                    <p className="text-xs text-gray-500 mt-1">{emptyDescription}</p>
                  </td>
                </tr>
              ) : (
                sorted.map((row, i) => (
                  <motion.tr
                    key={keyExtractor ? keyExtractor(row, i) : i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => onRowClick?.(row, i)}
                    className={cn(
                      "border-b border-white/5 transition-colors",
                      onRowClick && "cursor-pointer",
                      "hover:bg-white/5"
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn("px-5 py-3 text-sm text-gray-200", col.className)}
                      >
                        {col.render ? col.render(row, i) : (row[col.key] as ReactNode)}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { DataTable, type DataTableProps, type Column };
