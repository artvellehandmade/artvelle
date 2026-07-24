import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add product" };

export default async function NewProductPage() {
  const categoriesList = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  const categories = categoriesList.map((c) => c.name);

  return (
    <div>
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to products
      </Link>
      <h1 className="mb-6 font-serif text-3xl">Add product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}

