import { Suspense } from "react";
import { getProducts, type ShopQuery } from "@/lib/products";
import { ProductCard } from "@/components/store/product-card";
import { Reveal } from "@/components/store/reveal";
import { ShopFilters } from "@/components/store/shop-filters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Shop" };

type SP = Promise<{ category?: string; q?: string; sort?: string }>;

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
    <div className="container-px mx-auto max-w-7xl py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          The collection
        </p>
        <h1 className="mt-1 font-serif text-4xl">
          {sp.category && sp.category !== "All" ? sp.category : "Shop all"}
        </h1>
      </header>

      <Suspense fallback={<div className="h-24" />}>
        <ShopFilters categories={categories} />
      </Suspense>

      {products.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
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
