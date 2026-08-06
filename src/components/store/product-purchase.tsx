"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import { formatINR, cn } from "@/lib/utils";
import {
  priceForSelection,
  priceRange,
  isChoiceEnabled,
  repairSelection,
} from "@/lib/variants";
import type { ProductDTO, Attribute, SellableVariant } from "@/lib/types";
import { comboKey } from "@/lib/options";

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

function StrikeThrough() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <line x1="0" y1="100%" x2="100%" y2="0" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
    </svg>
  );
}

export function ProductPurchase({ product }: { product: ProductDTO }) {
  const { addItem, buyNow, leadInfo } = useCart();
  const { selection, setSelection }   = useProductView();
  
  const attributes = (product.attributes || []) as Attribute[];
  const hasOptions = attributes.length > 0;

  const [qty, setQty]       = useState(1);
  const [added, setAdded]   = useState(false);
  const [buying, setBuying] = useState(false);

  const unitPrice = priceForSelection(product as any, selection);
  const minMax = priceRange(product as any);

  const missing = attributes.filter(g => !selection[g.name]).map(g => g.name);
  const soldOut = product.stock <= 0;
  const needsChoice = missing.length > 0;
  const canOrder = !soldOut && !needsChoice;

  function toggle(groupName: string, value: string) {
    if (selection[groupName] === value) {
      const next = { ...selection };
      delete next[groupName];
      setSelection(next);
      return;
    }
    if (!isChoiceEnabled(groupName, value, product)) return;
    setSelection(repairSelection(attributes, { ...selection, [groupName]: value }));
  }

  function listNames(names: string[]) {
    if (names.length <= 1) return names[0] ?? "";
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }

  function buildItem() {
    const key = comboKey(selection);
    const variants = (product.sellableVariants || []) as SellableVariant[];
    const match = variants.find(v => v.id === key);
    
    let activeImage = product.images[0] ?? "";
    if (match && match.images && match.images.length > 0) {
      activeImage = match.images[0];
    }
    
    // Convert selection Record to SelectedOption[]
    const selectedOptions = Object.entries(selection).map(([name, value]) => ({ name, value }));
    
    return {
      productId: product.id,
      slug:      product.slug,
      name:      product.name,
      image:     activeImage,
      price:     unitPrice,
      stock:     product.stock,
      options:   selectedOptions.length > 0 ? selectedOptions : undefined,
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
      {hasOptions && (
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground">
            {missing.length === 0 ? "Your selection:" : "From"}
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${unitPrice}-${missing.length}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="text-2xl font-semibold"
            >
              {formatINR(missing.length === 0 ? unitPrice : minMax.min)}
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      {/* ── Variant Preview Strip ── */}
      {/* ── Option groups — pill style ── */}
      {attributes.map((group) => (
        <div key={group.name}>
          <p className="mb-2.5 flex flex-wrap items-center gap-x-2 text-sm font-medium">
            <span>{group.name} <span className="text-danger">*</span></span>
            {selection[group.name] ? (
              <span className="font-normal text-muted-foreground">— {selection[group.name]}</span>
            ) : (
              <span className="font-normal text-danger text-xs">Select one</span>
            )}
          </p>

          <div className="flex flex-wrap gap-2">
            {group.values.map((val) => {
              const isActive = selection[group.name] === val;
              const enabled = isChoiceEnabled(group.name, val, product);

              return (
                <motion.button
                  key={val}
                  type="button"
                  disabled={!enabled}
                  whileTap={enabled ? { scale: 0.96 } : undefined}
                  onClick={() => toggle(group.name, val)}
                  aria-pressed={isActive}
                  className={cn(
                    "relative overflow-hidden rounded-full border px-4 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "border-accent bg-accent/5 text-accent"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    !enabled && "pointer-events-none opacity-40"
                  )}
                >
                  <span className="relative z-10">{val}</span>
                  {!enabled && <StrikeThrough />}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
      {/* ── Add to cart / Buy CTA ── */}
      <div className="space-y-3 pt-2">
        <div className="flex gap-3 h-14">
          <div className="flex shrink-0 items-center rounded-full border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-30"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-medium">{qty}</span>
            <button
              type="button"
              onClick={() => setQty(Math.min(product.stock, qty + 1))}
              disabled={qty >= product.stock}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-30"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <Button
            size="lg"
            variant="outline"
            onClick={onAdd}
            disabled={!canOrder || added}
            className={cn("h-14 flex-1 text-sm font-semibold transition-all", added && "border-green-600 bg-green-50 text-green-700")}
          >
            {added ? (
              <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Added</span>
            ) : (
              <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Add to Cart</span>
            )}
          </Button>
        </div>

        <Button size="lg" variant="primary" onClick={onBuy} disabled={!canOrder || buying} className="h-14 w-full text-sm font-semibold shadow-xl shadow-primary/20">
          {buying ? (
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Preparing checkout...</span>
          ) : (
            <span className="flex items-center gap-2"><Zap className="h-4 w-4 fill-current" /> Buy it now</span>
          )}
        </Button>
        <WhatsAppProductButton product={product} />

        <div className="pt-2">
          {soldOut ? (
            <p className="text-center text-sm font-medium text-danger">Sold out</p>
          ) : needsChoice ? (
            <p className="text-center text-sm font-medium text-accent">Please select {listNames(missing)}</p>
          ) : (
            <p className="text-center text-sm font-medium text-green-600">In stock, ready to ship</p>
          )}
        </div>
      </div>

      <TrustRow />
    </div>
  );
}
