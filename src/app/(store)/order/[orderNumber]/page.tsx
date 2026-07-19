import Link from "next/link";
import { CheckCircle2, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order confirmed" };

type Item = { name: string; quantity: number; price: number };

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  const order = await prisma.order
    .findUnique({ where: { orderNumber } })
    .catch(() => null);

  if (!order) {
    return (
      <div className="container-px mx-auto max-w-xl py-28 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-6 font-serif text-3xl">Order not found</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn&apos;t find an order with that number.
        </p>
        <ButtonLink href="/shop" className="mt-8">
          Back to shop
        </ButtonLink>
      </div>
    );
  }

  const items = order.items as unknown as Item[];

  return (
    <div className="container-px mx-auto max-w-2xl py-16">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h1 className="mt-5 font-serif text-4xl">Thank you!</h1>
        <p className="mt-2 text-muted-foreground">
          Your order <span className="font-medium text-foreground">{order.orderNumber}</span> is
          confirmed. A confirmation email is on its way to {order.email}.
        </p>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl">Order summary</h2>
          <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize text-muted-foreground">
            {order.status}
          </span>
        </div>

        <ul className="mt-5 divide-y divide-border">
          {items.map((i, idx) => (
            <li key={idx} className="flex justify-between py-3 text-sm">
              <span>
                {i.name} <span className="text-muted-foreground">× {i.quantity}</span>
              </span>
              <span className="font-medium">
                {formatINR(i.price * i.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <Row label="Subtotal" value={formatINR(order.subtotal)} />
          <Row
            label="Shipping"
            value={order.shipping === 0 ? "Free" : formatINR(order.shipping)}
          />
          <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
            <span>Total</span>
            <span>{formatINR(order.total)}</span>
          </div>
          <Row label="Payment" value={order.paymentMethod} />
        </div>

        <div className="mt-6 rounded-xl bg-muted p-4 text-sm">
          <p className="font-medium">{order.customerName}</p>
          <p className="mt-1 text-muted-foreground">
            {order.address}, {order.city}, {order.state} - {order.pincode}
          </p>
          <p className="text-muted-foreground">{order.phone}</p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <ButtonLink href="/shop">Continue shopping</ButtonLink>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
