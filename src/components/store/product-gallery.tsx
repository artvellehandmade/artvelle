"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProductView } from "@/context/product-view";
import { unionImages, variantForImage } from "@/lib/variants";
import type { ProductDTO, Variant } from "@/lib/types";

export function ProductGallery({
  product,
  variants,
  name,
}: {
  product: ProductDTO;
  variants: Variant[];
  name: string;
}) {
  const { selection, setSelection } = useProductView();

  // Photos for the current (possibly partial) selection — a union across all
  // still-matching variants, falling back to the product's own photos.
  const list = unionImages(product, selection, product.images).filter(Boolean);
  const safe = list.length ? list : [""];

  // Track the shown photo by URL so it survives list changes (variant swaps).
  const [activeUrl, setActiveUrl] = useState<string>(safe[0]);
  const [direction, setDirection] = useState(0);
  if (safe.length && !safe.includes(activeUrl)) {
    setActiveUrl(safe[0]); // adjust-during-render when the photo set changes
    setDirection(0);
  }
  const current = Math.max(0, safe.indexOf(activeUrl));

  function goTo(index: number, dir: number) {
    const wrapped = (index + safe.length) % safe.length;
    setDirection(dir);
    setActiveUrl(safe[wrapped]);
  }

  // Clicking a photo pins the variant it uniquely belongs to (image → options).
  function pickPhoto(img: string, index: number) {
    setDirection(index > current ? 1 : -1);
    setActiveUrl(img);
    const v = variantForImage(variants, img);
    if (v) setSelection({ ...v.combo });
  }

  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row">
      {/* Thumbnails */}
      {safe.length > 1 && (
        <div className="flex gap-3 overflow-x-auto md:flex-col md:overflow-visible">
          {safe.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              onClick={() => pickPhoto(img, i)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer md:h-20 md:w-20",
                current === i
                  ? "border-accent scale-105"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
              aria-label={`View photo ${i + 1}`}
            >
              {img && (
                <Image
                  src={img}
                  alt={`${name} ${i + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div className="group relative aspect-square w-full flex-1 overflow-hidden rounded-3xl bg-muted ring-1 ring-border/70">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activeUrl || "empty"}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction * -60, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {safe[current] ? (
              <Image
                src={safe[current]}
                alt={name}
                fill
                sizes="(max-width:768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                No image
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Left / right arrows */}
        {safe.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(current - 1, -1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground opacity-0 shadow-md backdrop-blur transition-all hover:scale-110 hover:bg-background group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(current + 1, 1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground opacity-0 shadow-md backdrop-blur transition-all hover:scale-110 hover:bg-background group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {safe.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    current === i ? "w-5 bg-accent" : "w-1.5 bg-foreground/30"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
