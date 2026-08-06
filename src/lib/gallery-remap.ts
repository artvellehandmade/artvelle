import galleryMoves from "./gallery-moves.json";

/**
 * Old gallery URL (pre-2026-08-06 folder layout) → new URL, generated when the
 * photo folders were reorganised into Category/Subcategory/Product/(common|
 * Variant)/ (scripts/tmp/restructure-gallery.mjs → src/lib/gallery-moves.json).
 *
 * Why remap on READ instead of only migrating the database once:
 *   • next/image (the Image optimizer) does NOT follow the 308 redirect in
 *     src/proxy.ts — it treats a redirected source as an error. So any product
 *     whose stored URL is an old path would show a broken image until the DB is
 *     migrated. Remapping here means the storefront always emits the new,
 *     directly-servable path regardless of what is stored — so the folder move
 *     can deploy in one atomic step with no broken-image window, and historical
 *     snapshots (orders, leads) render correctly without being mutated.
 * The proxy redirect still matters for links opened directly (emails, Google
 * image results, hand-typed URLs) where there is no read-time remap.
 */
const MOVES = galleryMoves as Record<string, string>;

/** Remap a single URL to its current path (returns it unchanged if not moved). */
export function remapGalleryUrl<T extends string | null | undefined>(url: T): T {
  if (!url) return url;
  const direct = MOVES[url];
  if (direct) return direct as T;
  // The stored value and the map keys are both encodeURI'd, but be tolerant of
  // a differently-encoded input (e.g. a decoded path from an order snapshot).
  try {
    const normalised = encodeURI(decodeURIComponent(url));
    if (normalised !== url && MOVES[normalised]) return MOVES[normalised] as T;
  } catch {
    /* malformed escape — fall through */
  }
  return url;
}

/** Remap every URL in an array (non-arrays pass through untouched). */
export function remapGalleryUrls<T>(urls: T): T {
  return Array.isArray(urls)
    ? (urls.map((u) => (typeof u === "string" ? remapGalleryUrl(u) : u)) as T)
    : urls;
}
