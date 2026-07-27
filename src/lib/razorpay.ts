import crypto from "crypto";

/**
 * Minimal Razorpay helper built on the REST API + Node crypto — no extra
 * dependency. Used by the checkout server actions to create an order and to
 * verify the payment signature returned by Razorpay Checkout.
 *
 * Docs: https://razorpay.com/docs/api/orders/ and /docs/payments/payment-gateway/web-integration/standard/
 */

const KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const API_BASE = "https://api.razorpay.com/v1";

/** True when server keys are present, so the app can offer online payment. */
export function isRazorpayConfigured(): boolean {
  return Boolean(KEY_ID && KEY_SECRET);
}

/** Public key id, safe to hand to the browser to open Checkout. */
export function razorpayPublicKey(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || KEY_ID;
}

function authHeader(): string {
  return "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
}

export type RazorpayOrder = {
  id: string;
  amount: number; // in paise
  currency: string;
  status: string;
  receipt?: string;
};

/**
 * Create a Razorpay order. `amountInRupees` is whole rupees (the store prices
 * are integers); Razorpay works in paise, so we multiply by 100.
 */
export async function createRazorpayOrder(params: {
  amountInRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay is not configured");
  }
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(params.amountInRupees * 100),
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    const msg =
      data?.error?.description || data?.error?.reason || "Razorpay order failed";
    throw new Error(msg);
  }
  return data as RazorpayOrder;
}

/**
 * Verify the signature Razorpay Checkout returns after a successful payment.
 * signature === HMAC_SHA256(order_id + "|" + payment_id, key_secret).
 * Timing-safe compare to avoid leaking via response timing.
 */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(params.signature || "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
