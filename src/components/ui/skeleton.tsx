"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  variant?: "text" | "circle" | "card";
  className?: string;
  width?: string | number;
  height?: string | number;
}

function Skeleton({ variant = "text", className, width, height }: SkeletonProps) {
  const style = {
    width: width ?? undefined,
    height: height ?? undefined,
  };

  return (
    <div
      style={style}
      className={cn(
        "animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]",
        "animate-[shimmer_1.5s_ease-in-out_infinite]",
        variant === "text" && "h-4 w-full rounded-lg",
        variant === "circle" && "h-10 w-10 rounded-full",
        variant === "card" && "h-32 w-full rounded-2xl",
        className
      )}
    />
  );
}

export { Skeleton, type SkeletonProps };
