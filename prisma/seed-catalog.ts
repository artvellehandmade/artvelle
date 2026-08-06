/**
 * seed-catalog.ts — Artvelle real product-catalogue loader.
 *
 * Transcribes the studio price notebook (~73 products across 7 categories /
 * 17 subcategories) into the database. It:
 *   • upserts the 7 Categories (by slug) and their Subcategories (by
 *     categoryId + slug) — reusing any that already exist,
 *   • upserts every Product by its unique slug (create OR update),
 *   • shapes each product's `options` / `variants` exactly the way the
 *     storefront expects (see src/lib/variants.ts → deriveVariantModel):
 *         options  = [{ name, choices: [{ label, priceDelta }] }]
 *         variants = [{ combo: { Attr: value }, price, available, images, previewImage }]
 *
 * It is IDEMPOTENT: re-running it never duplicates rows and never deletes
 * existing products — it simply re-syncs the catalogue.
 *
 * Run it (from the project root, with DATABASE_URL / DIRECT_URL pointing at
 * the target database) with:
 *
 *     npx tsx prisma/seed-catalog.ts
 *
 * NOTE: prices below are transcribed verbatim from the notebook. Edit any of
 * them here (or later from Admin → Products) and re-run to update.
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
// Variant-shape builders — every product is described with one of these so the
// generated `options` / `variants` JSON matches deriveVariantModel exactly.
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
type Shape = { options: Option[]; variants: Variant[]; price: number };

/** Single size / single price → no options, no variants. */
const single = (price: number): Shape => ({ options: [], variants: [], price });

/** Size-only product. price = the minimum size price. */
function sizeOnly(sizes: { label: string; price: number }[]): Shape {
  const options: Option[] = [
    { name: "Size", choices: sizes.map((s) => ({ label: s.label, priceDelta: 0 })) },
  ];
  const variants: Variant[] = sizes.map((s) => ({
    combo: { Size: s.label },
    price: s.price,
    available: true,
    images: [],
    previewImage: null,
  }));
  return { options, variants, price: Math.min(...sizes.map((s) => s.price)) };
}

/**
 * Size × Stand product. Each row gives the size and a price per stand type
 * (e.g. { Wooden: 500, Metal: 600 }). A row may omit a stand (e.g. Metal-only).
 * Variants = the cartesian of the sizes and the stands actually priced.
 * price = the minimum across all rows/stands.
 */
function sizeStand(rows: { size: string; prices: Record<string, number> }[]): Shape {
  const sizes = rows.map((r) => r.size);
  const stands = Array.from(new Set(rows.flatMap((r) => Object.keys(r.prices))));
  const options: Option[] = [
    { name: "Size", choices: sizes.map((s) => ({ label: s, priceDelta: 0 })) },
    { name: "Stand", choices: stands.map((s) => ({ label: s, priceDelta: 0 })) },
  ];
  const variants: Variant[] = [];
  for (const r of rows) {
    for (const stand of stands) {
      const price = r.prices[stand];
      if (price == null) continue;
      variants.push({
        combo: { Size: r.size, Stand: stand },
        price,
        available: true,
        images: [],
        previewImage: null,
      });
    }
  }
  return { options, variants, price: Math.min(...variants.map((v) => v.price)) };
}

/** Half / Full preservation product. price = the minimum (Half). */
function preservation(half: number, full: number): Shape {
  return {
    options: [
      {
        name: "Preservation",
        choices: [
          { label: "Half", priceDelta: 0 },
          { label: "Full", priceDelta: 0 },
        ],
      },
    ],
    variants: [
      { combo: { Preservation: "Half" }, price: half, available: true, images: [], previewImage: null },
      { combo: { Preservation: "Full" }, price: full, available: true, images: [], previewImage: null },
    ],
    price: Math.min(half, full),
  };
}

// The Size×Stand table for Photo Frame H(1); every "SAME AS H(1)" frame reuses it.
const H1_TABLE = [
  { size: "6 inch", prices: { Wooden: 500, Metal: 600 } },
  { size: "8 inch", prices: { Wooden: 700, Metal: 800 } },
  { size: "10 inch", prices: { Wooden: 900, Metal: 1100 } },
  { size: "12 inch", prices: { Wooden: 1100, Metal: 1200 } },
];

// ---------------------------------------------------------------------------
// The catalogue. `category` = primary Category NAME, `subcategory` = the group
// it sits in inside that category. The rest comes from a Shape builder above.
// ---------------------------------------------------------------------------
type SeedProduct = {
  name: string;
  description: string;
  category: string;
  subcategory: string;
} & Shape;

const products: SeedProduct[] = [
  // ===================== POOJA ESSENTIALS → Pooja Thali =====================
  {
    name: "Pink 3 Vatki (Steel) Pooja Thali",
    description: "A handcrafted resin pooja thali with three steel vatkis and a glossy pink finish for daily aarti and festivals.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...sizeOnly([
      { label: "8 inch", price: 500 },
      { label: "10 inch", price: 700 },
      { label: "12 inch", price: 1250 },
    ]),
  },
  {
    name: "White 3 Vatki (2 Steel, 1 Plastic) Pooja Thali",
    description: "An elegant white resin pooja thali with two steel and one plastic vatki, finished with a mirror gloss.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...sizeOnly([
      { label: "8 inch", price: 450 },
      { label: "10 inch", price: 600 },
      { label: "12 inch", price: 1150 },
    ]),
  },
  {
    name: "Ram & Hanuman Photo Pooja Thali",
    description: "A devotional resin pooja thali featuring a Ram and Hanuman photo, ideal for daily worship and gifting.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...sizeOnly([
      { label: "10 inch", price: 600 },
      { label: "12 inch", price: 1150 },
    ]),
  },
  {
    name: "4 Vatki (2 Steel, 2 Plastic) Pooja Thali",
    description: "A practical resin pooja thali with four vatkis (two steel, two plastic) for all your aarti essentials.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...sizeOnly([
      { label: "8 inch", price: 450 },
      { label: "10 inch", price: 600 },
      { label: "12 inch", price: 1150 },
    ]),
  },
  {
    name: "Unique Morpinch Design Pooja Thali",
    description: "A unique resin pooja thali with peacock-feather (morpinch) detailing and a luminous glossy coat.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...sizeOnly([
      { label: "8 inch", price: 450 },
      { label: "10 inch", price: 600 },
      { label: "12 inch", price: 1150 },
    ]),
  },
  {
    name: "Lavender Pooja Thali with Stone Work",
    description: "A lavender-toned resin pooja thali accented with delicate stone work for a refined festive look.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...sizeOnly([
      { label: "8 inch", price: 450 },
      { label: "10 inch", price: 600 },
      { label: "12 inch", price: 1150 },
    ]),
  },
  {
    name: "Unique Pichwai Art Pink Pooja Thali",
    description: "A pink resin pooja thali showcasing traditional Pichwai art in a premium handcrafted finish.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...sizeOnly([
      { label: "8 inch", price: 600 },
      { label: "10 inch", price: 800 },
      { label: "12 inch", price: 1350 },
    ]),
  },
  {
    name: "Shreenathji White Pooja Thali with Diya",
    description: "A white resin Shreenathji pooja thali with an integrated diya, perfect for temple aarti.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...sizeOnly([
      { label: "10 inch", price: 700 },
      { label: "12 inch", price: 1300 },
    ]),
  },
  {
    name: "Om Moti Work White Pooja Thali with Diya",
    description: "A white resin pooja thali with Om moti (bead) work and a built-in diya for a graceful aarti.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...sizeOnly([
      { label: "10 inch", price: 700 },
      { label: "12 inch", price: 1300 },
    ]),
  },
  {
    name: "Pink Pooja Thali with Shloka",
    description: "A pink resin pooja thali inscribed with a sacred shloka for a meaningful daily ritual.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...sizeOnly([
      { label: "8 inch", price: 450 },
      { label: "10 inch", price: 600 },
      { label: "12 inch", price: 1150 },
    ]),
  },
  {
    name: "Mini Pooja Thali (3 Plastic Vatki)",
    description: "A compact resin mini pooja thali with three plastic vatkis, ideal for small mandirs and travel.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...sizeOnly([
      { label: "6 inch", price: 350 },
      { label: "8 inch", price: 450 },
    ]),
  },
  {
    name: "Mini Pooja Thali Unique Design (2 Plastic Vatki)",
    description: "A uniquely designed resin mini pooja thali with two plastic vatkis for everyday worship.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...sizeOnly([
      { label: "6 inch", price: 350 },
      { label: "8 inch", price: 450 },
    ]),
  },
  {
    name: "Lavender Unique Pooja Thali (4 Vatki & 1 Diya)",
    description: "A lavender resin pooja thali with four vatkis and one diya in a distinctive 8-inch layout.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...single(500),
  },
  {
    name: "White Shubh Labh Pooja Thali (3 Vatki)",
    description: "A white resin Shubh-Labh pooja thali with three vatkis to invite prosperity into your worship.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...sizeOnly([
      { label: "10 inch", price: 700 },
      { label: "12 inch", price: 1200 },
    ]),
  },
  {
    name: "Unique 8 Inch Pooja Thali (Best Seller)",
    description: "Our best-selling unique resin pooja thali, hand-finished with a glossy shine.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...sizeOnly([
      { label: "6 inch", price: 350 },
      { label: "8 inch", price: 450 },
    ]),
  },
  {
    name: "8 Inch Flower Style Pooja Thali",
    description: "A dainty flower-style resin pooja thali in a handy 8-inch size for daily aarti.",
    category: "Pooja Essentials",
    subcategory: "Pooja Thali",
    ...single(450),
  },

  // ===================== POOJA ESSENTIALS → Kankavati =====================
  {
    name: "4 Inch Kankavati - Red Colour",
    description: "A 4-inch red resin kankavati (kumkum holder) with a glossy finish for your pooja thali.",
    category: "Pooja Essentials",
    subcategory: "Kankavati",
    ...single(120),
  },
  {
    name: "4 Inch Kankavati - Om Design",
    description: "A 4-inch resin kankavati with an Om design to hold kumkum and roli during worship.",
    category: "Pooja Essentials",
    subcategory: "Kankavati",
    ...single(120),
  },
  {
    name: "4 Inch Kankavati - Yellow Moti Work",
    description: "A 4-inch yellow resin kankavati accented with moti (bead) work for a festive touch.",
    category: "Pooja Essentials",
    subcategory: "Kankavati",
    ...single(120),
  },

  // ===================== POOJA ESSENTIALS → Panchmashi =====================
  {
    name: "Hanuman Chalisa 5 Ratna Panchmashi (Saffron Thread)",
    description: "A resin Panchmashi set with the Hanuman Chalisa and five ratnas on a saffron thread.",
    category: "Pooja Essentials",
    subcategory: "Panchmashi",
    ...single(200),
  },
  {
    name: "Hanuman Chalisa 5 Ratna Panchmashi (Black Thread)",
    description: "A resin Panchmashi set with the Hanuman Chalisa and five ratnas on a black thread.",
    category: "Pooja Essentials",
    subcategory: "Panchmashi",
    ...single(200),
  },
  {
    name: "5 Ratna Brooch Pooja Thali (Black & Green Thread)",
    description: "A resin 5-ratna brooch-style pooja piece on a black and green thread for daily protection.",
    category: "Pooja Essentials",
    subcategory: "Panchmashi",
    ...single(200),
  },

  // ===================== POOJA ESSENTIALS → Kanha Jhula =====================
  {
    name: "Kanha Jhula - Unique Colour Round Design",
    description: "A resin Kanha Jhula with a unique-colour round design to cradle your Laddu Gopal.",
    category: "Pooja Essentials",
    subcategory: "Kanha Jhula",
    ...sizeOnly([
      { label: "8 inch", price: 1800 },
      { label: "10 inch", price: 2200 },
    ]),
  },
  {
    name: "Kanha Jhula - Pink Colour Round Design",
    description: "A pink resin Kanha Jhula with a round design, a heartfelt piece for Janmashtami and daily worship.",
    category: "Pooja Essentials",
    subcategory: "Kanha Jhula",
    ...sizeOnly([
      { label: "8 inch", price: 1800 },
      { label: "10 inch", price: 2200 },
    ]),
  },

  // ===================== POOJA ESSENTIALS → Shubh Labh =====================
  {
    name: "Mould Based Shubh Labh with Ganesha",
    description: "A mould-based resin Shubh-Labh with Ganesha to welcome prosperity at your doorway.",
    category: "Pooja Essentials",
    subcategory: "Shubh Labh",
    ...single(500),
  },
  {
    name: "Small Size Shubh Labh",
    description: "A compact resin Shubh-Labh hanging, perfect for smaller doorframes and gifting.",
    category: "Pooja Essentials",
    subcategory: "Shubh Labh",
    ...single(300),
  },
  {
    name: "Flower Style Shubh Labh with Hanging",
    description: "A flower-style resin Shubh-Labh with a decorative hanging for a festive main door.",
    category: "Pooja Essentials",
    subcategory: "Shubh Labh",
    ...single(400),
  },
  {
    name: "MDF Based Big Shubh Labh with Ganesha",
    description: "A large MDF-based resin Shubh-Labh with Ganesha, a striking Diwali and housewarming accent.",
    category: "Pooja Essentials",
    subcategory: "Shubh Labh",
    ...single(600),
  },

  // ===================== PERSONALIZED GIFTS → Photo Frames =====================
  // God Photo Frames (E-series)
  {
    name: "God Photo Frame with Stone Work (HD Resolution)",
    description: "A 9x11 inch resin god photo frame with stone work and an HD-resolution print for your pooja room.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    ...single(1500),
  },
  {
    name: "God Photo Frame with Stone Work (HD Resolution)",
    description: "A 9x11 inch resin god photo frame with stone work and an HD-resolution print, a divine spiritual gift.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    ...single(1500),
  },
  {
    name: "God Photo Frame (Big) with Wooden Framing & Resin Art",
    description: "A large 3x2 ft god photo frame with wooden framing and resin art for a majestic devotional display.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    ...single(12000),
  },
  // Photo Frames (H-series)
  {
    name: "Engagement & Wedding Memory Photo Frame",
    description: "A glossy resin photo frame to preserve your engagement or wedding memory, in wooden or metal stand.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    ...sizeStand(H1_TABLE),
  },
  {
    name: "Moti Work Photo Frame",
    description: "A resin photo frame edged with delicate moti (bead) work, available in wooden or metal stand.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    ...sizeStand(H1_TABLE),
  },
  {
    name: "Unique Bouquet Style Photo Frame",
    description: "A unique bouquet-style resin photo frame that turns a favourite photo into art, in wooden or metal stand.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    ...sizeStand(H1_TABLE),
  },
  {
    name: "Newborn Baby Photo Frame (with Details)",
    description: "A 9x11 inch resin newborn photo frame with the baby's weight, date, height and name on a metal stand.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    ...single(1200),
  },
  {
    name: "Couple Photo Frame",
    description: "A romantic resin couple photo frame with a glossy finish, available in wooden or metal stand.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    ...sizeStand(H1_TABLE),
  },
  {
    name: "Golden Border Quote Photo Frame",
    description: "A resin photo frame with a golden border and a personalised quote, in wooden or metal stand.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    ...sizeStand(H1_TABLE),
  },
  {
    name: "Sea Theme Unique Photo Frame",
    description: "A unique sea-theme resin photo frame with an ocean-inspired finish, in wooden or metal stand.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    ...sizeStand(H1_TABLE),
  },
  {
    name: "Moti Work Photo Frame with Golden Border",
    description: "A resin photo frame combining moti (bead) work with a golden border, in wooden or metal stand.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    ...sizeStand(H1_TABLE),
  },
  {
    name: "Photo Frame with Stone Work",
    description: "A resin photo frame accented with sparkling stone work, available in wooden or metal stand.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    ...sizeStand(H1_TABLE),
  },
  {
    name: "3 Flower Style Unique Name Plate",
    description: "A unique 3-flower style resin name plate, hand-finished and mounted on a metal stand.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    ...sizeStand([
      { size: "10 inch", prices: { Metal: 1200 } },
      { size: "12 inch", prices: { Metal: 1500 } },
    ]),
  },
  {
    name: "Pagli Photo Frame with Name",
    description: "A 9x11 inch resin Pagli (footprint) photo frame with the baby's name on a metal stand.",
    category: "Personalized Gifts",
    subcategory: "Photo Frames",
    ...single(1200),
  },

  // ===================== PERSONALIZED GIFTS → Keychain =====================
  {
    name: "Personalised Name & Designation Keychain",
    description: "A 2-inch resin keychain personalised with your designation and name, a smart everyday keepsake.",
    category: "Personalized Gifts",
    subcategory: "Keychain",
    ...single(200),
  },
  {
    name: "Pagli Style Keychain with Baby Photo",
    description: "A Pagli-style resin keychain set with your baby's photo, a cherished memento and return gift.",
    category: "Personalized Gifts",
    subcategory: "Keychain",
    ...single(300),
  },

  // ===================== PERSONALIZED GIFTS → Broch =====================
  {
    name: "Mom To Be & Dad To Be Brooch (Set of 2)",
    description: "A resin 'Mom To Be & Dad To Be' brooch set of two, a lovely accessory for baby showers.",
    category: "Personalized Gifts",
    subcategory: "Broch",
    ...single(400),
  },
  {
    name: "Dog Tag Brooch",
    description: "A handcrafted resin dog-tag brooch, a fun personalised accessory.",
    category: "Personalized Gifts",
    subcategory: "Broch",
    ...single(200),
  },

  // ===================== HOME DECOR → Mandir Backdrop =====================
  {
    name: "Unique Marble Theme Mandir Backdrop with Shlok (Customizable)",
    description: "A customizable 3x2 ft resin mandir backdrop in a unique marble theme with a shlok, set behind your idols.",
    category: "Home Decor",
    subcategory: "Mandir Backdrop",
    ...single(4500),
  },

  // ===================== HOME DECOR → Resin Toran =====================
  {
    name: "Unique Moti Work Resin Toran (Dhingli Work & Real Crystal)",
    description: "A premium resin toran starting from 3 feet with moti work, dhingli detailing and real crystal, finished on two sides.",
    category: "Home Decor",
    subcategory: "Resin Toran",
    ...single(12000),
  },

  // ===================== HOME DECOR → Name Plate =====================
  {
    name: "MDF Base Name Plate (Morpinch, Cow & Flower)",
    description: "A 12x18 inch MDF-base resin name plate decorated with morpinch, cow and flower motifs.",
    category: "Home Decor",
    subcategory: "Name Plate",
    ...single(3500),
  },
  {
    name: "Unique Marble Theme Name Plate (Golden Stone Work)",
    description: "A 9x11 inch resin name plate in a marble theme with golden stone work for an elegant doorway.",
    category: "Home Decor",
    subcategory: "Name Plate",
    ...single(2000),
  },
  {
    name: "Round Golden Theme Name Plate (Morpinch & Stone Work)",
    description: "A 12-inch round resin name plate in a golden theme with morpinch and stone work.",
    category: "Home Decor",
    subcategory: "Name Plate",
    ...single(2500),
  },
  {
    name: "Dream Home Photo & Quote Name Plate",
    description: "An 18x18 inch resin name plate featuring your home photo and a personalised quote.",
    category: "Home Decor",
    subcategory: "Name Plate",
    ...single(4500),
  },

  // ===================== BUSINESS ESSENTIALS → QR Code =====================
  {
    name: "QR Code Photo Frame for Business (with Light Stand)",
    description: "A 7-inch resin QR-code photo frame with a light stand for business reviews, WhatsApp and payments.",
    category: "Business Essentials",
    subcategory: "QR Code",
    ...single(1200),
  },

  // ===================== CAR ACCESSORIES → Car Accessories =====================
  {
    name: "Ganesha Car Dashboard Monument",
    description: "A compact 2-inch resin Ganesha dashboard idol that sits securely on your car dashboard.",
    category: "Car Accessories",
    subcategory: "Car Accessories",
    ...single(200),
  },
  {
    name: "Sea Theme Keychain",
    description: "A 2-inch sea-theme resin keychain with an ocean-inspired finish, a charming car or bag accessory.",
    category: "Car Accessories",
    subcategory: "Car Accessories",
    ...single(200),
  },

  // ===================== WEDDING → Ring Platter =====================
  {
    name: "Bouquet Style Ring Platter",
    description: "An 8-inch resin ring platter in a bouquet style to hold rings and trinkets at your engagement.",
    category: "Wedding",
    subcategory: "Ring Platter",
    ...single(800),
  },
  {
    name: "Unique Ring Platter with Flower Decoration",
    description: "A 10-inch resin ring platter with unique flower decoration, a beautiful engagement centrepiece.",
    category: "Wedding",
    subcategory: "Ring Platter",
    ...single(2500),
  },
  {
    name: "Ring Platter with Flower Decoration & Light",
    description: "A 10-inch resin ring platter with flower decoration and integrated light for a glowing display.",
    category: "Wedding",
    subcategory: "Ring Platter",
    ...single(1800),
  },
  {
    name: "Handle Theme Ring Platter",
    description: "A 10-inch resin ring platter with a decorative handle theme, elegant and easy to present.",
    category: "Wedding",
    subcategory: "Ring Platter",
    ...single(1300),
  },
  {
    name: "Bouquet Style Transparent Flower Ring Platter",
    description: "A 10-inch bouquet-style resin ring platter with transparent flowers set in crystal-clear resin.",
    category: "Wedding",
    subcategory: "Ring Platter",
    ...single(1200),
  },
  {
    name: "Sea Theme Unique Ring Platter",
    description: "A 10-inch unique sea-theme resin ring platter with an ocean-inspired finish.",
    category: "Wedding",
    subcategory: "Ring Platter",
    ...single(1500),
  },

  // ===================== WEDDING → Wedding Preservation =====================
  {
    name: "Varmala Preservation with Wooden Frame (14 inch)",
    description: "Preserve your wedding varmala in a 14-inch resin wooden frame; choose half or full preservation.",
    category: "Wedding",
    subcategory: "Wedding Preservation",
    ...preservation(3500, 5000),
  },
  {
    name: "Varmala Preservation with Cube (7x7 inch)",
    description: "Preserve your wedding varmala inside a 7x7 inch resin cube; choose half or full preservation.",
    category: "Wedding",
    subcategory: "Wedding Preservation",
    ...preservation(2000, 3000),
  },
  {
    name: "Varmala Preservation with Wooden Frame (16x20 inch)",
    description: "Preserve your wedding varmala in a large 16x20 inch resin wooden frame; choose half or full preservation.",
    category: "Wedding",
    subcategory: "Wedding Preservation",
    ...preservation(6000, 8000),
  },

  // ===================== FESTIVE COLLECTION → Rakhi =====================
  {
    name: "Evil Eye Rakhi",
    description: "A handcrafted resin evil-eye rakhi that lasts well beyond Raksha Bandhan.",
    category: "Festive Collection",
    subcategory: "Rakhi",
    ...single(120),
  },
  {
    name: "Flower Theme Bracelet Rakhi",
    description: "A flower-theme resin bracelet rakhi set with dried blooms in crystal-clear resin.",
    category: "Festive Collection",
    subcategory: "Rakhi",
    ...single(200),
  },
  {
    name: "Hanuman Chalisa Theme Rakhi",
    description: "A devotional resin rakhi featuring a Hanuman Chalisa theme, a meaningful keepsake for your brother.",
    category: "Festive Collection",
    subcategory: "Rakhi",
    ...single(120),
  },
  {
    name: "Bhai-Bhabhi Rakhi (Set of 2)",
    description: "A resin Bhai-Bhabhi rakhi set of two for celebrating both your brother and sister-in-law.",
    category: "Festive Collection",
    subcategory: "Rakhi",
    ...single(300),
  },
  {
    name: "Flower & Moti Pyara Bhai Rakhi",
    description: "A 'Pyara Bhai' resin rakhi with flower and moti (bead) work in crystal-clear resin.",
    category: "Festive Collection",
    subcategory: "Rakhi",
    ...single(120),
  },
  {
    name: "Ganesha Theme Bhai Rakhi",
    description: "A Ganesha-theme resin 'Bhai' rakhi, an auspicious and lasting Raksha Bandhan keepsake.",
    category: "Festive Collection",
    subcategory: "Rakhi",
    ...single(120),
  },
  {
    name: "Elephant Cartoon Bhai Rakhi",
    description: "A playful elephant-cartoon resin 'Bhai' rakhi that kids and grown-ups will love.",
    category: "Festive Collection",
    subcategory: "Rakhi",
    ...single(120),
  },

  // ===================== FESTIVE COLLECTION → Rakhi Hamper =====================
  {
    name: "Rakhi Hamper (12 Inch Pooja Thali + Rakhi + Chocolate)",
    description: "A deluxe Raksha Bandhan hamper with a 12-inch resin pooja thali, a rakhi and chocolate.",
    category: "Festive Collection",
    subcategory: "Rakhi Hamper",
    ...single(1400),
  },
  {
    name: "Mini Rakhi Hamper with Chocolate & Rakhi",
    description: "A mini Raksha Bandhan hamper pairing chocolate with a handcrafted resin rakhi.",
    category: "Festive Collection",
    subcategory: "Rakhi Hamper",
    ...single(150),
  },
];

// ---------------------------------------------------------------------------
// The 7 categories the store already has (upserted by slug; reused if present).
// ---------------------------------------------------------------------------
const CATEGORIES = [
  "Pooja Essentials",
  "Personalized Gifts",
  "Home Decor",
  "Festive Collection",
  "Wedding",
  "Business Essentials",
  "Car Accessories",
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
  for (const name of CATEGORIES) {
    const slug = slugify(name);
    const existing = await prisma.category.findUnique({ where: { slug } });
    const cat = await prisma.category.upsert({
      where: { slug },
      update: {}, // reuse as-is if it already exists
      create: { name, slug },
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

    const subcategoryId = subId[`${p.category}|${p.subcategory}`] ?? null;

    const data = {
      name: p.name,
      slug,
      description: p.description,
      category: p.category,
      subcategoryId,
      options: p.options as unknown as Prisma.InputJsonValue,
      variants: p.variants as unknown as Prisma.InputJsonValue,
      price: p.price,
      compareAtPrice: null,
      images: [] as string[],
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
  console.log("\nArtvelle catalogue seed complete.");
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
