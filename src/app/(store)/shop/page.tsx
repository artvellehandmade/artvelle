import { Suspense } from "react";
import type { Metadata } from "next";
import { getProducts, type ShopQuery } from "@/lib/products";
import { ProductCard } from "@/components/store/product-card";
import { Reveal } from "@/components/store/reveal";
import { ShopFilters } from "@/components/store/shop-filters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SP = Promise<{ category?: string; q?: string; sort?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SP;
}): Promise<Metadata> {
  const sp = await searchParams;

  // Search result pages are near-infinite and thin — keep them out of the
  // index but let crawlers follow through to the products themselves.
  if (sp.q) {
    return {
      title: `Search: ${sp.q}`,
      description: `Handmade resin art matching “${sp.q}”.`,
      robots: { index: false, follow: true },
    };
  }

  if (sp.category && sp.category !== "All") {
    const c = sp.category;
    return {
      title: `${c} — Handmade Resin Art`,
      description: `Shop handmade resin ${c.toLowerCase()} — each piece poured and finished by hand in India. Cash on delivery available, shipping calculated live at checkout.`,
      keywords: [`resin ${c.toLowerCase()}`, `handmade ${c.toLowerCase()}`, c],
      alternates: { canonical: `/shop?category=${encodeURIComponent(c)}` },
      openGraph: {
        title: `${c} — Handmade Resin Art`,
        url: `/shop?category=${encodeURIComponent(c)}`,
      },
    };
  }

  return {
    title: "Shop All Handmade Resin Art",
    description:
      "Browse every handmade resin piece — coasters, wall art, keepsakes and custom commissions. Poured by hand in India, delivered across the country.",
    keywords: [
      "buy resin art online India",
      "handmade resin coasters",
      "resin wall art",
      "resin keepsakes",
    ],
    alternates: { canonical: "/shop" },
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const query: ShopQuery = {
    category: sp.category,
    q: sp.q,
    sort: (sp.sort as ShopQuery["sort"]) ?? "newest",
  };
  
  const [products, categoriesList] = await Promise.all([
    getProducts(query),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  const categories = categoriesList.map((c) => c.name);

  return (
    <div className="container-px mx-auto max-w-7xl py-8 md:py-12">
      <header className="mb-6 md:mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          The collection
        </p>
        <h1 className="mt-1 font-serif text-3xl md:text-4xl">
          {sp.category && sp.category !== "All" ? sp.category : "Shop all"}
        </h1>
      </header>

      <Suspense fallback={<div className="h-24" />}>
        <ShopFilters categories={categories} />
      </Suspense>

      {products.length > 0 ? (
        <div className="mt-8 grid grid-cols-3 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-10 md:mt-10 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i * 0.05, 0.3)}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="mt-16 rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="font-serif text-xl">No pieces found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different category or search term.
          </p>
        </div>
      )}
    </div>
  );
}
