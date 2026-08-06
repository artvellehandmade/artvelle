import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Starting migration to simple options...");
  
  const products = await prisma.product.findMany();
  let migratedCount = 0;

  for (const product of products) {
    let options = product.options;
    let variants = product.variants;
    let variantPrices = product.variantPrices;
    
    if (!options || !Array.isArray(options) || options.length === 0) continue;
    
    // We only need to migrate if options lack "affects" field
    const needsMigration = options.some(opt => !opt.affects);
    if (!needsMigration) continue;
    
    console.log(`Migrating product: ${product.name}`);
    
    // Default strategy: first option affects images (usually Design/Color), rest affect price
    let updatedOptions = options.map((opt, index) => {
      return {
        ...opt,
        affects: index === 0 ? "images" : "price",
        choices: opt.choices.map(choice => {
           let priceDelta = 0;
           let images = [];
           
           // Extract price/images from variants if possible
           if (variants && Array.isArray(variants)) {
              const matchedVariants = variants.filter(v => v.combo[opt.name] === choice.label);
              if (matchedVariants.length > 0) {
                 // Try to figure out delta relative to base price
                 const minVariantPrice = Math.min(...matchedVariants.map(v => Number(v.price) || product.price));
                 priceDelta = Math.max(0, minVariantPrice - product.price);
                 
                 // If it's an image-affecting option, extract unique images
                 if (index === 0) {
                    matchedVariants.forEach(v => {
                       if (v.images && Array.isArray(v.images)) {
                          v.images.forEach(img => {
                             if (!images.includes(img)) images.push(img);
                          });
                       }
                    });
                 }
              }
           }
           
           return {
             ...choice,
             priceDelta,
             images,
             previewImage: images.length > 0 ? images[0] : null,
             available: true
           };
        })
      };
    });
    
    await prisma.product.update({
      where: { id: product.id },
      data: {
        options: updatedOptions,
        variants: [] // We clear the variants array as it's no longer used
      }
    });
    
    migratedCount++;
  }
  
  console.log(`Migration complete. Migrated ${migratedCount} products.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
