import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";
import type { ProductDTO, ProductOption, VariantPrice, Variant } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categoriesList] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  const categories = categoriesList.map((c) => c.name);

  const dto = {
    ...product,
    options: Array.isArray(product.options)
      ? (product.options as unknown as ProductOption[])
      : [],
    variantPrices: Array.isArray(product.variantPrices)
      ? (product.variantPrices as unknown as VariantPrice[])
      : [],
    variants: Array.isArray(product.variants)
      ? (product.variants as unknown as Variant[])
      : [],
  } as unknown as ProductDTO;

  return (
    <div>
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to products
      </Link>
      <h1 className="mb-6 font-serif text-3xl">Edit product</h1>
      <ProductForm product={dto} categories={categories} />
    </div>
  );
}

