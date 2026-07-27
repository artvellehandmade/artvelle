/**
 * NimbusPost (delivery) helper — server only.
 *
 * IMPORTANT: NimbusPost's API authenticates with your ACCOUNT email + password
 * (the same login used at ship.nimbuspost.com) via POST /users/login, which
 * returns a Bearer token. The "API key/secret" shown in the dashboard are NOT
 * accepted by this API — verified against the live endpoints. So set
 * NIMBUSPOST_EMAIL and NIMBUSPOST_PASSWORD in .env to enable shipping.
 *
 * Endpoints (base https://api.nimbuspost.com/v1/), mirrored from NimbusPost's
 * official SDK/Postman docs:
 *   POST  users/login              → { status, data: <token> }
 *   POST  shipments                → create shipment (auto-assigns courier + AWB)
 *   GET   shipments/track/{awb}    → tracking
 */

const BASE = "https://api.nimbuspost.com/v1";

function num(envVar: string | undefined, fallback: number): number {
  const n = Number(envVar);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function isNimbusPostConfigured(): boolean {
  return Boolean(process.env.NIMBUSPOST_EMAIL && process.env.NIMBUSPOST_PASSWORD);
}

// Simple in-memory token cache (best-effort across warm invocations).
let cachedToken: { token: string; at: number } | null = null;
const TOKEN_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function login(): Promise<string> {
  if (cachedToken && Date.now() - cachedToken.at < TOKEN_TTL_MS) {
    return cachedToken.token;
  }
  const res = await fetch(`${BASE}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.NIMBUSPOST_EMAIL,
      password: process.env.NIMBUSPOST_PASSWORD,
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!data?.status || !data?.data) {
    throw new Error(data?.message || "NimbusPost login failed. Check NIMBUSPOST_EMAIL / NIMBUSPOST_PASSWORD.");
  }
  cachedToken = { token: String(data.data), at: Date.now() };
  return cachedToken.token;
}

async function authed(path: string, init?: RequestInit) {
  const token = await login();
  const res = await fetch(`${BASE}/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  return res.json().catch(() => ({}));
}

export type ShipmentInput = {
  orderNumber: string;
  paymentType: "prepaid" | "cod";
  orderAmount: number; // rupees
  consignee: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  items: { name: string; qty: number; price: number }[];
};

export type ShipmentResult = {
  awb: string;
  courierName: string | null;
  shipmentId: string | null;
  trackingUrl: string | null;
};

/**
 * Create a forward shipment. NimbusPost auto-assigns the cheapest serviceable
 * courier and returns an AWB. The pickup location must already exist in your
 * NimbusPost dashboard; its name goes in NIMBUSPOST_WAREHOUSE_NAME.
 */
export async function createShipment(
  input: ShipmentInput
): Promise<ShipmentResult> {
  if (!isNimbusPostConfigured()) {
    throw new Error("NimbusPost is not configured (set NIMBUSPOST_EMAIL / NIMBUSPOST_PASSWORD).");
  }
  const warehouseName = process.env.NIMBUSPOST_WAREHOUSE_NAME;
  if (!warehouseName) {
    throw new Error("Set NIMBUSPOST_WAREHOUSE_NAME to your pickup warehouse name from the NimbusPost dashboard.");
  }

  const payload = {
    order_number: input.orderNumber,
    payment_type: input.paymentType,
    order_amount: input.orderAmount,
    package_weight: num(process.env.NIMBUSPOST_DEFAULT_WEIGHT, 500),
    package_length: num(process.env.NIMBUSPOST_DEFAULT_LENGTH, 15),
    package_breadth: num(process.env.NIMBUSPOST_DEFAULT_BREADTH, 15),
    package_height: num(process.env.NIMBUSPOST_DEFAULT_HEIGHT, 10),
    consignee: {
      name: input.consignee.name,
      address: input.consignee.address,
      address_2: "",
      city: input.consignee.city,
      state: input.consignee.state,
      pincode: input.consignee.pincode,
      phone: input.consignee.phone,
    },
    pickup: { warehouse_name: warehouseName },
    order_items: input.items.map((i) => ({
      name: i.name,
      qty: String(i.qty),
      price: String(i.price),
    })),
  };

  const data = await authed("shipments", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!data?.status) {
    throw new Error(data?.message || "NimbusPost could not create the shipment.");
  }

  // Response shape can vary; read defensively.
  const d = data.data ?? data;
  const awb = String(d.awb_number ?? d.awb ?? "");
  if (!awb) {
    throw new Error("NimbusPost did not return an AWB number.");
  }
  return {
    awb,
    courierName: d.courier_name ?? d.courier ?? null,
    shipmentId: d.shipment_id != null ? String(d.shipment_id) : null,
    trackingUrl: d.tracking_url ?? `https://ship.nimbuspost.com/track/${awb}`,
  };
}

export async function trackShipment(awb: string) {
  return authed(`shipments/track/${encodeURIComponent(awb)}`, { method: "GET" });
}
