"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Minus, Plus, Check, Zap, Loader2, X } from "lucide-react";
import { useCart } from "@/context/cart";
import { useProductView } from "@/context/product-view";
import { Button } from "@/components/ui/button";
import { WhatsAppProductButton } from "@/components/store/product-actions";
import { formatINR } from "@/lib/utils";
import {
  normalizeVariants,
  isChoiceEnabled,
  pruneSelection,
  effectiveVariant,
  minMatchingPrice,
  toSelectedOptions,
  missingChoices,
  realOptionGroups,
} from "@/lib/variants";
import type { ProductDTO } from "@/lib/types";

export function ProductPurchase({ product }: { product: ProductDTO }) {
  const { addItem, buyNow, leadInfo } = useCart();
  const { selection, setSelection } = useProductView();

  const variants = useMemo(() => normalizeVariants(product), [product]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [buying, setBuying] = useState(false);

  // Nothing is pre-selected: the customer browses every photo, then narrows
  // down. Buying is blocked until every option group has an answer.
  const groups = useMemo(() => realOptionGroups(product.options), [product]);
  const hasOptions = groups.length > 0;
  const variant = effectiveVariant(product, selection);
  const minPrice = minMatchingPrice(product, selection);
  const unitPrice = variant ? variant.price : minPrice;

  const missing = missingChoices(product.options, selection);
  const noVariantAvailable =
    variants.length > 0 && !variants.some((v) => v.available);
  const soldOut = product.stock <= 0 || noVariantAvailable;
  // Every group answered AND, where a variant matrix exists, that exact
  // combination has to resolve to an available variant.
  const unavailableCombo =
    missing.length === 0 && variants.length > 0 && !variant;
  const needsChoice = missing.length > 0 || unavailableCombo;
  const canOrder = !soldOut && !needsChoice;

  function toggle(groupName: string, value: string) {
    // Clicking the chosen answer again clears it, so a customer can back out
    // of a pick without reloading the page.
    if (selection[groupName] === value) {
      const next = { ...selection };
      delete next[groupName];
      setSelection(pruneSelection(variants, product.options, next));
      return;
    }
    if (!isChoiceEnabled(variants, product.options, groupName, value, selection))
      return;
    // Set the choice, then drop any now-incompatible later options.
    setSelection(
      pruneSelection(variants, product.options, {
        ...selection,
        [groupName]: value,
      })
    );
  }

  /** "Size" · "Design and Size" · "Design, Size and Vatki" */
  function listNames(names: string[]) {
    if (names.length <= 1) return names[0] ?? "";
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }

  function buildItem() {
    // Prefer the pinned variant's exact combo/photo/price.
    const combo = variant ? variant.combo : selection;
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: variant?.images[0] ?? product.images[0] ?? "",
      price: unitPrice,
      stock: product.stock,
      options: Object.keys(combo).length ? toSelectedOptions(combo) : undefined,
    };
  }

  function onAdd() {
    if (!canOrder) return;
    const had = leadInfo !== null;
    addItem(buildItem(), qty);
    if (had) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
    }
  }

  function onBuy() {
    if (!canOrder) return;
    if (leadInfo) setBuying(true);
    buyNow(buildItem(), qty);
  }

  return (
    <div className="space-y-6">
      {/* Options — checkbox-style boxes; every group must be answered */}
      {groups.map((group) => (
        <div key={group.name}>
          <p className="mb-2 flex flex-wrap items-center gap-x-2 text-sm font-medium">
            <span>
              {group.name}
              <span className="text-danger"> *</span>
            </span>
            {selection[group.name] ? (
              <>
                <span className="font-normal text-muted-foreground">
                  {selection[group.name]}
                </span>
                <button
                  type="button"
                  onClick={() => toggle(group.name, selection[group.name])}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" /> clear
                </button>
              </>
            ) : (
              <span className="font-normal text-danger">Please select</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.choices.map((choice) => {
              const isActive = selection[group.name] === choice.label;
              const enabled =
                isActive ||
                isChoiceEnabled(
                  variants,
                  product.options,
                  group.name,
                  choice.label,
                  selection
                );
              return (
                <motion.button
                  key={choice.label}
                  type="button"
                  disabled={!enabled}
                  whileTap={enabled ? { scale: 0.94 } : undefined}
                  onClick={() => toggle(group.name, choice.label)}
                  className={`relative flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                    isActive
                      ? "border-accent bg-accent/10 text-foreground"
                      : enabled
                        ? "border-border hover:border-foreground/40"
                        : "cursor-not-allowed border-dashed border-border text-muted-foreground/50"
                  }`}
                  title={
                    !enabled
                      ? "Not available in this combination"
                      : isActive
                        ? "Click again to unselect"
                        : undefined
                  }
                >
                  <span
                    className={`grid h-4 w-4 place-items-center rounded border ${
                      isActive
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {isActive && <Check className="h-3 w-3" />}
                  </span>
                  <span className={!enabled ? "line-through" : ""}>
                    {choice.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Live price — "From" until a single variant is pinned down */}
      {hasOptions && (
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground">
            {variant ? "Your selection:" : "From"}
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${unitPrice}-${!!variant}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="text-xl font-semibold"
            >
              {formatINR(unitPrice)}
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      {/* Quantity + Add / Buy */}
      {soldOut ? (
        <Button variant="outline" disabled className="w-full" size="lg">
          {noVariantAvailable ? "Out of stock" : "Sold out"}
        </Button>
      ) : (
        <div className="space-y-3">
          {missing.length > 0 && (
            <p className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
              Select {listNames(missing)} to continue.
            </p>
          )}
          {unavailableCombo && (
            <p className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
              That combination isn&apos;t available — try a different one.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex h-12 items-center rounded-full border border-border">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-12 w-12 cursor-pointer place-items-center rounded-l-full hover:bg-muted"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                className="grid h-12 w-12 cursor-pointer place-items-center rounded-r-full hover:bg-muted"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              onClick={onAdd}
              size="lg"
              className="min-w-[10rem] flex-1"
              disabled={needsChoice}
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" /> Added
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" /> Add to cart
                </>
              )}
            </Button>
          </div>

          {/* Buy now + WhatsApp — always a single row */}
          <div className="flex items-center gap-2.5">
            <Button
              onClick={onBuy}
              variant="gold"
              size="lg"
              disabled={buying || needsChoice}
              className="flex-1 min-w-0"
            >
              {buying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {/* No price until the selection is real — a "from" price on a
                  Buy button reads as the price you are about to pay. */}
              Buy now{needsChoice ? "" : ` · ${formatINR(unitPrice * qty)}`}
            </Button>
            <WhatsAppProductButton
              product={product}
              variant="compact"
              options={toSelectedOptions(variant ? variant.combo : selection)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
