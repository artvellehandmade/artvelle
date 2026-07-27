"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Lock, Truck, CreditCard } from "lucide-react";
import { useCart } from "@/context/cart";
import { useSettings } from "@/context/settings";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { placeOrder, verifyRazorpayPayment } from "@/app/actions/orders";

type PaymentMethod = "COD" | "Razorpay";

// Razorpay Checkout is loaded on demand from their CDN.
type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (r: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
};
type RazorpayInstance = { open: () => void };
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

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

  const onlineAvailable = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
  const codAvailable = s.codEnabled !== false;
  const [method, setMethod] = useState<PaymentMethod>(
    codAvailable ? "COD" : "Razorpay"
  );

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

    // If paying online, make sure the Razorpay script is ready before we start.
    if (method === "Razorpay") {
      const ok = await loadRazorpayScript();
      if (!ok) {
        setLoading(false);
        toast.error("Couldn't load the payment window. Check your connection.");
        return;
      }
    }

    const res = await placeOrder({
      ...form,
      paymentMethod: method,
      visitorId,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        note: i.note,
        options: i.options,
      })),
    });

    if (!res.ok) {
      setLoading(false);
      if ("requiresLogin" in res && res.requiresLogin) {
        toast.error("Please log in to confirm your order.");
        router.push("/account/login?next=/checkout");
        return;
      }
      toast.error(res.error || "Something went wrong");
      return;
    }

    // COD — order is confirmed immediately.
    if (!("payment" in res) || !res.payment) {
      clear();
      toast.success("Order placed!");
      router.push(`/order/${res.orderNumber}`);
      return;
    }

    // Online — open Razorpay Checkout, then verify server-side on success.
    const pay = res.payment;
    const orderNumber = res.orderNumber;

    if (!window.Razorpay) {
      setLoading(false);
      toast.error("Payment window unavailable. Please try again.");
      return;
    }

    const rzp = new window.Razorpay({
      key: pay.keyId,
      amount: pay.amount,
      currency: pay.currency,
      name: pay.name,
      description: `Order ${orderNumber}`,
      order_id: pay.orderId,
      prefill: pay.prefill,
      theme: { color: "#b08d4c" },
      handler: async (r) => {
        const verify = await verifyRazorpayPayment({
          orderNumber,
          razorpayOrderId: r.razorpay_order_id,
          razorpayPaymentId: r.razorpay_payment_id,
          razorpaySignature: r.razorpay_signature,
        });
        if (verify.ok) {
          clear();
          toast.success("Payment successful!");
          router.push(`/order/${orderNumber}`);
        } else {
          setLoading(false);
          toast.error(
            verify.error ||
              "We couldn't confirm your payment. If money was deducted, contact us."
          );
        }
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
          toast("Payment cancelled — your order is saved and unpaid.", {
            description: "You can pay later or contact us to complete it.",
          });
        },
      },
    });
    rzp.open();
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
              {onlineAvailable && (
                <label
                  className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-colors ${
                    method === "Razorpay"
                      ? "border-foreground bg-muted/40"
                      : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={method === "Razorpay"}
                    onChange={() => setMethod("Razorpay")}
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-sm">
                    Pay online
                    <span className="block text-xs text-muted-foreground">
                      UPI, cards, netbanking &amp; wallets — secured by Razorpay
                    </span>
                  </span>
                  <CreditCard className="ml-auto h-4 w-4 text-muted-foreground" />
                </label>
              )}

              {codAvailable && (
                <label
                  className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-colors ${
                    method === "COD"
                      ? "border-foreground bg-muted/40"
                      : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={method === "COD"}
                    onChange={() => setMethod("COD")}
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-sm">
                    Cash on Delivery
                    <span className="block text-xs text-muted-foreground">
                      Pay in cash when your order arrives
                    </span>
                  </span>
                  <Truck className="ml-auto h-4 w-4 text-muted-foreground" />
                </label>
              )}
            </div>
            {!onlineAvailable && (
              <p className="mt-2 text-xs text-muted-foreground">
                Pay conveniently on delivery.
              </p>
            )}
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
                  {i.options && i.options.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {i.options.map((o) => o.value).join(" · ")}
                    </span>
                  )}
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
                <Loader2 className="h-4 w-4 animate-spin" />{" "}
                {method === "Razorpay" ? "Starting payment…" : "Placing order…"}
              </>
            ) : method === "Razorpay" ? (
              <>Pay {formatINR(total)}</>
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
