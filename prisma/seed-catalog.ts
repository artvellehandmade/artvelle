/**
 * seed-catalog.ts — Artvelle refined product-catalogue loader.
 *
 * Transcribes the client's FINALIZED refined catalogue (20 products across 7
 * categories / 14 subcategories) into the database. It:
 *   • upserts the 7 Categories (by slug) and their Subcategories (by
 *     categoryId + slug) — reusing any that already exist,
 *   • upserts every Product by its unique slug (create OR update),
 *   • shapes each product's `options` / `variants` / `propertyModules` exactly
 *     the way the storefront expects (see src/lib/variants.ts →
 *     deriveVariantModel):
 *         options         = [{ name, choices: [{ label, priceDelta }] }]
 *         variants        = [{ combo: { Attr: value }, price, available, images, previewImage }]
 *         propertyModules = { images: [<image-driving option>], price: [<price-driving options>], stock: [], weight: [] }
 *
 * Per-product option architecture follows the client's refined spec:
 *   Design / Theme / Color / Type   → drive IMAGES
 *   Size / Configuration / Stand / Length / Preservation → drive PRICE
 * Each `variants` entry is the full cartesian of a product's options, with a
 * per-combo `price`. Prices are transcribed from the studio price list
 * (website-details.txt). Where the list gives a price for the price-driving
 * axis (Size / Stand / Preservation / per-design), that exact price is used;
 * where it gives no per-combo figure, the product's base/starting price is used
 * (noted inline). Product.price = the minimum variant price (or the single
 * price when a product has no options).
 *
 * It is IDEMPOTENT: re-running it never duplicates rows and never deletes
 * existing products — it simply re-syncs the catalogue. It is ADDITIVE: it does
 * not touch products/categories that aren't in this list.
 *
 * Run it (from the project root, with DATABASE_URL / DIRECT_URL pointing at the
 * target database) with:
 *
 *     npx tsx prisma/seed-catalog.ts
 *
 * NOTE: prices below are transcribed from the price list. Edit them here (or
 * later from Admin → Products) and re-run to update.
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

/** Mirrors src/lib/utils.ts → slugify; kept local so the seed is self-contained. */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Variant-shape types + builders. Every product is described with one of these
// so the generated `options` / `variants` / `propertyModules` JSON matches
// deriveVariantModel (and galleryForSelection) exactly.
// ---------------------------------------------------------------------------
type Choice = { label: string; priceDelta: number };
type Option = { name: string; choices: Choice[] };
type Variant = {
  combo: Record<string, string>;
  price: number;
  available: boolean;
  images: string[];
  previewImage: string | null;
};
type PropertyModules = {
  images: string[];
  price: string[];
  stock: string[];
  weight: string[];
};
type Shape = {
  options: Option[];
  variants: Variant[];
  propertyModules: PropertyModules;
  price: number;
};

/** An option spec: its choices and whether the choice drives images or price. */
type OptionSpec = { name: string; choices: string[]; drives: "images" | "price" };

/** Typed price-table lookup (avoids indexing an object literal by a string). */
type PriceMap = Record<string, number>;

/** Cartesian product of a set of options' choices → array of combos. */
function cartesian(options: { name: string; choices: string[] }[]): Record<string, string>[] {
  return options.reduce<Record<string, string>[]>(
    (acc, opt) => acc.flatMap((combo) => opt.choices.map((c) => ({ ...combo, [opt.name]: c }))),
    [{}]
  );
}

/**
 * Build a full option/variant model.
 *   specs   — the product's options (each flagged images- or price-driving)
 *   priceFn — returns the price for a full combo (usually a lookup on the
 *             price-driving axis; falls back to a base price otherwise)
 * `variants` is the cartesian of all options; `propertyModules` groups the
 * option names by what they drive; `price` = the minimum variant price.
 */
function model(specs: OptionSpec[], priceFn: (combo: Record<string, string>) => number): Shape {
  const options: Option[] = specs.map((o) => ({
    name: o.name,
    choices: o.choices.map((label) => ({ label, priceDelta: 0 })),
  }));
  const combos = cartesian(specs.map((o) => ({ name: o.name, choices: o.choices })));
  const variants: Variant[] = combos.map((combo) => ({
    combo,
    price: priceFn(combo),
    available: true,
    images: [],
    previewImage: null,
  }));
  const propertyModules: PropertyModules = {
    images: specs.filter((o) => o.drives === "images").map((o) => o.name),
    price: specs.filter((o) => o.drives === "price").map((o) => o.name),
    stock: [],
    weight: [],
  };
  const price = variants.length ? Math.min(...variants.map((v) => v.price)) : 0;
  return { options, variants, propertyModules, price };
}

/** Single price / no options. */
function single(price: number): Shape {
  return {
    options: [],
    variants: [],
    propertyModules: { images: [], price: [], stock: [], weight: [] },
    price,
  };
}

// ---------------------------------------------------------------------------
// Images. Real photos live in /public/products/gallery/<Category>/<folder>/.
// encodeURI turns spaces in the folder names into %20 so the URLs work.
// Only files that actually exist on disk are referenced (verified against the
// gallery tree). Order: hero → gallery-* → lifestyle → closeup → thumbnail.
// ---------------------------------------------------------------------------
const IMG = (p: string) => encodeURI(`/products/gallery/${p}`);
const pics = (dir: string, ...files: string[]) => files.map((f) => IMG(`${dir}/${f}`));
const galleryN = (n: number, ext = "webp") =>
  Array.from({ length: n }, (_, i) => `gallery-${String(i + 1).padStart(2, "0")}.${ext}`);

// The single Resin Pooja Thali folder (20 photos) is shared by the three thali
// products — they are the same product line at different tiers/sizes.
const THALI_IMAGES = pics(
  "Pooja Essentials/Resin Pooja Thali",
  "hero.webp",
  ...galleryN(17),
  "lifestyle.webp",
  "thumbnail.webp"
);

// The Size × Stand price grid for the Photo Frame, straight from H(1).
const FRAME_GRID: Record<string, PriceMap> = {
  '6"': { Wooden: 500, Metal: 600 },
  '8"': { Wooden: 700, Metal: 800 },
  '10"': { Wooden: 900, Metal: 1100 },
  '12"': { Wooden: 1100, Metal: 1200 },
};

// The Size × Preservation price grid for the Wedding Preservation Frame (O1–O3).
const PRESERVATION_GRID: Record<string, PriceMap> = {
  '7x7"': { Half: 2000, Full: 3000 },
  '14"': { Half: 3500, Full: 5000 },
  '16x20"': { Half: 6000, Full: 8000 },
};

// ---------------------------------------------------------------------------
// The refined catalogue. `category` = primary Category NAME, `subcategory` =
// the group inside that category (null = one-off, sits directly on the category
// page). The rest comes from a Shape builder above.
// ---------------------------------------------------------------------------
type SeedProduct = {
  name: string;
  description: string;
  category: string;
  subcategory: string | null;
  images: string[];
} & Shape;

const products: SeedProduct[] = [
  // ============================ POOJA ESSENTIALS ============================
  // --- Resin Pooja Thali ---
  {
    name: "Classic Pooja Thali",
    description:
      "A handcrafted resin pooja thali in your choice of design, size and bowl configuration for daily aarti and festivals.",
    category: "Pooja Essentials",
    subcategory: "Resin Pooja Thali",
    images: THALI_IMAGES,
    // Size drives price (8/10/12" from A(3), the standard 3-vatki thali).
    // Design (images) and Configuration carry no per-combo premium in the price
    // list, so every design/config keeps its size's base price.
    ...model(
      [
        {
          name: "Design",
          choices: [
            "White",
            "Pink",
            "Shubh Labh",
            "Shloka",
            "Ram & Hanuman",
            "Pichwai",
            "Lavender",
            "Stone Work",
          ],
          drives: "images",
        },
        { name: "Size", choices: ['8"', '10"', '12"'], drives: "price" },
        { name: "Configuration", choices: ["3 Bowls", "4 Bowls", "Divel"], drives: "price" },
      ],
      (c) => (({ '8"': 450, '10"': 600, '12"': 1150 } as PriceMap)[c.Size])
    ),
  },
  {
    name: "Mini Pooja Thali",
    description:
      "A compact resin mini pooja thali, ideal for small mandirs and travel; choose the design, size and bowl count.",
    category: "Pooja Essentials",
    subcategory: "Resin Pooja Thali",
    images: THALI_IMAGES,
    // Size drives price (6/8" from A(13)/A(14)/A(17)); Design/Configuration flat.
    ...model(
      [
        { name: "Design", choices: ["Unique", "Flower Style"], drives: "images" },
        { name: "Size", choices: ['6"', '8"'], drives: "price" },
        { name: "Configuration", choices: ["2 Bowls", "3 Bowls"], drives: "price" },
      ],
      (c) => (({ '6"': 350, '8"': 450 } as PriceMap)[c.Size])
    ),
  },
  {
    name: "Premium Designer Pooja Thali",
    description:
      "A premium resin pooja thali featuring detailed designer art with a luminous glossy finish, in three sizes.",
    category: "Pooja Essentials",
    subcategory: "Resin Pooja Thali",
    images: THALI_IMAGES,
    // Size drives price (8/10/12" from A(9) Pichwai, the premium tier); Design flat.
    ...model(
      [
        {
          name: "Design",
          choices: ["Pichwai", "Morpinch", "Om Moti Work", "Shreenathji"],
          drives: "images",
        },
        { name: "Size", choices: ['8"', '10"', '12"'], drives: "price" },
      ],
      (c) => (({ '8"': 600, '10"': 800, '12"': 1350 } as PriceMap)[c.Size])
    ),
  },
  {
    name: "Decorative Kankavati",
    description:
      "A 4-inch resin kankavati (kumkum holder) with a glossy finish to complete your pooja thali; pick your design.",
    category: "Pooja Essentials",
    subcategory: "Resin Pooja Thali",
    images: [], // no matching image folder in public/
    // A(2)/A(5)/A(19): all 4 inch, flat 120. Design drives images only.
    ...model(
      [{ name: "Design", choices: ["Red", "Om", "Yellow Moti Work"], drives: "images" }],
      () => 120
    ),
  },
  // --- Panchmashi ---
  {
    name: "Resin Panchmashi",
    description:
      "A resin Panchmashi set with the Hanuman Chalisa and five ratnas on your choice of sacred thread.",
    category: "Pooja Essentials",
    subcategory: "Panchmashi",
    images: pics("Pooja Essentials/Panchmashi Wall Art", "hero.webp", "gallery-01.webp", "thumbnail.webp"),
    // B(1)/B(2)/B(3): all flat 200. Thread type drives images only.
    ...model(
      [
        {
          name: "Type",
          choices: ["Saffron Thread", "Black Thread", "Black & Green Thread"],
          drives: "images",
        },
      ],
      () => 200
    ),
  },
  // --- Mandir Backdrop ---
  {
    name: "Custom Resin Mandir Backdrop",
    description:
      "A customizable 3x2 ft resin mandir backdrop in a marble theme with a shlok, set behind your idols.",
    category: "Pooja Essentials",
    subcategory: "Mandir Backdrop",
    images: pics("Pooja Essentials/Mandir Backdrop", "hero.webp", "thumbnail.webp"),
    ...single(4500),
  },
  // --- Kanha Jhula ---
  {
    name: "Resin Kanha Jhula",
    description:
      "A resin Kanha Jhula with a round design to cradle your Laddu Gopal; choose the colour and plate size.",
    category: "Pooja Essentials",
    subcategory: "Kanha Jhula",
    images: pics("Pooja Essentials/Krishna Jhula", "hero.webp", "gallery-01.webp", "thumbnail.webp"),
    // D(1)/D(2): Size drives price (8"→1800, 10"→2200); Colour drives images.
    ...model(
      [
        { name: "Color", choices: ["Unique", "Pink"], drives: "images" },
        { name: "Size", choices: ['8"', '10"'], drives: "price" },
      ],
      (c) => (({ '8"': 1800, '10"': 2200 } as PriceMap)[c.Size])
    ),
  },

  // ================================ HOME DECOR ==============================
  // --- Name Plates ---
  {
    name: "Custom Resin Name Plate",
    description:
      "A custom resin name plate hand-poured with your family name; choose the design and size for your doorway.",
    category: "Home Decor",
    subcategory: "Name Plates",
    images: pics(
      "Home Decor/Resin Name Plate",
      "hero.webp",
      "gallery-01.webp",
      "gallery-02.webp",
      "lifestyle.webp",
      "thumbnail.webp"
    ),
    // Size drives price, mapped from I(1)-I(4): 9x11"→2000, 12"→2500,
    // 12x18"→3500, 18x18"→4500. Design drives images (flat across sizes).
    ...model(
      [
        {
          name: "Design",
          choices: ["Marble Theme", "Round Golden", "MDF Morpinch", "Dream Home"],
          drives: "images",
        },
        { name: "Size", choices: ['9x11"', '12"', '12x18"', '18x18"'], drives: "price" },
      ],
      (c) =>
        (({ '9x11"': 2000, '12"': 2500, '12x18"': 3500, '18x18"': 4500 } as PriceMap)[c.Size])
    ),
  },
  // --- Door Toran ---
  {
    name: "Luxury Resin Toran",
    description:
      "A premium resin toran starting from 3 feet with moti and dhingli work and real crystal, finished on both sides.",
    category: "Home Decor",
    subcategory: "Door Toran",
    images: pics("Festive Decor/Resin Toran", "hero.webp", "thumbnail.webp"),
    // Price list gives a single starting price of 12000 (3 ft, two-side). Modelled
    // as a single price; length is quoted per order.
    ...single(12000),
  },
  // --- Shubh Labh ---
  {
    name: "Resin Shubh Labh",
    description:
      "A handcrafted resin Shubh-Labh door hanging to welcome prosperity; choose the style that suits your doorway.",
    category: "Home Decor",
    subcategory: "Shubh Labh",
    images: pics(
      "Festive Decor/Shubh Labh Door Hanging",
      "hero.webp",
      "gallery-01.webp",
      "gallery-02.webp",
      "lifestyle.webp",
      "thumbnail.webp"
    ),
    // L(1)-L(4): the Type is the only axis and carries the real per-style price
    // (Small 300, Flower Style 400, Mould+Ganesha 500, MDF Big 600). Type drives
    // images per the standard rule; price is resolved per combo.
    ...model(
      [
        {
          name: "Type",
          choices: ["Small", "Flower Style", "Mould Ganesha", "MDF Big Ganesha"],
          drives: "images",
        },
      ],
      (c) =>
        (({ Small: 300, "Flower Style": 400, "Mould Ganesha": 500, "MDF Big Ganesha": 600 } as PriceMap)[
          c.Type
        ])
    ),
  },

  // ============================== CAR ACCESSORIES ===========================
  {
    name: "Resin Dashboard Idol",
    description:
      "A compact 2-inch resin Ganesha dashboard idol that sits securely on your car dashboard.",
    category: "Car Accessories",
    subcategory: null, // one-off, sits directly on the category page
    images: pics(
      "Car Accessories/Dashboard Idol",
      "hero.webp",
      "gallery-01.webp",
      "lifestyle.webp",
      "closeup.webp",
      "thumbnail.webp"
    ),
    ...single(200),
  },

  // ============================= PERSONALISED GIFTS =========================
  // --- Photo Frames ---
  {
    name: "Custom Resin Photo Frame",
    description:
      "Turn a favourite photo into a glossy resin keepsake frame; choose the theme, size and wooden or metal stand.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    images: pics(
      "Personalised Gifts/Resin Photo Frame",
      "hero.webp",
      ...galleryN(6),
      "lifestyle.webp",
      "thumbnail.webp"
    ),
    // Client table: Theme (images), Size + Stand (price). Full Size×Stand grid
    // from H(1); Theme adds nothing (flat across the grid).
    ...model(
      [
        {
          name: "Theme",
          choices: ["Wedding", "Couple", "Baby", "Bouquet", "Golden", "Sea", "Stone"],
          drives: "images",
        },
        { name: "Size", choices: ['6"', '8"', '10"', '12"'], drives: "price" },
        { name: "Stand", choices: ["Wooden", "Metal"], drives: "price" },
      ],
      (c) => FRAME_GRID[c.Size][c.Stand]
    ),
  },
  {
    name: "Premium God Photo Frame",
    description:
      "A premium resin god photo frame with HD-resolution stone work; choose the standard 9x11 inch or the big 3x2 ft panel.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    images: pics(
      "Pooja Essentials/God Photo Frame",
      "hero.webp",
      "gallery-01.webp",
      "lifestyle.webp",
      "thumbnail.webp"
    ),
    // E(1)/E(2): 9x11" stone-work HD → 1500; E(3): big 3x2 ft wood-framing → 12000.
    ...model([{ name: "Size", choices: ['9x11"', "3x2 Feet"], drives: "price" }], (c) =>
      c.Size === '9x11"' ? 1500 : 12000
    ),
  },
  // --- Keychains ---
  {
    name: "Personalised Resin Keychain",
    description:
      "A personalised resin keychain — your name and designation, a Pagli baby photo or a sea theme — a smart everyday keepsake.",
    category: "Personalized Gifts",
    subcategory: "Keychains",
    images: pics(
      "Personalised Gifts/Name Keychain",
      "hero.webp",
      "gallery-01.webp",
      "lifestyle.webp",
      "closeup.webp",
      "thumbnail.webp"
    ),
    // G(1) Name & Designation 200, G(2) Pagli 300, M(3) Sea Theme 200. Type drives
    // images per the standard rule; each type carries its real price.
    ...model(
      [
        {
          name: "Type",
          choices: ["Name & Designation", "Pagli Baby Photo", "Sea Theme"],
          drives: "images",
        },
      ],
      (c) =>
        (({ "Name & Designation": 200, "Pagli Baby Photo": 300, "Sea Theme": 200 } as PriceMap)[
          c.Type
        ])
    ),
  },
  // --- Business Display ---
  {
    name: "QR Business Display Frame",
    description:
      "A 7-inch resin QR-code display frame with a light stand for business reviews, WhatsApp and payments.",
    category: "Personalized Gifts",
    subcategory: "Business Display",
    images: pics(
      "Personalised Gifts/QR Code Frame",
      "hero.webp",
      "gallery-01.webp",
      "lifestyle.webp",
      "closeup.webp",
      "thumbnail.webp"
    ),
    ...single(1200),
  },

  // ============================ FASHION ACCESSORIES =========================
  {
    name: "Personalised Resin Brooch",
    description:
      "A dainty handcrafted resin brooch that adds a refined touch to sarees, blazers and dupattas; single or set.",
    category: "Fashion Accessories",
    subcategory: null, // one-off, sits directly on the category page
    images: pics("Fashion Accessories/Resin Brooch", "hero.webp", "gallery-01.webp", "thumbnail.webp"),
    // F(1) Mom & Dad To Be set of 2 → 400, F(2) Dog Tag → 200. Type drives images;
    // each type carries its real price.
    ...model(
      [{ name: "Type", choices: ["Mom & Dad To Be (Set of 2)", "Dog Tag"], drives: "images" }],
      (c) => (c.Type === "Dog Tag" ? 200 : 400)
    ),
  },

  // ============================= WEDDING COLLECTION =========================
  // --- Ring Platters ---
  {
    name: "Resin Ring Platter",
    description:
      "An elegant resin ring platter to hold rings and trinkets at your engagement; choose the design and finish.",
    category: "Wedding",
    subcategory: "Ring Platters",
    images: pics(
      "Tableware and Dining/Ring Platter",
      "hero.png",
      "gallery-01.png",
      "gallery-02.png",
      "lifestyle.png"
    ),
    // N(1)-N(6): each design is offered at a fixed size, so the real per-design
    // price is carried on the Design axis (which also drives images).
    ...model(
      [
        {
          name: "Design",
          choices: [
            "Bouquet Style",
            "Transparent Flower",
            "Handle Theme",
            "Sea Theme",
            "Flower Decoration + Light",
            "Flower Decoration",
          ],
          drives: "images",
        },
      ],
      (c) =>
        (({
          "Bouquet Style": 800,
          "Transparent Flower": 1200,
          "Handle Theme": 1300,
          "Sea Theme": 1500,
          "Flower Decoration + Light": 1800,
          "Flower Decoration": 2500,
        } as PriceMap)[c.Design])
    ),
  },
  // --- Wedding Preservation ---
  {
    name: "Wedding Preservation Frame",
    description:
      "Preserve your wedding varmala and blooms in resin; choose the frame type, size and half or full preservation.",
    category: "Wedding",
    subcategory: "Wedding Preservation",
    images: pics(
      "Wedding Preservation/Varmala and Flower Preservation",
      "hero.webp",
      "gallery-01.webp",
      "gallery-02.webp",
      "lifestyle.webp",
      "thumbnail.webp"
    ),
    // Client table: Type (images), Size + Preservation (price). Size×Preservation
    // grid from O(1)-O(3). Type adds nothing (flat across the grid).
    // NOTE: the cartesian includes Type×Size combos the price list doesn't list
    // separately (e.g. Cube 16x20"); those inherit the size/preservation price.
    ...model(
      [
        { name: "Type", choices: ["Wooden Frame", "Cube"], drives: "images" },
        { name: "Size", choices: ['7x7"', '14"', '16x20"'], drives: "price" },
        { name: "Preservation", choices: ["Half", "Full"], drives: "price" },
      ],
      (c) => PRESERVATION_GRID[c.Size][c.Preservation]
    ),
  },

  // ============================= FESTIVE COLLECTION =========================
  // --- Rakhi ---
  {
    name: "Designer Resin Rakhi",
    description:
      "A handcrafted resin rakhi that lasts well beyond Raksha Bandhan; choose from evil-eye, floral and devotional designs.",
    category: "Festive Collection",
    subcategory: "Rakhi",
    images: pics(
      "Rakhi Collection/Resin Rakhi",
      "hero.webp",
      "gallery-01.webp",
      "gallery-02.webp",
      "gallery-03.webp",
      "lifestyle.webp",
      "thumbnail.webp"
    ),
    // Q(1)-Q(7): real per-design prices carried on the Design axis (drives images).
    ...model(
      [
        {
          name: "Design",
          choices: [
            "Evil Eye",
            "Flower Bracelet",
            "Hanuman Chalisa",
            "Bhai-Bhabhi (Set of 2)",
            "Pyara Bhai",
            "Ganesha",
            "Elephant Cartoon",
          ],
          drives: "images",
        },
      ],
      (c) =>
        (({
          "Evil Eye": 120,
          "Flower Bracelet": 200,
          "Hanuman Chalisa": 120,
          "Bhai-Bhabhi (Set of 2)": 300,
          "Pyara Bhai": 120,
          Ganesha: 120,
          "Elephant Cartoon": 120,
        } as PriceMap)[c.Design])
    ),
  },
  // --- Rakhi Hampers ---
  {
    name: "Premium Rakhi Hamper",
    description:
      "A Raksha Bandhan hamper pairing a handcrafted rakhi with chocolate; choose the mini set or the deluxe 12-inch thali set.",
    category: "Festive Collection",
    subcategory: "Rakhi Hampers",
    images: pics(
      "Rakhi Collection/Rakhi Preservation Hamper",
      "hero.png",
      "gallery-01.png",
      "gallery-02.png",
      "lifestyle.png"
    ),
    // P2/P3 Mini 150, P1 Deluxe (12" thali + rakhi + chocolate) 1400. Type drives
    // images; each type carries its real price.
    ...model(
      [
        {
          name: "Type",
          choices: ["Mini Hamper", 'Deluxe (12" Thali)'],
          drives: "images",
        },
      ],
      (c) => (c.Type === "Mini Hamper" ? 150 : 1400)
    ),
  },
];

// ---------------------------------------------------------------------------
// The 7 categories (upserted by slug; reused if present). Order = sortOrder.
// ---------------------------------------------------------------------------
const CATEGORIES = [
  "Pooja Essentials",
  "Home Decor",
  "Car Accessories",
  // NOTE: category display names are patched to match the store's EXISTING
  // live categories (Personalized Gifts / Wedding) so this additive seed
  // reuses them instead of creating near-duplicate categories. The image
  // FOLDER names on disk keep their original "Personalised Gifts" spelling
  // (see the `images` path strings above) — do not "fix" those to match.
  "Personalized Gifts",
  "Fashion Accessories",
  "Wedding",
  "Festive Collection",
];

async function main() {
  const counts = {
    catCreated: 0,
    catExisting: 0,
    subCreated: 0,
    subExisting: 0,
    prodCreated: 0,
    prodUpdated: 0,
  };

  // ---- Categories (upsert by unique slug) --------------------------------
  const catId: Record<string, string> = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const name = CATEGORIES[i];
    const slug = slugify(name);
    const existing = await prisma.category.findUnique({ where: { slug } });
    const cat = await prisma.category.upsert({
      where: { slug },
      update: {}, // reuse as-is if it already exists
      create: { name, slug, sortOrder: i },
    });
    catId[name] = cat.id;
    if (existing) counts.catExisting++;
    else counts.catCreated++;
  }

  // ---- Subcategories (upsert by [categoryId, slug]) ----------------------
  // Derived straight from the catalogue so every referenced group exists.
  const subId: Record<string, string> = {};
  const seenSub = new Set<string>();
  for (const p of products) {
    if (!p.subcategory) continue; // one-off product → no subcategory
    const key = `${p.category}|${p.subcategory}`;
    if (seenSub.has(key)) continue;
    seenSub.add(key);

    const categoryId = catId[p.category];
    if (!categoryId) throw new Error(`Product "${p.name}" references unknown category "${p.category}"`);

    const slug = slugify(p.subcategory);
    const existing = await prisma.subcategory.findUnique({
      where: { categoryId_slug: { categoryId, slug } },
    });
    const sub = await prisma.subcategory.upsert({
      where: { categoryId_slug: { categoryId, slug } },
      update: {}, // reuse as-is if it already exists
      create: { name: p.subcategory, slug, categoryId },
    });
    subId[key] = sub.id;
    if (existing) counts.subExisting++;
    else counts.subCreated++;
  }

  // ---- Products (upsert by unique slug) ----------------------------------
  // Slugs are deduped in array order (append -2, -3 …) so the mapping is
  // deterministic across runs and stays idempotent.
  const usedSlugs = new Set<string>();
  for (const p of products) {
    const base = slugify(p.name);
    let slug = base;
    let n = 1;
    while (usedSlugs.has(slug)) {
      n++;
      slug = `${base}-${n}`;
    }
    usedSlugs.add(slug);

    const subcategoryId = p.subcategory ? subId[`${p.category}|${p.subcategory}`] ?? null : null;

    const data = {
      name: p.name,
      slug,
      description: p.description,
      category: p.category,
      subcategoryId,
      options: p.options as unknown as Prisma.InputJsonValue,
      variants: p.variants as unknown as Prisma.InputJsonValue,
      propertyModules: p.propertyModules as unknown as Prisma.InputJsonValue,
      price: p.price,
      compareAtPrice: null,
      images: p.images,
      stock: 25,
      paymentModes: ["prepaid", "cod"],
      isActive: true,
      isFeatured: false,
    };

    const existing = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
    await prisma.product.upsert({
      where: { slug },
      update: data,
      create: data,
    });
    if (existing) counts.prodUpdated++;
    else counts.prodCreated++;
  }

  // ---- Summary -----------------------------------------------------------
  console.log("\nArtvelle refined catalogue seed complete.");
  console.log(
    `  Categories    : ${counts.catCreated} created, ${counts.catExisting} reused (${CATEGORIES.length} total)`
  );
  console.log(
    `  Subcategories : ${counts.subCreated} created, ${counts.subExisting} reused (${seenSub.size} total)`
  );
  console.log(
    `  Products      : ${counts.prodCreated} created, ${counts.prodUpdated} updated (${products.length} total)`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
