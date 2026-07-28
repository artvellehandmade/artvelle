import { prisma } from "./prisma";
import { getSettings } from "./settings";
import {
  isNimbusPostConfigured,
  createDraftOrder,
  createShipment,
  shipDraft,
  type ShipmentInput,
} from "./nimbuspost";

/**
 * Order fulfilment glue between the order/admin actions and the NimbusPost
 * client. Kept out of the "use server" action files so it can export plain
 * (non-action) helpers used by both.
 */

type OrderItem = {
  productId?: string;
  name: string;
  quantity: number;
  price: number;
};

/** Build the parcel + consignee payload for an order, incl. per-product size. */
async function buildShipmentInput(orderId: string): Promise<ShipmentInput | null> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;

  const items = (Array.isArray(order.items) ? order.items : []) as unknown as OrderItem[];

  // Sum per-unit weights and take the largest dimensions across the products
  // that specify them; anything unset falls back to the env defaults.
  const ids = items.map((i) => i.productId).filter(Boolean) as string[];
  const products = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, weightGrams: true, lengthCm: true, breadthCm: true, heightCm: true },
      })
    : [];
  const byId = new Map(products.map((p) => [p.id, p]));

  let weight = 0;
  let length = 0;
  let breadth = 0;
  let height = 0;
  for (const it of items) {
    const p = it.productId ? byId.get(it.productId) : undefined;
    if (p?.weightGrams) weight += p.weightGrams * it.quantity;
    if (p?.lengthCm) length = Math.max(length, p.lengthCm);
    if (p?.breadthCm) breadth = Math.max(breadth, p.breadthCm);
    if (p?.heightCm) height = Math.max(height, p.heightCm);
  }

  // Remaining COD to collect (balanceDue); zero → prepaid shipment.
  const cod = order.balanceDue > 0;

  return {
    orderNumber: order.orderNumber,
    paymentType: cod ? "cod" : "prepaid",
    orderAmount: cod ? order.balanceDue : order.total,
    consignee: {
      name: order.customerName,
      address: order.address,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
      phone: order.phone,
    },
    items: items.map((i) => ({ name: i.name, qty: i.quantity, price: i.price })),
    parcel: {
      weight: weight || undefined,
      length: length || undefined,
      breadth: breadth || undefined,
      height: height || undefined,
    },
  };
}

/**
 * Stage a NimbusPost DRAFT order for an order (called when an order is
 * confirmed). Best-effort: silently skips when shipping is off/unconfigured or
 * a draft/AWB already exists. Never throws to the caller's happy path.
 */
export async function createDraftForOrder(
  orderId: string
): Promise<{ ok: boolean; skipped?: string; nimbusOrderId?: string; error?: string }> {
  const settings = await getSettings();
  if (!settings.nimbusEnabled) return { ok: false, skipped: "shipping disabled" };
  if (!isNimbusPostConfigured()) return { ok: false, skipped: "not configured" };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Order not found" };
  if (order.nimbusShipmentId || order.trackingNumber) {
    return { ok: true, skipped: "already staged", nimbusOrderId: order.nimbusShipmentId ?? undefined };
  }

  const input = await buildShipmentInput(orderId);
  if (!input) return { ok: false, error: "Order not found" };

  try {
    const nimbusOrderId = await createDraftOrder(input);
    const history = Array.isArray(order.statusHistory)
      ? (order.statusHistory as unknown as { status: string; note?: string; at: string }[])
      : [];
    history.push({
      status: order.status,
      note: "Draft shipment created in NimbusPost — ready to dispatch",
      at: new Date().toISOString(),
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { nimbusShipmentId: nimbusOrderId, statusHistory: history as unknown as object[] },
    });
    return { ok: true, nimbusOrderId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * One-click dispatch: generate the AWB. Uses the existing NimbusPost draft when
 * present (orders/ship), otherwise creates the shipment outright (shipments).
 * Updates the order with courier/AWB/tracking and marks it shipped.
 */
export async function dispatchOrder(
  orderId: string
): Promise<{ ok: boolean; awb?: string; courier?: string | null; error?: string }> {
  const settings = await getSettings();
  if (!settings.nimbusEnabled) {
    return { ok: false, error: "NimbusPost shipping is turned off. Enable it in Admin → Settings." };
  }
  if (!isNimbusPostConfigured()) {
    return {
      ok: false,
      error:
        "NimbusPost isn't set up. Add NIMBUSPOST_EMAIL, NIMBUSPOST_PASSWORD and NIMBUSPOST_WAREHOUSE_NAME.",
    };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Order not found" };
  if (order.trackingNumber) {
    return { ok: false, error: `This order already has an AWB (${order.trackingNumber}).` };
  }

  try {
    let result;
    if (order.nimbusShipmentId) {
      // Draft already staged → just generate the AWB.
      result = await shipDraft(order.nimbusShipmentId);
    } else {
      const input = await buildShipmentInput(orderId);
      if (!input) return { ok: false, error: "Order not found" };
      result = await createShipment(input);
    }

    const history = Array.isArray(order.statusHistory)
      ? (order.statusHistory as unknown as { status: string; note?: string; at: string }[])
      : [];
    history.push({
      status: "shipped",
      note: `Dispatched via NimbusPost${result.courierName ? ` (${result.courierName})` : ""} — AWB ${result.awb}`,
      at: new Date().toISOString(),
    });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "shipped",
        courier: result.courierName,
        trackingNumber: result.awb,
        trackingUrl: result.trackingUrl,
        nimbusShipmentId: result.shipmentId ?? order.nimbusShipmentId,
        statusHistory: history as unknown as object[],
      },
    });

    return { ok: true, awb: result.awb, courier: result.courierName };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
