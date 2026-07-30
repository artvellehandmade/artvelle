import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { allCombinations, comboKey } from "@/lib/options";
import type { ProductOption, Variant, VariantPrice } from "@/lib/types";

const PAYMENT_MODE_LABELS: Record<string, string> = {
  prepaid: "Prepaid — Pay Online (full amount)",
  cod: "Cash on Delivery",
  partial: "Advance Payment (advance online + COD)",
  direct: "Customised Order (pay to owner, non-refundable)",
};

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "ID",
    "Name",
    "Description",
    "Tags (comma separated)",
    "Options & variants (ex..size,type , color )",
    "Variants (price · availability · photos)",
    "Compare-at price (₹)",
    "Price (₹)",
    "Secondary category (optional)",
    "Category",
    "featured in homepage ?",
    "checkout modes",
    "Weight (grams)",
    "Length (cm)",
    "Breadth (cm)",
    "Height (cm)",
  ];

  const rows: string[][] = [headers];

  for (const p of products) {
    const optionsRaw = (p.options as unknown as ProductOption[]) || [];
    const variantsRaw = (p.variants as unknown as Variant[]) || [];
    const variantPricesRaw = (p.variantPrices as unknown as VariantPrice[]) || [];

    const tagsStr = (p.tags || []).join(", ");

    let optionsStr = "None";
    if (optionsRaw.length > 0) {
      optionsStr = optionsRaw
        .map((opt) => `${opt.name}: ${opt.choices.map((c) => c.label).join(", ")}`)
        .join(" | ");
    }

    let variantsDetailsStr = "";
    const generatedCombos = allCombinations(optionsRaw);

    if (generatedCombos.length > 0) {
      const details: string[] = [];

      for (const combo of generatedCombos) {
        const comboName = Object.entries(combo)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");

        if (variantsRaw.length > 0) {
          const match = variantsRaw.find((v) => comboKey(v.combo) === comboKey(combo));

          if (match) {
            const availText = match.available ? "Available" : "Out of Stock";
            const imgCount = match.images?.length || 0;
            const imgText = imgCount > 0 ? `${imgCount} photo(s)` : "No photo";
            details.push(
              `[${comboName}] -> Price: ₹${match.price} | ${availText} | ${imgText} (EXISTING)`
            );
          } else {
            details.push(`[${comboName}] -> DOES NOT EXIST (Disabled Combination)`);
          }
        } else {
          const vpMatch = variantPricesRaw.find(
            (vp) => comboKey(vp.combo) === comboKey(combo)
          );
          let price = vpMatch ? vpMatch.price : p.price;
          if (!vpMatch) {
            for (const [gName, choiceVal] of Object.entries(combo)) {
              const grp = optionsRaw.find((o) => o.name === gName);
              const ch = grp?.choices.find((c) => c.label === choiceVal);
              if (ch) price += ch.priceDelta || 0;
            }
          }
          details.push(
            `[${comboName}] -> Price: ₹${price} | Available | ${p.images.length} main photo(s) (EXISTING)`
          );
        }
      }
      variantsDetailsStr = details.join("\n");
    } else {
      variantsDetailsStr = `No options variant matrix (Base Product Only) | Price: ₹${p.price} | Stock: ${p.stock} | Photos: ${p.images.length}`;
    }

    const modes = (p.paymentModes || []).map(
      (m) => PAYMENT_MODE_LABELS[m] || m
    );
    const checkoutModesStr = modes.join("; ");

    rows.push([
      p.id,
      p.name,
      p.description,
      tagsStr,
      optionsStr,
      variantsDetailsStr,
      p.compareAtPrice !== null && p.compareAtPrice !== undefined ? String(p.compareAtPrice) : "",
      String(p.price),
      p.secondaryCategory || "",
      p.category,
      p.isFeatured ? "Yes" : "No",
      checkoutModesStr,
      p.weightGrams !== null && p.weightGrams !== undefined ? String(p.weightGrams) : "",
      p.lengthCm !== null && p.lengthCm !== undefined ? String(p.lengthCm) : "",
      p.breadthCm !== null && p.breadthCm !== undefined ? String(p.breadthCm) : "",
      p.heightCm !== null && p.heightCm !== undefined ? String(p.heightCm) : "",
    ]);
  }

  const csvContent = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products_export_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
