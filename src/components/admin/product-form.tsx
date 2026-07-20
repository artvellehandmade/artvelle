"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Upload, X, LinkIcon, Star, Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/utils";
import { createProduct, updateProduct } from "@/app/actions/admin";
import type { ProductDTO, ProductOption } from "@/lib/types";

type Props = { product?: ProductDTO };

export function ProductForm({ product }: Props) {
  const router = useRouter();
  const editing = !!product;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: product?.name ?? "",
    category: product?.category ?? CATEGORIES[0],
    secondaryCategory: product?.secondaryCategory ?? "",
    price: product?.price?.toString() ?? "",
    compareAtPrice: product?.compareAtPrice?.toString() ?? "",
    stock: product?.stock?.toString() ?? "0",
    description: product?.description ?? "",
    tags: product?.tags?.join(", ") ?? "",
    isFeatured: product?.isFeatured ?? false,
    isActive: product?.isActive ?? true,
  });
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [urlInput, setUrlInput] = useState("");
  const [options, setOptions] = useState<ProductOption[]>(
    product?.options ?? []
  );

  // ---- Options CRUD ----
  function addOptionGroup() {
    setOptions((prev) => [
      ...prev,
      { name: "", choices: [{ label: "", priceDelta: 0 }] },
    ]);
  }
  function removeOptionGroup(gi: number) {
    setOptions((prev) => prev.filter((_, i) => i !== gi));
  }
  function setGroupName(gi: number, name: string) {
    setOptions((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, name } : g))
    );
  }
  function addChoice(gi: number) {
    setOptions((prev) =>
      prev.map((g, i) =>
        i === gi
          ? { ...g, choices: [...g.choices, { label: "", priceDelta: 0 }] }
          : g
      )
    );
  }
  function removeChoice(gi: number, ci: number) {
    setOptions((prev) =>
      prev.map((g, i) =>
        i === gi
          ? { ...g, choices: g.choices.filter((_, j) => j !== ci) }
          : g
      )
    );
  }
  function setChoice(
    gi: number,
    ci: number,
    patch: Partial<{ label: string; priceDelta: number }>
  ) {
    setOptions((prev) =>
      prev.map((g, i) =>
        i === gi
          ? {
              ...g,
              choices: g.choices.map((c, j) =>
                j === ci ? { ...c, ...patch } : c
              ),
            }
          : g
      )
    );
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok && data.url) {
          setImages((prev) => [...prev, data.url]);
        } else {
          toast.error(data.error || "Upload failed");
        }
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setImages((prev) => [...prev, url]);
    setUrlInput("");
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Drop empty option groups / choices before saving.
    const cleanOptions = options
      .map((g) => ({
        name: g.name.trim(),
        choices: g.choices
          .filter((c) => c.label.trim())
          .map((c) => ({
            label: c.label.trim(),
            priceDelta: Number(c.priceDelta) || 0,
          })),
      }))
      .filter((g) => g.name && g.choices.length > 0);

    const payload = {
      name: form.name,
      category: form.category,
      secondaryCategory: form.secondaryCategory || null,
      options: cleanOptions,
      price: Number(form.price || 0),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
      stock: Number(form.stock || 0),
      description: form.description,
      tags: form.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      images,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
    };

    const res = editing
      ? await updateProduct(product!.id, payload)
      : await createProduct(payload);

    setSaving(false);
    if (res.ok) {
      toast.success(editing ? "Product updated" : "Product created");
      router.push("/admin/products");
      router.refresh();
    } else {
      toast.error(res.error || "Could not save");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_340px]">
      {/* Main */}
      <div className="space-y-6">
        <Card title="Product details">
          <label className="block">
            <span className="label">Name *</span>
            <input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="input"
              placeholder="Ocean Wave Resin Coaster Set"
            />
          </label>
          <label className="block">
            <span className="label">Description *</span>
            <textarea
              required
              rows={5}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="input resize-none"
            />
          </label>
          <label className="block">
            <span className="label">Tags (comma separated)</span>
            <input
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              className="input"
              placeholder="ocean, blue, gift"
            />
          </label>
        </Card>

        <Card title="Images">
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                >
                  <Image
                    src={img}
                    alt={`Image ${i + 1}`}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm hover:bg-muted">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addUrl();
                    }
                  }}
                  className="input pl-9"
                  placeholder="…or paste an image URL"
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addUrl}>
                Add
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The first image is used as the cover. Upload needs Vercel Blob
            configured; pasting an image URL always works.
          </p>
        </Card>

        <Card title="Options & variants">
          <p className="-mt-1 text-xs text-muted-foreground">
            Let customers choose e.g. <b>Size</b> or <b>Type</b>. Each choice can
            add to the price (leave 0 for no change). Different products can have
            different options.
          </p>

          {options.map((group, gi) => (
            <div
              key={gi}
              className="rounded-xl border border-border p-3.5"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  value={group.name}
                  onChange={(e) => setGroupName(gi, e.target.value)}
                  className="input h-9"
                  placeholder="Option name (e.g. Size, Type, Shape)"
                />
                <button
                  type="button"
                  onClick={() => removeOptionGroup(gi)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"
                  title="Remove this option"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 space-y-2 pl-6">
                {group.choices.map((choice, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <input
                      value={choice.label}
                      onChange={(e) => setChoice(gi, ci, { label: e.target.value })}
                      className="input h-9 flex-1"
                      placeholder="Choice (e.g. Small)"
                    />
                    <div className="relative w-32 shrink-0">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        +₹
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={choice.priceDelta || ""}
                        onChange={(e) =>
                          setChoice(gi, ci, {
                            priceDelta: Number(e.target.value) || 0,
                          })
                        }
                        className="input h-9 pl-8"
                        placeholder="0"
                        title="Extra price for this choice"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeChoice(gi, ci)}
                      disabled={group.choices.length <= 1}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"
                      title="Remove choice"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addChoice(gi)}
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Add choice
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addOptionGroup}
            className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2.5 text-sm hover:bg-muted"
          >
            <Plus className="h-4 w-4" /> Add an option (Size, Type…)
          </button>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <Card title="Pricing & stock">
          <label className="block">
            <span className="label">Price (₹) *</span>
            <input
              required
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="label">Compare-at price (₹)</span>
            <input
              type="number"
              min={0}
              value={form.compareAtPrice}
              onChange={(e) => set("compareAtPrice", e.target.value)}
              className="input"
              placeholder="Optional — shows a discount"
            />
          </label>
          <label className="block">
            <span className="label">Stock *</span>
            <input
              required
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => set("stock", e.target.value)}
              className="input"
            />
          </label>
        </Card>

        <Card title="Organisation">
          <label className="block">
            <span className="label">Category *</span>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="input"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Secondary category (optional)</span>
            <select
              value={form.secondaryCategory}
              onChange={(e) => set("secondaryCategory", e.target.value)}
              className="input"
            >
              <option value="">None</option>
              {CATEGORIES.filter((c) => c !== form.category).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-muted-foreground">
              Also list this piece under a second category (e.g. a gift item).
            </span>
          </label>

          <Toggle
            label="Featured on homepage"
            icon={<Star className="h-4 w-4" />}
            checked={form.isFeatured}
            onChange={(v) => set("isFeatured", v)}
          />
          <Toggle
            label="Active (visible in shop)"
            checked={form.isActive}
            onChange={(v) => set("isActive", v)}
          />
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex-1" size="lg">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : editing ? (
              "Save changes"
            ) : (
              "Create product"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push("/admin/products")}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 font-serif text-lg">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-sm"
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "left-0.5 translate-x-5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
