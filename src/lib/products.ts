import { prisma } from "./prisma";
import type { Prisma, Product } from "@prisma/client";
import type {
  ProductDTO,
  ProductOption,
  VariantPrice,
  Variant,
  PaymentMode,
} from "./types";
import { searchProducts } from "./search";

/** Normalise a Prisma product row into a ProductDTO (coerces the JSON columns). */
export function toDTO(p: Product & { productImages?: { media: any }[] }): ProductDTO {
  return {
    ...p,
    media: p.productImages?.map((pi) => ({
      id: pi.media.id,
      url: pi.media.url,
      alt: pi.media.alt,
      width: pi.media.width,
      height: pi.media.height,
    })),
    options: Array.isArray(p.options)
      ? (p.options as unknown as ProductOption[])
      : [],
    variantPrices: Array.isArray(p.variantPrices)
      ? (p.variantPrices as unknown as VariantPrice[])
      : [],
    variants: Array.isArray(p.variants)
      ? (p.variants as unknown as Variant[])
      : [],
    paymentModes: (Array.isArray(p.paymentModes)
      ? p.paymentModes
      : ["prepaid", "cod"]) as PaymentMode[],
  };
}

export type ShopQuery = {
  category?: string;
  q?: string;
  sort?: "newest" | "price-asc" | "price-desc" | "featured";
};

function orderBy(
  sort?: ShopQuery["sort"]
): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price-asc":
      return { price: "asc" };
    case "price-desc":
      return { price: "desc" };
    case "featured":
      return { isFeatured: "desc" };
    default:
      return { createdAt: "desc" };
  }
}

export async function getProducts(query: ShopQuery = {}): Promise<ProductDTO[]> {
  try {
    const and: Prisma.ProductWhereInput[] = [{ isActive: true }];
    // A category page shows pieces whose primary OR secondary category matches.
    if (query.category && query.category !== "All") {
      and.push({
        OR: [
          { category: query.category },
          { secondaryCategory: query.category },
        ],
      });
    }

    const products = (
      await prisma.product.findMany({
        where: { AND: and },
        orderBy: orderBy(query.sort),
        include: { productImages: { include: { media: true } } },
      })
    ).map(toDTO);

    // Typo-tolerant fuzzy search (keeps the chosen sort when there's no query).
    if (query.q && query.q.trim()) {
      return searchProducts(products, query.q);
    }
    return products;
  } catch (err) {
    console.error("[products] getProducts failed:", err);
    return [];
  }
}

/** Compact catalogue for the live search dropdown (typo-tolerant). */
export async function searchCatalogue(
  q: string,
  limit = 6
): Promise<ProductDTO[]> {
  try {
    const products = (
      await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { isFeatured: "desc" },
        include: { productImages: { include: { media: true } } },
      })
    ).map(toDTO);
    return searchProducts(products, q, limit);
  } catch (err) {
    console.error("[products] searchCatalogue failed:", err);
    return [];
  }
}

export async function getFeatured(limit = 4): Promise<ProductDTO[]> {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    if (products.length === 0) {
      return (
        await prisma.product.findMany({
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      ).map(toDTO);
    }
    return products.map(toDTO);
  } catch (err) {
    console.error("[products] getFeatured failed:", err);
    return [];
  }
}

export async function getProductBySlug(
  slug: string
): Promise<ProductDTO | null> {
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: { productImages: { include: { media: true } } },
    });
    if (!product || !product.isActive) return null;
    return toDTO(product);
  } catch (err) {
    console.error("[products] getProductBySlug failed:", err);
    return null;
  }
}

export async function getRelated(
  category: string,
  excludeId: string,
  limit = 4,
  secondaryCategory?: string | null,
  subcategoryId?: string | null
): Promise<ProductDTO[]> {
  try {
    const cats = [category, secondaryCategory].filter(Boolean) as string[];

    // Siblings in the same group come first — the closest match to what the
    // shopper is looking at is another design of the same thing.
    const siblings = subcategoryId
      ? await prisma.product.findMany({
          where: { isActive: true, id: { not: excludeId }, subcategoryId },
          take: limit,
          orderBy: { createdAt: "desc" },
        })
      : [];
    if (siblings.length >= limit) return siblings.slice(0, limit).map(toDTO);

    const seen = new Set([excludeId, ...siblings.map((p) => p.id)]);
    const rest = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { notIn: [...seen] },
        OR: [{ category: { in: cats } }, { secondaryCategory: { in: cats } }],
      },
      take: limit - siblings.length,
      orderBy: { createdAt: "desc" },
    });
    return [...siblings, ...rest].map(toDTO);
  } catch {
    return [];
  }
}

export async function getCategoryCounts(): Promise<
  { category: string; count: number }[]
> {
  try {
    // Count a product under BOTH its primary and secondary category.
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { category: true, secondaryCategory: true },
    });
    const tally = new Map<string, number>();
    for (const p of products) {
      tally.set(p.category, (tally.get(p.category) ?? 0) + 1);
      if (p.secondaryCategory) {
        tally.set(
          p.secondaryCategory,
          (tally.get(p.secondaryCategory) ?? 0) + 1
        );
      }
    }
    return [...tally.entries()].map(([category, count]) => ({
      category,
      count,
    }));
  } catch {
    return [];
  }
}
