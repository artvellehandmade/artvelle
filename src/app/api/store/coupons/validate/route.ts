import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { code, items } = await req.json();

    if (!code) {
      return NextResponse.json({ success: false, error: "Coupon code is required" }, { status: 400 });
    }

    if (!items || !items.length) {
      return NextResponse.json({ success: false, error: "Cart is empty" }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return NextResponse.json({ success: false, error: "Invalid coupon code" }, { status: 404 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ success: false, error: "This coupon is no longer active" }, { status: 400 });
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ success: false, error: "This coupon has reached its usage limit" }, { status: 400 });
    }

    // Check if the cart has any items that match the coupon's productIds
    const applicableItems = items.filter((item: any) => 
      coupon.productIds.includes(item.productId)
    );

    if (applicableItems.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "This coupon is not valid for any items in your cart" 
      }, { status: 400 });
    }

    // Calculate discount
    let discountAmount = 0;

    if (coupon.isPercentage) {
      // Calculate percentage discount only on applicable items
      const applicableSubtotal = applicableItems.reduce(
        (sum: number, item: any) => sum + (item.price * item.quantity), 
        0
      );
      discountAmount = Math.floor((applicableSubtotal * coupon.discountAmount) / 100);
    } else {
      // Flat discount - assume it's capped at the applicable items subtotal
      const applicableSubtotal = applicableItems.reduce(
        (sum: number, item: any) => sum + (item.price * item.quantity), 
        0
      );
      discountAmount = Math.min(coupon.discountAmount, applicableSubtotal);
    }

    return NextResponse.json({
      success: true,
      discountAmount,
      code: coupon.code,
    });

  } catch (error) {
    console.error("Error validating coupon:", error);
    return NextResponse.json({ success: false, error: "Failed to validate coupon" }, { status: 500 });
  }
}
