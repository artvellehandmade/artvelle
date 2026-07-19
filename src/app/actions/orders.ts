"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { sendOrderEmails } from "@/lib/email";
import { orderNumber } from "@/lib/utils";

const inputSchema = z.object({
  customerName: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(6, "Enter a valid phone number"),
  address: z.string().min(4, "Enter your address"),
  city: z.string().min(2, "Enter your city"),
  state: z.string().min(2, "Enter your state"),
  pincode: z.string().min(4, "Enter your pincode"),
  note: z.string().optional(),
  paymentMethod: z.string().default("COD"),
  visitorId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        note: z.string().optional(),
      })
    )
    .min(1, "Your cart is empty"),
});

export type PlaceOrderInput = z.input<typeof inputSchema>;

export async function placeOrder(input: PlaceOrderInput) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  // Load authoritative product data (never trust client prices).
  const ids = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
  });

  const lineItems = data.items.map((i) => {
    const p = products.find((pr) => pr.id === i.productId);
    if (!p) throw new Error("A product in your cart is no longer available.");
    return {
      productId: p.id,
      name: p.name,
      image: p.images[0] ?? "",
      price: p.price,
      quantity: i.quantity,
      note: i.note ?? "",
    };
  });

  const subtotal = lineItems.reduce((n, i) => n + i.price * i.quantity, 0);

  const settings = await getSettings();
  let shipping = settings.shippingFee ?? 0;
  if (
    settings.freeShippingThreshold != null &&
    subtotal >= settings.freeShippingThreshold
  ) {
    shipping = 0;
  }
  const total = subtotal + shipping;

  const number = orderNumber();

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: number,
        customerName: data.customerName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        note: data.note,
        paymentMethod: data.paymentMethod || "COD",
        items: lineItems,
        subtotal,
        shipping,
        total,
      },
    });

    // Reduce stock.
    for (const i of lineItems) {
      await tx.product.update({
        where: { id: i.productId },
        data: { stock: { decrement: i.quantity } },
      });
    }

    return created;
  });

  // Mark this visitor's leads as converted.
  if (data.visitorId) {
    await prisma.lead
      .updateMany({
        where: { visitorId: data.visitorId, status: { not: "converted" } },
        data: { status: "converted" },
      })
      .catch(() => {});
  }

  // Emails: admin (new order) + customer (confirmation).
  try {
    await sendOrderEmails(settings, {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      email: order.email,
      phone: order.phone,
      address: order.address,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
      items: lineItems,
      subtotal,
      shipping,
      total,
      paymentMethod: order.paymentMethod,
      note: order.note,
    });
  } catch (err) {
    console.error("[orders] email failed:", err);
  }

  return { ok: true as const, orderNumber: order.orderNumber };
}
