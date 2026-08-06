"use client";

/**
 * VariantMediaTab — the new "Media" section inside the product form's variant module.
 *
 * Replaces the old flat "Photos" column in the variant table.
 * Divides management into 3 focused sections:
 *
 *   1. Variant Previews   — one hero preview per visual variant value
 *   2. Design Galleries   — per-value galleries (accordion, reorderable)
 *   3. Common Gallery     — images shared across ALL variants (packaging, lifestyle…)
 *
 * The frontend gallery renders:  selectedDesignGallery + commonGallery
 */

import { useState, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { PhotoPicker } from "@/components/admin/photo-picker";
import { cn } from "@/lib/utils";
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

  const [autoFilling, setAutoFilling] = useState<string | null>(null);

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

  // ---- Auto Fill ----
  const autoFill = useCallback(
    async (variantValue: string) => {
      if (autoFilling) return;
      setAutoFilling(variantValue);
      try {
        const params = new URLSearchParams({ limit: "100" });
        if (productCategory) params.set("category", productCategory);
        if (productSubcategory) params.set("subcategoryName", productSubcategory);
        params.set("variantValue", variantValue);

        const resp = await fetch(`/api/admin/media?${params}`);
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error);

        const designUrls: string[] = data.photos.map((p: { url: string }) => p.url);

        // Also pull common images (no variant tag, same category)
        const commonParams = new URLSearchParams({ limit: "100", variantValue: "__common__" });
        if (productCategory) commonParams.set("category", productCategory);
        if (productSubcategory) commonParams.set("subcategoryName", productSubcategory);
        const commonResp = await fetch(`/api/admin/media?${commonParams}`);
        const commonData = await commonResp.json();
        const commonUrls: string[] = (commonData.photos ?? []).map((p: { url: string }) => p.url);

        // Merge into state: preserve existing manual picks, add new ones
        const existingGallery = state.galleries[variantValue] ?? [];
        const newGallery = [...new Set([...existingGallery, ...designUrls])];
        const existingCommon = state.common ?? [];
        const newCommon = [...new Set([...existingCommon, ...commonUrls])];

        onChange({
          ...state,
          galleries: { ...state.galleries, [variantValue]: newGallery },
          common: newCommon,
          previews: {
            ...state.previews,
            ...(newGallery[0] && !state.previews[variantValue]
              ? { [variantValue]: newGallery[0] }
              : {}),
          },
        });

        toast.success(
          `Auto-filled ${designUrls.length} design image${designUrls.length !== 1 ? "s" : ""} + ${commonUrls.length} common image${commonUrls.length !== 1 ? "s" : ""}`
        );
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Auto-fill failed");
      } finally {
        setAutoFilling(null);
      }
    },
    [autoFilling, productCategory, productSubcategory, state, onChange]
  );

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
          description="Assign a gallery to each design. All sizes/combos sharing this design will use these images."
        />
        <div className="mt-3 space-y-2">
          {visualValues.map((val) => {
            const gallery = state.galleries[val] ?? [];
            const isOpen  = openSections.has(val);
            const isFilling = autoFilling === val;

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
                      <button
                        type="button"
                        onClick={() => autoFill(val)}
                        disabled={!!autoFilling}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all",
                          isFilling
                            ? "border-accent/40 bg-accent/10 text-accent"
                            : "border-accent/50 text-accent hover:bg-accent/5"
                        )}
                      >
                        <Sparkles className={cn("h-3.5 w-3.5", isFilling && "animate-pulse")} />
                        {isFilling ? "Auto-filling…" : "Auto Fill"}
                      </button>
                      <PhotoPicker
                        selected={gallery}
                        onChange={(imgs) => setGallery(val, imgs)}
                        preferCategory={productCategory}
                        preferVariantValue={val}
                        preferSubcategory={productSubcategory}
                        label="Pick Photos"
                      />
                    </div>

                    {/* Gallery grid */}
                    {gallery.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {gallery.map((img, i) => (
                          <div
                            key={img}
                            className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                          >
                            <Image
                              src={decodeURI(img)}
                              alt={`${val} image ${i + 1}`}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
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
                        No images yet — use Auto Fill or Pick Photos.
                      </p>
                    )}
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
          description="These images always appear, regardless of which design is selected — packaging, lifestyle, dimensions, etc."
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
                  className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                >
                  <Image
                    src={decodeURI(img)}
                    alt={`Common image ${i + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
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
