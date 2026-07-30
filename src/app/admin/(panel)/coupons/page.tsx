import Link from "next/link";
import { Plus, Ticket } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";
import { CouponRowActions } from "./coupon-row-actions"; // Need to create this

export const dynamic = "force-dynamic";
export const metadata = { title: "Coupons" };

export default async function AdminCoupons() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Coupons</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {coupons.length} coupon{coupons.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/coupons/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add coupon
          </Link>
        </div>
      </div>

      {coupons.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
          <Ticket className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 font-serif text-xl">No coupons yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a coupon code to offer discounts to your customers.
          </p>
          <Link
            href="/admin/coupons/new"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Add coupon
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Discount</th>
                  <th className="px-4 py-3 font-medium">Usage Limit</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium font-mono">{c.code}</p>
                          <span className="text-xs text-muted-foreground">
                            {c.productIds.length > 0 
                              ? `${c.productIds.length} specific product(s)`
                              : 'No specific products (invalid)'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.isPercentage 
                        ? `${c.discountAmount}%` 
                        : formatINR(c.discountAmount)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.usedCount} / {c.usageLimit ?? '∞'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          c.isActive
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.isActive ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <CouponRowActions id={c.id} isActive={c.isActive} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
