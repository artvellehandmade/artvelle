import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GALLERY_DIR = path.join(__dirname, '../public/products/gallery');

// Recursively find all images
function findImages(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findImages(filePath));
    } else {
      if (/\.(jpe?g|png)$/i.test(file)) {
        results.push(filePath);
      }
    }
  });
  return results;
}

async function processImages() {
  console.log('Scanning gallery directory...');
  const allImages = findImages(GALLERY_DIR);
  
  // Group by folder
  const groups = {};
  allImages.forEach((img) => {
    const dir = path.dirname(img);
    if (!groups[dir]) groups[dir] = [];
    groups[dir].push(img);
  });

  console.log(`Found ${allImages.length} images across ${Object.keys(groups).length} products.`);

  for (const [dir, files] of Object.entries(groups)) {
    // Sort files to ensure consistent ordering
    files.sort();

    console.log(`\nProcessing ${path.basename(dir)} (${files.length} images)`);

    for (let i = 0; i < files.length; i++) {
      const originalPath = files[i];
      let newName = '';

      if (i === 0) {
        newName = 'hero.webp';
      } else if (i === files.length - 1 && files.length >= 3) {
        newName = 'lifestyle.webp';
      } else {
        const galleryIndex = String(i).padStart(2, '0');
        newName = `gallery-${galleryIndex}.webp`;
      }

      const newPath = path.join(dir, newName);

      try {
        // Generate main 2048x2048 image
        await sharp(originalPath)
          .resize(2048, 2048, { fit: 'cover', position: 'center' })
          .webp({ quality: 80 })
          .toFile(newPath);
        
        console.log(`  Created ${newName}`);

        // If this is the hero image, also generate the thumbnail
        if (i === 0) {
          const thumbPath = path.join(dir, 'thumbnail.webp');
          await sharp(originalPath)
            .resize(800, 800, { fit: 'cover', position: 'center' })
            .webp({ quality: 80 })
            .toFile(thumbPath);
          console.log(`  Created thumbnail.webp`);
        }

        // Delete the original file
        fs.unlinkSync(originalPath);
      } catch (err) {
        console.error(`  Error processing ${originalPath}:`, err);
      }
    }
  }
  
  console.log('\nMigration complete!');
}

processImages();
