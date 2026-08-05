import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const artifactsDir = 'C:\\Users\\15ind\\.gemini\\antigravity-ide\\brain\\d34eb3e6-d1c5-45e9-8ee2-1d02cae383a4';
const destDir = 'C:\\Users\\15ind\\OneDrive\\Desktop\\Quellflow\\code\\ResinArt\\artvelle\\public\\products\\gallery\\Personalised Gifts\\QR Code Frame';

async function replaceImages() {
  const files = fs.readdirSync(artifactsDir);
  const heroFile = files.find(f => f.startsWith('qr_hero_') && f.endsWith('.png'));
  const gallery45File = files.find(f => f.startsWith('qr_gallery_45_') && f.endsWith('.png'));
  const lifestyleFile = files.find(f => f.startsWith('qr_lifestyle_') && f.endsWith('.png'));
  const closeupFile = files.find(f => f.startsWith('qr_closeup_') && f.endsWith('.png'));

  if (!heroFile || !gallery45File || !lifestyleFile || !closeupFile) {
    console.error('Missing some generated images!');
    return;
  }

  // Delete existing files in destDir
  const existing = fs.readdirSync(destDir);
  for (const file of existing) {
    fs.unlinkSync(path.join(destDir, file));
  }

  async function processAndSave(source, dest, size) {
    await sharp(path.join(artifactsDir, source))
      .resize(size, size, { fit: 'cover', position: 'center' })
      .webp({ quality: 80 })
      .toFile(path.join(destDir, dest));
    console.log(`Saved ${dest}`);
  }

  // Process images
  await processAndSave(heroFile, 'hero.webp', 2048);
  await processAndSave(gallery45File, 'gallery-01.webp', 2048);
  await processAndSave(closeupFile, 'closeup.webp', 2048);
  await processAndSave(lifestyleFile, 'lifestyle.webp', 2048);
  
  // Create thumbnail from hero
  await processAndSave(heroFile, 'thumbnail.webp', 800);

  console.log('Successfully replaced images for QR Code Frame!');
}

replaceImages().catch(console.error);
