import type { ProductOption, SelectedOption } from "./types";

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

/**
 * Compute a unit price from a base price + the price deltas of the selected
 * options, validated against the product's real option definitions. Unknown
 * options are ignored (never trust client-supplied deltas).
 */
export function priceWithOptions(
  basePrice: number,
  productOptions: ProductOption[],
  selected?: SelectedOption[]
): { unitPrice: number; clean: SelectedOption[] } {
  let price = basePrice;
  const clean: SelectedOption[] = [];
  for (const sel of selected ?? []) {
    const group = productOptions.find((g) => g.name === sel.name);
    if (!group) continue;
    const choice = group.choices.find((c) => c.label === sel.value);
    if (!choice) continue;
    price += choice.priceDelta || 0;
    clean.push({ name: sel.name, value: sel.value });
  }
  return { unitPrice: Math.max(0, price), clean };
}

/** Default selection = the first choice of every option group. */
export function defaultSelection(options: ProductOption[]): SelectedOption[] {
  return options
    .filter((g) => g.choices.length > 0)
    .map((g) => ({ name: g.name, value: g.choices[0].label }));
}
