import { prisma } from "@/lib/prisma";
import { CategoryManager } from "@/components/admin/category-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories — Admin" };

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { subcategories: true } } },
  });

  return (
    <CategoryManager
      initialCategories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        imageUrl: c.imageUrl,
        subcategoryCount: c._count.subcategories,
      }))}
    />
  );
}
