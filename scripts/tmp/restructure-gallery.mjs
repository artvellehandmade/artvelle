/**
 * restructure-gallery.mjs — move public/products/gallery into the scalable
 * Category/Subcategory/Product/(common|Variant)/file layout, and emit
 * src/lib/gallery-moves.json (old URL → new URL) used by:
 *   • proxy.ts             — permanent redirects so every old URL keeps working
 *   • flip-gallery-db.mjs  — post-deploy DB update
 *
 * Run:  node scripts/tmp/restructure-gallery.mjs           (dry run)
 *       node scripts/tmp/restructure-gallery.mjs --apply   (move files)
 */
import fs from 'fs';
import path from 'path';

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();
const GALLERY = path.join(ROOT, 'public', 'products', 'gallery');

// Old product folder (relative, decoded) → new product folder.
// Files inside go to "<new>/common" unless a special rule below says otherwise.
const FOLDER_MAP = {
  'Car Accessories/Dashboard Idol': 'Car Accessories/Dashboard Decor/Ganesha Dashboard Idol',
  'Fashion Accessories/Resin Brooch': 'Personalized Gifts/Brooches/Personalized Brooch',
  'Festive Decor/Resin Toran': 'Home Decor/Torans/Premium Resin Toran',
  'Festive Decor/Shubh Labh Door Hanging': 'Pooja Essentials/Pooja Accessories/Decorative Shubh Labh',
  'Home Decor/Resin Name Plate': 'Home Decor/Name Plates/Personalized Name Plate',
  'Personalised Gifts/Baby Footprint Frame': 'Home Decor/Photo Frames/Premium Resin Photo Frame',
  'Personalised Gifts/Flower Photo Frame': 'Home Decor/Photo Frames/Premium Resin Photo Frame',
  'Personalised Gifts/Name Keychain': 'Personalized Gifts/Keychains/Personalized Keychain',
  'Personalised Gifts/QR Code Frame': 'Business Essentials/Business Displays/Business QR Display',
  'Personalised Gifts/Resin Photo Frame': 'Home Decor/Photo Frames/Personalized Photo Frame',
  'Pooja Essentials/God Photo Frame': 'Pooja Essentials/Temple Decor/God Photo Frame',
  'Pooja Essentials/Krishna Jhula': 'Pooja Essentials/Temple Decor/Kanha Jhula',
  'Pooja Essentials/Mandir Backdrop': 'Pooja Essentials/Temple Decor/Mandir Backdrop',
  'Pooja Essentials/Panchmashi Wall Art': 'Pooja Essentials/Pooja Accessories/Panchratna Sacred Thread',
  'Pooja Essentials/Resin Pooja Thali': 'Pooja Essentials/Pooja Thalis', // special-cased below
  'Rakhi Collection/Rakhi Preservation Hamper': 'Festive Collection/Rakhi Hampers/Rakhi Gift Hamper',
  'Rakhi Collection/Resin Rakhi': 'Festive Collection/Rakhi/Designer Rakhi',
  'Tableware and Dining/Ring Platter': 'Wedding Collection/Ring Platters/Designer Ring Platter',
  'Wedding Preservation/Varmala and Flower Preservation': 'Wedding Collection/Wedding Preservation/Varmala Preservation',
};

/** Where each per-product photo of the shared thali folder belongs (from DB usage). */
const THALI_FILE_MAP = {
  'pooja-thali-7.jpg': 'Pooja Essentials/Pooja Thalis/Designer Pooja Thali/common',
  'pooja-thali-9.jpg': 'Pooja Essentials/Pooja Thalis/Designer Pooja Thali/common',
  'pooja-thali-15.jpg': 'Pooja Essentials/Pooja Thalis/Designer Pooja Thali/common',
  'pooja-thali-18.jpg': 'Pooja Essentials/Pooja Thalis/Designer Pooja Thali/common',
  'pooja-thali-4.jpg': 'Pooja Essentials/Pooja Thalis/Divine Pooja Thali/common',
  'pooja-thali-11.jpg': 'Pooja Essentials/Pooja Thalis/Divine Pooja Thali/common',
  'pooja-thali-2.jpg': 'Pooja Essentials/Pooja Accessories/Decorative Kankavati/common',
  'pooja-thali-5.jpg': 'Pooja Essentials/Pooja Accessories/Decorative Kankavati/common',
  'pooja-thali-19.jpg': 'Pooja Essentials/Pooja Accessories/Decorative Kankavati/common',
  // everything else in that folder (hero/gallery-*/lifestyle/thumbnail/unused jpgs)
  // is shared by several thali products → subcategory-level shared pool
};

/** Baby footprint photos are variant photos on the merged premium frame. */
const BABY_FOLDER = 'Personalised Gifts/Baby Footprint Frame';
const BABY_VARIANT_DIR = 'Home Decor/Photo Frames/Premium Resin Photo Frame/Baby Footprint';

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function newRelPath(oldRel) {
  const parts = oldRel.split('/');
  const folder = parts.slice(0, -1).join('/');
  const file = parts[parts.length - 1];

  if (folder === BABY_FOLDER) return `${BABY_VARIANT_DIR}/${file}`;
  if (folder === 'Pooja Essentials/Resin Pooja Thali') {
    const target = THALI_FILE_MAP[file] ?? 'Pooja Essentials/Pooja Thalis/shared';
    return `${target}/${file}`;
  }
  const mapped = FOLDER_MAP[folder];
  if (!mapped) throw new Error(`No mapping for folder: ${folder}`);
  return `${mapped}/common/${file}`;
}

const files = walk(GALLERY).sort();
const moves = {}; // old URL (encoded) → new URL (encoded)
let moved = 0;

for (const abs of files) {
  const oldRel = path.relative(GALLERY, abs).split(path.sep).join('/');
  const newRel = newRelPath(oldRel);
  if (oldRel === newRel) continue;
  const oldUrl = encodeURI(`/products/gallery/${oldRel}`);
  const newUrl = encodeURI(`/products/gallery/${newRel}`);
  moves[oldUrl] = newUrl;
  console.log(`${oldRel}\n  -> ${newRel}`);
  if (APPLY) {
    const dest = path.join(GALLERY, ...newRel.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(abs, dest);
    moved++;
  }
}

if (APPLY) {
  // remove now-empty old directories
  const prune = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) prune(path.join(dir, e.name));
    }
    if (dir !== GALLERY && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  };
  prune(GALLERY);

  const out = path.join(ROOT, 'src', 'lib', 'gallery-moves.json');
  fs.writeFileSync(out, JSON.stringify(moves, null, 1) + '\n');
  console.log(`\nMoved ${moved} files. Wrote ${Object.keys(moves).length} URL mappings -> src/lib/gallery-moves.json`);
} else {
  console.log(`\nDry run: ${Object.keys(moves).length} files would move. Re-run with --apply.`);
}
