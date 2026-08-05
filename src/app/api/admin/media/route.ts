import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch all media from the new relational table
    const media = await prisma.media.findMany({
      orderBy: { file: "asc" }
    });

    const photos = media.map(m => {
      // Reconstruct category and group from the file path if it was a repo file
      // Otherwise put uploaded blobs in "Uploaded"
      let category = "Uploaded";
      let group = "";
      if (m.source === "repo") {
        const parts = m.url.replace("/products/gallery/", "").split("/");
        if (parts.length >= 2) category = parts[0];
        if (parts.length >= 3) group = parts.slice(1, -1).join(" / ");
      } else if (m.source === "external") {
        category = "Pasted links";
      }

      return {
        url: m.url,
        file: m.file,
        category,
        group,
        source: m.source as "repo" | "blob" | "external",
      };
    });

    // 2. Map usage
    const usage: Record<string, { kind: string, id: string, name: string }[]> = {};
    
    const productImages = await prisma.productImage.findMany({
      include: { product: { select: { id: true, name: true } }, media: { select: { url: true } } }
    });

    for (const pi of productImages) {
      const url = pi.media.url;
      if (!usage[url]) usage[url] = [];
      usage[url].push({ kind: "product", id: pi.product.id, name: pi.product.name });
    }

    const subImages = await prisma.subcategoryImage.findMany({
      include: { subcategory: { select: { id: true, name: true } }, media: { select: { url: true } } }
    });

    for (const si of subImages) {
      const url = si.media.url;
      if (!usage[url]) usage[url] = [];
      usage[url].push({ kind: "subcategory", id: si.subcategory.id, name: si.subcategory.name });
    }

    return NextResponse.json({ photos, usage });
  } catch (err) {
    console.error("[api/admin/media] failed:", err);
    return NextResponse.json(
      { error: "Could not read the photo library" },
      { status: 500 }
    );
  }
}
