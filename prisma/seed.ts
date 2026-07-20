import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Placeholder imagery — replace with real photos later via the admin panel
// (Upload with Vercel Blob, or paste an image URL).
const img = (seed: string) => `https://picsum.photos/seed/${seed}/900/900`;

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-");
}

// -------------------------------------------------------------------------
// Artvelle real product catalogue (prices are sensible starting points —
// edit any of them anytime from Admin → Products).
// category = primary, secondaryCategory = also shows under this section.
// -------------------------------------------------------------------------
type SeedProduct = {
  name: string;
  category: string;
  secondaryCategory?: string | null;
  price: number;
  compareAtPrice?: number | null;
  description: string;
  tags: string[];
  stock: number;
  isFeatured?: boolean;
  imgSeed: string;
  images?: string[]; // real photos (in /public/products); falls back to placeholder
  options?: {
    name: string;
    choices: { label: string; priceDelta: number }[];
  }[];
};

const products: SeedProduct[] = [
  {
    name: "Handcrafted Resin Pooja Thali",
    category: "Pooja & Spiritual",
    secondaryCategory: "Festival Collection",
    price: 1499,
    compareAtPrice: 1899,
    description:
      "A handcrafted resin pooja thali with intricate gold-leaf detailing and a glossy mirror finish — perfect for daily aarti, festivals and gifting. Lightweight, durable and easy to clean.",
    tags: ["pooja thali", "spiritual", "diwali", "festival", "gift", "handmade"],
    stock: 15,
    isFeatured: true,
    imgSeed: "poojathali",
    images: ["/products/pooja-thali-1.jpg"],
    options: [
      {
        name: "Type",
        choices: [
          { label: "Pichwai Art", priceDelta: 0 },
          { label: "Meenakari", priceDelta: 300 },
          { label: "Plain Marble", priceDelta: 0 },
        ],
      },
      {
        name: "Size",
        choices: [
          { label: "Small (8 inch)", priceDelta: 0 },
          { label: "Medium (10 inch)", priceDelta: 250 },
          { label: "Large (12 inch)", priceDelta: 600 },
        ],
      },
    ],
  },
  {
    name: "Resin Tea Coaster Set (Set of 4)",
    category: "Kitchen & Dining",
    secondaryCategory: "Home Decor",
    price: 899,
    compareAtPrice: 1199,
    description:
      "A set of four handcrafted resin coasters that protect your table in style. Heat-resistant, sealed for daily use, each piece uniquely swirled — a lovely housewarming gift.",
    tags: ["coaster", "tea", "kitchen", "set of 4", "marble", "housewarming"],
    stock: 30,
    isFeatured: true,
    imgSeed: "teacoaster",
  },
  {
    name: "Personalised Resin Keychain",
    category: "Fashion & Accessories",
    secondaryCategory: "Personalized Gifts",
    price: 299,
    compareAtPrice: 499,
    description:
      "A custom resin keychain with your name, initials or dried flowers set in crystal-clear resin. A charming little keepsake or return gift — personalise it your way.",
    tags: ["keychain", "personalised", "return gift", "name", "accessory"],
    stock: 60,
    imgSeed: "keychain",
  },
  {
    name: "Resin Panchmashi Spiritual Art",
    category: "Pooja & Spiritual",
    secondaryCategory: "Home Decor",
    price: 1299,
    compareAtPrice: null,
    description:
      "A sacred resin Panchmashi piece crafted for your home temple, blending traditional motifs with a modern glossy finish. A meaningful spiritual accent and a thoughtful gift.",
    tags: ["panchmashi", "pooja", "temple", "spiritual", "gift"],
    stock: 12,
    imgSeed: "panchmashi",
  },
  {
    name: "Personalised Resin Name Plate",
    category: "Home Decor",
    secondaryCategory: "Personalized Gifts",
    price: 1899,
    compareAtPrice: 2299,
    description:
      "Announce your home in style with a custom resin name plate hand-poured in your choice of colours, with your family name in elegant lettering. Weather-resistant and made to order.",
    tags: ["name plate", "personalised", "door", "custom", "housewarming"],
    stock: 20,
    isFeatured: true,
    imgSeed: "nameplate",
  },
  {
    name: "Artisan Resin Wrist Watch",
    category: "Fashion & Accessories",
    secondaryCategory: "Personalized Gifts",
    price: 1599,
    compareAtPrice: 1999,
    description:
      "A statement wristwatch with a one-of-a-kind resin dial — swirls of colour and shimmer captured in glass-like resin. No two are ever alike.",
    tags: ["watch", "resin", "accessory", "fashion", "gift"],
    stock: 14,
    imgSeed: "resinwatch",
  },
  {
    name: "Resin Ring Platter & Trinket Tray",
    category: "Kitchen & Dining",
    secondaryCategory: "Home Decor",
    price: 799,
    compareAtPrice: 999,
    description:
      "An elegant resin ring platter to hold rings, trinkets and small treasures — a favourite for weddings and dressing tables. Glossy, sturdy and gift-ready.",
    tags: ["ring platter", "tray", "trinket", "wedding", "gift"],
    stock: 22,
    imgSeed: "ringplatter",
  },
  {
    name: "Resin Kanha Jhula (Krishna Swing)",
    category: "Pooja & Spiritual",
    secondaryCategory: "Home Decor",
    price: 2199,
    compareAtPrice: 2699,
    description:
      "A beautifully detailed resin Kanha Jhula to cradle your Laddu Gopal, finished with gold accents. A heartfelt devotional piece for Janmashtami and everyday worship.",
    tags: ["kanha", "krishna", "jhula", "janmashtami", "spiritual", "gift"],
    stock: 10,
    isFeatured: true,
    imgSeed: "kanhajhula",
  },
  {
    name: "Resin Car Dashboard Decor",
    category: "Car Accessories",
    secondaryCategory: "Pooja & Spiritual",
    price: 699,
    compareAtPrice: null,
    description:
      "Bring calm to your drive with a compact resin dashboard decor — a serene deity or artful accent that sits securely on your car dashboard. A thoughtful gift for a new car.",
    tags: ["car", "dashboard", "decor", "idol", "new car", "gift"],
    stock: 25,
    imgSeed: "cardash",
  },
  {
    name: "Personalised Resin Photo Frame",
    category: "Home Decor",
    secondaryCategory: "Personalized Gifts",
    price: 1199,
    compareAtPrice: 1499,
    description:
      "Turn a favourite photo into a glossy resin-coated keepsake frame with dried flowers or a shimmer of your choice. A treasured gift for weddings, anniversaries and family memories.",
    tags: ["photo frame", "personalised", "memories", "anniversary", "gift"],
    stock: 18,
    isFeatured: true,
    imgSeed: "photoframe",
    images: [
      "/products/photo-frame-1.jpg",
      "/products/photo-frame-2.jpg",
      "/products/photo-frame-3.jpg",
      "/products/photo-frame-4.jpg",
    ],
    options: [
      {
        name: "Shape",
        choices: [
          { label: "Round", priceDelta: 0 },
          { label: "Square", priceDelta: 0 },
          { label: "Agate Slice", priceDelta: 200 },
        ],
      },
      {
        name: "Size",
        choices: [
          { label: "6 inch", priceDelta: 0 },
          { label: "8 inch", priceDelta: 300 },
          { label: "10 inch", priceDelta: 600 },
        ],
      },
    ],
  },
  {
    name: "Real Flower Preservation Resin Block",
    category: "Wedding Preservation",
    secondaryCategory: "Personalized Gifts",
    price: 2499,
    compareAtPrice: null,
    description:
      "Preserve your special-day blooms forever, encased in flawless clear resin. Send us your flowers and we'll transform them into a timeless keepsake block or frame.",
    tags: ["flower preservation", "wedding", "keepsake", "memories", "custom", "pendant"],
    stock: 8,
    isFeatured: true,
    imgSeed: "flowerpres",
    images: ["/products/flower-preservation-1.jpg"],
  },
  {
    name: "Varmala Preservation Frame",
    category: "Wedding Preservation",
    secondaryCategory: "Personalized Gifts",
    price: 4999,
    compareAtPrice: 5999,
    description:
      "Immortalise your wedding varmala in resin — petals from your garland preserved in a stunning frame. A once-in-a-lifetime memory you can keep and cherish forever.",
    tags: ["varmala", "wedding", "preservation", "garland", "anniversary"],
    stock: 6,
    isFeatured: true,
    imgSeed: "varmala",
  },
  {
    name: "Resin Shubh-Labh Door Set",
    category: "Pooja & Spiritual",
    secondaryCategory: "Festival Collection",
    price: 899,
    compareAtPrice: 1199,
    description:
      "Invite prosperity home with a handcrafted resin Shubh-Labh set, gleaming with gold detail. A must-have for Diwali, housewarmings and your main door.",
    tags: ["shubh labh", "diwali", "festival", "door", "housewarming"],
    stock: 28,
    imgSeed: "shubhlabh",
    images: ["/products/shubh-labh-1.jpg", "/products/shubh-labh-2.jpg"],
  },
  {
    name: "Resin Mandir Decoration Set",
    category: "Pooja & Spiritual",
    secondaryCategory: "Home Decor",
    price: 1799,
    compareAtPrice: null,
    description:
      "Adorn your home mandir with elegant resin decoration accents that catch the light beautifully. Handmade to bring warmth and devotion to your sacred space.",
    tags: ["mandir", "temple", "decoration", "spiritual", "home"],
    stock: 12,
    imgSeed: "mandir",
  },
  {
    name: "Divine Resin God Photo Frame",
    category: "Home Decor",
    secondaryCategory: "Pooja & Spiritual",
    price: 1399,
    compareAtPrice: 1699,
    description:
      "A divine resin-finished frame for your favourite deity photograph, with gold-leaf accents and a luminous glossy coat. Perfect for your pooja room or as a spiritual gift.",
    tags: ["god frame", "deity", "spiritual", "pooja", "gift"],
    stock: 16,
    isFeatured: true,
    imgSeed: "godframe",
  },
  {
    name: "Personalised Resin QR Code Frame",
    category: "Personalized Gifts",
    secondaryCategory: "Home Decor",
    price: 999,
    compareAtPrice: null,
    description:
      "A modern personalised resin frame featuring a custom QR code — link a wedding invite, a Spotify song or a video message. A unique, memorable keepsake gift.",
    tags: ["qr code", "personalised", "wedding", "spotify", "modern", "gift"],
    stock: 20,
    imgSeed: "qrframe",
    images: ["/products/qr-frame-1.jpg"],
  },
  {
    name: "Handcrafted Resin Brooch",
    category: "Fashion & Accessories",
    secondaryCategory: "Personalized Gifts",
    price: 399,
    compareAtPrice: 599,
    description:
      "A dainty handcrafted resin brooch with dried florals or shimmer, adding a refined touch to sarees, blazers and dupattas. A lovely little gift for her.",
    tags: ["brooch", "saree", "accessory", "floral", "gift"],
    stock: 40,
    imgSeed: "brooch",
  },
  {
    name: "Resin Pagli Frame (Baby Footprint)",
    category: "Home Decor",
    secondaryCategory: "Personalized Gifts",
    price: 1699,
    compareAtPrice: null,
    description:
      "Capture your little one's first footprints in a beautiful resin Pagli frame — a heart-melting keepsake for newborns and a cherished gift for new parents.",
    tags: ["pagli", "baby", "footprint", "newborn", "keepsake", "gift"],
    stock: 12,
    imgSeed: "pagliframe",
  },
  {
    name: "Rakhi Preservation Hamper",
    category: "Festival Collection",
    secondaryCategory: "Personalized Gifts",
    price: 1299,
    compareAtPrice: null,
    description:
      "Preserve the love of Raksha Bandhan — a curated resin hamper that keeps your rakhi as a lasting keepsake. A thoughtful gift set for brothers and sisters.",
    tags: ["rakhi", "hamper", "raksha bandhan", "brother", "gift"],
    stock: 20,
    imgSeed: "rakhihamper",
    images: [
      "/products/rakhi-hamper-1.jpg",
      "/products/rakhi-hamper-2.jpg",
      "/products/rakhi-hamper-3.jpg",
      "/products/rakhi-hamper-4.jpg",
      "/products/rakhi-threads-1.jpg",
    ],
  },
  {
    name: "Radiant Resin Toran (Door Hanging)",
    category: "Festival Collection",
    secondaryCategory: "Pooja & Spiritual",
    price: 1099,
    compareAtPrice: 1399,
    description:
      "Welcome guests with a radiant handcrafted resin toran for your doorway, rich with traditional motifs and gold detailing. A festive statement for Diwali and celebrations.",
    tags: ["toran", "door", "diwali", "festival", "bandhanwar", "home"],
    stock: 18,
    imgSeed: "toran",
  },
  {
    name: "Ocean Wave Resin Tea Table Top",
    category: "Home Decor",
    secondaryCategory: "Kitchen & Dining",
    price: 8999,
    compareAtPrice: 10999,
    description:
      "A show-stopping resin tea table top with flowing ocean-like waves and metallic depth, sealed to a mirror finish. A functional centrepiece that turns heads.",
    tags: ["tea table", "furniture", "centre table", "ocean", "statement"],
    stock: 4,
    isFeatured: true,
    imgSeed: "teatable",
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

  // Demo customer account (for trying the login + order tracking flow)
  const demoEmail = "customer@artvelle.com";
  const demoPassword = "customer123";
  await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      name: "Demo Customer",
      phone: "+91 90000 11111",
      passwordHash: await bcrypt.hash(demoPassword, 10),
    },
  });
  console.log(`✓ Demo customer → ${demoEmail} / ${demoPassword}`);

  // -----------------------------------------------------------------------
  // Products: reset the catalogue to Artvelle's real product list.
  // (Removes any old demo/sample products so the store shows only real items.)
  // NOTE: this replaces ALL products — once you start editing products in the
  // admin panel, don't re-run the seed or it will reset them to this list.
  // -----------------------------------------------------------------------
  await prisma.product.deleteMany({});
  for (const p of products) {
    const slug = slugify(p.name);
    await prisma.product.create({
      data: {
        name: p.name,
        slug,
        description: p.description,
        category: p.category,
        secondaryCategory: p.secondaryCategory ?? null,
        tags: p.tags,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        images: p.images ?? [img(p.imgSeed), img(`${p.imgSeed}-2`)],
        options: p.options ?? [],
        stock: p.stock,
        isFeatured: p.isFeatured ?? false,
      },
    });
  }
  console.log(`✓ Loaded ${products.length} real Artvelle products`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
