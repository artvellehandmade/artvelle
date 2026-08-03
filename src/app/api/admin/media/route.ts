import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getMediaLibrary } from "@/lib/media";

// The photo picker reads this. Admin-only: it exposes the shape of the repo.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const library = await getMediaLibrary();
    return NextResponse.json(library);
  } catch (err) {
    console.error("[api/admin/media] failed:", err);
    return NextResponse.json(
      { error: "Could not read the photo library" },
      { status: 500 }
    );
  }
}
