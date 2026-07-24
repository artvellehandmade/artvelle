import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-");
}

// -------------------------------------------------------------------------
// Artvelle real product catalogue.
// Prices/options are taken from the studio price notebook; edit any of them
// anytime from Admin → Products.
// category = primary section, secondaryCategory = also shows under this section.
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
  isActive?: boolean; // false = hidden from the storefront
  images?: string[]; // real photos in /public/products/gallery
  options?: {
    name: string;
    choices: { label: string; priceDelta: number }[];
  }[];
};

// Real photos live in /public/products/gallery/<Category>/<Product>/.
// encodeURI turns the spaces in the folder names into %20 so the URLs work.
const g = (path: string) => encodeURI(`/products/gallery/${path}`);
// Build [dir/base-1.jpg … dir/base-n.jpg]
const many = (dir: string, base: string, n: number) =>
  Array.from({ length: n }, (_, i) => g(`${dir}/${base}-${i + 1}.jpg`));

const products: SeedProduct[] = [
  // ------------------------- POOJA ESSENTIALS -------------------------
  {
    name: "Handcrafted Resin Pooja Thali",
    category: "Pooja Essentials",
    secondaryCategory: "Festive Decor",
    price: 599,
    compareAtPrice: 799,
    description:
      "A handcrafted resin pooja thali (aarti thali) with intricate detailing and a glossy mirror finish — perfect for daily aarti, festivals and gifting. Choose your design and size; each thali is poured and finished by hand.",
    tags: ["pooja thali", "aarti thali", "resin thali", "diwali", "festival", "gift", "handmade"],
    stock: 25,
    isFeatured: true,
    images: many("Pooja Essentials/Resin Pooja Thali", "pooja-thali", 19),
    options: [
      {
        name: "Design",
        choices: [
          { label: "Unique / White Marble", priceDelta: 0 },
          { label: "Ram–Hanuman Photo", priceDelta: 50 },
          { label: "Diya (Diveliya)", priceDelta: 150 },
          { label: "Pink 3-Vatki", priceDelta: 150 },
          { label: "Pichwai Art", priceDelta: 250 },
        ],
      },
      {
        name: "Size",
        choices: [
          { label: "6 inch", priceDelta: -150 },
          { label: "8 inch", priceDelta: 0 },
          { label: "10 inch", priceDelta: 150 },
          { label: "12 inch", priceDelta: 650 },
        ],
      },
    ],
  },
  {
    name: "Panchmashi Resin Spiritual Wall Art",
    category: "Pooja Essentials",
    secondaryCategory: "Home Decor",
    price: 199,
    compareAtPrice: 299,
    description:
      "A sacred resin Panchmashi piece for your home temple, blending traditional motifs with a modern glossy finish. A meaningful spiritual accent and a thoughtful gift.",
    tags: ["panchmashi", "pooja", "temple", "spiritual", "wall art", "gift"],
    stock: 20,
    images: many("Pooja Essentials/Panchmashi Wall Art", "panchmashi", 2),
    options: [
      {
        name: "Size",
        choices: [
          { label: "Standard", priceDelta: 0 },
          { label: "Large", priceDelta: 250 },
        ],
      },
    ],
  },
  {
    name: "Resin Mandir Backdrop",
    category: "Pooja Essentials",
    secondaryCategory: "Home Decor",
    price: 450,
    compareAtPrice: 599,
    description:
      "An elegant 3×2 ft resin mandir backdrop that catches the light beautifully behind your idols. Handmade to bring warmth and devotion to your sacred space.",
    tags: ["mandir", "temple", "mandir backdrop", "pooja", "home", "spiritual"],
    stock: 10,
    images: [g("Pooja Essentials/Mandir Backdrop/mandir-1.jpg")],
  },
  {
    name: "Resin Krishna Jhula for Laddu Gopal",
    category: "Pooja Essentials",
    secondaryCategory: "Home Decor",
    price: 1800,
    compareAtPrice: 2199,
    description:
      "A beautifully detailed resin Krishna Jhula (Kanha jhula) to cradle your Laddu Gopal, finished with gold accents. A heartfelt devotional piece for Janmashtami and everyday worship.",
    tags: ["krishna jhula", "kanha jhula", "laddu gopal", "janmashtami", "mandir", "spiritual"],
    stock: 8,
    isFeatured: true,
    images: many("Pooja Essentials/Krishna Jhula", "krishna-jhula", 2),
    options: [
      {
        name: "Size",
        choices: [
          { label: "8 inch plate", priceDelta: 0 },
          { label: "10 inch plate", priceDelta: 400 },
        ],
      },
    ],
  },
  {
    name: "Divine Resin God Photo Frame",
    category: "Pooja Essentials",
    secondaryCategory: "Home Decor",
    price: 1500,
    compareAtPrice: 1899,
    description:
      "A divine resin-finished frame for your favourite deity photograph, with a luminous glossy coat. Perfect for your pooja room or as a spiritual gift. Available up to a large 2×3 ft premium fibre panel.",
    tags: ["god frame", "god photo frame", "deity", "spiritual", "pooja", "gift"],
    stock: 12,
    isFeatured: true,
    images: many("Pooja Essentials/God Photo Frame", "god-frame", 3),
    options: [
      {
        name: "Size",
        choices: [
          { label: "9 × 11 inch", priceDelta: 0 },
          { label: "2 × 3 feet (Premium Fibre)", priceDelta: 10500 },
        ],
      },
    ],
  },

  // ------------------------- FESTIVE DECOR -------------------------
  {
    name: "Resin Shubh Labh Door Hanging",
    category: "Festive Decor",
    secondaryCategory: "Pooja Essentials",
    price: 299,
    compareAtPrice: 449,
    description:
      "Invite prosperity home with a handcrafted resin Shubh-Labh door hanging, gleaming with gold detail. A must-have for Diwali, housewarmings and your main door.",
    tags: ["shubh labh", "diwali", "festival", "door hanging", "housewarming"],
    stock: 30,
    images: many("Festive Decor/Shubh Labh Door Hanging", "shubh-labh", 4),
    options: [
      {
        name: "Type",
        choices: [
          { label: "Standard", priceDelta: 0 },
          { label: "Deluxe", priceDelta: 100 },
          { label: "Premium", priceDelta: 200 },
          { label: "MDF Base", priceDelta: 300 },
        ],
      },
    ],
  },
  {
    name: "Handcrafted Resin Toran Door Hanging",
    category: "Festive Decor",
    secondaryCategory: "Home Decor",
    price: 11999,
    compareAtPrice: 13999,
    description:
      "A statement 3 ft handcrafted resin toran (patta + jhumcha) for your doorway, rich with traditional motifs and gold detailing. A premium festive centrepiece for Diwali and celebrations.",
    tags: ["toran", "door hanging", "bandhanwar", "diwali", "festival", "premium"],
    stock: 4,
    images: [g("Festive Decor/Resin Toran/toran-1.jpg")],
  },

  // ------------------------- HOME DECOR -------------------------
  {
    name: "Custom Resin Name Plate",
    category: "Home Decor",
    secondaryCategory: "Personalised Gifts",
    price: 1999,
    compareAtPrice: 2499,
    description:
      "Announce your home in style with a custom resin name plate, hand-poured in your choice of colours with your family name in elegant lettering. Weather-resistant and made to order in MDF and premium finishes.",
    tags: ["name plate", "nameplate", "personalised", "door", "custom", "housewarming"],
    stock: 15,
    isFeatured: true,
    images: many("Home Decor/Resin Name Plate", "name-plate", 4),
    options: [
      {
        name: "Size",
        choices: [
          { label: "9 × 11 inch", priceDelta: 0 },
          { label: "12 inch", priceDelta: 500 },
          { label: "12 × 18 inch (MDF)", priceDelta: 1500 },
          { label: "18 inch", priceDelta: 3500 },
        ],
      },
    ],
  },

  // ------------------------- PERSONALISED GIFTS -------------------------
  {
    name: "Custom Resin Photo Frame",
    category: "Personalised Gifts",
    secondaryCategory: "Home Decor",
    price: 499,
    compareAtPrice: 699,
    description:
      "Turn a favourite photo into a glossy resin-coated keepsake frame. A treasured gift for weddings, anniversaries and family memories — choose your size and a wooden or metal stand.",
    tags: ["photo frame", "personalised", "memories", "anniversary", "custom", "gift"],
    stock: 30,
    isFeatured: true,
    images: many("Personalised Gifts/Resin Photo Frame", "photo-frame", 8),
    options: [
      {
        name: "Size",
        choices: [
          { label: "6 inch", priceDelta: 0 },
          { label: "8 inch", priceDelta: 200 },
          { label: "10 inch", priceDelta: 400 },
          { label: "12 inch", priceDelta: 600 },
        ],
      },
      {
        name: "Stand",
        choices: [
          { label: "Wooden Stand", priceDelta: 0 },
          { label: "Metal Stand", priceDelta: 100 },
        ],
      },
    ],
  },
  {
    name: "Personalised Baby Footprint & Newborn Frame",
    category: "Personalised Gifts",
    secondaryCategory: "Home Decor",
    price: 1200,
    compareAtPrice: 1499,
    description:
      "Capture your little one's first footprints or a newborn keepsake in a beautiful 9×11 inch resin frame (Pagli) — a heart-melting memory and a cherished gift for new parents.",
    tags: ["baby footprint", "pagli", "newborn", "keepsake", "personalised", "gift"],
    stock: 10,
    images: many("Personalised Gifts/Baby Footprint Frame", "baby-footprint", 2),
    options: [
      {
        name: "Type",
        choices: [
          { label: "Baby Footprint (Pagli)", priceDelta: 0 },
          { label: "Newborn Baby", priceDelta: 0 },
        ],
      },
    ],
  },
  {
    name: "Personalised Flower Photo Frame",
    category: "Personalised Gifts",
    secondaryCategory: "Wedding Preservation",
    price: 1200,
    compareAtPrice: 1499,
    description:
      "A personalised resin frame set with three preserved flowers around your photo, finished on a metal stand. A romantic keepsake for anniversaries and special days.",
    tags: ["flower frame", "personalised", "preserved flowers", "anniversary", "gift"],
    stock: 10,
    images: [g("Personalised Gifts/Flower Photo Frame/flower-frame-1.jpg")],
    options: [
      {
        name: "Size",
        choices: [
          { label: "10 inch", priceDelta: 0 },
          { label: "12 inch", priceDelta: 300 },
        ],
      },
    ],
  },
  {
    name: "Custom Resin Name Keychain",
    category: "Personalised Gifts",
    secondaryCategory: "Fashion Accessories",
    price: 199,
    compareAtPrice: 349,
    description:
      "A custom resin keychain with your name, initials or dried flowers set in crystal-clear resin. A charming little keepsake or return gift — personalise it your way.",
    tags: ["keychain", "name keychain", "personalised", "return gift", "accessory"],
    stock: 60,
    images: [
      g("Personalised Gifts/Name Keychain/keychain-1.jpg"),
      g("Personalised Gifts/Name Keychain/keychain-2.jpg"),
      g("Personalised Gifts/Name Keychain/keychain-car-1.jpg"),
    ],
    options: [
      {
        name: "Type",
        choices: [
          { label: "Standard", priceDelta: 0 },
          { label: "Premium", priceDelta: 100 },
        ],
      },
    ],
  },
  {
    name: "Custom Resin QR Code Frame",
    category: "Personalised Gifts",
    secondaryCategory: "Home Decor",
    price: 1200,
    compareAtPrice: 1499,
    description:
      "A modern personalised resin frame featuring a custom QR code with a light stand — link a wedding invite, a Spotify song or a video message. A unique, memorable keepsake gift.",
    tags: ["qr code", "qr frame", "personalised", "wedding", "spotify", "gift"],
    stock: 15,
    images: [g("Personalised Gifts/QR Code Frame/qr-frame-1.jpg")],
  },

  // ------------------------- FASHION ACCESSORIES -------------------------
  {
    name: "Personalised Resin Brooch",
    category: "Fashion Accessories",
    secondaryCategory: "Personalised Gifts",
    price: 199,
    compareAtPrice: 349,
    description:
      "A dainty handcrafted resin brooch that adds a refined touch to sarees, blazers and dupattas. Available as a single piece, a cute pet design, or a 'Mom & Dad To Be' set of two.",
    tags: ["brooch", "saree brooch", "accessory", "mom to be", "gift"],
    stock: 40,
    images: many("Fashion Accessories/Resin Brooch", "brooch", 2),
    options: [
      {
        name: "Type",
        choices: [
          { label: "Single", priceDelta: 0 },
          { label: "Pet / Dog Design", priceDelta: 0 },
          { label: "Mom & Dad To Be (Set of 2)", priceDelta: 200 },
        ],
      },
    ],
  },

  // ------------------------- WEDDING PRESERVATION -------------------------
  {
    name: "Wedding Varmala & Flower Preservation Frame",
    category: "Wedding Preservation",
    secondaryCategory: "Personalised Gifts",
    price: 3000,
    compareAtPrice: 3500,
    description:
      "Immortalise your wedding varmala and special-day blooms in resin — petals from your garland preserved in a stunning frame. Choose your size and full or half preservation. A once-in-a-lifetime memory to cherish forever.",
    tags: ["varmala", "flower preservation", "wedding", "garland", "keepsake", "anniversary"],
    stock: 6,
    isFeatured: true,
    images: [
      ...many("Wedding Preservation/Varmala and Flower Preservation", "varmala", 3),
      g("Wedding Preservation/Varmala and Flower Preservation/flower-preservation-1.jpg"),
    ],
    options: [
      {
        name: "Size",
        choices: [
          { label: "8 inch (Thick)", priceDelta: 0 },
          { label: "14 inch", priceDelta: 2000 },
          { label: "16 × 20 inch", priceDelta: 5000 },
        ],
      },
      {
        name: "Preservation",
        choices: [
          { label: "Full Preservation", priceDelta: 0 },
          { label: "Half Preservation", priceDelta: -1500 },
        ],
      },
    ],
  },

  // ------------------------- RAKHI COLLECTION -------------------------
  {
    name: "Personalised Rakhi Preservation Hamper",
    category: "Rakhi Collection",
    secondaryCategory: "Personalised Gifts",
    price: 149,
    compareAtPrice: 249,
    description:
      "Preserve the love of Raksha Bandhan — a curated resin hamper that keeps your rakhi as a lasting keepsake. From a mini hamper to a deluxe set with a 12-inch resin thali.",
    tags: ["rakhi hamper", "rakhi", "raksha bandhan", "brother", "gift set"],
    stock: 25,
    isFeatured: true,
    images: many("Rakhi Collection/Rakhi Preservation Hamper", "rakhi-hamper", 3),
    options: [
      {
        name: "Type",
        choices: [
          { label: "Mini Hamper", priceDelta: 0 },
          { label: "Deluxe Hamper with Thali (12 inch)", priceDelta: 1250 },
        ],
      },
    ],
  },
  {
    name: "Handcrafted Resin Rakhi",
    category: "Rakhi Collection",
    secondaryCategory: "Personalised Gifts",
    price: 120,
    compareAtPrice: 199,
    description:
      "A handcrafted resin rakhi that lasts well beyond Raksha Bandhan — set with dried flowers and shimmer in crystal-clear resin. Choose from Evil-Eye, Hanumanji, Brother and Bhai-Bhabhi designs.",
    tags: ["rakhi", "resin rakhi", "raksha bandhan", "keepsake", "gift"],
    stock: 100,
    images: many("Rakhi Collection/Resin Rakhi", "rakhi", 5),
    options: [
      {
        name: "Design",
        choices: [
          { label: "Evil Eye", priceDelta: 0 },
          { label: "Hanumanji", priceDelta: 0 },
          { label: "Brother", priceDelta: 80 },
          { label: "Bhai-Bhabhi Combo", priceDelta: 180 },
        ],
      },
    ],
  },

  // ------------------------- TABLEWARE & DINING -------------------------
  {
    name: "Personalised Resin Ring Platter",
    category: "Tableware & Dining",
    secondaryCategory: "Wedding Preservation",
    price: 799,
    compareAtPrice: 999,
    description:
      "An elegant resin ring platter to hold rings, trinkets and small treasures — a favourite for weddings, engagements and dressing tables. Glossy, sturdy and gift-ready.",
    tags: ["ring platter", "ring plate", "trinket tray", "wedding", "engagement", "gift"],
    stock: 20,
    isFeatured: true,
    images: many("Tableware and Dining/Ring Platter", "ring-platter", 6),
    options: [
      {
        name: "Size",
        choices: [
          { label: "8 inch", priceDelta: 0 },
          { label: "10 inch", priceDelta: 500 },
        ],
      },
    ],
  },

  // ------------------------- CAR ACCESSORIES -------------------------
  {
    name: "Resin Car Dashboard Idol (Ganesha)",
    category: "Car Accessories",
    secondaryCategory: "Pooja Essentials",
    price: 199,
    compareAtPrice: 299,
    description:
      "Bring calm to your drive with a compact resin Ganesha dashboard idol that sits securely on your car dashboard. A thoughtful gift for a new car.",
    tags: ["car dashboard", "dashboard idol", "ganesha", "car accessory", "new car", "gift"],
    stock: 40,
    images: many("Car Accessories/Dashboard Idol", "dashboard-idol", 3),
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
        images: p.images ?? [],
        options: p.options ?? [],
        stock: p.stock,
        isFeatured: p.isFeatured ?? false,
        isActive: p.isActive ?? true,
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
