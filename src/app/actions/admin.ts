"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdminSession, hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/utils";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

function revalidateStore() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

async function ensureUniqueSlug(name: string, ignoreId?: string) {
  const base = slugify(name) || "product";
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(1),
  category: z.string().min(1),
  price: z.coerce.number().int().nonnegative(),
  compareAtPrice: z.coerce.number().int().nonnegative().nullable().optional(),
  stock: z.coerce.number().int().nonnegative(),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type ProductInput = z.input<typeof productSchema>;

export async function createProduct(input: ProductInput) {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;
  const slug = await ensureUniqueSlug(data.name);

  const product = await prisma.product.create({
    data: {
      ...data,
      compareAtPrice: data.compareAtPrice || null,
      slug,
    },
  });
  revalidateStore();
  return { ok: true as const, id: product.id };
}

export async function updateProduct(id: string, input: ProductInput) {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;
  const slug = await ensureUniqueSlug(data.name, id);

  await prisma.product.update({
    where: { id },
    data: {
      ...data,
      compareAtPrice: data.compareAtPrice || null,
      slug,
    },
  });
  revalidateStore();
  revalidatePath(`/product/${slug}`);
  return { ok: true as const };
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  await prisma.product.delete({ where: { id } });
  revalidateStore();
  return { ok: true as const };
}

export async function setProductActive(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: { isActive } });
  revalidateStore();
  return { ok: true as const };
}

// -------- Settings (branding + contact) --------
const settingsSchema = z.object({
  brandName: z.string().min(1),
  tagline: z.string().default(""),
  logoUrl: z.string().nullable().optional(),
  heroHeadline: z.string().default(""),
  heroSubtext: z.string().default(""),
  aboutText: z.string().default(""),
  contactEmail: z.string().email(),
  contactPhone: z.string().default(""),
  whatsapp: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  adminNotifyEmail: z.string().email(),
  currency: z.string().default("INR"),
  shippingFee: z.coerce.number().int().nonnegative().default(0),
  freeShippingThreshold: z.coerce
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional(),
  codEnabled: z.boolean().default(true),
  announcement: z.string().nullable().optional(),
});

export type SettingsInput = z.input<typeof settingsSchema>;

export async function updateSettings(input: SettingsInput) {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: {
      ...data,
      freeShippingThreshold: data.freeShippingThreshold ?? null,
    },
    create: {
      id: "main",
      ...data,
      freeShippingThreshold: data.freeShippingThreshold ?? null,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}

// -------- Orders --------
const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export async function updateOrderStatus(id: string, status: string) {
  await requireAdmin();
  if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
    return { ok: false as const, error: "Invalid status" };
  }
  await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function updatePaymentStatus(id: string, paymentStatus: string) {
  await requireAdmin();
  await prisma.order.update({ where: { id }, data: { paymentStatus } });
  revalidatePath("/admin/orders");
  return { ok: true as const };
}

// -------- Messages --------
export async function setMessageRead(id: string, isRead: boolean) {
  await requireAdmin();
  await prisma.message.update({ where: { id }, data: { isRead } });
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function deleteMessage(id: string) {
  await requireAdmin();
  await prisma.message.delete({ where: { id } });
  revalidatePath("/admin/messages");
  return { ok: true as const };
}

// -------- Leads --------
export async function updateLeadStatus(id: string, status: string) {
  await requireAdmin();
  await prisma.lead.update({ where: { id }, data: { status } });
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function deleteLead(id: string) {
  await requireAdmin();
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/admin/leads");
  return { ok: true as const };
}

// -------- Admin password change --------
export async function changeAdminPassword(newPassword: string) {
  const session = await requireAdmin();
  if (newPassword.length < 6) {
    return { ok: false as const, error: "Password must be at least 6 characters" };
  }
  if (session.id === "env-admin") {
    return {
      ok: false as const,
      error:
        "You are logged in with env credentials. Seed the database to create a DB admin first.",
    };
  }
  await prisma.adminUser.update({
    where: { id: session.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  return { ok: true as const };
}
