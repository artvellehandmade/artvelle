/**
 * NimbusPost (delivery) helper — server only.
 *
 * Supports both:
 * 1. NimbusPost v2 API (https://api-v2.nimbuspost.com) via NIMBUSPOST_TOKEN
 * 2. NimbusPost v1 API (https://api.nimbuspost.com/v1) via EMAIL + PASSWORD
 */

const BASE_V1 = "https://api.nimbuspost.com/v1";
const BASE_V2 = "https://api-v2.nimbuspost.com";

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
  if (process.env.NIMBUSPOST_TOKEN?.trim()) {
    return process.env.NIMBUSPOST_TOKEN.trim();
  }
  if (cachedToken && Date.now() - cachedToken.at < TOKEN_TTL_MS) {
    return cachedToken.token;
  }
  const email = process.env.NIMBUSPOST_EMAIL?.trim();
  const password = process.env.NIMBUSPOST_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error(
      "NimbusPost credentials missing in .env. Please set NIMBUSPOST_TOKEN or NIMBUSPOST_EMAIL & NIMBUSPOST_PASSWORD."
    );
  }

  const res = await fetch(`${BASE_V1}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!data?.status || !data?.data) {
    throw new Error(
      `NimbusPost login failed (${data?.message?.trim() || "Invalid email/password"}).`
    );
  }
  cachedToken = { token: String(data.data), at: Date.now() };
  return cachedToken.token;
}

async function authed(path: string, init?: RequestInit) {
  const token = await login();
  const authHeader = token.toLowerCase().startsWith("bearer ")
    ? token
    : `Bearer ${token}`;
  
  // Use v2 API endpoint if token is a v2 JWT token or when calling v2 orders endpoint
  const url = path.startsWith("http")
    ? path
    : path.startsWith("orders/api/v1")
    ? `${BASE_V2}/${path}`
    : `${BASE_V1}/${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
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
  parcel?: { weight?: number; length?: number; breadth?: number; height?: number };
};

/** Build NimbusPost v2 order payload. */
function buildV2Payload(input: ShipmentInput) {
  const p = input.parcel ?? {};
  const pincodeNum = Number(input.consignee.pincode.replace(/\D/g, "")) || 380001;
  const rawPhone = input.consignee.phone.replace(/\D/g, "");
  const phone = rawPhone.length >= 10 ? rawPhone.slice(-10) : "9999999999";

  const weightKg = (p.weight && p.weight > 0 ? p.weight : num(process.env.NIMBUSPOST_DEFAULT_WEIGHT, 500)) / 1000;

  return {
    order_number: input.orderNumber,
    order_type: "b2c",
    payment_mode: input.paymentType === "cod" ? "cod" : "prepaid",
    items: input.items.map((i) => ({
      name: i.name,
      qty: Number(i.qty) || 1,
      price: Number(i.price) || 0,
    })),
    package: {
      weight: weightKg,
      length: p.length && p.length > 0 ? p.length : num(process.env.NIMBUSPOST_DEFAULT_LENGTH, 15),
      width: p.breadth && p.breadth > 0 ? p.breadth : num(process.env.NIMBUSPOST_DEFAULT_BREADTH, 15),
      height: p.height && p.height > 0 ? p.height : num(process.env.NIMBUSPOST_DEFAULT_HEIGHT, 10),
    },
    shipping_address: {
      name: input.consignee.name,
      address: input.consignee.address,
      city: input.consignee.city,
      state: input.consignee.state,
      pincode: pincodeNum,
      phone: phone,
    },
  };
}

/** Build NimbusPost v1 order payload. */
function buildV1Payload(input: ShipmentInput, warehouseName: string) {
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

export type ShipmentResult = {
  awb: string;
  courierName: string | null;
  shipmentId: string | null;
  trackingUrl: string | null;
};

function readShipmentResult(data: Record<string, unknown>): ShipmentResult {
  const d = ((data.data as Record<string, unknown>) ?? data) as Record<string, unknown>;
  const awb = String(d.awb_number ?? d.awb ?? "");
  return {
    awb,
    courierName: (d.courier_name as string) ?? (d.courier as string) ?? null,
    shipmentId: d.order_id != null ? String(d.order_id) : (d.shipment_id != null ? String(d.shipment_id) : null),
    trackingUrl: (d.tracking_url as string) ?? (awb ? `https://ship.nimbuspost.com/track/${awb}` : null),
  };
}

/**
 * Create a DRAFT order in NimbusPost. Supports both v2 and v1 APIs.
 */
export async function createDraftOrder(input: ShipmentInput): Promise<string> {
  if (!isNimbusPostConfigured()) {
    throw new Error("NimbusPost is not configured (set NIMBUSPOST_TOKEN or NIMBUSPOST_EMAIL).");
  }

  // Try v2 API if NIMBUSPOST_TOKEN is present
  if (process.env.NIMBUSPOST_TOKEN?.trim()) {
    const v2Payload = buildV2Payload(input);
    const data = await authed("orders/api/v1/orders", {
      method: "POST",
      body: JSON.stringify(v2Payload),
    });
    if (data?.success && data?.data?.order_id) {
      return String(data.data.order_id);
    }
    if (data?.error?.detail) {
      throw new Error(`NimbusPost v2: ${data.error.detail}`);
    }
  }

  // Fallback to v1 API
  const payload = buildV1Payload(input, requireWarehouse());
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

/** Create a forward shipment. */
export async function createShipment(
  input: ShipmentInput
): Promise<ShipmentResult> {
  if (!isNimbusPostConfigured()) {
    throw new Error("NimbusPost is not configured.");
  }

  // Try v2 API if NIMBUSPOST_TOKEN is present
  if (process.env.NIMBUSPOST_TOKEN?.trim()) {
    const v2Payload = buildV2Payload(input);
    const data = await authed("orders/api/v1/orders", {
      method: "POST",
      body: JSON.stringify(v2Payload),
    });
    if (data?.success && data?.data) {
      return readShipmentResult(data);
    }
    if (data?.error?.detail) {
      throw new Error(`NimbusPost v2: ${data.error.detail}`);
    }
  }

  // Fallback to v1 API
  const payload = buildV1Payload(input, requireWarehouse());
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

export type RateInput = {
  destinationPincode: string;
  weightGrams: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  paymentType: "prepaid" | "cod";
};

export async function calculateShippingRate(input: RateInput): Promise<number | null> {
  if (!isNimbusPostConfigured()) return null;

  try {
    // The origin location should be the pickup address ID (e.g. WH-001).
    const originLocation = process.env.NIMBUSPOST_WAREHOUSE_NAME || "WH-001";
    const weightKg = Math.max((input.weightGrams || 0) / 1000, 0.1);
    const length = Math.max(input.lengthCm || 0, 1);
    const breadth = Math.max(input.breadthCm || 0, 1);
    const height = Math.max(input.heightCm || 0, 1);

    let data;
    if (process.env.NIMBUSPOST_TOKEN?.trim()) {
      data = await authed("orders/api/v1/courier/serviceability", {
        method: "POST",
        body: JSON.stringify({
          origin: originLocation,
          destination: input.destinationPincode,
          payment_type: input.paymentType,
          weight: weightKg,
          length,
          breadth,
          height,
        }),
      });
    } else {
      data = await authed("courier/serviceability", {
        method: "POST",
        body: JSON.stringify({
          origin: originLocation,
          destination: input.destinationPincode,
          payment_type: input.paymentType,
          weight: weightKg,
          length,
          breadth,
          height,
        }),
      });
    }

    if (!data?.status || !data?.data?.length) {
      return null;
    }

    // Find the cheapest courier
    const couriers = data.data;
    let minRate = Infinity;
    for (const courier of couriers) {
      const rate = Number(courier.total_charges || courier.freight_charge);
      if (rate && rate < minRate) {
        minRate = rate;
      }
    }

    return minRate === Infinity ? null : minRate;
  } catch (error) {
    console.error("NimbusPost rate calculation error:", error);
    return null;
  }
}
