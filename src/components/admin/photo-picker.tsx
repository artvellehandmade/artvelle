"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Check, Images, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Photo = {
  url: string;
  file: string;
  category: string;
  group: string;
};
type PhotoUse = { kind: string; id: string; name: string };
type Library = { photos: Photo[]; usage: Record<string, PhotoUse[]> };

/**
 * Picks photos that already live in the repo under public/products/gallery.
 *
 * Nothing here uploads or deletes: choosing a photo just records its path, and
 * removing it only drops the path. The file stays in the repo, so the same
 * photo can be attached to another product later, or added back to this one.
 */
export function PhotoPicker({
  selected,
  onChange,
  max,
  /** Pre-filters the library to this category's folder when opened. */
  preferCategory,
  label = "Choose from photo library",
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
  preferCategory?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<string>("All");

  // Fetch once, the first time the picker is opened.
  useEffect(() => {
    if (!open || library || loading) return;
    setLoading(true);
    fetch("/api/admin/media")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not load photos");
        return data as Library;
      })
      .then(setLibrary)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [open, library, loading]);

  // Default the folder filter to the product's own category, when it has one.
  useEffect(() => {
    if (!open || !library || !preferCategory) return;
    const match = library.photos.find((p) => p.category === preferCategory);
    setFolder(match ? preferCategory : "All");
  }, [open, library, preferCategory]);

  const folders = useMemo(() => {
    const names = new Set<string>();
    for (const p of library?.photos ?? []) if (p.category) names.add(p.category);
    return ["All", ...[...names].sort()];
  }, [library]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (library?.photos ?? []).filter((p) => {
      if (folder !== "All" && p.category !== folder) return false;
      if (!needle) return true;
      return `${p.category} ${p.group} ${p.file}`.toLowerCase().includes(needle);
    });
  }, [library, folder, q]);

  // Group the visible photos by their subfolder, mirroring the repo layout.
  const grouped = useMemo(() => {
    const map = new Map<string, Photo[]>();
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
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <h3 className="font-serif text-lg">Photo library</h3>
                <p className="truncate text-xs text-muted-foreground">
                  {library ? `${library.photos.length} photos in the repo` : "Loading…"}
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

            <div className="space-y-3 border-b border-border px-5 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="input h-10 pl-9"
                  placeholder="Search photos…"
                />
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {folders.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFolder(f)}
                    className={cn(
                      "shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs transition-colors",
                      folder === f
                        ? "border-transparent bg-foreground text-background"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading && (
                <div className="grid place-items-center py-16 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}

              {!loading && grouped.length === 0 && (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No photos match. Add image files under{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    public/products/gallery/
                  </code>
                  .
                </p>
              )}

              {grouped.map(([groupName, photos]) => (
                <section key={groupName} className="mb-6">
                  <h4 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    {groupName}{" "}
                    <span className="normal-case opacity-60">
                      ({photos.length})
                    </span>
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
                              ? `${p.file} — already used by ${uses
                                  .map((u) => u.name)
                                  .join(", ")}`
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
                            src={p.url}
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
                          {uses.length > 0 && !on && (
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
