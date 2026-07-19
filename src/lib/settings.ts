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
  shippingFee: 0,
  freeShippingThreshold: null,
  codEnabled: true,
  announcement: "Free shipping on all prepaid orders • Handmade in India",
};

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
      shippingFee: row.shippingFee,
      freeShippingThreshold: row.freeShippingThreshold,
      codEnabled: row.codEnabled,
      announcement: row.announcement,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
});
