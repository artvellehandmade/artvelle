// Verifies the new courier-options + sync plumbing against the live API.
// Read-only: quotes rates and reads order state. Never books anything.
import { readFileSync } from "node:fs";
for (const f of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
}
import { PrismaClient } from "@prisma/client";
import { listCourierOptions, getOrderState } from "../src/lib/nimbuspost";
import { getCourierOptionsForOrder } from "../src/lib/fulfilment";

const p = new PrismaClient();

async function main() {
  console.log("— listCourierOptions (raw) —");
  const opts = await listCourierOptions({
    destinationPincode: "110001",
    weightGrams: 500,
    lengthCm: 20,
    breadthCm: 20,
    heightCm: 5,
    paymentType: "prepaid",
    orderValueRupees: 599,
  });
  console.log(`  ${opts.length} couriers, cheapest first:`);
  for (const c of opts.slice(0, 5)) {
    console.log(
      `   ₹${String(c.total).padStart(4)} ${c.name.padEnd(28)} ${c.type ?? "?"} · ${c.tatDays ?? "?"}d · fwd ₹${c.forward} rto ₹${c.rto} cod ₹${c.cod}`
    );
  }
  const sorted = opts.every((c, i) => i === 0 || opts[i - 1].total <= c.total);
  console.log("  sorted cheapest-first:", sorted);
  console.log("  all have a courierId:", opts.every((c) => !!c.courierId));

  console.log("\n— getCourierOptionsForOrder (a real order) —");
  const order = await p.order.findFirst({
    where: { pincode: { not: "" } },
    orderBy: { createdAt: "desc" },
  });
  if (!order) return console.log("  no orders in the DB");
  console.log(`  order ${order.orderNumber} → ${order.city} ${order.pincode}, balanceDue ₹${order.balanceDue}`);
  const res = await getCourierOptionsForOrder(order.id);
  if (!res.ok) console.log("  ERROR:", res.error);
  else {
    console.log(`  ${res.options.length} couriers · paymentType=${res.paymentType} · pincode=${res.pincode}`);
    console.log(`  cheapest: ${res.options[0].name} ₹${res.options[0].total} (${res.options[0].tatDays}d)`);
  }

  console.log("\n— draft state (the 'New' order in NimbusPost) —");
  const staged = await p.order.findFirst({ where: { nimbusShipmentId: { not: null } } });
  if (staged?.nimbusShipmentId) {
    const st = await getOrderState(staged.nimbusShipmentId);
    console.log(`  ${staged.orderNumber}: nimbus status="${st.orderStatus}" booked=${st.booked} awb=${st.awb ?? "(none)"}`);
  } else {
    console.log("  no order has a staged draft yet");
  }
}
main().catch((e) => console.error("FAILED:", e.message)).finally(() => p.$disconnect());
