"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
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

  const list = unionImages(product, selection, product.images).filter(Boolean);
  const safe = list.length ? list : [""];

  const [activeUrl, setActiveUrl] = useState<string>(safe[0]);
  const [direction, setDirection] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  // Separate ref arrays: desktop rail vs mobile grid (they coexist in DOM)
  const desktopRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mobileRefs  = useRef<(HTMLButtonElement | null)[]>([]);

  if (safe.length && !safe.includes(activeUrl)) {
    setActiveUrl(safe[0]);
    setDirection(0);
  }
  const current = Math.max(0, safe.indexOf(activeUrl));
  const many    = safe.length > 1;

  function revealThumb(index: number) {
    // Scroll whichever thumb container is visible into view (other is display:none → no-op)
    desktopRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    mobileRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }

  function goTo(index: number, dir: number) {
    const wrapped = (index + safe.length) % safe.length;
    setDirection(dir);
    setActiveUrl(safe[wrapped]);
    revealThumb(wrapped);
  }

  function pickPhoto(img: string, index: number) {
    setDirection(index > current ? 1 : -1);
    setActiveUrl(img);
    const v = variantForImage(variants, img);
    if (v) setSelection({ ...v.combo });
    revealThumb(index);
  }

  return (
    <>
      {/* ─── Gallery wrapper — desktop shifts right for left rail ─── */}
      <div className="relative md:pl-24">

        {/* ── DESKTOP: vertical thumbnail rail (left side, UNCHANGED) ── */}
        {many && (
          <div className="hidden md:flex md:absolute md:inset-y-0 md:left-0 md:w-20 md:flex-col md:gap-3 md:overflow-y-auto [scrollbar-width:thin]">
            {safe.map((img, i) => (
              <button
                key={`d-${i}`}
                ref={(el) => { desktopRefs.current[i] = el; }}
                type="button"
                onClick={() => pickPhoto(img, i)}
                aria-label={`View photo ${i + 1}`}
                aria-pressed={current === i}
                className={cn(
                  "relative aspect-square w-full shrink-0 overflow-hidden rounded-xl border-2",
                  "cursor-pointer transition-all duration-200",
                  current === i
                    ? "border-accent scale-[1.03] opacity-100 shadow-md shadow-accent/20"
                    : "border-transparent opacity-50 hover:opacity-80 hover:scale-[1.02]"
                )}
              >
                {img && (
                  <Image
                    src={img}
                    alt={`${name} ${i + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            MAIN PRODUCT IMAGE
            • aspect-square → true 1:1 square at every viewport width
            • object-contain → full product always visible, never cropped
            • bg-muted fills letterbox space around contained image
            • Fade animation (no x-slide) → zero layout shift on change
        ════════════════════════════════════════════════════════════════ */}
        <div className="group relative aspect-square w-full overflow-hidden rounded-2xl bg-muted ring-1 ring-border/70">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={activeUrl || "empty"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              drag={many ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_e, info) => {
                if (info.offset.x < -60) goTo(current + 1, 1);
                else if (info.offset.x > 60) goTo(current - 1, -1);
              }}
              className="absolute inset-0 touch-pan-y"
              style={{ cursor: many ? "grab" : "default" }}
            >
              {safe[current] ? (
                <Image
                  src={safe[current]}
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

          {/* ◀ / ▶ swipe arrows on main image */}
          {many && (
            <>
              <button
                type="button"
                onClick={() => goTo(current - 1, -1)}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-all hover:scale-110 hover:bg-background md:opacity-0 md:group-hover:opacity-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => goTo(current + 1, 1)}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-all hover:scale-110 hover:bg-background md:opacity-0 md:group-hover:opacity-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* N / Total counter */}
              <div className="absolute bottom-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background/75 px-3 py-0.5 backdrop-blur">
                <span className="text-[11px] tabular-nums font-medium text-foreground/70">
                  {current + 1} / {safe.length}
                </span>
              </div>
            </>
          )}

          {/* Zoom button */}
          {safe[current] && (
            <button
              type="button"
              onClick={() => setZoomed(true)}
              aria-label="Zoom image"
              className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-all hover:scale-110 hover:bg-background md:opacity-0 md:group-hover:opacity-100"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            MOBILE THUMBNAIL GRID  (hidden md+, replaced by left rail)

            Layout: exactly 6 thumbnails per row, wrapping naturally.

            [T][T][T][T][T][T]
            [T][T][T][T][T]        ← extra images wrap to next row

            Why flex-wrap instead of overflow-x-auto:
            • Page NEVER scrolls horizontally
            • No scrollbar (no overflow to hide)
            • Matches the Shape Studioz reference exactly
            • Each thumb = calc((100% - 5 × 8px) / 6) → 6 per row always
            • Extra images naturally flow to a second row
        ════════════════════════════════════════════════════════════════ */}
        {many && (
          <div className="mt-3 md:hidden">
            <div
              className="flex flex-wrap"
              style={{ gap: "6px" }}
            >
              {safe.map((img, i) => {
                const isActive = current === i;
                return (
                  <button
                    key={`m-${i}`}
                    ref={(el) => { mobileRefs.current[i] = el; }}
                    type="button"
                    onClick={() => pickPhoto(img, i)}
                    aria-label={`View photo ${i + 1}`}
                    aria-pressed={isActive}
                    style={{
                      // 6 per row: (100% - 5 gaps) / 6
                      // gap = 6px → 5 gaps = 30px
                      width: "calc((100% - 30px) / 6)",
                      aspectRatio: "1 / 1",
                      flexShrink: 0,
                    }}
                    className={cn(
                      "relative overflow-hidden rounded-xl border-2 cursor-pointer",
                      "transition-all duration-200",
                      isActive
                        ? "border-accent opacity-100 shadow-sm shadow-accent/30"
                        : "border-border/30 opacity-60 hover:opacity-85 hover:border-border/60"
                    )}
                  >
                    {img && (
                      <Image
                        src={img}
                        alt={`${name} view ${i + 1}`}
                        fill
                        sizes="calc((100vw - 62px) / 6)"
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

      {/* ════════════════════════════════════════════════════════════════
          FULLSCREEN ZOOM LIGHTBOX
      ════════════════════════════════════════════════════════════════ */}
      {zoomed && safe[current] && (
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
                onClick={(e) => { e.stopPropagation(); goTo(current - 1, -1); }}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(current + 1, 1); }}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div
            className="relative h-[85vmin] w-[85vmin] max-h-[90dvh] max-w-[90dvw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={safe[current]}
              alt={name}
              fill
              sizes="90vw"
              className="object-contain"
              priority
            />
          </div>

          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm text-white/60">
            {current + 1}&nbsp;/&nbsp;{safe.length}&nbsp;·&nbsp;Tap outside to close
          </span>
        </div>
      )}
    </>
  );
}
