"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const couponSchema = z.object({
  code: z.string().min(1, "Code is required"),
  discountAmount: z.coerce.number().min(0, "Discount amount must be a positive number"),
  isPercentage: z.boolean().default(false),
  isActive: z.boolean().default(true),
  productIds: z.array(z.string()).default([]),
  usageLimit: z.coerce.number().optional().nullable(),
})

export async function createCoupon(formData: FormData) {
  try {
    const rawData = {
      code: formData.get("code") as string,
      discountAmount: formData.get("discountAmount"),
      isPercentage: formData.get("isPercentage") === "true",
      isActive: formData.get("isActive") === "true",
      productIds: formData.getAll("productIds") as string[],
      usageLimit: formData.get("usageLimit") || null,
    }

    const validatedData = couponSchema.parse(rawData)

    await prisma.coupon.create({
      data: {
        code: validatedData.code.toUpperCase(),
        discountAmount: validatedData.discountAmount,
        isPercentage: validatedData.isPercentage,
        isActive: validatedData.isActive,
        productIds: validatedData.productIds,
        usageLimit: validatedData.usageLimit,
      },
    })

    revalidatePath("/admin/coupons")
    return { success: true }
  } catch (error: any) {
    console.error("Error creating coupon:", error)
    return { success: false, error: error.message || "Failed to create coupon" }
  }
}

export async function updateCoupon(id: string, formData: FormData) {
  try {
    const rawData = {
      code: formData.get("code") as string,
      discountAmount: formData.get("discountAmount"),
      isPercentage: formData.get("isPercentage") === "true",
      isActive: formData.get("isActive") === "true",
      productIds: formData.getAll("productIds") as string[],
      usageLimit: formData.get("usageLimit") || null,
    }

    const validatedData = couponSchema.parse(rawData)

    await prisma.coupon.update({
      where: { id },
      data: {
        code: validatedData.code.toUpperCase(),
        discountAmount: validatedData.discountAmount,
        isPercentage: validatedData.isPercentage,
        isActive: validatedData.isActive,
        productIds: validatedData.productIds,
        usageLimit: validatedData.usageLimit,
      },
    })

    revalidatePath("/admin/coupons")
    return { success: true }
  } catch (error: any) {
    console.error("Error updating coupon:", error)
    return { success: false, error: error.message || "Failed to update coupon" }
  }
}

export async function deleteCoupon(id: string) {
  try {
    await prisma.coupon.delete({
      where: { id },
    })

    revalidatePath("/admin/coupons")
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting coupon:", error)
    return { success: false, error: error.message || "Failed to delete coupon" }
  }
}
