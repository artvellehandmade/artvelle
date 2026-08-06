import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Star } from "lucide-react";
import { getProductBySlug, getRelated } from "@/lib/products";
import { getProductCrumb } from "@/lib/catalog";
import { formatINR } from "@/lib/utils";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchase } from "@/components/store/product-purchase";
import { ProductCard } from "@/components/store/product-card";
import { DescriptionCollapse } from "@/components/store/description-collapse";
import { ProductViewProvider } from "@/context/product-view";
import { priceRange } from "@/lib/variants";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

// ─── Deterministic rating stub (mirrors product-card.tsx) ───────────────────
function stubRating(name: string): { rating: number; count: number } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const h = Math.abs(hash);
  return {
    rating: Math.round((4.6 + (h % 4) * 0.1) * 10) / 10,
    count: 80 + (h % 100),
  };
}

// ─── Metadata ────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product" };

  const range = priceRange(product);
  const description = [
    `${product.name} — ${formatINR(range.min)}${range.min !== range.max ? `+` : ""}.`,
    product.description.replace(/\s+/g, " ").trim(),
  ]
    .join(" ")
    .slice(0, 158);

  const images    = product.images.filter(Boolean);
  const canonical = `/product/${product.slug}`;

  return {
    title: product.name,
    description,
    keywords: [product.name, product.category, ...(product.tags ?? [])].filter(
      Boolean
    ) as string[],
    alternates: { canonical },
    openGraph: {
      title: product.name,
      description,
      url: canonical,
      type: "website",
      ...(images.length ? { images: [{ url: images[0], alt: product.name }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      ...(images.length ? { images: [images[0]] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug }    = await params;
  const product     = await getProductBySlug(slug);
  if (!product || !product.isActive) notFound();

  const [related, settings, crumb] = await Promise.all([
    getRelated(
      product.category,
      product.id,
      6,
      product.secondaryCategory,
      product.subcategoryId
    ),
    getSettings(),
    getProductCrumb(product.subcategoryId),
  ]);

  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
        )
      : 0;


  const range     = priceRange(product);
  const hasRange  = range.min !== range.max;
  const { rating, count } = stubRating(product.name);

  const base            = siteUrl();
  const productUrl      = `${base}/product/${product.slug}`;
  const absoluteImages  = product.images
    .filter(Boolean)
    .map((src) => (src.startsWith("http") ? src : `${base}${src}`));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${productUrl}#product`,
        name: product.name,
        description: product.description.replace(/\s+/g, " ").trim(),
        ...(absoluteImages.length ? { image: absoluteImages } : {}),
        category: product.category,
        brand: { "@type": "Brand", name: settings.brandName },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: range.min,
          highPrice: range.max,
          offerCount: 1,
          availability:
            product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          url: productUrl,
          seller: { "@id": `${base}/#organization` },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: base },
          { "@type": "ListItem", position: 2, name: "Shop", item: `${base}/shop` },
          {
            "@type": "ListItem",
            position: 3,
            name: product.category,
            item: `${base}/shop?category=${encodeURIComponent(product.category)}`,
          },
          ...(crumb
            ? [
                {
                  "@type": "ListItem",
                  position: 4,
                  name: crumb.name,
                  item: `${base}${crumb.href}`,
                },
              ]
            : []),
          {
            "@type": "ListItem",
            position: crumb ? 5 : 4,
            name: product.name,
            item: productUrl,
          },
        ],
      },
    ],
  };

  return (
    <div className="container-px mx-auto max-w-7xl py-4 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-xs text-muted-foreground md:mb-6 md:text-sm">
        <Link href="/" className="hover:text-accent">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/shop" className="hover:text-accent">Shop</Link>
        {crumb && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={crumb.href} className="hover:text-accent">{crumb.name}</Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      <ProductViewProvider>
        <div className="grid items-start gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
          {/* ── Gallery — sticky on desktop ── */}
          <div className="md:sticky md:top-24 md:self-start min-w-0">
            <ProductGallery
              product={product}
              media={product.media ?? []}
            />
          </div>

          {/* ── Product info + purchase ── */}
          <div className="md:pt-2">
            {/* Category */}
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">
              {product.category}
            </p>

            {/* Product name */}
            <h1 className="mt-1.5 font-serif text-2xl leading-tight md:text-[2rem]">
              {product.name}
            </h1>

            {/* Rating row */}
            <div className="mt-1.5 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3.5 w-3.5 ${
                    star <= Math.round(rating)
                      ? "fill-accent text-accent"
                      : "fill-muted text-muted-foreground"
                  }`}
                />
              ))}
              <span className="ml-1 text-sm font-medium">{rating}</span>
              <span className="text-sm text-muted-foreground">({count} reviews)</span>
            </div>

            {/* Price */}
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-2xl font-semibold md:text-3xl">
                {hasRange
                  ? `${formatINR(range.min)} – ${formatINR(range.max)}`
                  : formatINR(range.min)}
              </span>
              {!hasRange && discount > 0 && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    {formatINR(product.compareAtPrice!)}
                  </span>
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                    Save {discount}%
                  </span>
                </>
              )}
            </div>

            {/* Stock status */}
            <p className="mt-2 text-sm">
              {product.stock > 0 ? (
                <span className="text-success">
                  In stock{product.stock <= 5 ? ` · only ${product.stock} left` : ""}
                </span>
              ) : (
                <span className="text-danger">Currently sold out</span>
              )}
            </p>

            <div className="mt-5 h-px bg-border" />

            {/* Collapsible description */}
            <div className="mt-5">
              <DescriptionCollapse text={product.description} />
            </div>

            {/* Purchase controls (variants, CTAs, trust) */}
            <div className="mt-6">
              <ProductPurchase product={product} />
            </div>
          </div>
        </div>
      </ProductViewProvider>

      {/* ── You may also love — horizontal carousel ── */}
      {related.length > 0 && (
        <section className="mt-20 md:mt-28">
          <h2 className="font-serif text-2xl md:text-3xl">You may also love</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Handpicked pieces that go beautifully together
          </p>

          {/* Horizontal scroll carousel — snap on mobile, grid on desktop */}
          <div className="-mx-5 mt-6 sm:mx-0">
            <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-2 sm:px-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible">
              {related.map((p) => (
                <div
                  key={p.id}
                  className="w-[calc(50vw-2rem)] shrink-0 sm:w-[calc(33vw-2rem)] md:w-auto"
                >
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
