"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Minus, Plus, Check, Zap, Loader2 } from "lucide-react";
import { useCart } from "@/context/cart";
import { useProductView } from "@/context/product-view";
import { Button } from "@/components/ui/button";
import { WhatsAppProductButton } from "@/components/store/product-actions";
import { formatINR } from "@/lib/utils";
import {
  normalizeVariants,
  initialSelection,
  repairSelection,
  isChoiceEnabled,
  resolveVariant,
  priceForSelection,
  imagesForSelection,
  toSelectedOptions,
  type Selection,
} from "@/lib/variants";
import type { ProductDTO } from "@/lib/types";

export function ProductPurchase({ product }: { product: ProductDTO }) {
  const { addItem, buyNow, leadInfo } = useCart();
  const { setImages } = useProductView();

  const variants = useMemo(() => normalizeVariants(product), [product]);
  const [selected, setSelected] = useState<Selection>(() =>
    initialSelection(variants, product.options)
  );

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [buying, setBuying] = useState(false);

  const unitPrice = priceForSelection(product, selected);
  const hasOptions = product.options.length > 0;
  const noVariantAvailable =
    variants.length > 0 && !variants.some((v) => v.available);
  const soldOut = product.stock <= 0 || noVariantAvailable;

  function choose(groupName: string, value: string) {
    if (!isChoiceEnabled(variants, product.options, groupName, value, selected))
      return;
    const next = repairSelection(variants, product.options, {
      ...selected,
      [groupName]: value,
    });
    setSelected(next);
    setImages(imagesForSelection(product, next));
  }

  function buildItem() {
    const variant = resolveVariant(variants, selected);
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: variant?.images[0] ?? product.images[0] ?? "",
      price: unitPrice,
      stock: product.stock,
      options: Object.keys(selected).length
        ? toSelectedOptions(selected)
        : undefined,
    };
  }

  function onAdd() {
    if (soldOut) return;
    const had = leadInfo !== null;
    addItem(buildItem(), qty);
    if (had) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
    }
  }

  function onBuy() {
    if (soldOut) return;
    if (leadInfo) setBuying(true);
    buyNow(buildItem(), qty);
  }

  return (
    <div className="space-y-6">
      {/* Options — Flipkart-style boxes, one pick per attribute */}
      {product.options.map((group) => (
        <div key={group.name}>
          <p className="mb-2 text-sm font-medium">
            {group.name}
            <span className="ml-2 font-normal text-muted-foreground">
              {selected[group.name]}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {group.choices.map((choice) => {
              const isActive = selected[group.name] === choice.label;
              const enabled = isChoiceEnabled(
                variants,
                product.options,
                group.name,
                choice.label,
                selected
              );
              return (
                <motion.button
                  key={choice.label}
                  type="button"
                  disabled={!enabled}
                  whileTap={enabled ? { scale: 0.94 } : undefined}
                  onClick={() => choose(group.name, choice.label)}
                  className={`relative flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                    isActive
                      ? "border-accent bg-accent/10 text-foreground"
                      : enabled
                        ? "border-border hover:border-foreground/40"
                        : "cursor-not-allowed border-dashed border-border text-muted-foreground/50"
                  }`}
                  title={enabled ? undefined : "Not available in this combination"}
                >
                  {/* Checkbox indicator */}
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

      {/* Live price for the current selection */}
      {hasOptions && (
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground">Your selection:</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={unitPrice}
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
            <Button onClick={onAdd} size="lg" className="min-w-[10rem] flex-1">
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={onBuy}
              variant="gold"
              size="lg"
              disabled={buying}
              className="flex-1"
            >
              {buying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Buy now · {formatINR(unitPrice * qty)}
            </Button>
            <WhatsAppProductButton
              product={product}
              variant="full"
              options={toSelectedOptions(selected)}
              className="flex-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}
