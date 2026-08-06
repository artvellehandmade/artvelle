import type { Attribute, MediaDTO, PropertyDependencies, SellableVariant } from "./types";
import { comboKey } from "./options";

export type Selection = Record<string, string>;

/** Default selection = the first available choice of every attribute. */
export function defaultSelection(attributes: Attribute[]): Selection {
  const result: Selection = {};
  for (const attr of attributes) {
    if (attr.values.length > 0) {
      result[attr.name] = attr.values[0];
    }
  }
  return result;
}

/**
 * Bridge the admin authoring model (`options` + `variants`) to the storefront/
 * checkout read model (`attributes` + `sellableVariants`). Single source of truth,
 * used both when saving a product (server action) and as a read-time fallback for
 * products saved before the two halves were connected. Pure — no DB/server deps.
 */
export function deriveVariantModel(input: {
  options?: unknown;
  variants?: unknown;
  price: number;
  stock: number;
}): { attributes: Attribute[]; sellableVariants: SellableVariant[] } {
  const options = Array.isArray(input.options) ? (input.options as any[]) : [];
  const attributes: Attribute[] = options
    .map((o) => ({
      name: String(o?.name ?? "").trim(),
      values: Array.isArray(o?.choices)
        ? (o.choices as any[]).map((c) => String(c?.label ?? "").trim()).filter(Boolean)
        : [],
    }))
    .filter((a) => a.name && a.values.length > 0);

  const variants = Array.isArray(input.variants) ? (input.variants as any[]) : [];
  const basePrice = Number(input.price) || 0;
  const baseStock = Number(input.stock) || 0;
  const sellableVariants: SellableVariant[] = variants
    .filter((v) => v && typeof v.combo === "object" && v.combo)
    .map((v) => {
      const combo = v.combo as Record<string, string>;
      const priceRaw = v.price;
      const price =
        priceRaw === "" || priceRaw == null ? basePrice : Number(priceRaw) || basePrice;
      const images = Array.isArray(v.images) ? (v.images as any[]).filter(Boolean) : [];
      const stockRaw = v.stock;
      const stock =
        stockRaw === "" || stockRaw == null || !Number.isFinite(Number(stockRaw))
          ? baseStock // no per-variant stock set → inherit the product's stock
          : Number(stockRaw);
      return {
        id: comboKey(combo),
        combo,
        price,
        images,
        stock,
        weight: 0,
        available: v.available !== false,
      };
    });

  return { attributes, sellableVariants };
}

/**
 * The selection to show on first load: the combo of the first *available* sellable
 * variant (so the customer lands on something orderable), falling back to the first
 * choice of each attribute. Empty for products with no options.
 */
export function firstAvailableSelection(product: {
  attributes?: Attribute[];
  sellableVariants?: SellableVariant[];
}): Selection {
  const attributes = product.attributes ?? [];
  if (attributes.length === 0) return {};
  const variants = product.sellableVariants ?? [];
  const firstAvailable = variants.find((v) => v.available);
  if (firstAvailable) return { ...firstAvailable.combo };
  const anyVariant = variants[0];
  if (anyVariant) return { ...anyVariant.combo };
  return defaultSelection(attributes);
}

/** 
 * Returns the effective price for a selection.
 */
export function priceForSelection(
  product: { price: number; sellableVariants?: any },
  selected: Selection
): number {
  const variants = (product.sellableVariants || []) as SellableVariant[];
  const key = comboKey(selected);
  const match = variants.find(v => v.id === key);
  return match?.price ?? product.price;
}

export function imagesForSelection(
  product: { images: string[]; sellableVariants?: any },
  selected: Selection
): string[] {
  const variants = (product.sellableVariants || []) as SellableVariant[];
  const key = comboKey(selected);
  const match = variants.find(v => v.id === key);
  
  if (match && match.images && match.images.length > 0) {
    return match.images;
  }

  return product.images || [];
}

/**
 * Resolves the storefront gallery for a selection from the relational
 * ProductImage rows (`product.media`) — the intended source of truth.
 *
 * The "visual variant" attribute is dynamic: it's the first attribute driving
 * images (`propertyModules.images[0]`), falling back to the first attribute
 * (`attributes[0]`) when no image dependencies are declared. Its selected value
 * scopes the gallery. Result = media tagged with that value (ordered by
 * sortOrder) followed by the common media (`variantValue == null`, ordered by
 * sortOrder), de-duplicated by url. Falls back to `imagesForSelection` (the
 * legacy sellableVariants JSON → `product.images`) when there are no media rows
 * or the computed list is empty. Videos are returned like images (the gallery
 * detects them by extension). Pure — no DB/server deps.
 */
export function galleryForSelection(
  product: {
    images: string[];
    media?: MediaDTO[];
    attributes?: Attribute[];
    propertyModules?: PropertyDependencies;
    sellableVariants?: any;
  },
  selected: Selection
): string[] {
  const media = product.media ?? [];
  if (media.length > 0) {
    // Visual attribute is dynamic: prefer the first image-driving property, then
    // fall back to the first attribute. Guard against a non-array `images`.
    const pmImages = product.propertyModules?.images;
    const visualName =
      (Array.isArray(pmImages) ? pmImages[0] : undefined) ??
      product.attributes?.[0]?.name;
    const visualVal = visualName ? selected[visualName] : undefined;

    // Defensive: the query already orders by sortOrder, but never trust the
    // input array's order here.
    const bySort = (a: MediaDTO, b: MediaDTO) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

    const variantRows =
      visualVal != null
        ? media.filter((m) => m.variantValue === visualVal).sort(bySort)
        : [];
    const commonRows = media
      .filter((m) => m.variantValue == null)
      .sort(bySort);

    const urls = [...variantRows, ...commonRows]
      .map((m) => m.url)
      .filter(Boolean);
    const deduped = Array.from(new Set(urls));
    if (deduped.length > 0) return deduped;
  }

  return imagesForSelection(product, selected);
}

/** 
 * Returns the min and max possible price for a product.
 */
export function priceRange(product: { price: number; sellableVariants?: any }): { min: number; max: number } {
  const variants = (product.sellableVariants || []) as SellableVariant[];
  if (variants.length === 0) return { min: product.price, max: product.price };
  
  const prices = variants.filter(v => v.available).map(v => v.price);
  if (prices.length === 0) return { min: product.price, max: product.price };
  
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/**
 * Is the given choice currently in stock/available?
 * (Simplest check: does a sellable variant exist with this choice that is available?)
 */
export function isChoiceEnabled(
  groupName: string,
  choiceLabel: string,
  product: { sellableVariants?: any }
): boolean {
  const variants = (product.sellableVariants || []) as SellableVariant[];
  if (variants.length === 0) return true; // If no variants generated, assume enabled
  
  // Find any variant that has this choice and is available
  return variants.some(v => v.combo[groupName] === choiceLabel && v.available);
}

/**
 * Ensures a partial or outdated selection is still valid, filling in missing choices.
 */
export function repairSelection(
  attributes: Attribute[],
  selected: Selection
): Selection {
  const current = { ...selected };
  let modified = false;

  for (const attr of attributes) {
    if (attr.values.length === 0) continue;
    const val = current[attr.name];
    if (!val || !attr.values.includes(val)) {
      current[attr.name] = attr.values[0];
      modified = true;
    }
  }

  // Remove keys that aren't attributes anymore
  const names = new Set(attributes.map(g => g.name));
  for (const k of Object.keys(current)) {
    if (!names.has(k)) {
      delete current[k];
      modified = true;
    }
  }

  return current;
}
