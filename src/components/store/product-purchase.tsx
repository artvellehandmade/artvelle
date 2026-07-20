"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, Minus, Plus, Check, Zap, Loader2 } from "lucide-react";
import { useCart } from "@/context/cart";
import { Button } from "@/components/ui/button";
import { WhatsAppProductButton } from "@/components/store/product-actions";
import { formatINR } from "@/lib/utils";
import { priceWithOptions, defaultSelection } from "@/lib/options";
import type { ProductDTO, SelectedOption } from "@/lib/types";

export function ProductPurchase({ product }: { product: ProductDTO }) {
  const { addItem, buyNow, leadInfo } = useCart();
  const soldOut = product.stock <= 0;
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [buying, setBuying] = useState(false);
  const [selected, setSelected] = useState<SelectedOption[]>(() =>
    defaultSelection(product.options)
  );

  const { unitPrice } = priceWithOptions(
    product.price,
    product.options,
    selected
  );
  const hasPriceDeltas = product.options.some((g) =>
    g.choices.some((c) => c.priceDelta !== 0)
  );

  function choose(groupName: string, value: string) {
    setSelected((prev) => {
      const rest = prev.filter((o) => o.name !== groupName);
      return [...rest, { name: groupName, value }];
    });
  }

  function valueFor(groupName: string) {
    return selected.find((o) => o.name === groupName)?.value;
  }

  function buildItem() {
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] ?? "",
      price: unitPrice,
      stock: product.stock,
      options: selected.length ? selected : undefined,
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
      {/* Options */}
      {product.options.map((group) => (
        <div key={group.name}>
          <p className="mb-2 text-sm font-medium">
            {group.name}
            <span className="ml-2 font-normal text-muted-foreground">
              {valueFor(group.name)}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {group.choices.map((choice) => {
              const active = valueFor(group.name) === choice.label;
              return (
                <button
                  key={choice.label}
                  type="button"
                  onClick={() => choose(group.name, choice.label)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {choice.label}
                  {choice.priceDelta > 0 && (
                    <span
                      className={
                        active ? "opacity-80" : "text-muted-foreground"
                      }
                    >
                      {" "}
                      +{formatINR(choice.priceDelta)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Live price for the current selection (when options change price) */}
      {hasPriceDeltas && (
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground">Your selection:</span>
          <span className="text-xl font-semibold">{formatINR(unitPrice)}</span>
        </div>
      )}

      {/* Quantity + Add / Buy */}
      {soldOut ? (
        <Button variant="outline" disabled className="w-full" size="lg">
          Sold out
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
              options={selected}
              className="flex-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}
