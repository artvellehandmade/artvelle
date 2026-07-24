import type {
  ProductOption,
  SelectedOption,
  Variant,
  VariantPrice,
} from "./types";
import { allCombinations, comboKey } from "./options";

/** The subset of a product this module needs — works for DTOs and Prisma rows. */
export type VariantSource = {
  price: number;
  options: ProductOption[];
  variants?: Variant[];
  variantPrices?: VariantPrice[];
  images?: string[];
};

/** A selection as a plain map, e.g. { Size: "4 inch", Vatki: "1" }. */
export type Selection = Record<string, string>;

export function toSelection(options?: SelectedOption[]): Selection {
  const s: Selection = {};
  for (const o of options ?? []) s[o.name] = o.value;
  return s;
}

export function toSelectedOptions(sel: Selection): SelectedOption[] {
  return Object.entries(sel).map(([name, value]) => ({ name, value }));
}

/**
 * Return the product's variant matrix, synthesising one for older products
 * (from options + legacy variantPrices + per-choice images) so every product
 * behaves the same. Returns [] when the product has no options at all.
 */
export function normalizeVariants(p: VariantSource): Variant[] {
  if (p.variants && p.variants.length) return p.variants;

  const combos = allCombinations(p.options);
  if (!combos.length) return [];

  const priceByKey = new Map(
    (p.variantPrices ?? []).map((v) => [comboKey(v.combo), v.price])
  );

  return combos.map((combo) => {
    const key = comboKey(combo);
    let price = priceByKey.get(key);
    const images: string[] = [];
    if (price == null) {
      // Fall back to base price + additive per-choice deltas.
      price = p.price;
      for (const [g, val] of Object.entries(combo)) {
        const group = p.options.find((o) => o.name === g);
        const choice = group?.choices.find((c) => c.label === val);
        if (choice) price += choice.priceDelta || 0;
      }
    }
    // Carry any per-choice images (legacy single-image-per-choice feature).
    for (const [g, val] of Object.entries(combo)) {
      const group = p.options.find((o) => o.name === g);
      const choice = group?.choices.find((c) => c.label === val);
      if (choice?.image && !images.includes(choice.image)) {
        images.push(choice.image);
      }
    }
    return { combo, price, available: true, images };
  });
}

/**
 * Is `choice` in `groupName` selectable, given the current selection? Uses a
 * hierarchical rule (Flipkart-style): a choice is enabled when at least one
 * AVAILABLE variant matches it plus every selection made in the option groups
 * listed *before* this one. So the first option (e.g. Size) is the primary
 * attribute and later ones (e.g. Vatki) depend on it.
 */
export function isChoiceEnabled(
  variants: Variant[],
  options: ProductOption[],
  groupName: string,
  choice: string,
  selected: Selection
): boolean {
  if (!variants.length) return true; // simple product, no constraints
  // Hierarchical: the first option (e.g. Size) is primary and always
  // selectable; later options (e.g. Vatki) are constrained only by the
  // options listed BEFORE them. Switching a primary option never dead-ends —
  // conflicting sub-selections are dropped instead (see pruneSelection).
  const order = options.map((o) => o.name);
  const gi = order.indexOf(groupName);
  const prior = order.slice(0, gi);
  return variants.some(
    (v) =>
      v.available &&
      v.combo[groupName] === choice &&
      prior.every((g) => selected[g] == null || v.combo[g] === selected[g])
  );
}

/**
 * Drop any selection that has become inconsistent with the options chosen
 * before it (keeps earlier picks, removes conflicting later ones). Used after
 * a change so switching e.g. Size clears an incompatible Vatki instead of
 * blocking.
 */
export function pruneSelection(
  variants: Variant[],
  options: ProductOption[],
  selected: Selection
): Selection {
  if (!variants.length) return { ...selected };
  const order = options.map((o) => o.name);
  const result: Selection = { ...selected };
  for (let i = 0; i < order.length; i++) {
    const g = order[i];
    if (result[g] == null) continue;
    const ok = variants.some(
      (v) =>
        v.available &&
        v.combo[g] === result[g] &&
        order
          .slice(0, i)
          .every((pg) => result[pg] == null || v.combo[pg] === result[pg])
    );
    if (!ok) delete result[g];
  }
  return result;
}

/** All created (available) variants consistent with a partial selection. */
export function matchingVariants(
  variants: Variant[],
  selected: Selection
): Variant[] {
  return variants.filter(
    (v) =>
      v.available &&
      Object.entries(selected).every(([g, val]) => v.combo[g] === val)
  );
}

/**
 * The single variant a selection points to, if it can be pinned down — either
 * the selection names every attribute, or only one created variant is left.
 */
export function effectiveVariant(
  p: VariantSource,
  selected: Selection
): Variant | null {
  const variants = normalizeVariants(p);
  if (!variants.length) return null;
  const matched = matchingVariants(variants, selected);
  if (matched.length === 1) return matched[0];
  const full = p.options.every((o) => selected[o.name] != null);
  return full ? resolveVariant(variants, selected) : null;
}

/** Lowest price among the variants a (partial) selection still allows. */
export function minMatchingPrice(p: VariantSource, selected: Selection): number {
  const variants = normalizeVariants(p);
  const matched = matchingVariants(variants, selected);
  if (!matched.length) return p.price;
  return Math.min(...matched.map((v) => v.price));
}

/** Union of photos across the variants a (partial) selection allows. */
export function unionImages(
  p: VariantSource,
  selected: Selection,
  fallback: string[]
): string[] {
  const variants = normalizeVariants(p);
  if (!variants.length) return fallback;
  const matched = matchingVariants(variants, selected);
  const out: string[] = [];
  for (const v of matched) {
    for (const img of v.images) if (!out.includes(img)) out.push(img);
  }
  return out.length ? out : fallback;
}

/** The one created variant a photo uniquely belongs to (null if 0 or many). */
export function variantForImage(
  variants: Variant[],
  img: string
): Variant | null {
  const owners = variants.filter((v) => v.available && v.images.includes(img));
  return owners.length === 1 ? owners[0] : null;
}

/**
 * After a change, walk the option groups in order and fix any downstream
 * selection that is no longer valid, snapping it to the first enabled choice.
 */
export function repairSelection(
  variants: Variant[],
  options: ProductOption[],
  selected: Selection
): Selection {
  if (!variants.length) return { ...selected };
  const order = options.map((o) => o.name);
  const result: Selection = { ...selected };
  for (let i = 0; i < order.length; i++) {
    const g = order[i];
    const choices = options[i].choices.map((c) => c.label);
    const ok = (val: string) =>
      variants.some(
        (v) =>
          v.available &&
          v.combo[g] === val &&
          order.slice(0, i).every((pg) => v.combo[pg] === result[pg])
      );
    if (result[g] == null || !ok(result[g])) {
      const first = choices.find(ok);
      if (first != null) result[g] = first;
      else delete result[g];
    }
  }
  return result;
}

/** A sensible starting selection: the first available variant, then repaired. */
export function initialSelection(
  variants: Variant[],
  options: ProductOption[]
): Selection {
  if (!variants.length) return {};
  const first = variants.find((v) => v.available) ?? variants[0];
  return repairSelection(variants, options, first ? { ...first.combo } : {});
}

/** The available variant that exactly matches a full selection, if any. */
export function resolveVariant(
  variants: Variant[],
  selected: Selection
): Variant | null {
  return (
    variants.find(
      (v) =>
        v.available &&
        Object.keys(v.combo).length === Object.keys(selected).length &&
        Object.entries(v.combo).every(([g, val]) => selected[g] === val)
    ) ?? null
  );
}

/** Images to display for a selection — the variant's own, else the product's. */
export function imagesForSelection(
  p: VariantSource,
  selected: Selection
): string[] {
  const variants = normalizeVariants(p);
  const v = variants.length ? resolveVariant(variants, selected) : null;
  if (v && v.images.length) return v.images;
  return p.images ?? [];
}

/** The unit price for a selection (falls back to the base price). */
export function priceForSelection(p: VariantSource, selected: Selection): number {
  const variants = normalizeVariants(p);
  if (!variants.length) return p.price;
  const v = resolveVariant(variants, selected);
  return v ? v.price : p.price;
}

/** Min–max price across all available variants (for a header price range). */
export function priceRange(p: VariantSource): { min: number; max: number } {
  const variants = normalizeVariants(p).filter((v) => v.available);
  if (!variants.length) return { min: p.price, max: p.price };
  const prices = variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
