import { prisma } from "@/lib/prisma";
import { CouponForm } from "../coupon-form";

export const metadata = { title: "New Coupon" };

export default async function NewCouponPage() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="font-serif text-3xl mb-6">Create Coupon</h1>
      <CouponForm products={products} />
    </div>
  );
}
