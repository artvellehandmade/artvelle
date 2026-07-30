import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CouponForm } from "../../coupon-form";

export const metadata = { title: "Edit Coupon" };

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const [coupon, products] = await Promise.all([
    prisma.coupon.findUnique({ where: { id } }),
    prisma.product.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!coupon) notFound();

  return (
    <div>
      <h1 className="font-serif text-3xl mb-6">Edit Coupon</h1>
      <CouponForm coupon={coupon} products={products} />
    </div>
  );
}
