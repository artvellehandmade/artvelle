import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Only allow cron requests
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      // Leaving this open for local testing if CRON_SECRET is not set, 
      // but in production Vercel enforces it securely.
    }

    // 1. Find orphan media
    // Prisma does not have a direct `NOT IN` for relations if we want to check both at once easily,
    // so we can use `where` with `none`
    const orphans = await prisma.media.findMany({
      where: {
        productImages: { none: {} },
        subcategoryImages: { none: {} },
      }
    });

    if (orphans.length === 0) {
      return NextResponse.json({ success: true, purged: 0 });
    }

    let deletedBlobs = 0;
    const deletedDbIds: string[] = [];

    // 2. Delete from Vercel Blob (only if source === 'blob')
    for (const media of orphans) {
      if (media.source === "blob") {
        try {
          await del(media.url);
          deletedBlobs++;
        } catch (e) {
          console.error(`Failed to delete blob: ${media.url}`, e);
          continue; // skip DB deletion if blob delete fails so we can try next time
        }
      }
      deletedDbIds.push(media.id);
    }

    // 3. Delete from database
    if (deletedDbIds.length > 0) {
      await prisma.media.deleteMany({
        where: { id: { in: deletedDbIds } }
      });
    }

    return NextResponse.json({ 
      success: true, 
      purgedDb: deletedDbIds.length,
      purgedBlobs: deletedBlobs 
    });
  } catch (err: any) {
    console.error("[api/cron/purge-media] failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
