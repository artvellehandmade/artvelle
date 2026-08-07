import { cache } from "react";
import { prisma } from "./prisma";
import type { SettingsDTO } from "./types";

export const DEFAULT_SETTINGS: SettingsDTO = {
  brandName: "Artvelle",
  tagline: "Handcrafted resin art, made to be seen.",
  logoUrl: null,
  heroHeadline: "Art that captures light.",
  heroSubtext:
    "Original, handmade resin pieces — coasters, wall art, keepsakes and custom commissions.",
  aboutText:
    "Artvelle is a small studio creating one-of-a-kind resin art. Every piece is poured, cured and finished by hand.",
  contactEmail: "hello@artvelle.example",
  contactPhone: "+91 90000 00000",
  whatsapp: "+919000000000",
  address: "Studio Artvelle, India",
  instagram: "https://instagram.com",
  facebook: "",
  adminNotifyEmail: "admin@artvelle.example",
  currency: "INR",
  freeShippingThreshold: null,
  codEnabled: true,
  prepaidEnabled: true,
  partialEnabled: true,
  directEnabled: true,
  razorpayEnabled: false,
  nimbusEnabled: false,
  announcement: "Free shipping on all prepaid orders • Handmade in India",
  defaultMaterialsCare: [
    "Premium quality resin, hand-poured and hand-finished",
    "Wipe with a soft dry cloth — no chemical cleaners",
    "Keep away from direct sunlight and heat",
  ].join("\n"),
  defaultShippingInfo: [
    "Handmade to order — dispatched in 2–4 working days",
    "Delivered across India, tracking shared on dispatch",
    "Cash on Delivery available on eligible pin codes",
  ].join("\n"),
  defaultReturnsInfo: [
    "Damaged or wrong item? Report within 48 hours of delivery with unboxing photos.",
    "Made-to-order pieces can't be returned for a change of mind.",
    "Approved claims are replaced or refunded to the original payment method.",
  ].join("\n"),
};

/**
 * Resolve the product page's info blocks: a product's own copy wins, otherwise
 * the store-wide default. A blank result means "hide this section" — that's how
 * an admin switches a block off store-wide (clear it in Product defaults).
 *
 * Single source of truth for the rule, so the product page, any future PDP
 * variant and the admin preview can't drift apart.
 */
export function resolveProductInfo(
  product: {
    materialsCare?: string | null;
    shippingInfo?: string | null;
    returnsInfo?: string | null;
  },
  settings: Pick<
    SettingsDTO,
    "defaultMaterialsCare" | "defaultShippingInfo" | "defaultReturnsInfo"
  >
): { materialsCare: string; shippingInfo: string; returnsInfo: string } {
  // Only `null` inherits. An empty string is a deliberate per-product "hide
  // this section", which is why this isn't a `||` chain.
  const pick = (own: string | null | undefined, fallback: string) =>
    (own ?? fallback).trim();
  return {
    materialsCare: pick(product.materialsCare, settings.defaultMaterialsCare),
    shippingInfo: pick(product.shippingInfo, settings.defaultShippingInfo),
    returnsInfo: pick(product.returnsInfo, settings.defaultReturnsInfo),
  };
}

/**
 * Load site settings. Falls back to defaults if the DB is unavailable so the
 * storefront still renders (e.g. during first build before DB is configured).
 */
export const getSettings = cache(async (): Promise<SettingsDTO> => {
  try {
    const row = await prisma.siteSettings.findUnique({ where: { id: "main" } });
    if (!row) return DEFAULT_SETTINGS;
    return {
      brandName: row.brandName,
      tagline: row.tagline,
      logoUrl: row.logoUrl,
      heroHeadline: row.heroHeadline,
      heroSubtext: row.heroSubtext,
      aboutText: row.aboutText,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
      whatsapp: row.whatsapp,
      address: row.address,
      instagram: row.instagram,
      facebook: row.facebook,
      adminNotifyEmail: row.adminNotifyEmail,
      currency: row.currency,
      freeShippingThreshold: row.freeShippingThreshold,
      codEnabled: row.codEnabled,
      prepaidEnabled: row.prepaidEnabled,
      partialEnabled: row.partialEnabled,
      directEnabled: row.directEnabled,
      razorpayEnabled: row.razorpayEnabled,
      nimbusEnabled: row.nimbusEnabled,
      announcement: row.announcement,
      defaultMaterialsCare: row.defaultMaterialsCare,
      defaultShippingInfo: row.defaultShippingInfo,
      defaultReturnsInfo: row.defaultReturnsInfo,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
});
