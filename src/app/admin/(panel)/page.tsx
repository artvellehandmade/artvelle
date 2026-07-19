import Link from "next/link";
import {
  Package,
  ShoppingCart,
  IndianRupee,
  Users,
  MessageSquare,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

async function getStats() {
  try {
    const [
      products,
      activeProducts,
      orders,
      pendingOrders,
      revenueAgg,
      leads,
      unreadMessages,
      recentOrders,
      recentLeads,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "pending" } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: "cancelled" } },
      }),
      prisma.lead.count({ where: { status: "interested" } }),
      prisma.message.count({ where: { isRead: false } }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    ]);
    return {
      products,
      activeProducts,
      orders,
      pendingOrders,
      revenue: revenueAgg._sum.total ?? 0,
      leads,
      unreadMessages,
      recentOrders,
      recentLeads,
      ok: true as const,
    };
  } catch {
    return { ok: false as const };
  }
}

export default async function AdminDashboard() {
  const stats = await getStats();

  if (!stats.ok) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <h1 className="font-serif text-2xl">Database not connected</h1>
        <p className="mt-2 text-muted-foreground">
          Set your <code className="rounded bg-muted px-1.5">DATABASE_URL</code>{" "}
          and run the setup script to see your dashboard. See the README.
        </p>
      </div>
    );
  }

  const cards = [
    {
      label: "Revenue",
      value: formatINR(stats.revenue),
      icon: IndianRupee,
      href: "/admin/orders",
    },
    {
      label: "Orders",
      value: stats.orders,
      sub: `${stats.pendingOrders} pending`,
      icon: ShoppingCart,
      href: "/admin/orders",
    },
    {
      label: "Products",
      value: stats.products,
      sub: `${stats.activeProducts} active`,
      icon: Package,
      href: "/admin/products",
    },
    {
      label: "Interested",
      value: stats.leads,
      sub: "in cart",
      icon: Users,
      href: "/admin/leads",
    },
    {
      label: "Inquiries",
      value: stats.unreadMessages,
      sub: "unread",
      icon: MessageSquare,
      href: "/admin/messages",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back — here&apos;s how your store is doing.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="hidden rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:opacity-90 sm:inline-block"
        >
          + Add product
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              href={c.href}
              className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-accent"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-4 text-2xl font-medium">{c.value}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {c.label}
              </p>
              {c.sub && (
                <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm hover:text-accent">
              View all
            </Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {stats.recentOrders.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">No orders yet.</p>
            )}
            {stats.recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{o.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.orderNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatINR(o.total)}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {o.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent interested */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg">Interested customers</h2>
            <Link href="/admin/leads" className="text-sm hover:text-accent">
              View all
            </Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {stats.recentLeads.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">
                No cart activity yet.
              </p>
            )}
            {stats.recentLeads.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty {l.quantity}
                    {l.email ? ` · ${l.email}` : ""}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {l.createdAt.toLocaleDateString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
