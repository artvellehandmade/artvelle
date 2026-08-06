import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Migrating ProductImage slots...');
  
  // Set slot = 'hero' where isPrimary = true
  const resHero = await prisma.productImage.updateMany({
    where: { isPrimary: true },
    data: { slot: 'hero' },
  });
  console.log(`Updated ${resHero.count} hero images.`);

  // Set slot = 'gallery' for the rest
  const resGallery = await prisma.productImage.updateMany({
    where: { isPrimary: false, slot: 'gallery' },
    data: { slot: 'gallery' },
  });
  console.log(`Updated ${resGallery.count} gallery images.`);

  console.log('Migrating Media roles based on filename...');
  const medias = await prisma.media.findMany();
  let updatedMedia = 0;
  for (const m of medias) {
    const roles = [];
    if (m.file.toLowerCase().includes('packaging')) roles.push('Packaging');
    if (m.file.toLowerCase().includes('dimension')) roles.push('Dimension Guide');
    
    if (roles.length > 0) {
      await prisma.media.update({
        where: { id: m.id },
        data: { roles },
      });
      updatedMedia++;
    }
  }
  console.log(`Updated ${updatedMedia} media with inferred roles.`);
  console.log('Migration complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
