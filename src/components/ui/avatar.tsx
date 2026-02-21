"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";

const avatarSizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

type AvatarSize = keyof typeof avatarSizes;

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  ring?: boolean;
  status?: "online" | "offline" | "busy" | "away";
  className?: string;
}

const statusColors = {
  online: "bg-emerald-500",
  offline: "bg-gray-500",
  busy: "bg-red-500",
  away: "bg-amber-500",
} as const;

function Avatar({
  src,
  alt,
  name,
  size = "md",
  ring = false,
  status,
  className,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initials = name ? getInitials(name) : "?";

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className={cn(
          "rounded-full overflow-hidden flex items-center justify-center font-medium",
          "bg-gradient-to-br from-indigo-500 to-violet-500 text-white",
          avatarSizes[size],
          ring && "ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-gray-900"
        )}
      >
        {src && !imgError ? (
          <img
            src={src}
            alt={alt || name || "Avatar"}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-gray-900",
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

export { Avatar, type AvatarProps, type AvatarSize };
