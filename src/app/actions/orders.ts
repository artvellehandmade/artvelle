"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { sendOrderEmails } from "@/lib/email";
import { getUserSession } from "@/lib/user-auth";
import { priceWithOptions } from "@/lib/options";
import {
  normalizeVariants,
  resolveVariant,
  toSelection,
} from "@/lib/variants";
import { orderNumber } from "@/lib/utils";
import type { ProductOption, VariantPrice, Variant } from "@/lib/types";

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
        options: z
          .array(z.object({ name: z.string(), value: z.string() }))
          .optional(),
      })
    )
    .min(1, "Your cart is empty"),
});

export type PlaceOrderInput = z.input<typeof inputSchema>;

export async function placeOrder(input: PlaceOrderInput) {
  // Login is required to confirm an order (browsing/cart stays open to guests).
  const user = await getUserSession();
  if (!user) {
    return {
      ok: false as const,
      error: "Please log in to confirm your order.",
      requiresLogin: true as const,
    };
  }

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
    // Recompute the unit price from the product's real option prices.
    const productOptions = Array.isArray(p.options)
      ? (p.options as unknown as ProductOption[])
      : [];
    const variantPrices = Array.isArray(p.variantPrices)
      ? (p.variantPrices as unknown as VariantPrice[])
      : [];
    const variants = Array.isArray(p.variants)
      ? (p.variants as unknown as Variant[])
      : [];

    // Validate the client's option choices against the product's real deltas.
    const { unitPrice: additivePrice, clean } = priceWithOptions(
      p.price,
      productOptions,
      i.options,
      variantPrices
    );

    // Prefer the Flipkart-style variant matrix when the product uses one.
    const source = { price: p.price, options: productOptions, variants, variantPrices, images: p.images };
    const normalized = normalizeVariants(source);
    const matched =
      normalized.length && clean.length
        ? resolveVariant(normalized, toSelection(clean))
        : null;
    const unitPrice = matched ? matched.price : additivePrice;
    const image = matched?.images[0] ?? p.images[0] ?? "";

    return {
      productId: p.id,
      name: p.name,
      image,
      price: unitPrice,
      quantity: i.quantity,
      options: clean,
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
        userId: user.id,
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
        statusHistory: [
          { status: "pending", note: "Order placed", at: new Date().toISOString() },
        ],
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

  // Mark this visitor's leads as ordered.
  if (data.visitorId) {
    await prisma.lead
      .updateMany({
        where: { visitorId: data.visitorId, status: { notIn: ["ordered", "lost"] } },
        data: { status: "ordered" },
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
