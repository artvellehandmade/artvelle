"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Lock, Truck, CreditCard, Wallet, MessageCircle } from "lucide-react";
import { useCart } from "@/context/cart";
import { useSettings } from "@/context/settings";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import {
  placeOrder,
  verifyRazorpayPayment,
  getCheckoutContext,
} from "@/app/actions/orders";
import type { PaymentMode } from "@/lib/types";

// The stored order label for each checkout mode.
const MODE_TO_METHOD: Record<PaymentMode, "Razorpay" | "COD" | "Partial" | "Direct"> = {
  prepaid: "Razorpay",
  cod: "COD",
  partial: "Partial",
  direct: "Direct",
};

type CheckoutContext = {
  methods: Record<PaymentMode, boolean>;
  products: { id: string; paymentModes: PaymentMode[]; advancePercent: number | null }[];
};

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
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
};

export function CheckoutClient({ user }: { user: CheckoutUser }) {
  const { items, subtotal, clear } = useCart();
  const s = useSettings();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Payment rules for the cart, loaded from the server (authoritative).
  const [ctx, setCtx] = useState<CheckoutContext | null>(null);
  const [method, setMethod] = useState<PaymentMode | null>(null);

  const [form, setForm] = useState({
    customerName: user.name ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    address: user.address ?? "",
    city: user.city ?? "",
    state: user.state ?? "",
    pincode: user.pincode ?? "",
    note: "",
  });

  const shipping =
    s.freeShippingThreshold != null && subtotal >= s.freeShippingThreshold
      ? 0
      : s.shippingFee;
  const total = subtotal + shipping;

  // A stable signature of the cart's product ids so we only refetch on change.
  const idKey = items.map((i) => i.productId).sort().join(",");

  useEffect(() => {
    const ids = idKey ? idKey.split(",") : [];
    if (ids.length === 0) {
      setCtx(null);
      return;
    }
    let alive = true;
    getCheckoutContext(ids).then((res) => {
      if (alive) setCtx(res);
    });
    return () => {
      alive = false;
    };
  }, [idKey]);

  // Modes offered = intersection of each product's modes, filtered by globals.
  const allowedModes = useMemo<PaymentMode[]>(() => {
    if (!ctx) return [];
    const byId = new Map(ctx.products.map((p) => [p.id, p]));
    const all: PaymentMode[] = ["prepaid", "cod", "partial", "direct"];
    let modes = all.filter((m) =>
      items.every((i) => {
        const p = byId.get(i.productId);
        const list = p?.paymentModes?.length ? p.paymentModes : ["prepaid", "cod"];
        return list.includes(m);
      })
    );
    modes = modes.filter((m) => ctx.methods[m]);
    return modes.length ? modes : ["direct"];
  }, [ctx, items]);

  // Advance (partial) = sum of each line's advance% of its line total.
  const advance = useMemo(() => {
    if (!ctx) return 0;
    const byId = new Map(ctx.products.map((p) => [p.id, p]));
    let a = 0;
    for (const i of items) {
      const pct = byId.get(i.productId)?.advancePercent ?? 0;
      a += Math.round((i.price * i.quantity * pct) / 100);
    }
    return Math.min(Math.max(a, 0), total);
  }, [ctx, items, total]);

  // Keep the selected mode valid as the allowed set resolves/changes.
  useEffect(() => {
    if (allowedModes.length === 0) return;
    setMethod((cur) => (cur && allowedModes.includes(cur) ? cur : allowedModes[0]));
  }, [allowedModes]);

  const isOnline = method === "prepaid" || method === "partial";
  const balanceDue =
    method === "prepaid" ? 0 : method === "partial" ? total - advance : total;

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
    if (!method) return;
    setLoading(true);

    const visitorId =
      typeof window !== "undefined"
        ? localStorage.getItem("artvelle_vid") ?? undefined
        : undefined;

    const online = method === "prepaid" || method === "partial";

    // If paying online, make sure the Razorpay script is ready before we start.
    if (online) {
      const ok = await loadRazorpayScript();
      if (!ok) {
        setLoading(false);
        toast.error("Couldn't load the payment window. Check your connection.");
        return;
      }
    }

    const res = await placeOrder({
      ...form,
      paymentMethod: MODE_TO_METHOD[method],
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

    // COD / Direct — confirmed immediately, no payment window.
    if (!("payment" in res) || !res.payment) {
      clear();
      toast.success(method === "direct" ? "Order request sent!" : "Order placed!");
      router.push(`/order/${res.orderNumber}`);
      return;
    }

    // Online (prepaid / partial) — open Razorpay, then verify server-side.
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

  // Presentation details for each offered mode.
  const MODE_UI: Record<
    PaymentMode,
    { label: string; desc: string; icon: React.ReactNode }
  > = {
    prepaid: {
      label: "Prepaid — Pay Online",
      desc: "UPI, cards, netbanking & wallets — secured by Razorpay",
      icon: <CreditCard className="h-4 w-4 text-muted-foreground" />,
    },
    partial: {
      label: "Advance Payment",
      desc: `Pay ${formatINR(advance)} advance online now · ${formatINR(
        total - advance
      )} on delivery. Advance is non-refundable.`,
      icon: <Wallet className="h-4 w-4 text-muted-foreground" />,
    },
    cod: {
      label: "Cash on Delivery",
      desc: "Pay in full when your order arrives",
      icon: <Truck className="h-4 w-4 text-muted-foreground" />,
    },
    direct: {
      label: "Customised Order",
      desc: "No payment now — we'll contact you to finalise your custom piece. Customised orders are non-refundable.",
      icon: <MessageCircle className="h-4 w-4 text-muted-foreground" />,
    },
  };

  const buttonLabel = !method
    ? "Loading…"
    : method === "prepaid"
    ? `Pay ${formatINR(total)}`
    : method === "partial"
    ? `Pay ${formatINR(advance)} now`
    : method === "direct"
    ? "Request customised order"
    : `Place order · ${formatINR(total)}`;

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
            {!ctx ? (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading payment
                options…
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {allowedModes.map((m) => {
                  const ui = MODE_UI[m];
                  return (
                    <label
                      key={m}
                      className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-colors ${
                        method === m
                          ? "border-foreground bg-muted/40"
                          : "border-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={method === m}
                        onChange={() => setMethod(m)}
                        className="accent-[var(--accent)]"
                      />
                      <span className="text-sm">
                        {ui.label}
                        <span className="block text-xs text-muted-foreground">
                          {ui.desc}
                        </span>
                      </span>
                      <span className="ml-auto">{ui.icon}</span>
                    </label>
                  );
                })}
              </div>
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

            {/* Payment split — shown for partial (advance) and any COD balance. */}
            {method === "partial" && (
              <div className="mt-1 space-y-1 rounded-xl bg-muted/50 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pay now (advance)</span>
                  <span className="font-medium">{formatINR(advance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due on delivery</span>
                  <span className="font-medium">{formatINR(balanceDue)}</span>
                </div>
                <p className="pt-1 text-muted-foreground">
                  The advance amount is non-refundable.
                </p>
              </div>
            )}
            {method === "cod" && (
              <p className="text-xs text-muted-foreground">
                Pay {formatINR(total)} in cash on delivery.
              </p>
            )}
            {method === "direct" && (
              <p className="text-xs text-muted-foreground">
                No payment now — we&apos;ll contact you to finalise your
                customised piece. Customised orders are non-refundable.
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !method}
            className="mt-6 w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />{" "}
                {isOnline ? "Starting payment…" : "Placing order…"}
              </>
            ) : (
              buttonLabel
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
