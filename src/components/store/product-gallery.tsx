"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProductView } from "@/context/product-view";

export function ProductGallery({
  fallbackImages,
  name,
}: {
  fallbackImages: string[];
  name: string;
}) {
  const { images } = useProductView();
  const list = (images.length ? images : fallbackImages).filter(Boolean);
  const safe = list.length ? list : [""];

  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(0);

  // When the variant (image set) changes, snap back to the first photo.
  const listKey = safe.join("|");
  const [seenKey, setSeenKey] = useState(listKey);
  if (listKey !== seenKey) {
    setSeenKey(listKey);
    setActive(0);
    setDirection(0);
  }

  const current = Math.min(active, safe.length - 1);

  function go(next: number) {
    const count = safe.length;
    const wrapped = (next + count) % count;
    setDirection(next > current ? 1 : -1);
    setActive(wrapped);
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
              onClick={() => {
                setDirection(i > current ? 1 : -1);
                setActive(i);
              }}
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
      <div className="group relative aspect-square flex-1 overflow-hidden rounded-3xl bg-muted">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={`${listKey}#${current}`}
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
              onClick={() => go(current - 1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground opacity-0 shadow-md backdrop-blur transition-all hover:scale-110 hover:bg-background group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(current + 1)}
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
