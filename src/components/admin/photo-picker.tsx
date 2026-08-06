"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Check, Images, Loader2, Search, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { MediaLibraryItem } from "@/lib/types";

type Library = { photos: MediaLibraryItem[]; usage: Record<string, { kind: string; id: string; name: string; slot?: string }[]>; total: number };

// Repo folders sort alphabetically; these two synthetic buckets go last.
const LAST = ["Uploaded", "Pasted links"];

/**
 * Picks any photo the store already has: the gallery committed to the repo,
 * anything uploaded to Vercel Blob, and any image URL pasted in by hand.
 *
 * When `preferVariantValue` is provided, the picker defaults to that value's
 * images first and shows a smart-filter badge so the admin knows the context.
 */
export function PhotoPicker({
  selected,
  onChange,
  max,
  /** Pre-filters the library to this category's folder when opened. */
  preferCategory,
  /** When set, filter defaults to images tagged with this variant value. */
  preferVariantValue,
  /** When set, show subcategory filter context. */
  preferSubcategory,
  label = "Choose from photo library",
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
  preferCategory?: string;
  preferVariantValue?: string;
  preferSubcategory?: string;
  label?: string;
}) {
  const [open, setOpen]       = useState(false);
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ]             = useState("");
  const [folder, setFolder]   = useState<string>("All");
  // Smart variant filter: "all" = no filter, a string = filter by variantValue
  const [variantFilter, setVariantFilter] = useState<string | null>(null);

  // Build query string for the API based on current filters
  function buildQuery() {
    const p = new URLSearchParams({ limit: "200" });
    if (folder !== "All") p.set("category", folder);
    if (variantFilter !== null) {
      p.set("variantValue", variantFilter === "" ? "__common__" : variantFilter);
    }
    if (q.trim()) p.set("q", q.trim());
    return p.toString();
  }

  // Fetch when opened (or when filters change)
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/admin/media?${buildQuery()}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not load photos");
        return data as Library;
      })
      .then(setLibrary)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, folder, variantFilter]);

  // Re-fetch on search with debounce
  useEffect(() => {
    if (!open || !library) return;
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/admin/media?${buildQuery()}`)
        .then((r) => r.json())
        .then(setLibrary)
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // When the picker first opens, set smart defaults
  useEffect(() => {
    if (!open) return;
    if (preferVariantValue !== undefined) {
      setVariantFilter(preferVariantValue);
    }
    if (preferCategory) {
      setFolder(preferCategory);
    }
  }, [open, preferVariantValue, preferCategory]);

  const folders = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of library?.photos ?? []) {
      if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    const names = [...counts.keys()].sort((a, b) => {
      const ai = LAST.indexOf(a);
      const bi = LAST.indexOf(b);
      if (ai !== bi) return (ai === -1 ? -1 : ai) - (bi === -1 ? -1 : bi);
      return a.localeCompare(b);
    });
    return [
      { name: "All", count: library?.photos.length ?? 0 },
      ...names.map((name) => ({ name, count: counts.get(name) ?? 0 })),
    ];
  }, [library]);

  // Photos are already filtered by the API; just do local text search
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return library?.photos ?? [];
    return (library?.photos ?? []).filter((p) =>
      `${p.category} ${p.group} ${p.file} ${p.variantValue ?? ""}`.toLowerCase().includes(needle)
    );
  }, [library, q]);

  // Group the visible photos by their subfolder, mirroring the repo layout.
  const grouped = useMemo(() => {
    const map = new Map<string, MediaLibraryItem[]>();
    for (const p of visible) {
      const key = [p.category, p.group].filter(Boolean).join(" / ") || "Ungrouped";
      const list = map.get(key);
      if (list) list.push(p);
      else map.set(key, [p]);
    }
    return [...map.entries()];
  }, [visible]);

  const atLimit = max !== undefined && selected.length >= max;

  function toggle(url: string) {
    if (selected.includes(url)) {
      onChange(selected.filter((u) => u !== url));
      return;
    }
    if (atLimit) {
      toast.error(`You can pick at most ${max} photo${max === 1 ? "" : "s"}.`);
      return;
    }
    onChange([...selected, url]);
  }

  const hasSmartFilter = variantFilter !== null;
  const smartFilterLabel =
    variantFilter === ""
      ? "Common (no variant)"
      : variantFilter
      ? `Design: ${variantFilter}`
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm hover:bg-muted"
      >
        <Images className="h-4 w-4" />
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <h3 className="font-serif text-lg">Photo library</h3>
                <p className="truncate text-xs text-muted-foreground">
                  {library
                    ? `${library.total ?? library.photos.length} photos total`
                    : "Loading…"}
                  {max !== undefined && ` · pick up to ${max}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-border text-muted-foreground hover:bg-muted"
                aria-label="Close photo library"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filters */}
            <div className="space-y-2.5 border-b border-border px-5 py-3">
              {/* Smart variant filter pill */}
              {(preferVariantValue !== undefined || preferSubcategory) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Smart filter:</span>
                  {hasSmartFilter && smartFilterLabel && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent">
                      <Tag className="h-3 w-3" />
                      {smartFilterLabel}
                      <button
                        type="button"
                        onClick={() => setVariantFilter(null)}
                        className="ml-0.5 hover:text-danger"
                        aria-label="Remove smart filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {!hasSmartFilter && (
                    <button
                      type="button"
                      onClick={() => setVariantFilter(preferVariantValue ?? null)}
                      className="rounded-full border border-dashed border-accent/50 px-2.5 py-1 text-xs text-accent hover:bg-accent/5"
                    >
                      Show {preferVariantValue ? `"${preferVariantValue}"` : "common"} images
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setVariantFilter(null); setFolder("All"); }}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Browse all
                  </button>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="input h-10 pl-9"
                  placeholder="Search photos…"
                />
              </div>

              {/* Category tabs */}
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {folders.map((f) => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => setFolder(f.name)}
                    className={cn(
                      "shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs transition-colors",
                      folder === f.name
                        ? "border-transparent bg-foreground text-background"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {f.name}
                    <span className="ml-1.5 opacity-60">{f.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading && (
                <div className="grid place-items-center py-16 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}

              {!loading && grouped.length === 0 && (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No photos match.{" "}
                  {hasSmartFilter && (
                    <button
                      type="button"
                      onClick={() => setVariantFilter(null)}
                      className="underline"
                    >
                      Remove smart filter
                    </button>
                  )}
                </p>
              )}

              {grouped.map(([groupName, photos]) => (
                <section key={groupName} className="mb-6">
                  <h4 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    {groupName}{" "}
                    <span className="normal-case opacity-60">({photos.length})</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                    {photos.map((p) => {
                      const on = selected.includes(p.url);
                      const uses = library?.usage[p.url] ?? [];
                      return (
                        <button
                          key={p.url}
                          type="button"
                          onClick={() => toggle(p.url)}
                          title={
                            uses.length
                              ? `${p.file} — used by ${uses.map((u) => u.name).join(", ")}`
                              : p.file
                          }
                          className={cn(
                            "group relative aspect-square cursor-pointer overflow-hidden rounded-xl border-2 bg-muted transition-all",
                            on
                              ? "border-accent ring-2 ring-accent/30"
                              : "border-transparent hover:border-border"
                          )}
                        >
                          <Image
                            src={decodeURI(p.url)}
                            alt={p.file}
                            fill
                            sizes="(max-width: 640px) 33vw, 20vw"
                            className="object-cover"
                          />
                          {on && (
                            <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-foreground shadow">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {/* Variant value badge */}
                          {p.variantValue && (
                            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-accent/80 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur">
                              {p.variantValue}
                            </span>
                          )}
                          {!p.variantValue && uses.length > 0 && !on && (
                            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                              in {uses.length}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">
              <p className="text-xs text-muted-foreground">
                {selected.length} selected. Removing a photo here never deletes
                the file — you can add it back, or to another product, anytime.
              </p>
              <Button type="button" size="sm" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
