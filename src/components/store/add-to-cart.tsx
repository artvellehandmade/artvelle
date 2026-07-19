"use client";

import { useState } from "react";
import { ShoppingBag, Minus, Plus, Check } from "lucide-react";
import { useCart } from "@/context/cart";
import { Button } from "@/components/ui/button";
import type { ProductDTO } from "@/lib/types";

export function AddToCartButton({
  product,
  className,
  withQuantity = false,
}: {
  product: ProductDTO;
  className?: string;
  withQuantity?: boolean;
}) {
  const { addItem, leadInfo } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0;

  function add() {
    if (soldOut) return;
    // If we already have the shopper's contact, this adds immediately; otherwise
    // the mini sign-up modal opens first (toast/animation handled after it saves).
    const hadInfo = leadInfo !== null;
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images[0] ?? "",
        price: product.price,
        stock: product.stock,
      },
      qty
    );
    if (hadInfo) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
    }
  }

  if (soldOut) {
    return (
      <Button variant="outline" disabled className={className}>
        Sold out
      </Button>
    );
  }

  return (
    <div className={withQuantity ? "flex flex-col gap-4 sm:flex-row" : ""}>
      {withQuantity && (
        <div className="inline-flex items-center rounded-full border border-border h-11">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="h-11 w-11 grid place-items-center hover:bg-muted rounded-l-full cursor-pointer"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm tabular-nums">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            className="h-11 w-11 grid place-items-center hover:bg-muted rounded-r-full cursor-pointer"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      <Button onClick={add} className={withQuantity ? "flex-1" : className}>
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
  );
}
