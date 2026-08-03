"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Edit2,
  Image as ImageIcon,
  Layers,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoPicker } from "@/components/admin/photo-picker";
import { formatINR } from "@/lib/utils";
import {
  createSubcategory,
  deleteSubcategory,
  setProductSubcategory,
  updateSubcategory,
} from "@/app/actions/admin";

type Sub = {
  id: string;
  name: string;
  slug: string;
  images: string[];
  priceMin: number | null;
  priceMax: number | null;
  isActive: boolean;
  productCount: number;
  autoPriceMin: number;
  autoPriceMax: number;
  coverImages: string[];
};

type MiniProduct = {
  id: string;
  name: string;
  price: number;
  images: string[];
  isActive: boolean;
  subcategoryId: string | null;
};

type Draft = {
  name: string;
  images: string[];
  priceMin: string;
  priceMax: string;
  isActive: boolean;
};

const emptyDraft: Draft = {
  name: "",
  images: [],
  priceMin: "",
  priceMax: "",
  isActive: true,
};

export function SubcategoryManager({
  category,
  subcategories,
  products,
}: {
  category: { id: string; name: string };
  subcategories: Sub[];
  products: MiniProduct[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Which group's product list is expanded.
  const [managingId, setManagingId] = useState<string | null>(null);

  const loose = useMemo(
    () => products.filter((p) => !p.subcategoryId),
    [products]
  );

  function beginEdit(sub: Sub) {
    setAdding(false);
    setEditingId(sub.id);
    setDraft({
      name: sub.name,
      images: sub.images,
      priceMin: sub.priceMin?.toString() ?? "",
      priceMax: sub.priceMax?.toString() ?? "",
      isActive: sub.isActive,
    });
  }

  function payload() {
    return {
      categoryId: category.id,
      name: draft.name.trim(),
      images: draft.images,
      priceMin: draft.priceMin === "" ? null : Number(draft.priceMin),
      priceMax: draft.priceMax === "" ? null : Number(draft.priceMax),
      isActive: draft.isActive,
    };
  }

  function save() {
    if (!draft.name.trim()) {
      toast.error("Give the subcategory a name");
      return;
    }
    start(async () => {
      const res = editingId
        ? await updateSubcategory(editingId, payload())
        : await createSubcategory(payload());
      if (res.ok) {
        toast.success(editingId ? "Subcategory updated" : "Subcategory created");
        setAdding(false);
        setEditingId(null);
        setDraft(emptyDraft);
        router.refresh();
      } else {
        toast.error(res.error || "Could not save");
      }
    });
  }

  function remove(sub: Sub) {
    if (
      !confirm(
        `Delete the subcategory "${sub.name}"?\n\nIts ${sub.productCount} product(s) are NOT deleted — they will show directly on the ${category.name} page instead.`
      )
    )
      return;
    start(async () => {
      const res = await deleteSubcategory(sub.id);
      if (res.ok) {
        toast.success("Subcategory deleted");
        router.refresh();
      } else {
        toast.error(res.error || "Could not delete");
      }
    });
  }

  function move(productId: string, subcategoryId: string | null) {
    start(async () => {
      const res = await setProductSubcategory(productId, subcategoryId);
      if (res.ok) router.refresh();
      else toast.error(res.error || "Could not move product");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/categories"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All categories
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl">{category.name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Subcategories are the groups shoppers see on this category page.
              A group with <b>2 or more</b> products shows as a tile (name,
              photo, price range). A group with <b>one</b> product shows as that
              product instead.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setEditingId(null);
              setDraft(emptyDraft);
              setAdding((v) => !v);
            }}
          >
            {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {adding ? "Cancel" : "Add subcategory"}
          </Button>
        </div>
      </div>

      {(adding || editingId) && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-serif text-lg">
            {editingId ? "Edit subcategory" : "New subcategory"}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Name *</span>
              <input
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                className="input"
                placeholder="e.g. Resin Pooja Thali"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-3">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, isActive: e.target.checked }))
                }
                className="h-4 w-4"
              />
              <span className="text-sm">Visible on the store</span>
            </label>
          </div>

          <div>
            <span className="label">Price range (optional)</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                value={draft.priceMin}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, priceMin: e.target.value }))
                }
                className="input h-10 w-32"
                placeholder="500"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="number"
                min={0}
                value={draft.priceMax}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, priceMax: e.target.value }))
                }
                className="input h-10 w-32"
                placeholder="2000"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Leave both blank and the range is worked out from the products
              inside, so it stays correct on its own as you add or reprice
              pieces.
            </p>
          </div>

          <div>
            <span className="label">Cover photo (up to 2)</span>
            {draft.images.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-3">
                {draft.images.map((img) => (
                  <div
                    key={img}
                    className="relative h-24 w-24 overflow-hidden rounded-xl border border-border bg-muted"
                  >
                    <Image
                      src={img}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          images: d.images.filter((u) => u !== img),
                        }))
                      }
                      className="absolute right-1 top-1 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-black/65 text-white backdrop-blur"
                      title="Remove (the file stays in the repo)"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <PhotoPicker
              selected={draft.images}
              onChange={(images) => setDraft((d) => ({ ...d, images }))}
              max={2}
              preferCategory={category.name}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Leave empty to reuse the first photo of the products inside — no
              need to pick the same picture twice.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAdding(false);
                setEditingId(null);
                setDraft(emptyDraft);
              }}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Create subcategory"}
            </Button>
          </div>
        </div>
      )}

      {/* ---- The groups ---- */}
      <div className="space-y-3">
        {subcategories.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Layers className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 font-serif text-lg">No subcategories yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Add one — e.g. “Resin Pooja Thali” — then move the individual
              thalis into it. Until then, all {products.length} product(s) show
              directly on the {category.name} page.
            </p>
          </div>
        )}

        {subcategories.map((sub) => {
          const inside = products.filter((p) => p.subcategoryId === sub.id);
          const collapses = sub.productCount === 1;
          const min = sub.priceMin ?? sub.autoPriceMin;
          const max = sub.priceMax ?? sub.autoPriceMax;
          const manual = sub.priceMin != null || sub.priceMax != null;
          const cover = sub.coverImages[0];

          return (
            <div
              key={sub.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="flex flex-wrap items-center gap-4 p-4">
                <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={sub.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground/60" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{sub.name}</p>
                    {!sub.isActive && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        Hidden
                      </span>
                    )}
                    {sub.images.length === 0 && cover && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        Photo borrowed from product
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {sub.productCount === 0
                      ? "No products yet — hidden from the store"
                      : `${sub.productCount} product${
                          sub.productCount === 1 ? "" : "s"
                        } · ${
                          min === max
                            ? formatINR(min)
                            : `${formatINR(min)} – ${formatINR(max)}`
                        }`}
                    {manual && sub.productCount > 0 && " (manual range)"}
                  </p>
                  {collapses && (
                    <p className="mt-1 text-xs text-accent">
                      Only one product inside — the store shows that product
                      directly, not this group.
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-1.5">
                  {/* Straight into a new product with this group preselected —
                      the fastest way to add the 5th thali to the shelf. */}
                  <Link
                    href={`/admin/products/new?category=${encodeURIComponent(
                      category.name
                    )}&subcategoryId=${sub.id}`}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-xs font-medium text-background hover:opacity-90"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add product
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      setManagingId((v) => (v === sub.id ? null : sub.id))
                    }
                    className="cursor-pointer rounded-full border border-border px-3.5 py-2 text-xs hover:bg-muted"
                  >
                    {managingId === sub.id ? "Done" : "Move existing"}
                  </button>
                  <button
                    type="button"
                    onClick={() => beginEdit(sub)}
                    className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Edit"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(sub)}
                    className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-border text-muted-foreground hover:border-danger/20 hover:bg-danger/10 hover:text-danger"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {managingId === sub.id && (
                <div className="space-y-4 border-t border-border bg-muted/30 p-4">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                      Inside this subcategory ({inside.length})
                    </p>
                    {inside.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nothing here yet. Add products from the list below.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {inside.map((p) => (
                          <ProductRow
                            key={p.id}
                            product={p}
                            actionLabel="Remove"
                            onAction={() => move(p.id, null)}
                            disabled={pending}
                          />
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                      Not in any subcategory ({loose.length})
                    </p>
                    {loose.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Every product in {category.name} is already grouped.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {loose.map((p) => (
                          <ProductRow
                            key={p.id}
                            product={p}
                            actionLabel="Add"
                            onAction={() => move(p.id, sub.id)}
                            disabled={pending}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {loose.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium">
            Shown directly on the {category.name} page ({loose.length})
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            One-off pieces that don&apos;t belong to any group — exactly right
            for something like a Jhula where there is only one.
          </p>
          <ul className="mt-3 space-y-1.5">
            {loose.map((p) => (
              <ProductRow key={p.id} product={p} disabled={pending} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProductRow({
  product,
  actionLabel,
  onAction,
  disabled,
}: {
  product: MiniProduct;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt=""
            fill
            sizes="40px"
            className="object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={`/admin/products/${product.id}/edit`}
          className="block truncate text-sm hover:text-accent"
        >
          {product.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {formatINR(product.price)}
          {!product.isActive && " · hidden"}
        </p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          disabled={disabled}
          className="shrink-0 cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
        >
          {actionLabel === "Add" ? (
            <Check className="mr-1 inline h-3 w-3" />
          ) : (
            <X className="mr-1 inline h-3 w-3" />
          )}
          {actionLabel}
        </button>
      )}
    </li>
  );
}
