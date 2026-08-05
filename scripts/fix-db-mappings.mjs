import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDatabaseImages() {
  console.log('Fetching all products...');
  const products = await prisma.product.findMany();

  for (const product of products) {
    // Collect all old image paths for this product
    const oldPaths = new Set();
    
    if (Array.isArray(product.images)) {
      product.images.forEach(img => oldPaths.add(decodeURI(img)));
    }
    
    if (Array.isArray(product.variants)) {
      product.variants.forEach(v => {
        if (Array.isArray(v.images)) {
          v.images.forEach(img => oldPaths.add(decodeURI(img)));
        }
      });
    }

    if (oldPaths.size === 0) continue;

    // Group by directory
    const groups = {};
    Array.from(oldPaths).forEach(img => {
      const dir = img.substring(0, img.lastIndexOf('/'));
      if (!groups[dir]) groups[dir] = [];
      groups[dir].push(img);
    });

    const mapping = {};

    for (const [dir, files] of Object.entries(groups)) {
      files.sort();
      for (let i = 0; i < files.length; i++) {
        let newName = '';
        if (i === 0) {
          newName = 'hero.webp';
        } else if (i === files.length - 1 && files.length >= 3) {
          newName = 'lifestyle.webp';
        } else {
          const galleryIndex = String(i).padStart(2, '0');
          newName = `gallery-${galleryIndex}.webp`;
        }
        
        mapping[files[i]] = `${dir}/${newName}`;
        // Add encoded version just in case
        mapping[encodeURI(files[i])] = encodeURI(`${dir}/${newName}`);
      }
    }

    // Now update the product JSON
    const newImages = (product.images || []).map(img => mapping[img] || mapping[decodeURI(img)] || img);
    
    const newVariants = (product.variants || []).map(v => {
      if (v.images) {
        v.images = v.images.map(img => mapping[img] || mapping[decodeURI(img)] || img);
      }
      return v;
    });

    console.log(`Updating Product: ${product.name}`);
    await prisma.product.update({
      where: { id: product.id },
      data: {
        images: newImages,
        variants: newVariants
      }
    });

    // Also update Media table for the relational schema
    for (const [oldUrl, newUrl] of Object.entries(mapping)) {
      const mediaRecords = await prisma.media.findMany({
        where: { url: oldUrl }
      });
      
      for (const media of mediaRecords) {
        try {
          await prisma.media.update({
            where: { id: media.id },
            data: { 
              url: newUrl,
              file: newUrl.split('/').pop()
            }
          });
        } catch (err) {
          // If unique constraint fails, it means the webp media is already created, so we can delete the old one
          if (err.code === 'P2002') {
             try { await prisma.media.delete({ where: { id: media.id } }); } catch(e) {}
          }
        }
      }
    }
  }

  console.log('Finished updating database mappings!');
}

fixDatabaseImages().catch(console.error).finally(() => prisma.$disconnect());
