"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShoppingBag,
  Minus,
  Plus,
  Check,
  Zap,
  Loader2,
  HandHeart,
  Truck,
  ShieldCheck,
  IndianRupee,
} from "lucide-react";
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

// ─── Trust badges row (lives inside the purchase section, near CTAs) ────────
function TrustRow() {
  const items = [
    { icon: <HandHeart  className="h-4 w-4" />, label: "Handmade to Order" },
    { icon: <Truck      className="h-4 w-4" />, label: "Ships Across India" },
    { icon: <ShieldCheck className="h-4 w-4" />, label: "Secure Packaging" },
    { icon: <IndianRupee className="h-4 w-4" />, label: "Cash on Delivery" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl border border-border p-4">
      {items.map(({ icon, label }) => (
        <div key={label} className="flex flex-col items-center gap-1.5 text-center">
          <span className="gold-text">{icon}</span>
          <span className="text-[10px] leading-tight text-muted-foreground sm:text-xs">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Diagonal line SVG for unavailable pills ─────────────────────────────────
function StrikeThrough() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <line
        x1="0"
        y1="100%"
        x2="100%"
        y2="0"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.3"
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ProductPurchase({ product }: { product: ProductDTO }) {
  const { addItem, buyNow, leadInfo } = useCart();
  const { selection, setSelection }   = useProductView();

  const variants  = useMemo(() => normalizeVariants(product), [product]);
  const [qty, setQty]       = useState(1);
  const [added, setAdded]   = useState(false);
  const [buying, setBuying] = useState(false);

  const groups     = useMemo(() => realOptionGroups(product.options), [product]);
  const hasOptions = groups.length > 0;
  const variant    = effectiveVariant(product, selection);
  const minPrice   = minMatchingPrice(product, selection);
  const unitPrice  = variant ? variant.price : minPrice;

  const missing          = missingChoices(product.options, selection);
  const noVariantAvail   = variants.length > 0 && !variants.some((v) => v.available);
  const soldOut          = product.stock <= 0 || noVariantAvail;
  const unavailableCombo = missing.length === 0 && variants.length > 0 && !variant;
  const needsChoice      = missing.length > 0 || unavailableCombo;
  const canOrder         = !soldOut && !needsChoice;

  function toggle(groupName: string, value: string) {
    if (selection[groupName] === value) {
      const next = { ...selection };
      delete next[groupName];
      setSelection(pruneSelection(variants, product.options, next));
      return;
    }
    if (!isChoiceEnabled(variants, product.options, groupName, value, selection))
      return;
    setSelection(
      pruneSelection(variants, product.options, { ...selection, [groupName]: value })
    );
  }

  function listNames(names: string[]) {
    if (names.length <= 1) return names[0] ?? "";
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }

  function buildItem() {
    const combo = variant ? variant.combo : selection;
    return {
      productId: product.id,
      slug:      product.slug,
      name:      product.name,
      image:     variant?.images[0] ?? product.images[0] ?? "",
      price:     unitPrice,
      stock:     product.stock,
      options:   Object.keys(combo).length ? toSelectedOptions(combo) : undefined,
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
    <div className="space-y-5">
      {/* ── Live price — always visible, "From" until a variant is pinned ── */}
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
              transition={{ duration: 0.15 }}
              className="text-2xl font-semibold"
            >
              {formatINR(unitPrice)}
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      {/* ── Option groups — pill style ── */}
      {groups.map((group) => (
        <div key={group.name}>
          {/* Group label + current pick */}
          <p className="mb-2.5 flex flex-wrap items-center gap-x-2 text-sm font-medium">
            <span>
              {group.name}
              <span className="text-danger"> *</span>
            </span>
            {selection[group.name] ? (
              <span className="font-normal text-muted-foreground">
                — {selection[group.name]}
              </span>
            ) : (
              <span className="font-normal text-danger text-xs">Select one</span>
            )}
          </p>

          {/* Pill grid */}
          <div className="flex flex-wrap gap-2">
            {group.choices.map((choice) => {
              const isActive = selection[group.name] === choice.label;
              const enabled  =
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
                  whileTap={enabled ? { scale: 0.96 } : undefined}
                  onClick={() => toggle(group.name, choice.label)}
                  aria-pressed={isActive}
                  aria-label={`${group.name}: ${choice.label}${!enabled ? " (unavailable)" : ""}`}
                  title={
                    !enabled
                      ? "Not available in this combination"
                      : isActive
                      ? "Click to unselect"
                      : undefined
                  }
                  className={[
                    // Base — minimum 44 px touch target, pill shape
                    "relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center",
                    "rounded-full border px-4 text-sm font-medium",
                    "transition-all duration-150 select-none",
                    // States
                    isActive
                      ? "border-accent bg-accent text-accent-foreground shadow-sm"
                      : enabled
                      ? "border-border bg-background hover:border-foreground/40 hover:bg-muted cursor-pointer"
                      : "cursor-not-allowed border-dashed border-border/60 text-muted-foreground/50",
                  ].join(" ")}
                >
                  {/* Diagonal line on unavailable pills */}
                  {!enabled && <StrikeThrough />}

                  {/* Label */}
                  <span className="relative z-10">{choice.label}</span>

                  {/* Check mark for active */}
                  {isActive && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="relative z-10 ml-1.5 flex h-4 w-4 items-center justify-center"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}

      {/* ── Validation banners ── */}
      {missing.length > 0 && (
        <p className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
          Please select {listNames(missing)} to continue.
        </p>
      )}
      {unavailableCombo && (
        <p className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
          That combination isn&apos;t available — try a different one.
        </p>
      )}

      {/* ── Action section ── */}
      {soldOut ? (
        <Button variant="outline" disabled className="w-full" size="lg">
          {noVariantAvail ? "Out of stock" : "Sold out"}
        </Button>
      ) : (
        <div className="space-y-3">
          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-3">
            {/* Quantity stepper */}
            <div className="inline-flex h-12 shrink-0 items-center rounded-full border border-border">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-12 w-12 cursor-pointer place-items-center rounded-l-full hover:bg-muted"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                className="grid h-12 w-12 cursor-pointer place-items-center rounded-r-full hover:bg-muted"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Add to Cart */}
            <Button
              onClick={onAdd}
              size="lg"
              className="flex-1"
              disabled={needsChoice}
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" /> Added
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" /> Add to Cart
                </>
              )}
            </Button>
          </div>

          {/* Buy Now + WhatsApp */}
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
              Buy Now
              {!needsChoice && ` · ${formatINR(unitPrice * qty)}`}
            </Button>
            <WhatsAppProductButton
              product={product}
              variant="compact"
              options={toSelectedOptions(variant ? variant.combo : selection)}
            />
          </div>
        </div>
      )}

      {/* ── Trust badges — immediately below CTAs ── */}
      <TrustRow />
    </div>
  );
}
