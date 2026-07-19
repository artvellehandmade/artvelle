import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getAdminSession } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Image storage is not configured. Add a Vercel Blob store and set BLOB_READ_WRITE_TOKEN. You can also paste an image URL instead.",
      },
      { status: 400 }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "image";
    const key = `products/${base}-${Date.now()}.${ext}`;

    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[upload] error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
