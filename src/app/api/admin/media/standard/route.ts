import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // We want to fetch the "Standard" images: Packaging, Dimensions, Included, Lifestyle.
    // The roles might be stored exactly as these lowercase strings.
    const standardRoles = ["packaging", "dimensions", "included", "lifestyle"];
    
    // Fetch one canonical image per standard role.
    const standardMedia = await Promise.all(
      standardRoles.map(async (role) => {
        const media = await prisma.media.findFirst({
          where: { roles: { has: role } },
          orderBy: { createdAt: "desc" },
        });
        return { role, media };
      })
    );

    // Filter out nulls and format the response
    const result: Record<string, string> = {};
    for (const item of standardMedia) {
      if (item.media) {
        result[item.role] = item.media.url;
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[media/standard] get failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
