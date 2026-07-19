import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import type { ProductDTO } from "./types";

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
    const where: Prisma.ProductWhereInput = { isActive: true };
    if (query.category && query.category !== "All") {
      where.category = query.category;
    }
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
        { tags: { has: query.q.toLowerCase() } },
      ];
    }
    const products = await prisma.product.findMany({
      where,
      orderBy: orderBy(query.sort),
    });
    return products as ProductDTO[];
  } catch (err) {
    console.error("[products] getProducts failed:", err);
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
      return (await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      })) as ProductDTO[];
    }
    return products as ProductDTO[];
  } catch (err) {
    console.error("[products] getFeatured failed:", err);
    return [];
  }
}

export async function getProductBySlug(
  slug: string
): Promise<ProductDTO | null> {
  try {
    const product = await prisma.product.findUnique({ where: { slug } });
    return product as ProductDTO | null;
  } catch (err) {
    console.error("[products] getProductBySlug failed:", err);
    return null;
  }
}

export async function getRelated(
  category: string,
  excludeId: string,
  limit = 4
): Promise<ProductDTO[]> {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, category, id: { not: excludeId } },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    return products as ProductDTO[];
  } catch {
    return [];
  }
}

export async function getCategoryCounts(): Promise<
  { category: string; count: number }[]
> {
  try {
    const grouped = await prisma.product.groupBy({
      by: ["category"],
      where: { isActive: true },
      _count: { _all: true },
    });
    return grouped.map((g) => ({
      category: g.category,
      count: g._count._all,
    }));
  } catch {
    return [];
  }
}
