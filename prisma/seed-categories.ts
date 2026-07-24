import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-");
}

const CATEGORY_IMAGES: Record<string, string> = {
  "Home Decor": "/products/gallery/Home%20Decor/Resin%20Name%20Plate/name-plate-1.jpg",
  "Pooja Essentials": "/products/gallery/Pooja%20Essentials/Resin%20Pooja%20Thali/pooja-thali-1.jpg",
  "Wedding Preservation": "/products/gallery/Wedding%20Preservation/Varmala%20and%20Flower%20Preservation/varmala-1.jpg",
  "Personalised Gifts": "/products/gallery/Personalised%20Gifts/Resin%20Photo%20Frame/photo-frame-1.jpg",
  "Rakhi Collection": "/products/gallery/Rakhi%20Collection/Rakhi%20Preservation%20Hamper/rakhi-hamper-1.jpg",
  "Tableware & Dining": "/products/gallery/Tableware%20and%20Dining/Ring%20Platter/ring-platter-1.jpg",
  "Fashion Accessories": "/products/gallery/Fashion%20Accessories/Resin%20Brooch/brooch-1.jpg",
  "Car Accessories": "/products/gallery/Car%20Accessories/Dashboard%20Idol/dashboard-idol-1.jpg",
  "Festive Decor": "/products/gallery/Festive%20Decor/Resin%20Toran/toran-1.jpg",
};

const CATEGORIES = [
  "Home Decor",
  "Pooja Essentials",
  "Wedding Preservation",
  "Personalised Gifts",
  "Rakhi Collection",
  "Tableware & Dining",
  "Fashion Accessories",
  "Car Accessories",
  "Festive Decor",
];

async function main() {
  console.log("Seeding categories...");

  for (const name of CATEGORIES) {
    const slug = slugify(name);
    const imageUrl = CATEGORY_IMAGES[name] || null;

    await prisma.category.upsert({
      where: { name },
      update: { slug, imageUrl },
      create: { name, slug, imageUrl },
    });
  }

  console.log("✓ Categories seeded successfully.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
