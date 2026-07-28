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
  return Boolean(
    process.env.NIMBUSPOST_TOKEN ||
      (process.env.NIMBUSPOST_EMAIL && process.env.NIMBUSPOST_PASSWORD)
  );
}

// Simple in-memory token cache (best-effort across warm invocations).
let cachedToken: { token: string; at: number } | null = null;
const TOKEN_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function login(): Promise<string> {
  if (process.env.NIMBUSPOST_TOKEN) {
    return process.env.NIMBUSPOST_TOKEN.trim();
  }
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
    throw new Error(
      data?.message ||
        "NimbusPost login failed. Check NIMBUSPOST_EMAIL / NIMBUSPOST_PASSWORD or set NIMBUSPOST_TOKEN."
    );
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
  // Optional parcel size; falls back to NIMBUSPOST_DEFAULT_* when omitted.
  parcel?: { weight?: number; length?: number; breadth?: number; height?: number };
};

/** Build the NimbusPost order/shipment request body from an order. */
function buildPayload(input: ShipmentInput, warehouseName: string) {
  const p = input.parcel ?? {};
  return {
    order_number: input.orderNumber,
    payment_type: input.paymentType,
    order_amount: input.orderAmount,
    package_weight: p.weight && p.weight > 0 ? p.weight : num(process.env.NIMBUSPOST_DEFAULT_WEIGHT, 500),
    package_length: p.length && p.length > 0 ? p.length : num(process.env.NIMBUSPOST_DEFAULT_LENGTH, 15),
    package_breadth: p.breadth && p.breadth > 0 ? p.breadth : num(process.env.NIMBUSPOST_DEFAULT_BREADTH, 15),
    package_height: p.height && p.height > 0 ? p.height : num(process.env.NIMBUSPOST_DEFAULT_HEIGHT, 10),
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
}

function requireWarehouse(): string {
  const warehouseName = process.env.NIMBUSPOST_WAREHOUSE_NAME;
  if (!warehouseName) {
    throw new Error(
      "Set NIMBUSPOST_WAREHOUSE_NAME to your pickup warehouse name from the NimbusPost dashboard."
    );
  }
  return warehouseName;
}

function readShipmentResult(data: Record<string, unknown>): ShipmentResult {
  const d = ((data.data as Record<string, unknown>) ?? data) as Record<string, unknown>;
  const awb = String(d.awb_number ?? d.awb ?? "");
  if (!awb) throw new Error("NimbusPost did not return an AWB number.");
  return {
    awb,
    courierName: (d.courier_name as string) ?? (d.courier as string) ?? null,
    shipmentId: d.shipment_id != null ? String(d.shipment_id) : null,
    trackingUrl: (d.tracking_url as string) ?? `https://ship.nimbuspost.com/track/${awb}`,
  };
}

/**
 * Create a DRAFT order in NimbusPost (no courier/AWB yet) so admin can review
 * it and dispatch in one click. Returns the NimbusPost order id.
 */
export async function createDraftOrder(input: ShipmentInput): Promise<string> {
  if (!isNimbusPostConfigured()) {
    throw new Error("NimbusPost is not configured (set NIMBUSPOST_EMAIL / NIMBUSPOST_PASSWORD).");
  }
  const payload = buildPayload(input, requireWarehouse());
  const data = await authed("orders/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!data?.status) {
    throw new Error(data?.message || "NimbusPost could not create the draft order.");
  }
  const d = data.data ?? data;
  const orderId = d.order_id ?? d.id ?? d.data?.id;
  if (orderId == null) throw new Error("NimbusPost did not return an order id.");
  return String(orderId);
}

/** Ship an existing NimbusPost draft order → assigns courier + AWB. */
export async function shipDraft(nimbusOrderId: string): Promise<ShipmentResult> {
  const data = await authed("orders/ship", {
    method: "POST",
    body: JSON.stringify({ id: Number(nimbusOrderId) || nimbusOrderId }),
  });
  if (!data?.status) {
    throw new Error(data?.message || "NimbusPost could not generate the AWB.");
  }
  return readShipmentResult(data);
}

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
  const payload = buildPayload(input, requireWarehouse());
  const data = await authed("shipments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!data?.status) {
    throw new Error(data?.message || "NimbusPost could not create the shipment.");
  }
  return readShipmentResult(data);
}

export async function trackShipment(awb: string) {
  return authed(`shipments/track/${encodeURIComponent(awb)}`, { method: "GET" });
}
