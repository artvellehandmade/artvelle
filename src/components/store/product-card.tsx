import Image from "next/image";
import Link from "next/link";
import { Eye, SlidersHorizontal, ArrowRight } from "lucide-react";
import { formatINR } from "@/lib/utils";
import type { ProductDTO } from "@/lib/types";
import { ButtonLink } from "@/components/ui/button";
import { AddToCartButton } from "./add-to-cart";
import { BuyNowButton, WhatsAppProductButton } from "./product-actions";

export function ProductCard({ product }: { product: ProductDTO }) {
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) *
            100
        )
      : 0;

  return (
    <div className="group flex flex-col">
      <Link
        href={`/product/${product.slug}`}
        className="card-lift relative block aspect-square overflow-hidden rounded-2xl bg-muted"
      >
        {product.images[0] ? (
          <>
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
            {/* Crossfade to the second photo on hover (if one exists) */}
            {product.images[1] && (
              <Image
                src={product.images[1]}
                alt={`${product.name} — alternate view`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover opacity-0 transition-all duration-700 ease-out group-hover:scale-110 group-hover:opacity-100"
              />
            )}
            {/* Soft sheen on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
            No image
          </div>
        )}

        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground shadow-md">
            −{discount}%
          </span>
        )}
        {product.stock <= 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-foreground/85 px-2.5 py-1 text-xs font-medium text-background backdrop-blur">
            Sold out
          </span>
        )}
        {product.stock > 0 && product.stock <= 5 && (
          <span className="absolute right-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-medium text-danger shadow-sm backdrop-blur">
            Only {product.stock} left
          </span>
        )}

        {/* Quick view pill slides up on hover */}
        <span className="absolute inset-x-3 bottom-3 flex translate-y-3 items-center justify-center gap-1.5 rounded-full bg-card/90 py-2 text-xs font-medium opacity-0 shadow-lg backdrop-blur transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <Eye className="h-3.5 w-3.5" /> View piece
        </span>
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="text-[11px] uppercase tracking-widest gold-text">
          {product.category}
        </p>
        <Link
          href={`/product/${product.slug}`}
          className="mt-1 font-serif text-lg leading-snug transition-colors hover:text-accent"
        >
          {product.name}
        </Link>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-semibold">
            {formatINR(product.price)}
          </span>
          {discount > 0 && (
            <span className="text-sm text-muted-foreground line-through">
              {formatINR(product.compareAtPrice!)}
            </span>
          )}
        </div>
        <div className="mt-4 space-y-2">
          {product.options.length > 0 ? (
            // Has choices (Size/Type…) — send to the page to pick them.
            <div className="flex gap-2">
              <ButtonLink
                href={`/product/${product.slug}`}
                variant="outline"
                className="flex-1"
              >
                <SlidersHorizontal className="h-4 w-4" /> Choose options
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <WhatsAppProductButton product={product} variant="icon" />
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <AddToCartButton product={product} className="flex-1" />
                <WhatsAppProductButton product={product} variant="icon" />
              </div>
              <BuyNowButton product={product} className="w-full" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
