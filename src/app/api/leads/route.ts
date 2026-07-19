import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { sendLeadEmail } from "@/lib/email";

export const runtime = "nodejs";

const schema = z.object({
  productId: z.string().optional(),
  productName: z.string().min(1),
  productImage: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  price: z.number().int().nonnegative().optional(),
  visitorId: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const lead = await prisma.lead.create({ data });

    // Notify admin (don't fail the request if email is down / unconfigured).
    try {
      const settings = await getSettings();
      await sendLeadEmail(settings, {
        productName: data.productName,
        quantity: data.quantity,
        price: data.price ?? null,
      });
    } catch (err) {
      console.error("[leads] email failed:", err);
    }

    return NextResponse.json({ ok: true, id: lead.id });
  } catch (err) {
    console.error("[leads] error:", err);
    return NextResponse.json(
      { ok: false, error: "Could not record lead" },
      { status: 400 }
    );
  }
}
