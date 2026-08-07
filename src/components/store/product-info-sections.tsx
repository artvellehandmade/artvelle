"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  PackageOpen,
  Sparkles,
  Truck,
  RotateCcw,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Everything a customer reads *after* deciding — description, care, shipping,
 * returns, reviews. Collapsed by default (except the description) so the buy
 * block stays within a thumb's reach on mobile.
 */

function Row({
  icon,
  title,
  meta,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-4 text-left"
      >
        <span className="gold-text shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-medium">{title}</span>
        {meta && <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-5 pl-7 pr-1 text-sm leading-relaxed text-muted-foreground">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function ProductInfoSections({
  description,
  rating,
  reviewCount,
  specs,
}: {
  description: string;
  rating: number;
  reviewCount: number;
  /** Label/value pairs rendered inside Materials & Care (dimensions, weight…). */
  specs?: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-2xl border border-border px-4 md:px-5">
      <Row
        icon={<PackageOpen className="h-4 w-4" />}
        title="Product Details"
        defaultOpen
      >
        <p className="whitespace-pre-line">{description}</p>
      </Row>

      <Row icon={<Sparkles className="h-4 w-4" />} title="Materials & Care">
        <Bullets
          items={[
            "Premium quality resin, hand-poured and hand-finished",
            "Wipe with a soft dry cloth — no chemical cleaners",
            "Keep away from direct sunlight and heat",
          ]}
        />
        {specs && specs.length > 0 && (
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {specs.map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-3 sm:justify-start">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium text-foreground sm:ml-auto">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Row>

      <Row icon={<Truck className="h-4 w-4" />} title="Shipping & Delivery">
        <Bullets
          items={[
            "Handmade to order — dispatched in 2–4 working days",
            "Delivered across India, tracking shared on dispatch",
            "Cash on Delivery available on eligible pin codes",
          ]}
        />
      </Row>

      <Row icon={<RotateCcw className="h-4 w-4" />} title="Returns & Refunds">
        <Bullets
          items={[
            "Damaged or wrong item? Report within 48 hours of delivery with unboxing photos.",
            "Made-to-order pieces can't be returned for a change of mind.",
            "Approved claims are replaced or refunded to the original payment method.",
          ]}
        />
      </Row>

      <Row
        icon={<Star className="h-4 w-4" />}
        title="Customer Reviews"
        meta={
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-accent text-accent" />
            {rating}
          </span>
        }
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl font-semibold text-foreground">{rating}</span>
          <div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-3.5 w-3.5",
                    s <= Math.round(rating)
                      ? "fill-accent text-accent"
                      : "fill-muted text-muted-foreground"
                  )}
                />
              ))}
            </div>
            <p className="mt-0.5 text-xs">Based on {reviewCount} verified buyers</p>
          </div>
        </div>
      </Row>
    </div>
  );
}
