import Image from "next/image";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import type { ProductDTO } from "@/lib/types";
import { AddToCartButton } from "./add-to-cart";

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
        className="relative block aspect-square overflow-hidden rounded-2xl bg-muted"
      >
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
            No image
          </div>
        )}

        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            −{discount}%
          </span>
        )}
        {product.stock <= 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-foreground/80 px-2.5 py-1 text-xs font-medium text-background">
            Sold out
          </span>
        )}
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {product.category}
        </p>
        <Link
          href={`/product/${product.slug}`}
          className="mt-1 font-serif text-lg leading-snug hover:text-accent transition-colors"
        >
          {product.name}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <span className="font-medium">{formatINR(product.price)}</span>
          {discount > 0 && (
            <span className="text-sm text-muted-foreground line-through">
              {formatINR(product.compareAtPrice!)}
            </span>
          )}
        </div>
        <div className="mt-4">
          <AddToCartButton product={product} className="w-full" />
        </div>
      </div>
    </div>
  );
}
