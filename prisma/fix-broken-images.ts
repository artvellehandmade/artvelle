/**
 * One-time corrective fix for broken product images found by a read-only
 * audit (2026-08-06):
 *
 *  1. "Designer Ring Platter" and "Rakhi Gift Hamper" store image URLs with a
 *     `.webp` extension, but the real files on disk under
 *     public/products/gallery/... are `.png`. Ring Platter also references a
 *     non-existent `gallery-03` — dropped.
 *  2. "Divine Pooja Thali" has a ProductImage row pointing at a Media row
 *     (`pooja-thali-10.jpg`) whose file never existed on disk — removed so
 *     the gallery no longer tries to render a dead image.
 *
 * Idempotent: safe to re-run (updates are absolute replacements; the delete
 * is a no-op if already removed). Does not touch any other product.
 * Run with: npx tsx prisma/fix-broken-images.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Swap a stored gallery URL from .webp to the real .png file, dropping any
 *  reference to a file that doesn't exist on disk at all. */
function fixUrl(url: string, validPngBasenames: string[]): string | null {
  const m = url.match(/\/([^/]+)\.webp$/i);
  if (!m) return url; // not one of the broken URLs — leave as-is
  const base = m[1];
  if (!validPngBasenames.includes(base)) return null; // file doesn't exist — drop it
  return url.replace(/\.webp$/i, ".png");
}

async function fixProductImages(
  productName: string,
  validPngBasenames: string[]
) {
  const product = await prisma.product.findFirst({ where: { name: productName } });
  if (!product) {
    console.log(`  [skip] product not found: ${productName}`);
    return;
  }

  const images = Array.isArray(product.images) ? (product.images as string[]) : [];
  const fixedImages = images
    .map((u) => fixUrl(u, validPngBasenames))
    .filter((u): u is string => Boolean(u));

  const variants = Array.isArray(product.variants) ? (product.variants as any[]) : [];
  const fixedVariants = variants.map((v) => ({
    ...v,
    images: Array.isArray(v.images)
      ? v.images.map((u: string) => fixUrl(u, validPngBasenames)).filter(Boolean)
      : v.images,
    previewImage: v.previewImage ? fixUrl(v.previewImage, validPngBasenames) : v.previewImage,
  }));

  await prisma.product.update({
    where: { id: product.id },
    data: { images: fixedImages, variants: fixedVariants },
  });

  // Fix (or drop) the matching ProductImage/Media rows too, so the relational
  // gallery — the source of truth the storefront actually reads — agrees.
  const productImages = await prisma.productImage.findMany({
    where: { productId: product.id },
    include: { media: true },
  });
  for (const pi of productImages) {
    const fixed = fixUrl(pi.media.url, validPngBasenames);
    if (fixed === null) {
      await prisma.productImage.delete({ where: { id: pi.id } });
      console.log(`  removed dead ProductImage: ${pi.media.url}`);
      continue;
    }
    if (fixed !== pi.media.url) {
      const target = await prisma.media.upsert({
        where: { url: fixed },
        update: {},
        create: { url: fixed, file: fixed.split("/").pop() || fixed, source: "repo" },
      });
      if (target.id !== pi.mediaId) {
        // Repoint to the correct Media row; skip if that would violate the
        // (productId, mediaId, variantValue) unique constraint.
        const clash = await prisma.productImage.findFirst({
          where: { productId: product.id, mediaId: target.id, variantValue: pi.variantValue },
        });
        if (clash) {
          await prisma.productImage.delete({ where: { id: pi.id } });
        } else {
          await prisma.productImage.update({ where: { id: pi.id }, data: { mediaId: target.id } });
        }
        console.log(`  repointed ProductImage: ${pi.media.url} -> ${fixed}`);
      }
    }
  }

  console.log(`  ✓ ${productName}: ${images.length} -> ${fixedImages.length} product.images`);
}

async function removeOrphanProductImage(productName: string, deadUrlSubstring: string) {
  const product = await prisma.product.findFirst({ where: { name: productName } });
  if (!product) {
    console.log(`  [skip] product not found: ${productName}`);
    return;
  }
  const rows = await prisma.productImage.findMany({
    where: { productId: product.id },
    include: { media: true },
  });
  const dead = rows.filter((r) => r.media.url.includes(deadUrlSubstring));
  for (const r of dead) {
    await prisma.productImage.delete({ where: { id: r.id } });
    console.log(`  removed dead ProductImage on ${productName}: ${r.media.url}`);
  }
  if (dead.length === 0) console.log(`  [ok] no dead reference found on ${productName} (already clean)`);
}

async function main() {
  console.log("Fixing Designer Ring Platter (.webp -> .png, drop missing gallery-03)...");
  await fixProductImages("Designer Ring Platter", ["hero", "gallery-01", "gallery-02", "lifestyle"]);

  console.log("Fixing Rakhi Gift Hamper (.webp -> .png)...");
  await fixProductImages("Rakhi Gift Hamper", ["hero", "gallery-01", "gallery-02", "lifestyle"]);

  console.log("Removing dead pooja-thali-10.jpg reference from Divine Pooja Thali...");
  await removeOrphanProductImage("Divine Pooja Thali", "pooja-thali-10.jpg");

  console.log("\nDone.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
