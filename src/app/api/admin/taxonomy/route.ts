import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/taxonomy
 *
 * Feeds the Media Library's classification dropdowns so tagging stays
 * consistent with live store data. Returns:
 *   - categories: store categories (ordered) each with their subcategories
 *   - variantAttributes: attrName → sorted unique values, auto-collected from
 *     ALL products by merging their `attributes` and `options` JSON.
 *
 * Admin-guarded with the same session check as the other admin/media routes.
 */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // --- Categories + their subcategories (store-defined, ordered) ---
    const categoryRows = await prisma.category.findMany({
      include: { subcategories: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });

    const categories = categoryRows.map((c) => ({
      name: c.name,
      slug: c.slug,
      subcategories: c.subcategories.map((s) => ({ name: s.name, slug: s.slug })),
    }));

    // --- Variant attributes, merged from every product ---
    // `attributes` shape: [{ name, values: [] }]
    // `options`    shape: [{ name, choices: [{ label }] }]
    // Both are free-form JSON, so every access is defensive.
    const products = await prisma.product.findMany({
      select: { attributes: true, options: true },
    });

    const collected: Record<string, Set<string>> = {};
    const add = (name: unknown, value: unknown) => {
      const n = String(name ?? "").trim();
      const v = String(value ?? "").trim();
      if (!n || !v) return;
      (collected[n] ??= new Set<string>()).add(v);
    };

    for (const p of products) {
      // attributes → { name, values: [] }
      const attrs = Array.isArray(p.attributes) ? (p.attributes as any[]) : [];
      for (const a of attrs) {
        const values = Array.isArray(a?.values) ? (a.values as any[]) : [];
        for (const v of values) add(a?.name, v);
      }
      // options → { name, choices: [{ label }] }
      const opts = Array.isArray(p.options) ? (p.options as any[]) : [];
      for (const o of opts) {
        const choices = Array.isArray(o?.choices) ? (o.choices as any[]) : [];
        for (const c of choices) add(o?.name, c?.label);
      }
    }

    const variantAttributes: Record<string, string[]> = {};
    for (const [name, set] of Object.entries(collected)) {
      variantAttributes[name] = Array.from(set).sort((x, y) => x.localeCompare(y));
    }

    return NextResponse.json({ categories, variantAttributes });
  } catch (err) {
    console.error("[api/admin/taxonomy] failed:", err);
    return NextResponse.json({ error: "Could not load taxonomy" }, { status: 500 });
  }
}
