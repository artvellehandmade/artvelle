import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { getProducts, type ShopQuery } from "@/lib/products";
import { getCategoryTiles, getSubcategoryView } from "@/lib/catalog";
import { ProductCard } from "@/components/store/product-card";
import { SubcategoryCard } from "@/components/store/subcategory-card";
import { Reveal } from "@/components/store/reveal";
import { ShopFilters } from "@/components/store/shop-filters";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SP = Promise<{
  category?: string;
  sub?: string;
  q?: string;
  sort?: string;
}>;

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

  // A subcategory is a real, indexable shelf of its own.
  if (sp.category && sp.sub) {
    const view = await getSubcategoryView(sp.category, sp.sub);
    if (view) {
      const url = `/shop?category=${encodeURIComponent(sp.category)}&sub=${
        view.slug
      }`;
      return {
        title: `${view.name} — Handmade Resin ${view.categoryName}`,
        description: `${
          view.products.length
        } handmade resin ${view.name.toLowerCase()} designs, each poured and finished by hand in India. Cash on delivery available.`,
        keywords: [
          view.name,
          `resin ${view.name.toLowerCase()}`,
          view.categoryName,
        ],
        alternates: { canonical: url },
        openGraph: { title: `${view.name} — Handmade Resin Art`, url },
      };
    }
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

const GRID =
  "mt-8 grid grid-cols-3 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-10 md:mt-10 md:grid-cols-3 lg:grid-cols-4";

function Empty({ message }: { message: string }) {
  return (
    <div className="mt-16 rounded-2xl border border-dashed border-border p-12 text-center">
      <p className="font-serif text-xl">No pieces found</p>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const sort = (sp.sort as ShopQuery["sort"]) ?? "newest";
  const categoriesList = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  const categories = categoriesList.map((c) => c.name);
  const inCategory = !!sp.category && sp.category !== "All";

  // ---- Level 3: inside one subcategory — the real, individual pieces ----
  // Skipped while searching, because a search should reach products directly.
  if (inCategory && sp.sub && !sp.q) {
    const view = await getSubcategoryView(sp.category!, sp.sub, sort);
    if (view) {
      const range =
        view.priceMin === view.priceMax
          ? formatINR(view.priceMin)
          : `${formatINR(view.priceMin)} – ${formatINR(view.priceMax)}`;

      return (
        <div className="container-px mx-auto max-w-7xl py-8 md:py-12">
          <header className="mb-6 md:mb-8">
            <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <Link href="/shop" className="hover:text-foreground">
                Shop
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link
                href={`/shop?category=${encodeURIComponent(view.categoryName)}`}
                className="hover:text-foreground"
              >
                {view.categoryName}
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">{view.name}</span>
            </nav>
            <h1 className="mt-2 font-serif text-3xl md:text-4xl">{view.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {view.products.length} design
              {view.products.length === 1 ? "" : "s"} · {range}
            </p>
          </header>

          <Suspense fallback={<div className="h-24" />}>
            <ShopFilters categories={categories} />
          </Suspense>

          {view.products.length > 0 ? (
            <div className={GRID}>
              {view.products.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i * 0.05, 0.3)}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Empty message="This collection is being restocked — check back soon." />
          )}
        </div>
      );
    }
    // An unknown subcategory falls through to the category page below.
  }

  // ---- Level 2: a category — groups as tiles, one-offs as products ----
  if (inCategory && !sp.q) {
    const tiles = await getCategoryTiles(sp.category!, sort);

    return (
      <div className="container-px mx-auto max-w-7xl py-8 md:py-12">
        <header className="mb-6 md:mb-8">
          <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <Link href="/shop" className="hover:text-foreground">
              Shop
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{sp.category}</span>
          </nav>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl">
            {sp.category}
          </h1>
        </header>

        <Suspense fallback={<div className="h-24" />}>
          <ShopFilters categories={categories} />
        </Suspense>

        {tiles.length > 0 ? (
          <div className={GRID}>
            {tiles.map((tile, i) => (
              <Reveal
                key={tile.kind === "product" ? tile.product.id : tile.id}
                delay={Math.min(i * 0.05, 0.3)}
              >
                {tile.kind === "product" ? (
                  <ProductCard product={tile.product} />
                ) : (
                  <SubcategoryCard tile={tile} category={sp.category!} />
                )}
              </Reveal>
            ))}
          </div>
        ) : (
          <Empty message="Nothing in this category yet — try another one." />
        )}
      </div>
    );
  }

  // ---- Level 1: shop all, and every search — a flat list of real pieces ----
  const products = await getProducts({ category: sp.category, q: sp.q, sort });

  return (
    <div className="container-px mx-auto max-w-7xl py-8 md:py-12">
      <header className="mb-6 md:mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          The collection
        </p>
        <h1 className="mt-1 font-serif text-3xl md:text-4xl">
          {inCategory ? sp.category : "Shop all"}
        </h1>
      </header>

      <Suspense fallback={<div className="h-24" />}>
        <ShopFilters categories={categories} />
      </Suspense>

      {products.length > 0 ? (
        <div className={GRID}>
          {products.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i * 0.05, 0.3)}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      ) : (
        <Empty message="Try a different category or search term." />
      )}
    </div>
  );
}
