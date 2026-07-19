"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Lock, Truck } from "lucide-react";
import { useCart } from "@/context/cart";
import { useSettings } from "@/context/settings";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { placeOrder } from "@/app/actions/orders";

const PAYMENTS = [
  { id: "COD", label: "Cash on Delivery", available: true },
  { id: "UPI", label: "UPI / Card (coming soon)", available: false },
  { id: "Razorpay", label: "Online payment (coming soon)", available: false },
];

export type CheckoutUser = {
  name: string;
  email: string;
  phone: string | null;
};

export function CheckoutClient({ user }: { user: CheckoutUser }) {
  const { items, subtotal, clear } = useCart();
  const s = useSettings();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customerName: user.name ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    note: "",
  });

  const shipping =
    s.freeShippingThreshold != null && subtotal >= s.freeShippingThreshold
      ? 0
      : s.shippingFee;
  const total = subtotal + shipping;

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  if (items.length === 0 && !loading) {
    return (
      <div className="container-px mx-auto max-w-2xl py-28 text-center">
        <h1 className="font-serif text-3xl">Your cart is empty</h1>
        <ButtonLink href="/shop" className="mt-8">
          Browse the shop
        </ButtonLink>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const visitorId =
      typeof window !== "undefined"
        ? localStorage.getItem("artvelle_vid") ?? undefined
        : undefined;

    const res = await placeOrder({
      ...form,
      paymentMethod: "COD",
      visitorId,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        note: i.note,
      })),
    });

    if (res.ok) {
      clear();
      toast.success("Order placed!");
      router.push(`/order/${res.orderNumber}`);
    } else {
      setLoading(false);
      if ("requiresLogin" in res && res.requiresLogin) {
        toast.error("Please log in to confirm your order.");
        router.push("/account/login?next=/checkout");
        return;
      }
      toast.error(res.error || "Something went wrong");
    }
  }

  return (
    <div className="container-px mx-auto max-w-6xl py-12">
      <h1 className="font-serif text-4xl">Checkout</h1>

      <form
        onSubmit={onSubmit}
        className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]"
      >
        <div className="space-y-8">
          <section>
            <h2 className="font-serif text-xl">Contact details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <input
                  required
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Phone" required>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Email" required className="sm:col-span-2">
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl">Shipping address</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Address" required className="sm:col-span-2">
                <input
                  required
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  className="input"
                  placeholder="House no, street, area"
                />
              </Field>
              <Field label="City" required>
                <input
                  required
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="State" required>
                <input
                  required
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Pincode" required>
                <input
                  required
                  value={form.pincode}
                  onChange={(e) => set("pincode", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Order notes (optional)" className="sm:col-span-2">
                <textarea
                  value={form.note}
                  onChange={(e) => set("note", e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="Personalisation details, delivery instructions…"
                />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl">Payment</h2>
            <div className="mt-4 space-y-3">
              {PAYMENTS.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 rounded-2xl border p-4 ${
                    p.available
                      ? "border-foreground cursor-pointer"
                      : "border-border opacity-60"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    defaultChecked={p.id === "COD"}
                    disabled={!p.available}
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-sm">{p.label}</span>
                  {p.id === "COD" && (
                    <Truck className="ml-auto h-4 w-4 text-muted-foreground" />
                  )}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Online payment options are coming soon. For now, pay conveniently
              on delivery.
            </p>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
          <h2 className="font-serif text-xl">Your order</h2>
          <ul className="mt-4 space-y-3">
            {items.map((i) => (
              <li key={i.productId} className="flex gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {i.image && (
                    <Image
                      src={i.image}
                      alt={i.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col text-sm">
                  <span className="line-clamp-1">{i.name}</span>
                  <span className="text-muted-foreground">Qty {i.quantity}</span>
                </div>
                <span className="text-sm font-medium">
                  {formatINR(i.price * i.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{shipping === 0 ? "Free" : formatINR(shipping)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-medium">
              <span>Total</span>
              <span>{formatINR(total)}</span>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="mt-6 w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Placing order…
              </>
            ) : (
              <>Place order · {formatINR(total)}</>
            )}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Your details are safe with us
          </p>
        </aside>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-sm text-muted-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
    </label>
  );
}
