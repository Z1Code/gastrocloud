import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "CLP"): string {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency }).format(
    amount
  );
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function generateOrderNumber(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}
