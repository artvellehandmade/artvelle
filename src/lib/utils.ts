import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function orderNumber(): string {
  // AV-<base36 time><2 random chars> — human friendly, hard to collide
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `AV-${t}${r}`;
}

export const CATEGORIES = [
  "Resin Art",
  "Coasters",
  "Wall Art",
  "Name Plates",
  "Home Decor",
  "Keepsakes",
] as const;

export type Category = (typeof CATEGORIES)[number];
