import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Truck, ShieldCheck, HandHeart, ChevronRight } from "lucide-react";
import { getProductBySlug, getRelated } from "@/lib/products";
import { formatINR } from "@/lib/utils";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchase } from "@/components/store/product-purchase";
import { ProductCard } from "@/components/store/product-card";
import { ProductViewProvider } from "@/context/product-view";
import { normalizeVariants, priceRange } from "@/lib/variants";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product" };
  return {
    title: product.name,
    description: product.description.slice(0, 150),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) notFound();

  const related = await getRelated(
    product.category,
    product.id,
    4,
    product.secondaryCategory
  );
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) *
            100
        )
      : 0;

  // Flipkart-style: nothing is pre-selected — the customer browses all photos
  // and narrows down. Header shows a price range when variants differ.
  const variants = normalizeVariants(product);
  const range = priceRange(product);
  const hasRange = range.min !== range.max;

  return (
    <div className="container-px mx-auto max-w-7xl py-8 md:py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/shop" className="hover:text-accent">
          Shop
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <ProductViewProvider>
      <div className="grid items-start gap-10 md:grid-cols-2 lg:gap-16">
        {/* Gallery: pinned to the top and sticky so a long description never
            stretches or scrolls the square photo out of view. */}
        <div className="md:sticky md:top-24 self-start">
          <ProductGallery
            product={product}
            variants={variants}
            name={product.name}
          />
        </div>

        <div className="md:pt-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {product.category}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight">
            {product.name}
          </h1>

          <div className="mt-4 flex items-center gap-3">
            <span className="text-2xl font-medium">
              {hasRange
                ? `${formatINR(range.min)} – ${formatINR(range.max)}`
                : formatINR(range.min)}
            </span>
            {!hasRange && discount > 0 && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatINR(product.compareAtPrice!)}
                </span>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                  Save {discount}%
                </span>
              </>
            )}
          </div>

          <p className="mt-3 text-sm">
            {product.stock > 0 ? (
              <span className="text-success">
                In stock{product.stock <= 5 ? ` · only ${product.stock} left` : ""}
              </span>
            ) : (
              <span className="text-danger">Currently sold out</span>
            )}
          </p>

          <div className="mt-6 h-px bg-border" />

          <p className="mt-6 leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          {product.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {product.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8">
            <ProductPurchase product={product} />
          </div>

          <div className="mt-8 grid gap-4 rounded-2xl border border-border p-5 sm:grid-cols-3">
            <Feature icon={<HandHeart className="h-5 w-5" />} label="Handmade to order" />
            <Feature icon={<Truck className="h-5 w-5" />} label="Ships across India" />
            <Feature icon={<ShieldCheck className="h-5 w-5" />} label="Cash on delivery" />
          </div>
        </div>
      </div>
      </ProductViewProvider>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="font-serif text-3xl">You may also like</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 sm:flex-col sm:text-center">
      <span className="gold-text">{icon}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
