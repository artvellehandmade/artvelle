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

/**
 * Normalise an Indian phone number to E.164-ish digits for wa.me links.
 * 10 digits → prefixed with 91; keeps existing country codes; strips symbols.
 */
export function normalisePhone(phone: string): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

/** Build a click-to-send WhatsApp link with a pre-filled message. */
export function whatsappLink(phone: string, message: string): string {
  const to = normalisePhone(phone);
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}

export const CATEGORIES = [
  "Home Decor",
  "Pooja Essentials",
  "Wedding Preservation",
  "Personalised Gifts",
  "Rakhi Collection",
  "Tableware & Dining",
  "Fashion Accessories",
  "Car Accessories",
  "Festive Decor",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Encode a gallery path (folder names contain spaces → %20). */
export const galleryImg = (path: string) =>
  encodeURI(`/products/gallery/${path}`);

/** A representative real photo for each category (used on the homepage tiles). */
export const CATEGORY_IMAGES: Record<string, string> = {
  "Home Decor": galleryImg("Home Decor/Resin Name Plate/name-plate-1.jpg"),
  "Pooja Essentials": galleryImg("Pooja Essentials/Resin Pooja Thali/pooja-thali-1.jpg"),
  "Wedding Preservation": galleryImg("Wedding Preservation/Varmala and Flower Preservation/varmala-1.jpg"),
  "Personalised Gifts": galleryImg("Personalised Gifts/Resin Photo Frame/photo-frame-1.jpg"),
  "Rakhi Collection": galleryImg("Rakhi Collection/Rakhi Preservation Hamper/rakhi-hamper-1.jpg"),
  "Tableware & Dining": galleryImg("Tableware and Dining/Ring Platter/ring-platter-1.jpg"),
  "Fashion Accessories": galleryImg("Fashion Accessories/Resin Brooch/brooch-1.jpg"),
  "Car Accessories": galleryImg("Car Accessories/Dashboard Idol/dashboard-idol-1.jpg"),
  "Festive Decor": galleryImg("Festive Decor/Resin Toran/toran-1.jpg"),
};
