"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [""];

  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row">
      {list.length > 1 && (
        <div className="flex gap-3 md:flex-col">
          {list.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors cursor-pointer md:h-20 md:w-20",
                active === i ? "border-accent" : "border-transparent"
              )}
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

      <div className="relative aspect-square flex-1 overflow-hidden rounded-3xl bg-muted">
        {list[active] ? (
          <Image
            src={list[active]}
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
      </div>
    </div>
  );
}
