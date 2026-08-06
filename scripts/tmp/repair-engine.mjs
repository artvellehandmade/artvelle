/**
 * repair-engine.mjs — persist price-engine data for products whose
 * attributes/sellableVariants were never derived from their legacy
 * options/variants matrix, and clear secondaryCategory when it just
 * repeats the primary category.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

function comboKey(combo) {
  return Object.keys(combo)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}=${combo[k]}`)
    .join('|');
}

async function run() {
  const products = await prisma.product.findMany();

  for (const p of products) {
    const options = Array.isArray(p.options) ? p.options : [];
    const variants = Array.isArray(p.variants) ? p.variants : [];
    const attributes = Array.isArray(p.attributes) ? p.attributes : [];
    const sellable = Array.isArray(p.sellableVariants) ? p.sellableVariants : [];
    const data = {};

    // Derive attributes + rules + sellableVariants from the legacy matrix
    if (options.length > 0 && (attributes.length === 0 || sellable.length === 0) && variants.length > 0) {
      const newAttributes = options.map((o) => ({
        name: o.name,
        values: (o.choices || []).map((c) => c.label),
      }));
      const priceRules = variants.map((v) => ({ match: v.combo, value: v.price }));
      const newSellable = variants.map((v) => ({
        id: comboKey(v.combo),
        combo: v.combo,
        price: Number(v.price) || p.price,
        images: Array.isArray(v.images) ? v.images : [],
        stock: v.available === false ? 0 : p.stock,
        weight: p.weightGrams ?? 0,
        available: v.available !== false,
      }));
      const pm = p.propertyModules && typeof p.propertyModules === 'object' ? p.propertyModules : {};
      data.attributes = newAttributes;
      data.rules = { price: priceRules, stock: [], images: [], weight: [] };
      data.sellableVariants = newSellable;
      data.propertyModules = {
        price: Array.isArray(pm.price) && pm.price.length ? pm.price : newAttributes.map((a) => a.name),
        images: Array.isArray(pm.images) && pm.images.length ? pm.images : newAttributes.slice(0, 1).map((a) => a.name),
        stock: Array.isArray(pm.stock) ? pm.stock : [],
        weight: Array.isArray(pm.weight) ? pm.weight : [],
      };
      const min = Math.min(...newSellable.filter((v) => v.available).map((v) => v.price));
      if (Number.isFinite(min) && min !== p.price) data.price = min;
      console.log(`ENGINE ${p.slug}: ${newAttributes.map((a) => `${a.name}(${a.values.length})`).join('+')} -> ${newSellable.length} sellable variants, ${priceRules.length} price rules${data.price ? `, price -> ${data.price}` : ''}`);
    }

    if (p.secondaryCategory && p.secondaryCategory === p.category) {
      data.secondaryCategory = null;
      console.log(`CLEAR self secondaryCategory: ${p.slug}`);
    }

    if (Object.keys(data).length > 0) {
      await prisma.product.update({ where: { id: p.id }, data });
    }
  }
  console.log('Done.');
}

run().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
