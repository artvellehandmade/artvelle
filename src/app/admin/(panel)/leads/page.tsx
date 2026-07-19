import Image from "next/image";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";
import { LeadActions } from "@/components/admin/lead-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Interested customers" };

const statusColor: Record<string, string> = {
  interested: "bg-accent/15 text-accent",
  contacted: "bg-blue-500/15 text-blue-500",
  converted: "bg-success/15 text-success",
};

export default async function AdminLeads() {
  const leads = await prisma.lead
    .findMany({ orderBy: { createdAt: "desc" }, take: 300 })
    .catch(() => []);

  return (
    <div>
      <h1 className="font-serif text-3xl">Interested customers</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everyone who added a product to their cart — your warm leads.
      </p>

      {leads.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 font-serif text-xl">No cart activity yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When visitors add products to their cart, they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {l.productImage && (
                            <Image
                              src={l.productImage}
                              alt={l.productName}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{l.productName}</p>
                          {l.price != null && (
                            <p className="text-xs text-muted-foreground">
                              {formatINR(l.price)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{l.quantity}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.email || l.phone ? (
                        <span>
                          {l.email}
                          {l.email && l.phone ? " · " : ""}
                          {l.phone}
                        </span>
                      ) : (
                        <span className="text-xs">
                          Guest ({l.visitorId?.slice(0, 6) || "—"})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.createdAt.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs capitalize ${
                          statusColor[l.status] ?? "bg-muted"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <LeadActions id={l.id} status={l.status} />
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
