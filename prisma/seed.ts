import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const img = (seed: string) => `https://picsum.photos/seed/${seed}/900/900`;

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-");
}

const products = [
  {
    name: "Ocean Wave Resin Coaster Set",
    category: "Coasters",
    price: 1299,
    compareAtPrice: 1799,
    description:
      "A set of 4 handcrafted coasters capturing rolling ocean waves in blue and white resin, finished with a soft gold rim. Heat-resistant and sealed for daily use.",
    tags: ["ocean", "blue", "gift", "set of 4"],
    images: [img("wave1"), img("wave2"), img("wave3")],
    stock: 18,
    isFeatured: true,
  },
  {
    name: "Golden Petals Resin Wall Clock",
    category: "Wall Art",
    price: 3499,
    compareAtPrice: null,
    description:
      "A 12-inch silent wall clock with real preserved petals suspended in clear resin and shimmering gold flakes. A statement piece for any living room.",
    tags: ["clock", "gold", "flowers", "home"],
    images: [img("clock1"), img("clock2")],
    stock: 7,
    isFeatured: true,
  },
  {
    name: "Personalised Resin Name Plate",
    category: "Name Plates",
    price: 1899,
    compareAtPrice: 2299,
    description:
      "A custom name plate for your home or desk, hand-poured in your choice of colours with your name set in elegant lettering. Share your name and colour preference at checkout.",
    tags: ["custom", "personalised", "gift", "door"],
    images: [img("plate1"), img("plate2")],
    stock: 25,
    isFeatured: true,
  },
  {
    name: "Galaxy Resin Serving Tray",
    category: "Home Decor",
    price: 2699,
    compareAtPrice: 3199,
    description:
      "A deep-space inspired serving tray with swirling purples, blues and metallic stars set in durable resin, complete with brass handles.",
    tags: ["galaxy", "tray", "purple", "serveware"],
    images: [img("galaxy1"), img("galaxy2"), img("galaxy3")],
    stock: 10,
    isFeatured: true,
  },
  {
    name: "Preserved Rose Keepsake Cube",
    category: "Keepsakes",
    price: 999,
    compareAtPrice: null,
    description:
      "A single preserved rose encased in a flawless clear resin cube — a timeless keepsake for anniversaries and special moments.",
    tags: ["rose", "love", "gift", "anniversary"],
    images: [img("rose1"), img("rose2")],
    stock: 30,
    isFeatured: false,
  },
  {
    name: "Abstract Ocean Resin Wall Art",
    category: "Wall Art",
    price: 5499,
    compareAtPrice: 6999,
    description:
      "A large 24-inch abstract seascape on a wooden panel, layered with resin to create glossy, lifelike waves and sandy textures. Ready to hang.",
    tags: ["ocean", "large", "statement", "abstract"],
    images: [img("art1"), img("art2"), img("art3")],
    stock: 4,
    isFeatured: true,
  },
  {
    name: "Marble Effect Coaster Set",
    category: "Coasters",
    price: 1099,
    compareAtPrice: null,
    description:
      "Set of 4 white-and-gold marble effect coasters, each unique. Elegant, minimal and protective for your surfaces.",
    tags: ["marble", "white", "gold", "minimal"],
    images: [img("marble1"), img("marble2")],
    stock: 22,
    isFeatured: false,
  },
  {
    name: "Floral Resin Bookmark Set",
    category: "Keepsakes",
    price: 649,
    compareAtPrice: 899,
    description:
      "A trio of translucent bookmarks with pressed flowers and a delicate tassel — a lovely little gift for the readers in your life.",
    tags: ["bookmark", "flowers", "gift", "set of 3"],
    images: [img("book1"), img("book2")],
    stock: 40,
    isFeatured: false,
  },
  {
    name: "Beachscape Resin Night Lamp",
    category: "Home Decor",
    price: 2199,
    compareAtPrice: null,
    description:
      "A warm LED night lamp with a layered resin beach scene that glows softly — a calming addition to bedside tables and study desks.",
    tags: ["lamp", "beach", "led", "night"],
    images: [img("lamp1"), img("lamp2")],
    stock: 12,
    isFeatured: false,
  },
  {
    name: "Custom Photo Resin Frame",
    category: "Keepsakes",
    price: 1499,
    compareAtPrice: 1899,
    description:
      "Turn a favourite photo into a glossy resin-coated keepsake frame. Upload details at checkout — perfect for weddings and family memories.",
    tags: ["photo", "custom", "frame", "memories"],
    images: [img("frame1"), img("frame2")],
    stock: 15,
    isFeatured: false,
  },
];

async function main() {
  // Settings (single row)
  await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main" },
  });
  console.log("✓ Site settings ready");

  // Admin user
  const email = (process.env.ADMIN_EMAIL || "admin@artvelle.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "artvelle123";
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, name: "Admin" },
  });
  console.log(`✓ Admin ready → ${email} / ${password}`);

  // Products
  for (const p of products) {
    const slug = slugify(p.name);
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: { ...p, slug },
    });
  }
  console.log(`✓ Seeded ${products.length} products`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
