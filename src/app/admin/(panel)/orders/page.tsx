import { ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { OrdersTable, type AdminOrder } from "@/components/admin/orders-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

export default async function AdminOrders() {
  const raw = await prisma.order
    .findMany({ orderBy: { createdAt: "desc" } })
    .catch(() => []);

  const orders: AdminOrder[] = raw.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    email: o.email,
    phone: o.phone,
    address: o.address,
    city: o.city,
    state: o.state,
    pincode: o.pincode,
    items: o.items as AdminOrder["items"],
    subtotal: o.subtotal,
    shipping: o.shipping,
    total: o.total,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    status: o.status,
    note: o.note,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="font-serif text-3xl">Orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {orders.length} order{orders.length === 1 ? "" : "s"}
      </p>

      {orders.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 font-serif text-xl">No orders yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Orders placed on your store will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <OrdersTable orders={orders} />
        </div>
      )}
    </div>
  );
}
