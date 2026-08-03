import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site-url";

/**
 * Static routes worth indexing. Anything transactional or private is excluded
 * here and blocked in robots.ts.
 */
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/shop", priority: 0.9, changeFrequency: "daily" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.5, changeFrequency: "monthly" },
  { path: "/shipping-returns", priority: 0.5, changeFrequency: "monthly" },
  { path: "/privacy-policy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // A dead database must not take the whole sitemap down — degrade to the
  // static routes rather than throwing and serving nothing. But NEVER fail
  // silently: a sitemap that quietly loses every product looks identical to a
  // healthy one, so log loudly enough to spot it in the build output.
  const [products, categories] = await Promise.all([
    prisma.product
      .findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      })
      .catch((e) => {
        console.error("[sitemap] product query FAILED:", e);
        return [];
      }),
    prisma.category.findMany({ select: { name: true } }).catch((e) => {
      console.error("[sitemap] category query FAILED:", e);
      return [];
    }),
  ]);

  // Only groups that actually hold two or more pieces get their own URL — a
  // group of one collapses into that product on the storefront, so indexing it
  // would just duplicate the product page.
  const subcategories = await prisma.subcategory
    .findMany({
      where: { isActive: true },
      select: {
        slug: true,
        updatedAt: true,
        category: { select: { name: true } },
        _count: { select: { products: { where: { isActive: true } } } },
      },
    })
    .then((subs) => subs.filter((s) => s._count.products > 1))
    .catch((e) => {
      console.error("[sitemap] subcategory query FAILED:", e);
      return [];
    });

  console.log(
    `[sitemap] ${products.length} products, ${categories.length} categories, ${subcategories.length} subcategories, base=${base}`
  );

  for (const c of categories) {
    entries.push({
      url: `${base}/shop?category=${encodeURIComponent(c.name)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const s of subcategories) {
    entries.push({
      url: `${base}/shop?category=${encodeURIComponent(
        s.category.name
      )}&sub=${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  for (const p of products) {
    entries.push({
      url: `${base}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
