/**
 * fix-catalog.mjs — one-shot cleanup to match the client's 23-family catalog chart.
 *
 *  1. Backs up all products/categories/subcategories to a JSON file.
 *  2. Copies any extra gallery photos from the 16 duplicate products (created
 *     2026-08-06) onto their originals, then deletes the duplicates.
 *  3. Renames three frames to the chart's names and merges "Baby Footprint &
 *     Newborn Frame" into "Premium Resin Photo Frame" via price-engine rules.
 *  4. Restructures categories/subcategories to the chart, dual-lists the
 *     Business QR Display, and removes the junk subcats + empty category.
 *  5. Validates price-engine data (attributes/rules/sellableVariants) on all
 *     remaining products and prints the final catalog.
 *
 * Run:  node --env-file=.env scripts/tmp/fix-catalog.mjs           (dry run)
 *       node --env-file=.env scripts/tmp/fix-catalog.mjs --apply   (write)
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const APPLY = process.argv.includes('--apply');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

/** Mirrors src/lib/options.ts → comboKey. */
function comboKey(combo) {
  return Object.keys(combo)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}=${combo[k]}`)
    .join('|');
}

// keeper slug → duplicate slug (duplicate gets merged in, then deleted)
const DUP_PAIRS = [
  ['ganesha-dashboard-idol', 'resin-dashboard-idol'],
  ['personalized-brooch', 'personalised-resin-brooch'],
  ['designer-rakhi', 'designer-resin-rakhi'],
  ['rakhi-gift-hamper', 'premium-rakhi-hamper'],
  ['personalized-name-plate', 'custom-resin-name-plate'],
  ['premium-resin-toran', 'luxury-resin-toran'],
  ['decorative-shubh-labh', 'resin-shubh-labh'],
  ['personalized-keychain', 'personalised-resin-keychain'],
  ['temple-photo-frame', 'premium-god-photo-frame'],
  ['business-qr-display', 'qr-business-display-frame'],
  ['mandir-backdrop', 'custom-resin-mandir-backdrop'],
  ['kanha-jhula', 'resin-kanha-jhula'],
  ['panchratna-sacred-thread', 'resin-panchmashi'],
  ['designer-pooja-thali', 'premium-designer-pooja-thali'],
  ['designer-ring-platter', 'resin-ring-platter'],
  ['varmala-preservation', 'wedding-preservation-frame'],
];

// designer-pooja-thali already has a hand-curated 5-photo gallery; don't flood
// it with the duplicate's 20 generic shots.
const SKIP_GALLERY_MERGE = new Set(['designer-pooja-thali']);

const log = (...a) => console.log(...a);

async function main() {
  // ---------- 0. backup ----------
  const [products, categories, subcategories, productImages] = await Promise.all([
    prisma.product.findMany(),
    prisma.category.findMany(),
    prisma.subcategory.findMany(),
    prisma.productImage.findMany(),
  ]);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join('scripts', 'tmp', `backup-catalog-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ products, categories, subcategories, productImages }, null, 1));
  log(`Backup of ${products.length} products / ${categories.length} categories / ${subcategories.length} subcats -> ${backupPath}`);
  log(APPLY ? '\n*** APPLY MODE — WRITING TO DATABASE ***\n' : '\n*** DRY RUN — no writes (pass --apply to execute) ***\n');

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const catByName = new Map(categories.map((c) => [c.name, c]));
  const subById = new Map(subcategories.map((s) => [s.id, s]));
  const subByKey = new Map(subcategories.map((s) => [`${s.categoryId}/${s.name}`, s]));
  const piByProduct = new Map();
  for (const pi of productImages) {
    if (!piByProduct.has(pi.productId)) piByProduct.set(pi.productId, []);
    piByProduct.get(pi.productId).push(pi);
  }
  const mediaByUrl = new Map(
    (await prisma.media.findMany({ select: { id: true, url: true } })).map((m) => [m.url, m])
  );

  const need = (slug) => {
    const p = bySlug.get(slug);
    if (!p) throw new Error(`Missing product: ${slug}`);
    return p;
  };

  await prisma.$transaction(async (tx) => {
    const w = {
      product: {
        update: (args) => (APPLY ? tx.product.update(args) : Promise.resolve()),
        updateMany: (args) => (APPLY ? tx.product.updateMany(args) : Promise.resolve()),
        delete: (args) => (APPLY ? tx.product.delete(args) : Promise.resolve()),
      },
      subcategory: {
        update: (args) => (APPLY ? tx.subcategory.update(args) : Promise.resolve()),
        create: (args) => (APPLY ? tx.subcategory.create(args) : Promise.resolve({ id: `new-${args.data.slug}` })),
        delete: (args) => (APPLY ? tx.subcategory.delete(args) : Promise.resolve()),
      },
      category: {
        update: (args) => (APPLY ? tx.category.update(args) : Promise.resolve()),
        delete: (args) => (APPLY ? tx.category.delete(args) : Promise.resolve()),
      },
      media: {
        upsert: (args) => (APPLY ? tx.media.upsert(args) : Promise.resolve(mediaByUrl.get(args.where.url) ?? { id: `new-media` })),
      },
      productImage: {
        create: (args) => (APPLY ? tx.productImage.create(args) : Promise.resolve()),
        createMany: (args) => (APPLY ? tx.productImage.createMany(args) : Promise.resolve()),
      },
    };

    // ---------- 1. merge extra dup gallery photos onto keepers, delete dups ----------
    for (const [keepSlug, dupSlug] of DUP_PAIRS) {
      const keep = need(keepSlug);
      const dup = bySlug.get(dupSlug);
      if (!dup) {
        log(`SKIP (already gone): ${dupSlug}`);
        continue;
      }

      if (!SKIP_GALLERY_MERGE.has(keepSlug)) {
        const keeperUrls = new Set([
          ...(keep.images || []),
          ...(piByProduct.get(keep.id) || []).map((pi) => mediaUrl(pi)),
        ]);
        function mediaUrl(pi) {
          for (const [url, m] of mediaByUrl) if (m.id === pi.mediaId) return url;
          return '';
        }
        const extras = (dup.images || []).filter((u) => !keeperUrls.has(u));
        if (extras.length > 0) {
          let sortOrder = (piByProduct.get(keep.id) || []).reduce((m, pi) => Math.max(m, pi.sortOrder + 1), 0);
          for (const url of extras) {
            const file = decodeURIComponent(url.split('/').pop() || url);
            const media = await w.media.upsert({
              where: { url },
              update: {},
              create: { url, file, source: 'repo' },
            });
            await w.productImage.create({
              data: { productId: keep.id, mediaId: media.id, variantValue: null, slot: 'gallery', sortOrder: sortOrder++ },
            });
          }
          await w.product.update({
            where: { id: keep.id },
            data: { images: [...(keep.images || []), ...extras] },
          });
          log(`ENRICH ${keepSlug}: +${extras.length} photos from ${dupSlug}`);
        }
      }

      await w.product.delete({ where: { id: dup.id } });
      log(`DELETE dup: ${dupSlug} ("${dup.name}")`);
    }

    // ---------- 2. renames to chart names ----------
    const RENAMES = [
      ['temple-photo-frame', 'God Photo Frame', 'god-photo-frame'],
      ['custom-resin-photo-frame', 'Personalized Photo Frame', 'personalized-photo-frame'],
      ['flower-photo-frame', 'Premium Resin Photo Frame', 'premium-resin-photo-frame'],
    ];
    for (const [slug, newName, newSlug] of RENAMES) {
      const p = need(slug);
      await w.product.update({ where: { id: p.id }, data: { name: newName, slug: newSlug } });
      log(`RENAME ${slug} -> "${newName}" (${newSlug})`);
    }

    // ---------- 3. merge Baby Footprint & Newborn Frame into Premium Resin Photo Frame ----------
    const premium = need('flower-photo-frame'); // renamed above; same id
    const baby = need('baby-footprint-newborn-frame');

    const FLOWER_DESIGNS = ['Bouquet', 'Rose Cluster', 'Mixed Wildflower'];
    const BABY_DESIGNS = ['Baby Footprint', 'Newborn Pagli'];
    const attributes = [
      { name: 'Design', values: [...FLOWER_DESIGNS, ...BABY_DESIGNS] },
      { name: 'Stand', values: ['Wooden', 'Metal'] },
      { name: 'Size', values: ['10"', '12"', '9×11"'] },
    ];
    const propertyModules = {
      price: ['Design', 'Stand', 'Size'],
      images: ['Design'],
      stock: ['Design', 'Stand', 'Size'],
      weight: [],
    };
    const flowerPrice = (stand, size) =>
      stand === 'Wooden' ? (size === '10"' ? 900 : 1100) : size === '10"' ? 1100 : 1300;

    const priceRules = [];
    const stockRules = [];
    const sellable = [];
    const babyImages = baby.images || [];
    for (const design of [...FLOWER_DESIGNS, ...BABY_DESIGNS]) {
      for (const stand of ['Wooden', 'Metal']) {
        for (const size of ['10"', '12"', '9×11"']) {
          const combo = { Design: design, Stand: stand, Size: size };
          const isFlower = FLOWER_DESIGNS.includes(design);
          const available = isFlower
            ? size !== '9×11"'
            : stand === 'Metal' && size === '9×11"';
          const price = isFlower
            ? size === '9×11"' ? 900 : flowerPrice(stand, size)
            : 1200;
          if (available) priceRules.push({ match: combo, value: price });
          else stockRules.push({ match: combo, value: 0 });
          sellable.push({
            id: comboKey(combo),
            combo,
            price,
            images: !isFlower && available ? babyImages : [],
            stock: available ? (isFlower ? premium.stock : baby.stock) : 0,
            weight: 0,
            available,
          });
        }
      }
    }

    await w.product.update({
      where: { id: premium.id },
      data: {
        description:
          'A premium personalised resin keepsake frame — preserve real flowers around your photo, or capture your baby\'s footprints and newborn memories (Pagli). Choose the design, stand and size.',
        tags: Array.from(new Set([...(premium.tags || []), ...(baby.tags || [])])),
        options: [
          {
            name: 'Design',
            affects: 'images',
            choices: [...FLOWER_DESIGNS, ...BABY_DESIGNS].map((label) => ({
              label, images: [], available: true, priceDelta: 0, previewImage: null,
            })),
          },
          {
            name: 'Stand',
            affects: 'price',
            choices: ['Wooden', 'Metal'].map((label) => ({ label, images: [], available: true, priceDelta: 0, previewImage: null })),
          },
          {
            name: 'Size',
            affects: 'price',
            choices: ['10"', '12"', '9×11"'].map((label) => ({ label, images: [], available: true, priceDelta: 0, previewImage: null })),
          },
        ],
        attributes,
        propertyModules,
        rules: { price: priceRules, stock: stockRules, images: [], weight: [] },
        sellableVariants: sellable,
        price: 900,
        compareAtPrice: premium.compareAtPrice ?? 1499,
        images: Array.from(new Set([...(premium.images || []), ...babyImages])),
      },
    });

    // baby photos become variant-tagged gallery rows on the premium frame
    const babyPis = piByProduct.get(baby.id) || [];
    let so = ((piByProduct.get(premium.id) || []).reduce((m, pi) => Math.max(m, pi.sortOrder + 1), 0));
    for (const pi of babyPis) {
      for (const design of BABY_DESIGNS) {
        await w.productImage.create({
          data: { productId: premium.id, mediaId: pi.mediaId, variantValue: design, slot: 'gallery', sortOrder: so++ },
        });
      }
    }
    await w.product.delete({ where: { id: baby.id } });
    log(`MERGE baby-footprint-newborn-frame -> premium-resin-photo-frame (${sellable.length} combos, ${priceRules.length} price rules, ${babyPis.length * 2} tagged photos) + DELETE baby product`);

    // ---------- 4. category & subcategory restructure ----------
    const poojaCat = catByName.get('Pooja Essentials');
    const homeCat = catByName.get('Home Decor');
    const giftsCat = catByName.get('Personalized Gifts');
    const weddingCat = catByName.get('Wedding');
    const festiveCat = catByName.get('Festive Collection');
    const carCat = catByName.get('Car Accessories');
    const bizCat = catByName.get('Business Essentials');
    const fashionCat = catByName.get('Fashion Accessories');

    // 4a. Wedding -> Wedding Collection (name is the storefront's filter key)
    await w.category.update({ where: { id: weddingCat.id }, data: { name: 'Wedding Collection' } });
    await w.product.updateMany({ where: { category: 'Wedding' }, data: { category: 'Wedding Collection' } });
    await w.product.updateMany({ where: { secondaryCategory: 'Wedding' }, data: { secondaryCategory: 'Wedding Collection' } });
    log('RENAME category "Wedding" -> "Wedding Collection" (incl. product strings)');

    // 4b. category display order per the chart
    const CAT_ORDER = [
      [poojaCat, 0], [homeCat, 1], [giftsCat, 2], [weddingCat, 3], [festiveCat, 4], [carCat, 5], [bizCat, 6],
    ];
    for (const [cat, sortOrder] of CAT_ORDER) {
      await w.category.update({ where: { id: cat.id }, data: { sortOrder } });
    }

    // 4c. subcategory renames / moves / creations
    const sub = (cat, name) => subByKey.get(`${cat.id}/${name}`);

    const poojaThali = sub(poojaCat, 'Pooja Thali');
    await w.subcategory.update({ where: { id: poojaThali.id }, data: { name: 'Pooja Thalis', slug: 'pooja-thalis', sortOrder: 0 } });
    log('RENAME subcat "Pooja Thali" -> "Pooja Thalis"');

    const poojaAcc = sub(poojaCat, 'Pooja Accessories');
    const templeDecor = sub(poojaCat, 'Temple Decor');
    await w.subcategory.update({ where: { id: poojaAcc.id }, data: { sortOrder: 1 } });
    await w.subcategory.update({ where: { id: templeDecor.id }, data: { sortOrder: 2 } });

    const photoFrames = sub(giftsCat, 'Photo Frames');
    await w.subcategory.update({ where: { id: photoFrames.id }, data: { categoryId: homeCat.id, sortOrder: 1 } });
    log('MOVE subcat "Photo Frames": Personalized Gifts -> Home Decor');

    const namePlates = sub(homeCat, 'Name Plates');
    await w.subcategory.update({ where: { id: namePlates.id }, data: { sortOrder: 0 } });

    const doorToran = sub(homeCat, 'Door Toran');
    await w.subcategory.update({ where: { id: doorToran.id }, data: { name: 'Torans', slug: 'torans', sortOrder: 2 } });
    log('RENAME subcat "Door Toran" -> "Torans"');

    const keychains = sub(giftsCat, 'Keychains');
    await w.subcategory.update({ where: { id: keychains.id }, data: { sortOrder: 0 } });
    const brooches = await w.subcategory.create({
      data: { name: 'Brooches', slug: 'brooches', categoryId: giftsCat.id, sortOrder: 1 },
    });
    log('CREATE subcat "Brooches" (Personalized Gifts)');
    const dashboardDecor = await w.subcategory.create({
      data: { name: 'Dashboard Decor', slug: 'dashboard-decor', categoryId: carCat.id, sortOrder: 0 },
    });
    log('CREATE subcat "Dashboard Decor" (Car Accessories)');
    const bizDisplays = await w.subcategory.create({
      data: { name: 'Business Displays', slug: 'business-displays', categoryId: bizCat.id, sortOrder: 0 },
    });
    log('CREATE subcat "Business Displays" (Business Essentials)');

    const ringPlatters = sub(weddingCat, 'Ring Platters');
    const weddingPres = sub(weddingCat, 'Wedding Preservation');
    const rakhi = sub(festiveCat, 'Rakhi');
    const rakhiHampers = sub(festiveCat, 'Rakhi Hampers');
    await w.subcategory.update({ where: { id: ringPlatters.id }, data: { sortOrder: 0 } });
    await w.subcategory.update({ where: { id: weddingPres.id }, data: { sortOrder: 1 } });
    await w.subcategory.update({ where: { id: rakhi.id }, data: { sortOrder: 0 } });
    await w.subcategory.update({ where: { id: rakhiHampers.id }, data: { sortOrder: 1 } });

    // 4d. product placements per the chart
    const PLACEMENTS = [
      // slug, category name, subcategory id, secondaryCategory (undefined = leave as is)
      ['classic-pooja-thali', 'Pooja Essentials', poojaThali.id, undefined],
      ['designer-pooja-thali', 'Pooja Essentials', poojaThali.id, undefined],
      ['divine-pooja-thali', 'Pooja Essentials', poojaThali.id, undefined],
      ['mini-pooja-thali', 'Pooja Essentials', poojaThali.id, undefined],
      ['decorative-kankavati', 'Pooja Essentials', poojaAcc.id, undefined],
      ['decorative-shubh-labh', 'Pooja Essentials', poojaAcc.id, 'Home Decor'],
      ['panchratna-sacred-thread', 'Pooja Essentials', poojaAcc.id, undefined],
      ['mandir-backdrop', 'Pooja Essentials', templeDecor.id, undefined],
      ['kanha-jhula', 'Pooja Essentials', templeDecor.id, undefined],
      ['temple-photo-frame', 'Pooja Essentials', templeDecor.id, undefined], // now God Photo Frame
      ['personalized-name-plate', 'Home Decor', namePlates.id, undefined],
      ['custom-resin-photo-frame', 'Home Decor', photoFrames.id, 'Personalized Gifts'], // now Personalized Photo Frame
      ['flower-photo-frame', 'Home Decor', photoFrames.id, 'Personalized Gifts'], // now Premium Resin Photo Frame
      ['premium-resin-toran', 'Home Decor', doorToran.id, undefined],
      ['personalized-keychain', 'Personalized Gifts', keychains.id, undefined],
      ['personalized-brooch', 'Personalized Gifts', brooches.id, undefined],
      ['designer-ring-platter', 'Wedding Collection', ringPlatters.id, undefined],
      ['varmala-preservation', 'Wedding Collection', weddingPres.id, undefined],
      ['designer-rakhi', 'Festive Collection', rakhi.id, undefined],
      ['rakhi-gift-hamper', 'Festive Collection', rakhiHampers.id, undefined],
      ['ganesha-dashboard-idol', 'Car Accessories', dashboardDecor.id, undefined],
      ['business-qr-display', 'Business Essentials', bizDisplays.id, 'Personalized Gifts'],
    ];
    for (const [slug, category, subcategoryId, secondaryCategory] of PLACEMENTS) {
      const p = need(slug);
      const data = { category, subcategoryId };
      if (secondaryCategory !== undefined) data.secondaryCategory = secondaryCategory;
      await w.product.update({ where: { id: p.id }, data });
    }
    log(`PLACE ${PLACEMENTS.length} products into chart categories/subcategories`);

    // 4e. delete junk subcats (only if they hold no products) + empty category
    const JUNK_SUBCATS = [
      [poojaCat, 'Resin Pooja Thali'],
      [poojaCat, 'Panchmashi'],
      [poojaCat, 'Mandir Backdrop'],
      [poojaCat, 'Kanha Jhula'],
      [homeCat, 'Shubh Labh'],
      [giftsCat, 'Business Display'],
    ];
    const placedSubIds = new Set(PLACEMENTS.map(([, , subId]) => subId));
    for (const [cat, name] of JUNK_SUBCATS) {
      const s = sub(cat, name);
      if (!s) { log(`junk subcat already gone: ${name}`); continue; }
      if (placedSubIds.has(s.id)) throw new Error(`Refusing to delete subcat in use: ${name}`);
      if (APPLY) {
        const count = await tx.product.count({ where: { subcategoryId: s.id } });
        if (count > 0) throw new Error(`Subcat "${name}" still holds ${count} products — aborting`);
      }
      await w.subcategory.delete({ where: { id: s.id } });
      log(`DELETE junk subcat: ${name}`);
    }

    if (fashionCat) {
      if (APPLY) {
        const count = await tx.product.count({
          where: { OR: [{ category: 'Fashion Accessories' }, { secondaryCategory: 'Fashion Accessories' }] },
        });
        if (count > 0) throw new Error(`Fashion Accessories still referenced by ${count} products — aborting`);
      }
      await w.category.delete({ where: { id: fashionCat.id } });
      log('DELETE empty category: Fashion Accessories');
    }
  }, { timeout: 180000, maxWait: 30000 });

  // ---------- 5. validation + final report ----------
  if (!APPLY) {
    log('\nDry run complete. Re-run with --apply to execute.');
    return;
  }

  const finalProducts = await prisma.product.findMany({
    include: { subcategory: { select: { name: true } } },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  log(`\n=== FINAL CATALOG (${finalProducts.length} products) ===`);
  const issues = [];
  for (const p of finalProducts) {
    const attrs = Array.isArray(p.attributes) ? p.attributes : [];
    const sv = Array.isArray(p.sellableVariants) ? p.sellableVariants : [];
    const opts = Array.isArray(p.options) ? p.options : [];
    const avail = sv.filter((v) => v.available);
    const min = avail.length ? Math.min(...avail.map((v) => v.price)) : p.price;
    const max = avail.length ? Math.max(...avail.map((v) => v.price)) : p.price;
    if (opts.length > 0 && attrs.length === 0) issues.push(`${p.slug}: has options but NO attributes`);
    if (opts.length > 0 && sv.length === 0) issues.push(`${p.slug}: has options but NO sellableVariants`);
    if (avail.length > 0 && p.price !== min) issues.push(`${p.slug}: price ${p.price} != min variant price ${min}`);
    if (p.compareAtPrice != null && p.compareAtPrice <= p.price) issues.push(`${p.slug}: compareAtPrice ${p.compareAtPrice} <= price ${p.price}`);
    log(`${p.category} | ${p.subcategory?.name ?? '-'} | ${p.name} | ₹${min}${max !== min ? `–₹${max}` : ''} | ${sv.length} variants${p.secondaryCategory ? ` | also in: ${p.secondaryCategory}` : ''}`);
  }
  log(issues.length ? `\nISSUES:\n- ${issues.join('\n- ')}` : '\nPrice-engine check: all products consistent ✔');

  const finalCats = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { subcategories: { orderBy: { sortOrder: 'asc' }, select: { name: true } } },
  });
  log('\n=== CATEGORIES ===');
  for (const c of finalCats) log(`${c.name}: ${c.subcategories.map((s) => s.name).join(', ') || '(none)'}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
