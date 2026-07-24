import type {
  ProductOption,
  SelectedOption,
  VariantPrice,
} from "./types";

/** Stable signature of a set of selected options (order-independent). */
export function optionSignature(options?: SelectedOption[]): string {
  if (!options || options.length === 0) return "";
  return [...options]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((o) => `${o.name}=${o.value}`)
    .join("|");
}

/** A cart line is unique per product + selected option combination. */
export function makeLineId(productId: string, options?: SelectedOption[]): string {
  const sig = optionSignature(options);
  return sig ? `${productId}::${sig}` : productId;
}

/** Stable key for a combination map, e.g. { Size:"S", Type:"A" } → "Size=S|Type=A". */
export function comboKey(combo: Record<string, string>): string {
  return Object.keys(combo)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}=${combo[k]}`)
    .join("|");
}

/** Turn a selection into a combo map { optionName: value }. */
function selectionToCombo(selected: SelectedOption[]): Record<string, string> {
  const combo: Record<string, string> = {};
  for (const s of selected) combo[s.name] = s.value;
  return combo;
}

/**
 * Every full combination of the product's options (cartesian product).
 * Used by the admin form to lay out the combination-price matrix.
 * Returns combos as ordered maps { optionName: choiceLabel }.
 */
export function allCombinations(
  productOptions: ProductOption[]
): Record<string, string>[] {
  const groups = productOptions.filter((g) => g.name && g.choices.length > 0);
  if (groups.length === 0) return [];
  let combos: Record<string, string>[] = [{}];
  for (const g of groups) {
    const next: Record<string, string>[] = [];
    for (const base of combos) {
      for (const c of g.choices) {
        if (!c.label) continue;
        next.push({ ...base, [g.name]: c.label });
      }
    }
    combos = next;
  }
  return combos;
}

/**
 * Find an exact combination price for a selection, if one is defined. The rule
 * must cover every option group and match every selected value.
 */
export function findVariantPrice(
  variantPrices: VariantPrice[],
  productOptions: ProductOption[],
  selected: SelectedOption[]
): number | null {
  if (!variantPrices?.length) return null;
  const groupNames = productOptions
    .filter((g) => g.name && g.choices.length > 0)
    .map((g) => g.name);
  if (groupNames.length === 0) return null;
  const selMap = selectionToCombo(selected);
  for (const v of variantPrices) {
    const keys = Object.keys(v.combo);
    if (keys.length !== groupNames.length) continue;
    const matches = groupNames.every((n) => selMap[n] === v.combo[n]);
    if (matches) return v.price;
  }
  return null;
}

/**
 * Compute a unit price, validated against the product's real option
 * definitions. An exact combination price (variantPrices) wins when defined;
 * otherwise it falls back to base price + the price deltas of each choice.
 * Unknown options are ignored (never trust client-supplied prices).
 */
export function priceWithOptions(
  basePrice: number,
  productOptions: ProductOption[],
  selected?: SelectedOption[],
  variantPrices?: VariantPrice[]
): { unitPrice: number; clean: SelectedOption[] } {
  const clean: SelectedOption[] = [];
  for (const sel of selected ?? []) {
    const group = productOptions.find((g) => g.name === sel.name);
    if (!group) continue;
    const choice = group.choices.find((c) => c.label === sel.value);
    if (!choice) continue;
    clean.push({ name: sel.name, value: sel.value });
  }

  // Exact combination price takes precedence over additive deltas.
  const variant = findVariantPrice(variantPrices ?? [], productOptions, clean);
  if (variant != null) {
    return { unitPrice: Math.max(0, variant), clean };
  }

  let price = basePrice;
  for (const sel of clean) {
    const group = productOptions.find((g) => g.name === sel.name)!;
    const choice = group.choices.find((c) => c.label === sel.value)!;
    price += choice.priceDelta || 0;
  }
  return { unitPrice: Math.max(0, price), clean };
}

/** Default selection = the first choice of every option group. */
export function defaultSelection(options: ProductOption[]): SelectedOption[] {
  return options
    .filter((g) => g.choices.length > 0)
    .map((g) => ({ name: g.name, value: g.choices[0].label }));
}

/**
 * The image a selection should display, if any choice defines one. The first
 * option group (in order) whose selected choice has an image wins.
 */
export function imageForSelection(
  productOptions: ProductOption[],
  selected: SelectedOption[]
): string | null {
  for (const group of productOptions) {
    const sel = selected.find((s) => s.name === group.name);
    if (!sel) continue;
    const choice = group.choices.find((c) => c.label === sel.value);
    if (choice?.image) return choice.image;
  }
  return null;
}
