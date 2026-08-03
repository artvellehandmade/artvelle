// Server-side only: touches the filesystem and the database.
import { readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { prisma } from "./prisma";
import manifest from "./media-manifest.json";

/** One photo that lives in the repo under public/products/gallery. */
export type Photo = {
  /** Site-relative, URL-encoded — exactly the string stored on products. */
  url: string;
  file: string;
  /** Top folder, e.g. "Pooja Essentials". */
  category: string;
  /** Second folder, e.g. "Resin Pooja Thali". Empty when there isn't one. */
  group: string;
  size?: number;
};

/** Where a photo is currently attached. Detaching never deletes the file. */
export type PhotoUse = {
  kind: "product" | "subcategory" | "category";
  id: string;
  name: string;
};

export type MediaLibrary = {
  photos: Photo[];
  /** url → everything currently using it, so the same file is reused, not re-uploaded. */
  usage: Record<string, PhotoUse[]>;
};

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|svg)$/i;

function galleryDir() {
  return join(process.cwd(), "public", "products", "gallery");
}

function describe(absPath: string): Photo {
  const rel = relative(galleryDir(), absPath).split(sep);
  return {
    url: encodeURI(`/products/gallery/${rel.join("/")}`),
    file: rel[rel.length - 1],
    category: rel.length >= 2 ? rel[0] : "",
    group: rel.length >= 3 ? rel.slice(1, -1).join(" / ") : "",
  };
}

async function walk(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (IMAGE_EXT.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Every photo in the repo.
 *
 * Reads the real folder when it is there (local dev — a photo dropped in shows
 * up on the next refresh, no rebuild) and otherwise falls back to the manifest
 * generated at build time, which is what production uses because `public/` is
 * not readable from Vercel's serverless filesystem.
 */
export async function listPhotos(): Promise<Photo[]> {
  const files = await walk(galleryDir());
  if (files.length > 0) {
    const photos: Photo[] = [];
    for (const f of files.sort((a, b) => a.localeCompare(b))) {
      const info = describe(f);
      const size = await stat(f)
        .then((s) => s.size)
        .catch(() => undefined);
      photos.push({ ...info, size });
    }
    return photos;
  }
  return (manifest.photos ?? []) as Photo[];
}

/** Build the url → users map so the picker can show "used by 2 products". */
export async function getPhotoUsage(): Promise<Record<string, PhotoUse[]>> {
  const usage: Record<string, PhotoUse[]> = {};
  const add = (url: string, use: PhotoUse) => {
    if (!url) return;
    (usage[url] ??= []).push(use);
  };

  try {
    const [products, subcategories, categories] = await Promise.all([
      prisma.product.findMany({ select: { id: true, name: true, images: true } }),
      prisma.subcategory.findMany({
        select: { id: true, name: true, images: true },
      }),
      prisma.category.findMany({
        select: { id: true, name: true, imageUrl: true },
      }),
    ]);

    for (const p of products)
      for (const url of p.images)
        add(url, { kind: "product", id: p.id, name: p.name });
    for (const s of subcategories)
      for (const url of s.images)
        add(url, { kind: "subcategory", id: s.id, name: s.name });
    for (const c of categories)
      if (c.imageUrl) add(c.imageUrl, { kind: "category", id: c.id, name: c.name });
  } catch (err) {
    console.error("[media] usage lookup failed:", err);
  }

  return usage;
}

export async function getMediaLibrary(): Promise<MediaLibrary> {
  const [photos, usage] = await Promise.all([listPhotos(), getPhotoUsage()]);
  return { photos, usage };
}
