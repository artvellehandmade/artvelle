"use client";

/**
 * VariantMediaTab — the "Media" section inside the product form's Variants tab.
 *
 * Divides management into 3 focused sections:
 *
 *   1. Variant Previews   — one hero preview per visual variant value
 *   2. Design Galleries   — per-value galleries (accordion, drag-to-reorder),
 *                           each with a read-only "Final gallery" preview
 *   3. Common Gallery     — images shared across ALL variants (drag-to-reorder)
 *
 * The storefront gallery renders:  selectedDesignGallery + commonGallery
 * (this is exactly what the per-variant "Final gallery" preview shows).
 */

import { useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  X,
} from "lucide-react";
import { PhotoPicker } from "@/components/admin/photo-picker";
import type { ProductOption } from "@/lib/types";

export type VisualGalleryState = {
  /** key = variantValue string; null key = "common" gallery */
  galleries: Record<string, string[]>;
  previews: Record<string, string>;
  common: string[];
};

type Props = {
  options: ProductOption[];
  /** Which option is the visual (gallery-driving) one. Defaults to first option. */
  visualOptionName?: string;
  state: VisualGalleryState;
  onChange: (next: VisualGalleryState) => void;
  productCategory?: string;
  productSubcategory?: string;
};

/** Sentinel scope for the common gallery when tracking a drag. */
const COMMON_SCOPE = "__common__";

/** Reorder helper — move `from` to `to`, returning a new array. */
function reorder(list: string[], from: number, to: number): string[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function VariantMediaTab({
  options,
  visualOptionName,
  state,
  onChange,
  productCategory,
  productSubcategory,
}: Props) {
  // Determine which option is the "visual" one (drives gallery)
  const visualOption = options.find((o) =>
    visualOptionName
      ? o.name.toLowerCase() === visualOptionName.toLowerCase()
      : true
  ) ?? options[0];

  const visualValues = visualOption?.choices.map((c) => c.label).filter(Boolean) ?? [];

  // Track which accordion sections are open
  const [openSections, setOpenSections] = useState<Set<string>>(() =>
    new Set(visualValues.slice(0, 1)) // open first by default
  );

  // Which image is being dragged: { scope: variantValue | COMMON_SCOPE, index }.
  const [drag, setDrag] = useState<{ scope: string; index: number } | null>(null);

  function toggleSection(val: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }

  // ---- Gallery helpers ----

  function setGallery(variantValue: string, images: string[]) {
    onChange({
      ...state,
      galleries: { ...state.galleries, [variantValue]: images },
    });
  }

  function setPreview(variantValue: string, url: string | null) {
    const previews = { ...state.previews };
    if (url === null) delete previews[variantValue];
    else previews[variantValue] = url;
    onChange({ ...state, previews });
  }

  function setCommon(images: string[]) {
    onChange({ ...state, common: images });
  }

  // Remove a single image from a gallery
  function removeFromGallery(variantValue: string, url: string) {
    const cur = state.galleries[variantValue] ?? [];
    setGallery(variantValue, cur.filter((u) => u !== url));
    if (state.previews[variantValue] === url) setPreview(variantValue, null);
  }

  function removeFromCommon(url: string) {
    setCommon(state.common.filter((u) => u !== url));
  }

  // ---- Drag-and-drop reordering ----
  function onDropInGallery(variantValue: string, target: number) {
    if (drag && drag.scope === variantValue) {
      setGallery(variantValue, reorder(state.galleries[variantValue] ?? [], drag.index, target));
    }
    setDrag(null);
  }

  function onDropInCommon(target: number) {
    if (drag && drag.scope === COMMON_SCOPE) {
      setCommon(reorder(state.common, drag.index, target));
    }
    setDrag(null);
  }

  if (visualValues.length === 0) {
    return (
      <p className="rounded-lg bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
        Add at least one option with choices above to enable the Media tab.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Section 1: Variant Previews ── */}
      <div>
        <SectionHeader
          title="Variant Previews"
          description="One preview thumbnail per design — shown on the variant picker."
        />
        <div className="mt-3 flex flex-wrap gap-3">
          {visualValues.map((val) => {
            const preview = state.previews[val] ?? null;
            return (
              <div key={val} className="flex flex-col items-center gap-1.5">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-border bg-muted">
                  {preview ? (
                    <>
                      <Image
                        src={decodeURI(preview)}
                        alt={val}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPreview(val, null)}
                        className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white hover:bg-danger"
                        aria-label="Remove preview"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <span className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">
                      None
                    </span>
                  )}
                </div>
                <p className="max-w-[64px] truncate text-center text-[11px] font-medium">
                  {val}
                </p>
                <PhotoPicker
                  selected={preview ? [preview] : []}
                  onChange={([url]) => setPreview(val, url ?? null)}
                  max={1}
                  preferCategory={productCategory}
                  preferVariantValue={val}
                  preferSubcategory={productSubcategory}
                  label="Set"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Design Galleries ── */}
      <div>
        <SectionHeader
          title="Design Galleries"
          description="Assign a gallery to each design. All sizes/combos sharing this design will use these images. Drag photos to reorder."
        />
        <div className="mt-3 space-y-2">
          {visualValues.map((val) => {
            const gallery = state.galleries[val] ?? [];
            const isOpen = openSections.has(val);
            // The storefront shows this design's gallery followed by the common gallery.
            const finalGallery = [...gallery, ...state.common];

            return (
              <div key={val} className="overflow-hidden rounded-xl border border-border">
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => toggleSection(val)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 font-medium text-sm">{val}</span>
                  <span className="text-xs text-muted-foreground">
                    {gallery.length} image{gallery.length !== 1 ? "s" : ""}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                    {/* Actions row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <PhotoPicker
                        selected={gallery}
                        onChange={(imgs) => setGallery(val, imgs)}
                        preferCategory={productCategory}
                        preferVariantValue={val}
                        preferSubcategory={productSubcategory}
                        label="Pick Photos"
                      />
                    </div>

                    {/* Gallery grid (drag to reorder) */}
                    {gallery.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {gallery.map((img, i) => (
                          <div
                            key={img}
                            draggable
                            onDragStart={() => setDrag({ scope: val, index: i })}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => onDropInGallery(val, i)}
                            onDragEnd={() => setDrag(null)}
                            className={`group relative aspect-square cursor-move overflow-hidden rounded-lg border bg-muted transition-all ${
                              drag?.scope === val && drag.index === i
                                ? "border-accent opacity-40 ring-2 ring-accent"
                                : "border-border"
                            }`}
                          >
                            <Image
                              src={decodeURI(img)}
                              alt={`${val} image ${i + 1}`}
                              fill
                              sizes="80px"
                              className="pointer-events-none object-cover"
                            />
                            {/* Drag handle hint */}
                            <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                              <GripVertical className="h-3 w-3" />
                            </span>
                            {/* Set as preview button */}
                            {state.previews[val] !== img && (
                              <button
                                type="button"
                                onClick={() => setPreview(val, img)}
                                className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                                title="Set as preview"
                              >
                                Set preview
                              </button>
                            )}
                            {state.previews[val] === img && (
                              <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-semibold text-white">
                                Preview
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFromGallery(val, img)}
                              className="absolute right-1 bottom-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger"
                              aria-label="Remove"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        No images yet — use Pick Photos.
                      </p>
                    )}

                    {/* Read-only "Final gallery" = this design's gallery + common */}
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Final gallery preview ({finalGallery.length})
                      </p>
                      {finalGallery.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {finalGallery.map((img, i) => (
                            <div
                              key={`${img}-${i}`}
                              className="relative h-12 w-12 overflow-hidden rounded-md border border-border bg-muted"
                              title={i < gallery.length ? "Design image" : "Common image"}
                            >
                              <Image
                                src={decodeURI(img)}
                                alt={`Final ${i + 1}`}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                              {i >= gallery.length && (
                                <span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[7px] leading-tight text-white">
                                  common
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Nothing yet — this design has no images and there are no common images.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Common Gallery ── */}
      <div>
        <SectionHeader
          title="Common Gallery"
          description="These images always appear, regardless of which design is selected — packaging, lifestyle, dimensions, etc. Drag to reorder."
        />
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <PhotoPicker
              selected={state.common}
              onChange={setCommon}
              preferCategory={productCategory}
              preferSubcategory={productSubcategory}
              preferVariantValue=""   // "" = common sentinel (no variant tag)
              label="Pick Common Photos"
            />
          </div>
          {state.common.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {state.common.map((img, i) => (
                <div
                  key={img}
                  draggable
                  onDragStart={() => setDrag({ scope: COMMON_SCOPE, index: i })}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropInCommon(i)}
                  onDragEnd={() => setDrag(null)}
                  className={`group relative aspect-square cursor-move overflow-hidden rounded-lg border bg-muted transition-all ${
                    drag?.scope === COMMON_SCOPE && drag.index === i
                      ? "border-accent opacity-40 ring-2 ring-accent"
                      : "border-border"
                  }`}
                >
                  <Image
                    src={decodeURI(img)}
                    alt={`Common image ${i + 1}`}
                    fill
                    sizes="80px"
                    className="pointer-events-none object-cover"
                  />
                  {/* Drag handle hint */}
                  <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <GripVertical className="h-3 w-3" />
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCommon(img)}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              No common images yet — pick packaging, lifestyle, or dimension shots here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Helper components ----

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h4 className="font-medium text-sm">{title}</h4>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
