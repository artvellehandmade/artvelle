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
  const many = safe.length > 1;

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

  const Thumb = ({ img, i }: { img: string; i: number }) => (
    <button
      type="button"
      onClick={() => pickPhoto(img, i)}
      className={cn(
        "relative aspect-square shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer",
        "h-16 w-16 md:h-auto md:w-full",
        current === i
          ? "border-accent scale-[1.03]"
          : "border-transparent opacity-60 hover:opacity-100"
      )}
      aria-label={`View photo ${i + 1}`}
    >
      {img && (
        <Image src={img} alt={`${name} ${i + 1}`} fill sizes="80px" className="object-cover" />
      )}
    </button>
  );

  return (
    // Desktop: reserve a left rail (pl-24) and pin thumbnails to the photo's height.
    <div className="relative md:pl-24">
      {/* Thumbnails — horizontal strip on mobile, vertical scroll rail on desktop */}
      {many && (
        <div
          className={cn(
            "mt-3 flex gap-2.5 overflow-x-auto pb-1 md:mt-0 md:pb-0",
            "md:absolute md:inset-y-0 md:left-0 md:w-20 md:flex-col md:gap-3 md:overflow-x-visible md:overflow-y-auto",
            "[scrollbar-width:thin]"
          )}
        >
          {safe.map((img, i) => (
            <Thumb key={`${img}-${i}`} img={img} i={i} />
          ))}
        </div>
      )}

      {/* Main image — always a perfect square */}
      <div className="group relative aspect-square w-full overflow-hidden rounded-3xl bg-muted ring-1 ring-border/70">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activeUrl || "empty"}
            custom={direction}
            drag={many ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -60) goTo(current + 1, 1);
              else if (info.offset.x > 60) goTo(current - 1, -1);
            }}
            initial={{ opacity: 0, x: direction * 60, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction * -60, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
          >
            {safe[current] ? (
              <Image
                src={safe[current]}
                alt={name}
                fill
                sizes="(max-width:768px) 100vw, 45vw"
                className="pointer-events-none select-none object-cover"
                priority
                draggable={false}
              />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                No image
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Left / right arrows (hover on desktop, always tappable on mobile) */}
        {many && (
          <>
            <button
              type="button"
              onClick={() => goTo(current - 1, -1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-all hover:scale-110 hover:bg-background md:left-3 md:h-10 md:w-10 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(current + 1, 1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-all hover:scale-110 hover:bg-background md:right-3 md:h-10 md:w-10 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Counter + dots */}
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-1 backdrop-blur">
              {safe.length <= 8 ? (
                safe.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      current === i ? "w-4 bg-accent" : "w-1.5 bg-foreground/30"
                    )}
                  />
                ))
              ) : (
                <span className="text-xs tabular-nums text-foreground/70">
                  {current + 1} / {safe.length}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
