"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useProductView } from "@/context/product-view";
import { cn } from "@/lib/utils";
import type { ProductDTO, MediaDTO } from "@/lib/types";
import { imagesForSelection } from "@/lib/variants";

export function ProductGallery({
  product,
  media,
}: {
  product: ProductDTO;
  media: MediaDTO[];
}) {
  const { selection } = useProductView();
  
  // Use the new rule-based engine to determine the correct gallery
  const activeImages = imagesForSelection(product, selection);

  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [activeImages]);

  if (!activeImages.length) {
    return (
      <div className="aspect-[4/5] w-full rounded-2xl bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-sm font-medium tracking-wide">
          NO IMAGES
        </span>
      </div>
    );
  }

  const currentUrl = activeImages[activeIndex];
  const isVideo = currentUrl?.match(/\.(mp4|webm|mov)$/i);

  function paginate(newDirection: number) {
    setDirection(newDirection);
    setActiveIndex((prev) => {
      let next = prev + newDirection;
      if (next < 0) next = activeImages.length - 1;
      if (next >= activeImages.length) next = 0;
      return next;
    });
  }

  return (
    <div className="sticky top-24 flex flex-col gap-4">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted">
        {isVideo ? (
          <video
            key={currentUrl}
            src={currentUrl}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <Image
            key={currentUrl}
            src={currentUrl || ""}
            alt={product.name}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        )}
        
        {activeImages.length > 1 && (
          <>
            <button
              onClick={() => paginate(-1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-black backdrop-blur transition hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => paginate(1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-black backdrop-blur transition hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
              {activeImages.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {activeImages.length > 1 && (
        <div className="grid grid-cols-6 gap-2">
          {activeImages.map((url, i) => {
            const thumbIsVideo = url.match(/\.(mp4|webm|mov)$/i);
            return (
              <button
                key={url + i}
                onClick={() => {
                  setDirection(i > activeIndex ? 1 : -1);
                  setActiveIndex(i);
                }}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-lg bg-muted transition-all",
                  i === activeIndex ? "ring-2 ring-primary ring-offset-2" : "opacity-70 hover:opacity-100"
                )}
              >
                {thumbIsVideo ? (
                  <div className="flex h-full w-full items-center justify-center bg-black/10">
                    <Play className="h-4 w-4 text-foreground/50" />
                  </div>
                ) : (
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="100px"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
