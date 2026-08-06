/**
 * flip-gallery-db.mjs — point every database image reference at the NEW
 * gallery folder structure (Category/Subcategory/Product/(common|Variant)/).
 *
 * ⚠️ RUN THIS ONLY AFTER THE RESTRUCTURED FOLDERS ARE DEPLOYED (git push →
 * Vercel build finishes). Until then the live deployment only serves the OLD
 * paths, and flipping the database early would break live product images.
 * (Old URLs keep working forever either way — src/proxy.ts 308-redirects
 * them — so there is no rush. This flip just makes the stored data match
 * reality so the admin Media Library shows true paths.)
 *
 * Also removes dangling Media/ProductImage rows that point at files deleted
 * from the repo long ago (the jpg→webp migration left them behind).
 *
 * Run:  node --env-file=.env scripts/flip-gallery-db.mjs           (dry run)
 *       node --env-file=.env scripts/flip-gallery-db.mjs --apply   (write)
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const APPLY = process.argv.includes('--apply');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOVES = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'gallery-moves.json'), 'utf8'));

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

const mapUrl = (u) => (typeof u === 'string' && MOVES[u]) || u;
const mapArr = (a) => (Array.isArray(a) ? a.map(mapUrl) : a);

/** Deep-map every string that looks like a gallery URL inside JSON. */
function mapJson(value) {
  if (typeof value === 'string') return mapUrl(value);
  if (Array.isArray(value)) return value.map(mapJson);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = mapJson(v);
    return out;
  }
  return value;
}

const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

async function run() {
  console.log(APPLY ? '*** APPLY ***' : '*** DRY RUN (pass --apply to write) ***');
  let updates = 0;

  // ---- products: every JSON field that can hold image URLs ----
  for (const p of await prisma.product.findMany()) {
    const data = {};
    const images = mapArr(p.images);
    if (changed(images, p.images)) data.images = images;
    for (const field of ['options', 'variants', 'variantPrices', 'rules', 'sellableVariants']) {
      const next = mapJson(p[field]);
      if (changed(next, p[field])) data[field] = next;
    }
    if (Object.keys(data).length) {
      updates++;
      console.log(`product ${p.slug}: ${Object.keys(data).join(', ')}`);
      if (APPLY) await prisma.product.update({ where: { id: p.id }, data });
    }
  }

  // ---- media library rows ----
  for (const m of await prisma.media.findMany()) {
    const url = mapUrl(m.url);
    if (url !== m.url) {
      updates++;
      console.log(`media: ${m.url} -> ${url}`);
      if (APPLY) await prisma.media.update({ where: { id: m.id }, data: { url } });
    }
  }

  // ---- subcategory covers, category covers, site logo ----
  for (const s of await prisma.subcategory.findMany()) {
    const images = mapArr(s.images);
    if (changed(images, s.images)) {
      updates++;
      console.log(`subcategory ${s.name}: images`);
      if (APPLY) await prisma.subcategory.update({ where: { id: s.id }, data: { images } });
    }
  }
  for (const c of await prisma.category.findMany()) {
    const imageUrl = mapUrl(c.imageUrl ?? '');
    if (c.imageUrl && imageUrl !== c.imageUrl) {
      updates++;
      console.log(`category ${c.name}: imageUrl`);
      if (APPLY) await prisma.category.update({ where: { id: c.id }, data: { imageUrl } });
    }
  }
  const settings = await prisma.siteSettings.findFirst();
  if (settings?.logoUrl && mapUrl(settings.logoUrl) !== settings.logoUrl) {
    updates++;
    if (APPLY) await prisma.siteSettings.update({ where: { id: settings.id }, data: { logoUrl: mapUrl(settings.logoUrl) } });
  }

  // ---- lead / order snapshots (historical, but keep them tidy too) ----
  for (const l of await prisma.lead.findMany()) {
    const img = mapUrl(l.productImage ?? '');
    if (l.productImage && img !== l.productImage) {
      updates++;
      if (APPLY) await prisma.lead.update({ where: { id: l.id }, data: { productImage: img } });
    }
  }
  for (const o of await prisma.order.findMany()) {
    const items = mapJson(o.items);
    if (changed(items, o.items)) {
      updates++;
      console.log(`order ${o.orderNumber}: item images`);
      if (APPLY) await prisma.order.update({ where: { id: o.id }, data: { items } });
    }
  }

  // ---- remove dangling repo media (file gone from the repo, nothing real to show) ----
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'media-manifest.json'), 'utf8'));
  const onDisk = new Set(manifest.photos.map((p) => p.url));
  const media = await prisma.media.findMany({ include: { productImages: true, subcategoryImages: true } });
  for (const m of media) {
    const finalUrl = mapUrl(m.url);
    if (!finalUrl.startsWith('/products/gallery/')) continue; // blob/external
    if (onDisk.has(finalUrl)) continue;
    updates++;
    console.log(`DANGLING media (file no longer in repo): ${m.url} — removing row + ${m.productImages.length} gallery links`);
    if (APPLY) {
      await prisma.productImage.deleteMany({ where: { mediaId: m.id } });
      await prisma.subcategoryImage.deleteMany({ where: { mediaId: m.id } });
      await prisma.media.delete({ where: { id: m.id } });
    }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${updates} updates.`);
}

run().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
