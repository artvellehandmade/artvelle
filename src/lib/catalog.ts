import { prisma } from "./prisma";
import type { ProductDTO } from "./types";
import { toDTO } from "./products";

/**
 * The browsing hierarchy: Category → Subcategory → Product.
 *
 * "Pooja Essentials" (category) shows "Resin Pooja Thali" (subcategory) as if
 * it were a product — name, photo, price range — and clicking it lists the
 * actual thalis. The rule the owner asked for: a group holding more than one
 * piece is shown as a group; a group holding exactly one piece IS that piece,
 * so single items never cost the shopper an extra click.
 */

export type SubcategoryTile = {
  kind: "subcategory";
  id: string;
  name: string;
  slug: string;
  /** Own cover photos, or borrowed from the products inside. */
  images: string[];
  priceMin: number;
  priceMax: number;
  productCount: number;
};

export type ProductTile = { kind: "product"; product: ProductDTO };
export type CategoryTile = SubcategoryTile | ProductTile;

/**
 * Cheapest and dearest a product can actually be bought for. Variants each
 * carry their own price, so a piece offered from ₹500 to ₹2,000 reports both
 * ends rather than just its base price.
 */
export function productPriceRange(p: ProductDTO): { min: number; max: number } {
  const prices = [p.price];
  for (const v of p.variants) {
    if (v.available && Number.isFinite(v.price)) prices.push(v.price);
  }
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Range across a set of products, ignoring any manual override. */
export function computedRange(products: ProductDTO[]) {
  if (products.length === 0) return { min: 0, max: 0 };
  const ranges = products.map(productPriceRange);
  return {
    min: Math.min(...ranges.map((r) => r.min)),
    max: Math.max(...ranges.map((r) => r.max)),
  };
}

type SubcategoryRow = {
  id: string;
  name: string;
  slug: string;
  images: string[];
  priceMin: number | null;
  priceMax: number | null;
};

/**
 * Cover photos for a group. Its own pick wins; otherwise the first photo of
 * each of the first two products stands in — so a photo already attached to a
 * product never has to be uploaded or re-picked for the group as well.
 */
function coverImages(sub: SubcategoryRow, products: ProductDTO[]): string[] {
  const own = sub.images.filter(Boolean);
  if (own.length > 0) return own.slice(0, 2);
  const borrowed: string[] = [];
  for (const p of products) {
    const first = p.images[0];
    if (first && !borrowed.includes(first)) borrowed.push(first);
    if (borrowed.length === 2) break;
  }
  return borrowed;
}

function toTile(sub: SubcategoryRow, products: ProductDTO[]): SubcategoryTile {
  const auto = computedRange(products);
  return {
    kind: "subcategory",
    id: sub.id,
    name: sub.name,
    slug: sub.slug,
    images: coverImages(sub, products),
    // A manual override on either end wins; the other end still comes from the
    // live products, so a half-filled override can't produce a broken range.
    priceMin: sub.priceMin ?? auto.min,
    priceMax: sub.priceMax ?? auto.max,
    productCount: products.length,
  };
}

/**
 * What to render on a category page: a mix of group tiles and plain products.
 *
 * `sort` only reorders the loose products — groups always lead, in their
 * configured order, so the shelf structure stays stable as stock changes.
 */
export async function getCategoryTiles(
  categoryName: string,
  sort?: "newest" | "price-asc" | "price-desc" | "featured"
): Promise<CategoryTile[]> {
  try {
    const category = await prisma.category.findFirst({
      where: { name: categoryName },
      select: { id: true },
    });

    // A category page shows pieces whose primary OR secondary category matches.
    const products = (
      await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { category: categoryName },
            { secondaryCategory: categoryName },
          ],
        },
        orderBy: { createdAt: "desc" },
      })
    ).map(toDTO);

    const subs: SubcategoryRow[] = category
      ? await prisma.subcategory.findMany({
          where: { categoryId: category.id, isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            priceMin: true,
            priceMax: true,
          },
        })
      : [];

    const tiles: CategoryTile[] = [];
    const grouped = new Set<string>();

    for (const sub of subs) {
      const inside = products.filter((p) => p.subcategoryId === sub.id);
      if (inside.length === 0) continue; // nothing to sell yet — hide it
      for (const p of inside) grouped.add(p.id);
      if (inside.length === 1) {
        // Exactly one piece: it IS the product, not a group.
        tiles.push({ kind: "product", product: inside[0] });
      } else {
        tiles.push(toTile(sub, inside));
      }
    }

    // Anything not inside one of THIS category's groups sits on the page
    // directly — including a piece that only appears here as a secondary
    // category while its group lives elsewhere.
    const loose = products.filter((p) => !grouped.has(p.id));
    sortProducts(loose, sort);
    for (const p of loose) tiles.push({ kind: "product", product: p });

    return tiles;
  } catch (err) {
    console.error("[catalog] getCategoryTiles failed:", err);
    return [];
  }
}

function sortProducts(products: ProductDTO[], sort?: string) {
  switch (sort) {
    case "price-asc":
      products.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      products.sort((a, b) => b.price - a.price);
      break;
    case "featured":
      products.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
      break;
    // "newest" is the order they arrive in from the query.
  }
}

export type SubcategoryView = {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  images: string[];
  priceMin: number;
  priceMax: number;
  products: ProductDTO[];
};

/** One group and the real pieces inside it, for the drill-down page. */
export async function getSubcategoryView(
  categoryName: string,
  subSlug: string,
  sort?: "newest" | "price-asc" | "price-desc" | "featured"
): Promise<SubcategoryView | null> {
  try {
    const sub = await prisma.subcategory.findFirst({
      where: { slug: subSlug, isActive: true, category: { name: categoryName } },
      select: {
        id: true,
        name: true,
        slug: true,
        images: true,
        priceMin: true,
        priceMax: true,
        category: { select: { name: true } },
      },
    });
    if (!sub) return null;

    const products = (
      await prisma.product.findMany({
        where: { isActive: true, subcategoryId: sub.id },
        orderBy: { createdAt: "desc" },
      })
    ).map(toDTO);
    sortProducts(products, sort);

    const tile = toTile(sub, products);
    return {
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
      categoryName: sub.category.name,
      images: tile.images,
      priceMin: tile.priceMin,
      priceMax: tile.priceMax,
      products,
    };
  } catch (err) {
    console.error("[catalog] getSubcategoryView failed:", err);
    return null;
  }
}

/**
 * The group a product sits in, for its breadcrumb — so someone looking at one
 * thali can get back to the other nineteen in a click.
 */
export async function getProductCrumb(subcategoryId: string | null) {
  if (!subcategoryId) return null;
  try {
    const sub = await prisma.subcategory.findUnique({
      where: { id: subcategoryId },
      select: {
        name: true,
        slug: true,
        isActive: true,
        category: { select: { name: true } },
        _count: { select: { products: { where: { isActive: true } } } },
      },
    });
    // A group of one collapses on the storefront — linking to it would send
    // the shopper to a page holding only the product they are already on.
    if (!sub || !sub.isActive || sub._count.products < 2) return null;
    return {
      name: sub.name,
      slug: sub.slug,
      categoryName: sub.category.name,
      href: `/shop?category=${encodeURIComponent(sub.category.name)}&sub=${
        sub.slug
      }`,
    };
  } catch {
    return null;
  }
}

/** Admin: every group in a category, with a live count and price range. */
export async function getSubcategoriesForAdmin(categoryId: string) {
  const subs = await prisma.subcategory.findMany({
    where: { categoryId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const products = (
    await prisma.product.findMany({
      where: { subcategoryId: { in: subs.map((s) => s.id) } },
    })
  ).map(toDTO);

  return subs.map((sub) => {
    const inside = products.filter((p) => p.subcategoryId === sub.id);
    const auto = computedRange(inside);
    return {
      ...sub,
      productCount: inside.length,
      autoPriceMin: auto.min,
      autoPriceMax: auto.max,
      coverImages: coverImages(sub, inside),
    };
  });
}
