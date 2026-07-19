import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user-auth";
import { logout } from "@/app/actions/account";
import { AccountProfile } from "@/components/store/account-profile";
import {
  AccountOrders,
  type AccountOrder,
} from "@/components/store/account-orders";
import type { StatusEntry } from "@/components/store/order-timeline";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account" };

export default async function AccountPage() {
  const session = await getUserSession();
  if (!session) redirect("/account/login?next=/account");

  const user = await prisma.user
    .findUnique({ where: { id: session.id } })
    .catch(() => null);

  if (!user) {
    // Session valid but user row gone — force re-login.
    redirect("/account/login");
  }

  // Orders linked by account id OR matching email (covers guest→account merges).
  const raw = await prisma.order
    .findMany({
      where: { OR: [{ userId: user.id }, { email: user.email }] },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => []);

  const orders: AccountOrder[] = raw.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    total: o.total,
    subtotal: o.subtotal,
    shipping: o.shipping,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt.toISOString(),
    courier: o.courier,
    trackingNumber: o.trackingNumber,
    trackingUrl: o.trackingUrl,
    items: o.items as AccountOrder["items"],
    statusHistory: (Array.isArray(o.statusHistory)
      ? o.statusHistory
      : []) as unknown as StatusEntry[],
    address: o.address,
    city: o.city,
    state: o.state,
    pincode: o.pincode,
  }));

  return (
    <div className="container-px mx-auto max-w-6xl py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Hello, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-muted-foreground">
            Track your orders and manage your details
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </form>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <AccountProfile
            name={user.name}
            email={user.email}
            phone={user.phone}
          />
        </aside>

        <section>
          <h2 className="font-serif text-2xl">
            My orders
            <span className="ml-2 text-base text-muted-foreground">
              ({orders.length})
            </span>
          </h2>
          <div className="mt-5">
            <AccountOrders orders={orders} />
          </div>
        </section>
      </div>
    </div>
  );
}
