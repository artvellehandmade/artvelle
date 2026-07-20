import { NextResponse } from "next/server";
import { searchCatalogue } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const products = await searchCatalogue(q, 6);
  const results = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    price: p.price,
    image: p.images[0] ?? "",
  }));
  return NextResponse.json({ results });
}
