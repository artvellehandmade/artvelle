import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  alt:              z.string().nullable().optional(),
  variantAttribute: z.string().nullable().optional(),
  variantValue:     z.string().nullable().optional(),
  subcategoryName:  z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const updated = await prisma.media.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ ok: true, media: updated });
  } catch (err) {
    console.error("[api/admin/media/[id]] PATCH failed:", err);
    return NextResponse.json({ error: "Could not update media" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.media.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/media/[id]] DELETE failed:", err);
    return NextResponse.json({ error: "Could not delete media" }, { status: 500 });
  }
}
