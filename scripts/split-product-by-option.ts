/**
 * Splits one product that carries several designs as an option into a separate
 * product per design, filed under a subcategory.
 *
 * The Pooja Thali is the case this was written for: one product with a Design
 * axis (5 choices) and a Size axis (5 choices) = 25 variants. Shoppers could
 * only ever reach it as a single listing. After the split there are 5 real
 * products — each with its own id, name, photos, price and its own Size
 * variants — sitting inside a "Resin Pooja Thali" subcategory.
 *
 *   npx tsx scripts/split-product-by-option.ts \
 *     --slug handcrafted-resin-pooja-thali --by Design --group "Resin Pooja Thali"
 *
 *   npx tsx scripts/split-product-by-option.ts --undo --group "Resin Pooja Thali"
 *
 * Flags: --dry-run to preview, --stock N to set each child's stock,
 * --name-prefix to shorten the generated names (defaults to the parent's name,
 * which is often longer than a card wants).
 *
 * The original product is deactivated, never deleted — past orders and leads
 * point at its id and must keep resolving.
 */

import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/utils";

const prisma = new PrismaClient();

type Variant = {
  combo: Record<string, string>;
  price: number;
  available: boolean;
  images: string[];
};
type Choice = { label: string; priceDelta: number; image?: string | null };
type Option = { name: string; choices: Choice[] };

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const has = (name: string) => process.argv.includes(`--${name}`);

async function uniqueSlug(base: string) {
  let slug = base;
  let n = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

async function split() {
  const slug = arg("slug");
  const axis = arg("by");
  const groupName = arg("group");
  const dryRun = has("dry-run");
  if (!slug || !axis || !groupName) {
    throw new Error("Need --slug, --by and --group");
  }

  const parent = await prisma.product.findUnique({ where: { slug } });
  if (!parent) throw new Error(`No product with slug "${slug}"`);

  const options = parent.options as unknown as Option[];
  const variants = parent.variants as unknown as Variant[];
  const splitOn = options.find((o) => o.name === axis);
  if (!splitOn) {
    throw new Error(
      `"${axis}" is not an option on this product. Found: ${options
        .map((o) => o.name)
        .join(", ")}`
    );
  }
  const remaining = options.filter((o) => o.name !== axis);

  const category = await prisma.category.findFirst({
    where: { name: parent.category },
  });
  if (!category) throw new Error(`No category row named "${parent.category}"`);

  // Photo sets that list EVERY product photo carry no information about which
  // design they belong to — they are a leftover from bulk-ticking. Treating
  // them as a real selection would hand one design all 19 photos.
  const allPhotos = new Set(parent.images);
  const isBulkTicked = (imgs: string[]) =>
    imgs.length === parent.images.length && imgs.every((i) => allPhotos.has(i));

  const perChoice = splitOn.choices.map((choice, index) => {
    const mine = variants.filter((v) => v.combo[axis] === choice.label);

    // Keep the parent's photo order so covers stay predictable.
    const picked = new Set<string>();
    for (const v of mine) {
      if (isBulkTicked(v.images ?? [])) continue;
      for (const url of v.images ?? []) picked.add(url);
    }
    let images = parent.images.filter((u) => picked.has(u));
    if (images.length === 0 && parent.images[0]) images = [parent.images[0]];

    const childVariants: Variant[] = mine.map((v) => {
      const combo = { ...v.combo };
      delete combo[axis];
      return {
        combo,
        price: v.price,
        available: v.available,
        images: (v.images ?? []).filter((u) => images.includes(u)),
      };
    });

    // The card price should be the cheapest a shopper can actually buy it for.
    const sellable = childVariants.filter((v) => v.available).map((v) => v.price);
    const price = sellable.length ? Math.min(...sellable) : parent.price;
    const highest = sellable.length ? Math.max(...sellable) : parent.price;

    // Only offer sizes this design actually has.
    const present = new Set(
      childVariants.flatMap((v) => Object.entries(v.combo).map(([k, val]) => `${k}=${val}`))
    );
    const childOptions: Option[] = remaining
      .map((o) => ({
        name: o.name,
        choices: o.choices.filter((c) => present.has(`${o.name}=${c.label}`)),
      }))
      .filter((o) => o.choices.length > 0);

    return {
      label: choice.label,
      index,
      name: `${arg("name-prefix") ?? parent.name} — ${choice.label}`,
      images,
      variants: childVariants,
      options: childOptions,
      price,
      highest,
    };
  });

  const stockEach = arg("stock")
    ? Number(arg("stock"))
    : Math.max(1, Math.round(parent.stock / perChoice.length));

  console.log(`\nSplitting "${parent.name}" on "${axis}" → ${perChoice.length} products`);
  console.log(`Subcategory: ${parent.category} › ${groupName}`);
  console.log(`Stock each: ${stockEach} (parent had ${parent.stock})\n`);
  for (const c of perChoice) {
    console.log(
      `  ${c.name}\n    ₹${c.price}–₹${c.highest} · ${c.variants.length} variants · ${c.images.length} photos`
    );
  }

  if (dryRun) {
    console.log("\n--dry-run: nothing written.");
    return;
  }

  const group =
    (await prisma.subcategory.findFirst({
      where: { categoryId: category.id, name: groupName },
    })) ??
    (await prisma.subcategory.create({
      data: {
        categoryId: category.id,
        name: groupName,
        slug: await (async () => {
          const base = slugify(groupName);
          let s = base;
          let n = 1;
          while (
            await prisma.subcategory.findUnique({
              where: { categoryId_slug: { categoryId: category.id, slug: s } },
            })
          ) {
            n += 1;
            s = `${base}-${n}`;
          }
          return s;
        })(),
      },
    }));

  for (const c of perChoice) {
    const created = await prisma.product.create({
      data: {
        name: c.name,
        slug: await uniqueSlug(slugify(c.name)),
        description: `${parent.description}\n\nDesign: ${c.label}.`,
        category: parent.category,
        secondaryCategory: parent.secondaryCategory,
        subcategoryId: group.id,
        tags: [...new Set([...parent.tags, c.label.toLowerCase()])],
        options: c.options as unknown as object[],
        variantPrices: [],
        variants: c.variants as unknown as object[],
        price: c.price,
        compareAtPrice: parent.compareAtPrice,
        images: c.images,
        stock: stockEach,
        paymentModes: parent.paymentModes,
        advancePercent: parent.advancePercent,
        weightGrams: parent.weightGrams,
        lengthCm: parent.lengthCm,
        breadthCm: parent.breadthCm,
        heightCm: parent.heightCm,
        shippingType: parent.shippingType,
        shippingFee: parent.shippingFee,
        shippingMarkup: parent.shippingMarkup,
        // One featured piece is enough — five would crowd the homepage.
        isFeatured: parent.isFeatured && c.index === 0,
        isActive: true,
      },
    });
    console.log(`  created ${created.slug}`);
  }

  await prisma.product.update({
    where: { id: parent.id },
    data: { isActive: false, isFeatured: false, subcategoryId: null },
  });
  console.log(`\n  hidden (not deleted): ${parent.slug}`);
  console.log("  → past orders and leads still resolve against it.\n");
}

async function undo() {
  const groupName = arg("group");
  if (!groupName) throw new Error("Need --group");

  const group = await prisma.subcategory.findFirst({
    where: { name: groupName },
    include: { products: true },
  });
  if (!group) throw new Error(`No subcategory named "${groupName}"`);

  const orders = await prisma.order.findMany({ select: { items: true } });
  const ordered = new Set(
    orders.flatMap((o) =>
      (o.items as unknown as { productId: string }[]).map((i) => i.productId)
    )
  );

  const blocked = group.products.filter((p) => ordered.has(p.id));
  if (blocked.length > 0) {
    console.log("Refusing to delete — these have been ordered:");
    for (const p of blocked) console.log("  " + p.name);
    console.log("Hide them in the admin instead.");
    return;
  }

  await prisma.product.deleteMany({ where: { subcategoryId: group.id } });
  await prisma.subcategory.delete({ where: { id: group.id } });
  console.log(`Deleted ${group.products.length} products and the "${groupName}" subcategory.`);

  const slug = arg("slug");
  if (slug) {
    await prisma.product.update({
      where: { slug },
      data: { isActive: true },
    });
    console.log(`Reactivated ${slug}.`);
  }
}

(has("undo") ? undo() : split())
  .catch((err) => {
    console.error("\n" + err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
