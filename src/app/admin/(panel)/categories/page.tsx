import { prisma } from "@/lib/prisma";
import { CategoryManager } from "@/components/admin/category-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories — Admin" };

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return <CategoryManager initialCategories={categories} />;
}
