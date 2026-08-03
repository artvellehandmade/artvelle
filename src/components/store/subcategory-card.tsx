import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { formatINR } from "@/lib/utils";
import type { SubcategoryTile } from "@/lib/catalog";

/**
 * A group shown in place of the products inside it — the shopper sees one
 * "Resin Pooja Thali" tile rather than twenty near-identical thalis, and
 * clicking through lists the real pieces.
 *
 * Deliberately mirrors ProductCard's shape so a category page can mix the two
 * in one grid without the layout shifting.
 */
export function SubcategoryCard({
  tile,
  category,
}: {
  tile: SubcategoryTile;
  category: string;
}) {
  const href = `/shop?category=${encodeURIComponent(category)}&sub=${tile.slug}`;
  const range =
    tile.priceMin === tile.priceMax
      ? formatINR(tile.priceMin)
      : `${formatINR(tile.priceMin)} – ${formatINR(tile.priceMax)}`;

  return (
    <div className="group flex flex-col">
      <Link
        href={href}
        className="card-lift relative block aspect-square overflow-hidden rounded-2xl bg-muted"
      >
        {tile.images[0] ? (
          <>
            <Image
              src={tile.images[0]}
              alt={tile.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
            {tile.images[1] && (
              <Image
                src={tile.images[1]}
                alt={`${tile.name} — alternate view`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover opacity-0 transition-all duration-700 ease-out group-hover:scale-110 group-hover:opacity-100"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            No image
          </div>
        )}

        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
          <Layers className="h-3 w-3" />
          {tile.productCount} designs
        </span>

        <span className="absolute inset-x-3 bottom-3 hidden translate-y-3 items-center justify-center gap-1.5 rounded-full bg-card/90 py-2 text-xs font-medium opacity-0 shadow-lg backdrop-blur transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 sm:flex">
          View all {tile.productCount} <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>

      <div className="mt-2.5 flex flex-1 flex-col sm:mt-4">
        <p className="truncate text-[10px] uppercase tracking-widest gold-text sm:text-[11px]">
          {category}
        </p>
        <Link
          href={href}
          className="mt-0.5 line-clamp-2 font-serif text-sm leading-snug transition-colors hover:text-accent sm:mt-1 sm:text-lg"
        >
          {tile.name}
        </Link>
        <div className="mt-1 sm:mt-2">
          <span className="text-sm font-semibold sm:text-base">{range}</span>
        </div>

        <div className="mt-2.5 sm:mt-4">
          <Link
            href={href}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-full border border-border text-sm font-medium transition-colors hover:bg-muted sm:h-11"
          >
            Browse designs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
