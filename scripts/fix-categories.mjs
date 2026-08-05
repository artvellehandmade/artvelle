import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCategories() {
  const cats = await prisma.category.findMany();
  for (const cat of cats) {
    if (cat.imageUrl && cat.imageUrl.includes('.jpg')) {
      const dir = cat.imageUrl.substring(0, cat.imageUrl.lastIndexOf('/'));
      await prisma.category.update({
        where: { id: cat.id },
        data: { imageUrl: `${dir}/hero.webp` }
      });
      console.log(`Updated category: ${cat.name}`);
    }
  }

  const subcats = await prisma.subcategory.findMany();
  for (const sub of subcats) {
    let updated = false;
    const newImages = sub.images.map(img => {
      if (img.includes('.jpg')) {
        updated = true;
        const dir = img.substring(0, img.lastIndexOf('/'));
        return `${dir}/hero.webp`;
      }
      return img;
    });

    if (updated) {
      await prisma.subcategory.update({
        where: { id: sub.id },
        data: { images: newImages }
      });
      console.log(`Updated subcategory: ${sub.name}`);
    }
  }

  console.log('Finished updating categories and subcategories!');
}

fixCategories().catch(console.error).finally(() => prisma.$disconnect());
