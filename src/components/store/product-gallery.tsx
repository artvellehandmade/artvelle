"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProductView } from "@/context/product-view";
import { selectionForImage, matchingVariants } from "@/lib/variants";
import type { ProductDTO, Variant } from "@/lib/types";

// ─── Gallery helpers ──────────────────────────────────────────────────────────

/**
 * Build the ordered image list for the current selection.
 *
 * Rule (per the spec):
 *   gallery = product.images (common, always shown)
 *           + selectedVariant.images (variant-specific, appended after common)
 *   — de-duplicated, order preserved.
 *
 * When no variant is selected (or when the product has no variants), only the
 * common images are shown.
 */
function buildGallery(
  product: ProductDTO,
  variants: Variant[],
  selection: Record<string, string>
): string[] {
  const common = (product.images ?? []).filter(Boolean);

  // If the user has made ANY selection, aggregate images from all variants
  // that still match this (possibly partial) selection.
  const variantImgs: string[] = [];
  if (variants.length && Object.keys(selection).length > 0) {
    const matched = matchingVariants(variants, selection);
    for (const v of matched) {
      for (const img of v.images) {
        if (img && !variantImgs.includes(img)) variantImgs.push(img);
      }
    }
  }

  // Merge: common first, then any variant-specific images not already listed.
  const merged: string[] = [...common];
  for (const img of variantImgs) {
    if (!merged.includes(img)) merged.push(img);
  }

  return merged.length ? merged : [""];
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  const safe = buildGallery(product, variants, selection);

  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomed, setZoomed]       = useState(false);

  // Thumbnail strip scroll state.
  const stripRef                      = useRef<HTMLDivElement | null>(null);
  const thumbRefs                     = useRef<(HTMLButtonElement | null)[]>([]);
  const [canLeft, setCanLeft]         = useState(false);
  const [canRight, setCanRight]       = useState(false);

  // Clamp active index whenever the image list changes (e.g. after a variant
  // pick adds / removes photos).
  useEffect(() => {
    setActiveIdx((i) => Math.min(i, Math.max(0, safe.length - 1)));
  }, [safe.length]);

  // Bidirectional sync: when selection changes (via ProductPurchase pills),
  // if the selected variant (even partially selected) has its own image, jump to it.
  useEffect(() => {
    if (Object.keys(selection).length === 0) return;
    const matched = variants.length ? matchingVariants(variants, selection) : [];
    const variantFirstImg = matched[0]?.images?.[0];
    if (variantFirstImg) {
      const idx = safe.indexOf(variantFirstImg);
      if (idx !== -1 && idx !== activeIdx) {
        setActiveIdx(idx);
        revealThumb(idx);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, safe]);

  // Strip scroll-arrow visibility.
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const EDGE = 10;
    const sync = () => {
      setCanLeft(el.scrollLeft > EDGE);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE);
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    const raf = requestAnimationFrame(sync);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [safe.length]);

  /** Centre a thumbnail inside the horizontal strip. */
  function revealThumb(index: number) {
    const strip = stripRef.current;
    const thumb = thumbRefs.current[index];
    if (!strip || !thumb) return;
    strip.scrollTo({
      left: thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2,
      behavior: "smooth",
    });
  }

  function nudgeStrip(dir: 1 | -1) {
    stripRef.current?.scrollBy({
      left: dir * (stripRef.current.clientWidth * 0.8),
      behavior: "smooth",
    });
  }

  /**
   * Navigate to image at `index`, wrapping around.
   * Also infers the variant the image belongs to and updates the selection.
   */
  const goTo = useCallback(
    (index: number) => {
      const wrapped = ((index % safe.length) + safe.length) % safe.length;
      const img     = safe[wrapped];

      setActiveIdx(wrapped);
      revealThumb(wrapped);

      // Bidirectional sync: infer the variant this image implies.
      if (img) {
        const next = selectionForImage(variants, product.options, img, selection);
        if (next) setSelection(next);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safe, variants, product.options, selection]
  );

  const many    = safe.length > 1;
  const current = safe[activeIdx] ?? "";

  // ── Dot / counter indicator ──────────────────────────────────────────────
  const useDots = safe.length <= 6;

  return (
    <>
      <div className="relative">
        {/* ── Main photo ── */}
        <div className="group relative aspect-square w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border/70">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              drag={many ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_e, info) => {
                if (info.offset.x < -60) goTo(activeIdx + 1);
                else if (info.offset.x > 60) goTo(activeIdx - 1);
              }}
              className="absolute inset-0 touch-pan-y"
              style={{ cursor: many ? "grab" : "default" }}
            >
              {current ? (
                <Image
                  src={current}
                  alt={name}
                  fill
                  className="pointer-events-none select-none object-contain"
                  sizes="(max-width:768px) 100vw, 45vw"
                  priority
                  draggable={false}
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  No image
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Prev / Next arrows */}
          {many && (
            <>
              <button
                type="button"
                onClick={() => goTo(activeIdx - 1)}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-all hover:scale-110 hover:bg-background md:opacity-0 md:group-hover:opacity-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIdx + 1)}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-all hover:scale-110 hover:bg-background md:opacity-0 md:group-hover:opacity-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Zoom button */}
          {current && (
            <button
              type="button"
              onClick={() => setZoomed(true)}
              aria-label="Zoom image"
              className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-all hover:scale-110 hover:bg-background md:opacity-0 md:group-hover:opacity-100"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          )}

          {/* Dot indicator (≤6 images) or N/M counter */}
          {many && (
            <div className="absolute bottom-2.5 left-1/2 z-10 -translate-x-1/2">
              {useDots ? (
                <div className="flex items-center gap-1.5">
                  {safe.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goTo(i)}
                      aria-label={`Go to photo ${i + 1}`}
                      className={cn(
                        "rounded-full transition-all duration-150",
                        i === activeIdx
                          ? "h-2 w-5 bg-accent"
                          : "h-1.5 w-1.5 bg-white/60 hover:bg-white/90"
                      )}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-full bg-background/75 px-3 py-0.5 backdrop-blur">
                  <span className="text-[11px] font-medium tabular-nums text-foreground/70">
                    {activeIdx + 1} / {safe.length}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Thumbnail strip ── */}
        {many && (
          <div className="relative mt-3">
            {canLeft && (
              <button
                type="button"
                onClick={() => nudgeStrip(-1)}
                aria-label="Scroll thumbnails left"
                className="absolute -left-1 top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-background/90 text-foreground shadow-md ring-1 ring-border backdrop-blur transition hover:bg-background md:grid"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
            {canRight && (
              <button
                type="button"
                onClick={() => nudgeStrip(1)}
                aria-label="Scroll thumbnails right"
                className="absolute -right-1 top-1/2 z-20 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-background/90 text-foreground shadow-md ring-1 ring-border backdrop-blur transition hover:bg-background md:grid"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Edge fades */}
            {canLeft && (
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />
            )}
            {canRight && (
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />
            )}

            <div
              ref={stripRef}
              className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth py-1"
            >
              {safe.map((img, i) => {
                const isActive = activeIdx === i;
                return (
                  <button
                    key={`t-${i}`}
                    ref={(el) => { thumbRefs.current[i] = el; }}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`View photo ${i + 1}`}
                    aria-pressed={isActive}
                    className={cn(
                      "relative aspect-square h-14 w-14 shrink-0 overflow-hidden rounded-xl md:h-16 md:w-16",
                      "cursor-pointer transition-all duration-150",
                      isActive
                        ? "ring-2 ring-accent ring-offset-1 ring-offset-background"
                        : "opacity-60 ring-1 ring-border/50 hover:opacity-100 hover:ring-border"
                    )}
                  >
                    {img && (
                      <Image
                        src={img}
                        alt={`${name} view ${i + 1}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                        loading={i <= 5 ? "eager" : "lazy"}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Fullscreen zoom lightbox ── */}
      {zoomed && current && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close zoom"
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>

          {many && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(activeIdx - 1); }}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(activeIdx + 1); }}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className="relative h-[85vmin] w-[85vmin] max-h-[90dvh] max-w-[90dvw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={current}
              alt={name}
              fill
              sizes="90vw"
              className="object-contain"
              priority
            />
          </div>

          {/* Dot indicator inside fullscreen */}
          {many && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
              {useDots ? (
                <div className="flex items-center gap-2">
                  {safe.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); goTo(i); }}
                      className={cn(
                        "rounded-full transition-all duration-150",
                        i === activeIdx
                          ? "h-2 w-5 bg-accent"
                          : "h-1.5 w-1.5 bg-white/50 hover:bg-white/80"
                      )}
                    />
                  ))}
                </div>
              ) : (
                <span className="whitespace-nowrap text-sm text-white/60">
                  {activeIdx + 1}&nbsp;/&nbsp;{safe.length}&nbsp;·&nbsp;Tap outside to close
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
