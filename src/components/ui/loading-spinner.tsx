"use client";

import { cn } from "@/lib/utils";

const spinnerSizes = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
} as const;

type SpinnerSize = keyof typeof spinnerSizes;

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <div className={cn("relative", spinnerSizes[size], className)}>
      <div
        className={cn(
          "absolute inset-0 rounded-full border-2 border-transparent",
          "border-t-orange-500 border-r-rose-500",
          "animate-spin"
        )}
      />
      <div
        className={cn(
          "absolute inset-1 rounded-full border-2 border-transparent",
          "border-b-orange-400/50 border-l-rose-400/50",
          "animate-spin [animation-direction:reverse] [animation-duration:0.8s]"
        )}
      />
    </div>
  );
}

export { LoadingSpinner, type LoadingSpinnerProps, type SpinnerSize };
