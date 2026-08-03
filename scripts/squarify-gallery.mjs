/**
 * Normalise every product gallery photo to a clean 1:1 square.
 *
 * The storefront renders all product imagery in `aspect-square` boxes
 * (product-card.tsx, product-gallery.tsx), so non-square source photos either
 * get hard-cropped on cards or letterboxed with grey bars on the PDP. This
 * script fixes that at the source instead.
 *
 * Per photo:
 *   1. auto-orient from EXIF
 *   2. trim baked-in black letterbox bars (phone screenshots)
 *   3. build a square canvas whose backdrop is a heavily blurred, slightly
 *      desaturated "cover" of the same photo — seamless on plain backdrops,
 *      tasteful on busy ones, never a dead grey bar
 *   4. soft shadow, then the FULL uncropped photo composited centred
 *   5. progressive mozjpeg
 *
 * Nothing is upscaled: the canvas is the photo's longest edge, clamped to
 * [1200, 1600].
 *
 * Photos are rewritten IN PLACE, so a ledger records what has already been
 * done — re-running would otherwise shrink each photo by another margin.
 *
 *   node scripts/squarify-gallery.mjs           # process new photos
 *   node scripts/squarify-gallery.mjs --dry     # report only, write nothing
 *   node scripts/squarify-gallery.mjs --only rakhi   # filter by path substring
 *   node scripts/squarify-gallery.mjs --force   # ignore the ledger
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', 'public', 'products', 'gallery');
const LEDGER = path.join(HERE, 'squarified-ledger.json');

const MIN = 1200;
const MAX = 1600;

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const FORCE = argv.includes('--force');
const ONLY = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;

/** Collect image paths under a directory tree. */
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Locate baked-in black bars by scanning a small greyscale proxy. A band only
 * counts as a bar when it is both very dark and flat, so genuinely dark photo
 * content at the edge is left alone. Returns a fractional crop box, or null.
 */
async function darkBarBox(buf) {
  const P = 64;
  const { data, info } = await sharp(buf)
    .rotate()
    .greyscale()
    .resize(P, P, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const at = (x, y) => data[y * info.width + x];
  const isBar = (pixels) => {
    let sum = 0;
    let max = 0;
    for (const v of pixels) {
      sum += v;
      if (v > max) max = v;
    }
    return sum / pixels.length < 26 && max < 46;
  };
  const row = (y) => Array.from({ length: P }, (_, x) => at(x, y));
  const col = (x) => Array.from({ length: P }, (_, y) => at(x, y));

  let top = 0;
  let bottom = P - 1;
  let left = 0;
  let right = P - 1;
  while (top < bottom && isBar(row(top))) top++;
  while (bottom > top && isBar(row(bottom))) bottom--;
  while (left < right && isBar(col(left))) left++;
  while (right > left && isBar(col(right))) right--;

  const keptY = (bottom - top + 1) / P;
  const keptX = (right - left + 1) / P;
  // Refuse implausible trims — that would mean the photo itself is mostly dark.
  if (keptY < 0.35 || keptX < 0.35) return null;
  if (keptY > 0.995 && keptX > 0.995) return null;

  return { top: top / P, left: left / P, width: keptX, height: keptY };
}

async function squarify(file) {
  const original = await fs.promises.readFile(file);
  let meta = await sharp(original).rotate().metadata();

  // 1. strip letterbox bars
  const box = await darkBarBox(original);
  let working;
  let trimmed = false;
  if (box) {
    working = await sharp(original)
      .rotate()
      .extract({
        left: Math.round(box.left * meta.width),
        top: Math.round(box.top * meta.height),
        width: Math.max(1, Math.round(box.width * meta.width)),
        height: Math.max(1, Math.round(box.height * meta.height)),
      })
      .toBuffer();
    meta = await sharp(working).metadata();
    trimmed = true;
  } else {
    working = await sharp(original).rotate().toBuffer();
  }

  // 2. canvas size — never upscale the photo
  const size = Math.round(Math.min(MAX, Math.max(MIN, Math.max(meta.width, meta.height))));

  // 3. blurred backdrop
  const backdrop = await sharp(working)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .blur(Math.max(8, Math.round(size / 26)))
    .modulate({ brightness: 0.96, saturation: 0.85 })
    .toBuffer();

  // 4. the photo itself, whole, centred, with a hair of breathing room
  const margin = Math.round(size * 0.018);
  const inner = size - margin * 2;
  const photo = await sharp(working)
    .resize(inner, inner, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();
  const pMeta = await sharp(photo).metadata();

  const shadow = await sharp({
    create: {
      width: Math.min(size, pMeta.width + margin * 2),
      height: Math.min(size, pMeta.height + margin * 2),
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0.26 },
    },
  })
    .blur(margin * 1.7)
    .png()
    .toBuffer();

  const out = await sharp(backdrop)
    .composite([
      { input: shadow, gravity: 'centre' },
      { input: photo, gravity: 'centre' },
    ])
    .jpeg({ quality: 86, progressive: true, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();

  if (!DRY) {
    const target = file.replace(/\.(png|webp)$/i, '.jpg');
    await fs.promises.writeFile(target, out);
    if (target !== file) await fs.promises.unlink(file);
  }

  return {
    rel: path.relative(ROOT, file),
    from: `${meta.width}x${meta.height}`,
    to: `${size}x${size}`,
    kb: Math.round(out.length / 1024),
    trimmed,
  };
}

const done = new Set(
  !FORCE && fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : []
);

let files = walk(ROOT);
if (ONLY) files = files.filter((f) => f.includes(ONLY));
const already = files.filter((f) => done.has(path.relative(ROOT, f))).length;
files = files.filter((f) => !done.has(path.relative(ROOT, f)));

console.log(
  `${files.length} image(s) to process, ${already} already square` +
    `${DRY ? ' [dry run]' : ''}\n`
);

let ok = 0;
for (const f of files) {
  try {
    const r = await squarify(f);
    ok++;
    done.add(r.rel);
    console.log(
      `${r.from.padEnd(10)} -> ${r.to.padEnd(10)} ${String(r.kb).padStart(4)}KB ` +
        `${r.trimmed ? '[trimmed] ' : ''}${r.rel}`
    );
  } catch (err) {
    console.error(`FAILED ${f}: ${err.message}`);
  }
}

if (!DRY) fs.writeFileSync(LEDGER, JSON.stringify([...done].sort(), null, 2));
console.log(`\ndone: ${ok}/${files.length}`);
