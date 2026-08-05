import { PrismaClient } from "@prisma/client";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const p = new PrismaClient();
const rows = await p.product.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
console.log("=== ALL PRODUCTS (", rows.length, ") ===");
for (const r of rows) {
  console.log(`  [${r.category}]${r.subcategoryId ? "*" : ""} ${r.name} (${r.slug}) - ₹${r.price} - imgs:${r.images.length}, variants:${r.variants.length}`);
}
const cats = await p.category.findMany({ include: { subcategories: true } });
console.log("\n=== CATEGORIES ===");
for (const c of cats) console.log(" ", c.name, "->", c.subcategories.map(s => s.name).join(", ") || "(no groups)");

console.log("\n=== IMAGE FOLDERS ===");
const gallery = "public/products/gallery";
try {
  for (const cat of readdirSync(gallery)) {
    const catPath = join(gallery, cat);
    if (!statSync(catPath).isDirectory()) continue;
    console.log(` ${cat}/`);
    try {
      for (const grp of readdirSync(catPath)) {
        const grpPath = join(catPath, grp);
        if (statSync(grpPath).isDirectory()) {
          const files = readdirSync(grpPath).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
          console.log(`   ${grp}/ (${files.length} images):`, files.join(", "));
        } else if (/\.(jpe?g|png|webp)$/i.test(grp)) {
          console.log(`   ${grp}`);
        }
      }
    } catch {}
  }
} catch {}
await p.$disconnect();
