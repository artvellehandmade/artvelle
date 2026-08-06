"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Upload, X, LinkIcon, Star, Plus, Trash2, GripVertical, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createProduct, updateProduct } from "@/app/actions/admin";
import { PhotoPicker } from "@/components/admin/photo-picker";
import { VariantMediaTab, type VisualGalleryState } from "@/components/admin/variant-media-tab";
import { allCombinations, comboKey } from "@/lib/options";
import { formatINR } from "@/lib/utils";
import type { ProductDTO, ProductOption } from "@/lib/types";

type SubcategoryOption = { id: string; name: string; categoryName: string };

type Props = {
  product?: ProductDTO;
  categories: string[];
  subcategories?: SubcategoryOption[];
  /** Preselected when arriving from "Add product" inside a subcategory. */
  initialCategory?: string;
  initialSubcategoryId?: string;
};

/** Which top-level tab of the editor is showing. */
type EditorTab = "optvar" | "pricing" | "media";

/**
 * ProductForm — the admin product editor.
 *
 * A persistent section (Basic Info, Organisation, Images, Checkout modes,
 * Shipping) sits above three top-level tabs: "Options & Variants" (the option
 * builder + combination generation), "Price & Stock" (base price / discount /
 * stock plus the per-combination pricing table) and "Media" (the visual-variant
 * gallery manager). Pricing uses a "Discount %" model (compareAtPrice is derived
 * from it) and, when variants exist, the product price is the minimum available
 * variant price.
 */
export function ProductForm({
  product,
  categories,
  subcategories = [],
  initialCategory,
  initialSubcategoryId,
}: Props) {
  const router = useRouter();
  // A duplicate arrives as a fully populated product with a blank id — that is
  // still a create, not an edit.
  const editing = !!product?.id;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Which top-level tab is visible.
  const [tab, setTab] = useState<EditorTab>("optvar");

  // Derive the "Discount %" field from an existing compare-at price:
  // discount = compareAtPrice > price ? round((cap - price) / cap * 100) : 0.
  const initialDiscount = (() => {
    const cap = product?.compareAtPrice ?? 0;
    const p = product?.price ?? 0;
    return cap > p && cap > 0 ? Math.round(((cap - p) / cap) * 100) : 0;
  })();

  const [form, setForm] = useState({
    name: product?.name ?? "",
    category: initialCategory ?? product?.category ?? categories[0] ?? "",
    secondaryCategory: product?.secondaryCategory ?? "",
    subcategoryId: initialSubcategoryId ?? product?.subcategoryId ?? "",
    price: product?.price?.toString() ?? "",
    // Percentage off the (implied) original price; replaces the raw compare-at field.
    discount: initialDiscount ? String(initialDiscount) : "",
    stock: product?.stock?.toString() ?? "0",
    description: product?.description ?? "",
    tags: product?.tags?.join(", ") ?? "",
    isFeatured: product?.isFeatured ?? false,
    isActive: product?.isActive ?? true,
  });
  // Which checkout modes this product allows.
  const ALL_MODES = ["prepaid", "cod", "partial", "direct"] as const;
  type Mode = (typeof ALL_MODES)[number];
  const [paymentModes, setPaymentModes] = useState<Mode[]>(
    (product?.paymentModes as Mode[]) ?? ["prepaid", "cod"]
  );
  const [advancePercent, setAdvancePercent] = useState(
    product?.advancePercent?.toString() ?? ""
  );
  const [parcel, setParcel] = useState({
    weightGrams: product?.weightGrams?.toString() ?? "",
    lengthCm: product?.lengthCm?.toString() ?? "",
    breadthCm: product?.breadthCm?.toString() ?? "",
    heightCm: product?.heightCm?.toString() ?? "",
  });
  const [shipping, setShipping] = useState({
    shippingType: product?.shippingType ?? "free",
    shippingFee: product?.shippingFee?.toString() ?? "0",
    shippingMarkup: product?.shippingMarkup?.toString() ?? "0",
  });
  const setShippingField = (k: keyof typeof shipping, v: string) =>
    setShipping((p) => ({ ...p, [k]: v }));
  const setParcelField = (k: keyof typeof parcel, v: string) =>
    setParcel((p) => ({ ...p, [k]: v }));
  function toggleMode(m: Mode) {
    setPaymentModes((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [urlInput, setUrlInput] = useState("");
  // Index of the image currently being dragged (for reordering).
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [options, setOptions] = useState<ProductOption[]>(
    product?.options ?? []
  );
  // Which option's values drive the per-variant image galleries (Media tab).
  // Persisted as Product.propertyModules.images = [name]; defaults to first option.
  const [imageOption, setImageOption] = useState<string>(
    product?.propertyModules?.images?.[0] ?? ""
  );

  // ---- Variants (Flipkart-style: price / stock / availability per combo) ----
  type VariantEntry = { available: boolean; price: string; stock: string };
  const [useVariants, setUseVariants] = useState<boolean>(
    (product?.variants?.length ?? 0) > 0 ||
      (product?.variantPrices?.length ?? 0) > 0
  );
  // Variant data keyed by combo signature.
  const [variantMap, setVariantMap] = useState<Record<string, VariantEntry>>(
    () => {
      const map: Record<string, VariantEntry> = {};
      if (product?.variants?.length) {
        for (const v of product.variants) {
          // Stored values may be blank ("" = inherit) despite the number type.
          const rawPrice = (v as { price?: unknown }).price;
          const rawStock = (v as { stock?: unknown }).stock;
          map[comboKey(v.combo)] = {
            available: v.available,
            // Preserve an "inherit base" (blank) price so the per-row
            // "Use Product Price" toggle round-trips.
            price: rawPrice === "" || rawPrice == null ? "" : String(rawPrice),
            stock: rawStock === "" || rawStock == null ? "" : String(rawStock),
          };
        }
      } else if (product?.variantPrices?.length) {
        // Migrate the older price-only matrix.
        for (const v of product.variantPrices) {
          map[comboKey(v.combo)] = {
            available: true,
            price: String(v.price),
            stock: "",
          };
        }
      }
      return map;
    }
  );

  // Per-option filter for the variant table (option name → value, "" = all).
  const [variantFilter, setVariantFilter] = useState<Record<string, string>>({});
  // Bulk-update inputs applied to every currently-filtered row.
  const [bulk, setBulk] = useState<{ price: string; stock: string; available: string }>({
    price: "",
    stock: "",
    available: "",
  });

  // ---- Visual Gallery state (Media tab) ----
  // Initialise from existing variants so editing an existing product keeps its images.
  const [visualGallery, setVisualGallery] = useState<VisualGalleryState>(() => {
    const galleries: Record<string, string[]> = {};
    const previews: Record<string, string> = {};
    const commonSet = new Set<string>();
    // Galleries are keyed by the image-driving option's value. Use the stored
    // choice (propertyModules.images) when present, else the first option.
    const imgOpt =
      product?.propertyModules?.images?.[0] ?? product?.options?.[0]?.name ?? "";
    if (product?.variants?.length) {
      for (const v of product.variants) {
        const visualVal = imgOpt
          ? v.combo?.[imgOpt]
          : Object.values(v.combo ?? {})[0];
        if (visualVal && v.images?.length) {
          galleries[visualVal] = galleries[visualVal] ?? [];
          for (const img of v.images) {
            if (!galleries[visualVal].includes(img)) galleries[visualVal].push(img);
          }
          if (!previews[visualVal]) previews[visualVal] = v.images[0];
        }
      }
    }
    for (const img of product?.images ?? []) {
      const inVariant = Object.values(galleries).some((g) => g.includes(img));
      if (!inVariant) commonSet.add(img);
    }
    return { galleries, previews, common: [...commonSet] };
  });

  // Cleaned option matrix — the shape both `combos` and the filter dropdowns need.
  const optionMatrix = useMemo(
    () =>
      options
        .map((g) => ({
          name: g.name.trim(),
          values: g.choices.map((c) => c.label.trim()).filter(Boolean),
        }))
        .filter((g) => g.name && g.values.length > 0),
    [options]
  );

  // The effective image-driving option: the admin's choice if it still exists,
  // else the first option. Empty string when the product has no options.
  const imageDrivingOption = useMemo(() => {
    const names = optionMatrix.map((o) => o.name);
    return imageOption && names.includes(imageOption) ? imageOption : names[0] ?? "";
  }, [imageOption, optionMatrix]);

  // All combinations of the current options (recomputed as options change).
  const combos = useMemo(() => allCombinations(optionMatrix), [optionMatrix]);

  // Combos currently visible in the table after the per-option filter.
  const filteredCombos = useMemo(
    () =>
      combos.filter((c) =>
        Object.entries(variantFilter).every(([name, val]) => !val || c[name] === val)
      ),
    [combos, variantFilter]
  );

  const base = Number(form.price || 0);

  // Product price = MIN of the available variant prices when variants exist,
  // else the entered base price. Blank variant price inherits the base.
  const variantMinPrice = useMemo(() => {
    if (!useVariants || combos.length === 0) return base;
    const prices = combos
      .map((c) => variantMap[comboKey(c)] ?? { available: true, price: "", stock: "" })
      .filter((v) => v.available)
      .map((v) => (v.price === "" ? base : Number(v.price) || 0));
    return prices.length ? Math.min(...prices) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useVariants, combos, variantMap, base]);

  const hasVariants = useVariants && combos.length > 0;
  const effectivePrice = hasVariants ? variantMinPrice : base;

  function variantOf(key: string): VariantEntry {
    return variantMap[key] ?? { available: true, price: "", stock: "" };
  }
  function setVariantField(key: string, patch: Partial<VariantEntry>) {
    setVariantMap((prev) => ({
      ...prev,
      [key]: { ...variantOf(key), ...patch },
    }));
  }

  // Apply the bulk-update inputs to every currently-filtered combo.
  function applyBulk() {
    const patch: Partial<VariantEntry> = {};
    if (bulk.price !== "") patch.price = bulk.price;
    if (bulk.stock !== "") patch.stock = bulk.stock;
    if (bulk.available === "yes") patch.available = true;
    if (bulk.available === "no") patch.available = false;
    if (Object.keys(patch).length === 0) {
      toast.error("Enter a price, stock or availability to apply.");
      return;
    }
    setVariantMap((prev) => {
      const next = { ...prev };
      for (const c of filteredCombos) {
        const key = comboKey(c);
        next[key] = { ...(next[key] ?? { available: true, price: "", stock: "" }), ...patch };
      }
      return next;
    });
    toast.success(`Updated ${filteredCombos.length} combination${filteredCombos.length !== 1 ? "s" : ""}.`);
  }

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
    patch: Partial<{ label: string; priceDelta: number; image: string | null }>
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

  // Only the groups belonging to the currently selected primary category.
  const categorySubs = useMemo(
    () => subcategories.filter((s) => s.categoryName === form.category),
    [subcategories, form.category]
  );

  // Switching category must drop a group that belongs to the old one,
  // otherwise the product would sit in a group its shoppers never reach.
  function onCategoryChange(category: string) {
    setForm((f) => {
      const stillValid = subcategories.some(
        (s) => s.id === f.subcategoryId && s.categoryName === category
      );
      return {
        ...f,
        category,
        subcategoryId: stillValid ? f.subcategoryId : "",
      };
    });
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

  // Move an image from one position to another (used by drag-drop and arrows).
  function moveImage(from: number, to: number) {
    setImages((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function onImageDrop(target: number) {
    if (dragIndex !== null) moveImage(dragIndex, target);
    setDragIndex(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Required fields live on different tabs, so validate here and jump the
    // admin to the offending tab (HTML5 required can't fire on unmounted tabs).
    if (!form.name.trim()) {
      toast.error("Name is required");
      setSaving(false);
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required");
      setSaving(false);
      return;
    }
    if (form.price === "") {
      setTab("pricing");
      toast.error("Price is required");
      setSaving(false);
      return;
    }
    if (form.stock === "") {
      setTab("pricing");
      toast.error("Stock is required");
      setSaving(false);
      return;
    }

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

    // Keep only the galleries/previews for the image-driving option's values, so
    // orphaned keys (left over from switching which option controls images) are
    // never persisted. syncProductImages keys ProductImage.variantValue on these.
    const imageValues = new Set(
      optionMatrix.find((o) => o.name === imageDrivingOption)?.values ?? []
    );
    const cleanGalleries: Record<string, string[]> = {};
    for (const [val, imgs] of Object.entries(visualGallery.galleries)) {
      if (imageValues.has(val) && imgs.length) cleanGalleries[val] = imgs;
    }
    // Preview thumbnail: the admin's manual pick wins; when none is chosen,
    // fall back to the 1st image of that value's gallery (then 1st common).
    const cleanPreviews: Record<string, string> = {};
    for (const val of imageValues) {
      const manual = visualGallery.previews[val];
      const preview =
        manual || cleanGalleries[val]?.[0] || visualGallery.common[0] || null;
      if (preview) cleanPreviews[val] = preview;
    }
    const cleanMedia: VisualGalleryState = {
      galleries: cleanGalleries,
      previews: cleanPreviews,
      common: visualGallery.common,
    };

    // Build the variant matrix. Images per combo are derived from the visual
    // gallery: all combos sharing the same image-driving value (e.g. "Pink") get
    // that value's gallery + the common gallery. Blank price/stock is sent
    // through as "" so deriveVariantModel inherits the product's values.
    const variants = hasVariants
      ? combos.map((combo) => {
          const v = variantOf(comboKey(combo));
          // The visual value is this combo's choice for the image-driving option.
          const visualVal = (imageDrivingOption ? combo[imageDrivingOption] : null) ?? null;
          const designImages = visualVal ? (cleanGalleries[visualVal] ?? []) : [];
          const comboImages = [...designImages, ...visualGallery.common];
          return {
            combo,
            price: v.price === "" ? "" : Number(v.price) || 0,
            stock: v.stock === "" ? "" : Number(v.stock) || 0,
            available: v.available,
            images: comboImages,
            previewImage: visualVal ? (cleanPreviews[visualVal] ?? null) : null,
          };
        })
      : [];

    // Derive a flat images array for the product (unique gallery images).
    const allVariantImages = new Set<string>();
    for (const gal of Object.values(cleanGalleries)) {
      for (const img of gal) allVariantImages.add(img);
    }
    for (const img of visualGallery.common) allVariantImages.add(img);
    // Fall back to the old `images` state if gallery is empty (e.g. product with no variants).
    const derivedImages = allVariantImages.size > 0 ? [...allVariantImages] : images;

    // Persist which option drives the image galleries (storefront reader contract:
    // Product.propertyModules.images = [optionName]). Preserve any other modules.
    const propertyModules = {
      ...(product?.propertyModules ?? {}),
      images: imageDrivingOption ? [imageDrivingOption] : [],
    };

    // Product price is the min available variant price when variants exist,
    // otherwise the entered base. Discount % round-trips through compareAtPrice.
    const price = Math.max(0, Math.round(effectivePrice));
    const discountNum = Math.min(99, Math.max(0, Number(form.discount) || 0));
    const compareAtPrice =
      discountNum > 0 ? Math.round(price / (1 - discountNum / 100)) : null;

    const payload = {
      name: form.name,
      category: form.category,
      secondaryCategory: form.secondaryCategory || null,
      subcategoryId: form.subcategoryId || null,
      options: cleanOptions,
      // Which option controls the image galleries (storefront reader contract).
      propertyModules,
      variantPrices: [], // superseded by `variants`
      variants,
      price,
      compareAtPrice,
      stock: Number(form.stock || 0),
      description: form.description,
      tags: form.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      images: derivedImages,
      // Clean preview/gallery/common split so the server can persist ProductImage rows.
      media: cleanMedia,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
      paymentModes: (paymentModes.length ? paymentModes : ["prepaid", "cod"]) as (
        | "prepaid"
        | "cod"
        | "partial"
        | "direct"
      )[],
      advancePercent: paymentModes.includes("partial") && advancePercent
        ? Number(advancePercent)
        : null,
      weightGrams: parcel.weightGrams ? Number(parcel.weightGrams) : null,
      lengthCm: parcel.lengthCm ? Number(parcel.lengthCm) : null,
      breadthCm: parcel.breadthCm ? Number(parcel.breadthCm) : null,
      heightCm: parcel.heightCm ? Number(parcel.heightCm) : null,
      shippingType: shipping.shippingType,
      shippingFee: Number(shipping.shippingFee || 0),
      shippingMarkup: Number(shipping.shippingMarkup || 0),
    };

    const res = editing
      ? await updateProduct(product!.id, payload)
      : await createProduct(payload);

    setSaving(false);
    if (res.ok) {
      toast.success(editing ? "Product updated" : "Product created");
      // Land back on the group that was just added to, so the next piece in
      // the set is one click away.
      router.push(
        form.subcategoryId
          ? `/admin/products?subcategoryId=${form.subcategoryId}`
          : "/admin/products"
      );
      router.refresh();
    } else {
      toast.error(res.error || "Could not save");
    }
  }

  const TABS: { id: EditorTab; label: string }[] = [
    { id: "optvar", label: "Options & Variants" },
    { id: "pricing", label: "Price & Stock" },
    { id: "media", label: "Media" },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* ── Persistent section — Basic Info, Organisation, Images, Checkout
          modes and Shipping stay visible above the tab bar. ── */}
      <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Product details">
            <label className="block">
              <span className="label">Name *</span>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="input"
                placeholder="Ocean Wave Resin Coaster Set"
              />
            </label>
            <label className="block">
              <span className="label">Description *</span>
              <textarea
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

          <Card title="Organisation">
            <label className="block">
              <span className="label">Category *</span>
              <select
                value={form.category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="input"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label">Subcategory (optional)</span>
              <select
                value={form.subcategoryId}
                onChange={(e) => set("subcategoryId", e.target.value)}
                className="input"
                disabled={categorySubs.length === 0}
              >
                <option value="">
                  {categorySubs.length === 0
                    ? "No subcategories in this category yet"
                    : "None — show on the category page"}
                </option>
                {categorySubs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted-foreground">
                Group this piece under e.g. <b>Resin Pooja Thali</b>. Leave as
                None for a one-off that should show on the category page directly.
              </span>
            </label>

            <label className="block">
              <span className="label">Secondary category (optional)</span>
              <select
                value={form.secondaryCategory}
                onChange={(e) => set("secondaryCategory", e.target.value)}
                className="input"
              >
                <option value="">None</option>
                {categories.filter((c) => c !== form.category).map((c) => (
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

          <div className="lg:col-span-2">
            <Card title="Images">
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {images.map((img, i) => (
                    <div
                      key={`${img}-${i}`}
                      draggable
                      onDragStart={() => setDragIndex(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onImageDrop(i)}
                      onDragEnd={() => setDragIndex(null)}
                      className={`group relative aspect-square cursor-move overflow-hidden rounded-xl border bg-muted transition-all ${
                        dragIndex === i
                          ? "border-accent opacity-40 ring-2 ring-accent"
                          : "border-border"
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`Image ${i + 1}`}
                        fill
                        sizes="120px"
                        className="pointer-events-none object-cover"
                      />
                      {i === 0 && (
                        <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">
                          Cover
                        </span>
                      )}

                      {/* Drag handle hint */}
                      <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <GripVertical className="h-3.5 w-3.5" />
                      </span>

                      {/* Reorder + remove controls (touch-friendly fallback for drag) */}
                      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveImage(i, i - 1)}
                            disabled={i === 0}
                            className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white disabled:opacity-30"
                            aria-label="Move left"
                            title="Move left"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(i, i + 1)}
                            disabled={i === images.length - 1}
                            className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white disabled:opacity-30"
                            aria-label="Move right"
                            title="Move right"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white hover:bg-danger"
                          aria-label="Remove"
                          title="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <PhotoPicker
                  selected={images}
                  onChange={setImages}
                  preferCategory={form.category}
                />
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
                Drag photos to reorder them (or use the arrows on hover). The first
                image is used as the cover. When you use the <b>Media</b> tab, the
                product gallery is built from those variant galleries instead.
              </p>
            </Card>
          </div>

          <Card title="Checkout modes">
            <p className="text-xs text-muted-foreground">
              Choose which payment options this product offers at checkout.
              At least one must be selected.
            </p>
            {([
              { mode: "prepaid" as Mode, label: "Prepaid — Pay Online (full amount)" },
              { mode: "cod" as Mode, label: "Cash on Delivery" },
              { mode: "partial" as Mode, label: "Advance Payment (advance online + COD)" },
              { mode: "direct" as Mode, label: "Customised Order (pay to owner, non-refundable)" },
            ] as { mode: Mode; label: string }[]).map(({ mode, label }) => (
              <label key={mode} className="flex items-center gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentModes.includes(mode)}
                  onChange={() => toggleMode(mode)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {label}
              </label>
            ))}
            {paymentModes.includes("partial") && (
              <label className="block">
                <span className="label">Advance % (for partial mode)</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={advancePercent}
                  onChange={(e) => setAdvancePercent(e.target.value)}
                  className="input"
                  placeholder="e.g. 30  (30% online, 70% on delivery)"
                />
              </label>
            )}
          </Card>

          <div className="lg:col-span-2">
            <Card title="Shipping settings & Parcel size">
              <p className="text-xs text-muted-foreground">
                Configure how shipping is charged for this product.
                Used when creating a NimbusPost shipment or calculating fees at checkout.
              </p>

              <label className="block mb-4">
                <span className="label">Shipping Type</span>
                <select
                  value={shipping.shippingType}
                  onChange={(e) => setShippingField("shippingType", e.target.value)}
                  className="input bg-card"
                >
                  <option value="free">Free Shipping (Always ₹0)</option>
                  <option value="fixed">Fixed Shipping (Flat rate per qty)</option>
                  <option value="nimbus">NimbusAPI + Markup (Dynamic calculation)</option>
                </select>
              </label>

              {shipping.shippingType === "fixed" && (
                <label className="block mb-4">
                  <span className="label">Fixed Shipping Fee (₹ per qty)</span>
                  <input
                    type="number"
                    min={0}
                    value={shipping.shippingFee}
                    onChange={(e) => setShippingField("shippingFee", e.target.value)}
                    className="input"
                  />
                </label>
              )}

              {shipping.shippingType === "nimbus" && (
                <label className="block mb-4">
                  <span className="label">Shipping Markup (₹ added to API rate per qty)</span>
                  <input
                    type="number"
                    min={0}
                    value={shipping.shippingMarkup}
                    onChange={(e) => setShippingField("shippingMarkup", e.target.value)}
                    className="input"
                  />
                </label>
              )}

              <p className="text-xs text-muted-foreground mb-2 mt-4">
                Dimensions and weight. Weight is per unit (multiplied by quantity).
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">Weight (grams)</span>
                  <input
                    type="number"
                    min={1}
                    value={parcel.weightGrams}
                    onChange={(e) => setParcelField("weightGrams", e.target.value)}
                    className="input"
                    placeholder="e.g. 500"
                  />
                </label>
                <label className="block">
                  <span className="label">Length (cm)</span>
                  <input
                    type="number"
                    min={1}
                    value={parcel.lengthCm}
                    onChange={(e) => setParcelField("lengthCm", e.target.value)}
                    className="input"
                    placeholder="e.g. 15"
                  />
                </label>
                <label className="block">
                  <span className="label">Breadth (cm)</span>
                  <input
                    type="number"
                    min={1}
                    value={parcel.breadthCm}
                    onChange={(e) => setParcelField("breadthCm", e.target.value)}
                    className="input"
                    placeholder="e.g. 15"
                  />
                </label>
                <label className="block">
                  <span className="label">Height (cm)</span>
                  <input
                    type="number"
                    min={1}
                    value={parcel.heightCm}
                    onChange={(e) => setParcelField("heightCm", e.target.value)}
                    className="input"
                    placeholder="e.g. 10"
                  />
                </label>
              </div>
            </Card>
          </div>
        </div>

      {/* ── Tab bar ── */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Price & Stock ── */}
      {tab === "pricing" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Pricing & stock">
            <label className="block">
              <span className="label">Price (₹) *</span>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className="input"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                {hasVariants
                  ? "Base price — inherited by any variant set to \"Use Product Price\"."
                  : "The product's selling price."}
              </span>
            </label>

            {hasVariants && (
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                <span className="label">Product price (from variants)</span>
                <p className="text-lg font-semibold">{formatINR(effectivePrice)}</p>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Lowest price across available combinations — shown to shoppers as
                  the &ldquo;from&rdquo; price.
                </span>
              </div>
            )}

            <label className="block">
              <span className="label">Discount %</span>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={form.discount}
                  onChange={(e) => set("discount", e.target.value)}
                  className="input pr-8"
                  placeholder="0"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                Shows a &ldquo;Save X%&rdquo; badge. We store the implied original
                price ({formatINR(effectivePrice)} at{" "}
                {Math.min(99, Math.max(0, Number(form.discount) || 0))}% off ={" "}
                {(() => {
                  const p = Math.max(0, Math.round(effectivePrice));
                  const d = Math.min(99, Math.max(0, Number(form.discount) || 0));
                  return formatINR(d > 0 ? Math.round(p / (1 - d / 100)) : p);
                })()}
                ). Leave 0 for no discount.
              </span>
            </label>

            <label className="block">
              <span className="label">Stock *</span>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => set("stock", e.target.value)}
                className="input"
              />
              {hasVariants && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Default stock — variants with a blank stock inherit this number.
                </span>
              )}
            </label>
          </Card>
        </div>
      )}

      {/* ── Options & Variants ── */}
      {tab === "optvar" && (
        <Card title="Options">
          <p className="-mt-1 text-xs text-muted-foreground">
            Let customers choose e.g. <b>Size</b> or <b>Vatki</b>.{" "}
            {useVariants ? (
              <>
                Prices and stock come from the <b>Price &amp; Stock</b> tab; photos
                from the <b>Media</b> tab.
              </>
            ) : (
              <>Each choice can add to the price (leave 0 for no change).</>
            )}
          </p>

          {options.map((group, gi) => (
            <div key={gi} className="rounded-xl border border-border p-3.5">
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
                  <div key={ci} className="flex flex-wrap items-center gap-2">
                    <input
                      value={choice.label}
                      onChange={(e) => setChoice(gi, ci, { label: e.target.value })}
                      className="input h-9 min-w-[8rem] flex-1"
                      placeholder="Choice (e.g. 4 inch)"
                    />
                    {!useVariants && (
                      <div className="relative w-28 shrink-0">
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
                    )}
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

          {combos.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {combos.length} combination{combos.length !== 1 ? "s" : ""} generated
              from these options. Set each one&apos;s price, stock and availability
              in the <b>Price &amp; Stock</b> tab.
            </p>
          )}
        </Card>
      )}

      {/* ── Price & Stock: the per-combination table (renders in the same tab
          as the base pricing card above). ── */}
      {tab === "pricing" && (
            <Card title="Variant pricing & stock">
              {optionMatrix.length === 0 ? (
                <p className="rounded-lg bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
                  Add at least one option (with choices) in the <b>Options</b> tab to
                  create variants.
                </p>
              ) : (
                <>
                  <div className="-mt-1 flex flex-wrap items-start justify-between gap-3">
                    <p className="max-w-md text-xs text-muted-foreground">
                      Give every combination (e.g. <b>4 inch</b> + <b>1 vatki</b>) its
                      own price and stock, and mark which ones you actually make.
                      Unavailable combos are greyed out for customers.
                    </p>
                    <Toggle
                      label={useVariants ? "On" : "Off"}
                      checked={useVariants}
                      onChange={setUseVariants}
                    />
                  </div>

                  {useVariants && (
                    <div className="space-y-4">
                      {/* Filter */}
                      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/30 p-3">
                        <span className="w-full text-xs font-medium text-muted-foreground">
                          Filter combinations
                        </span>
                        {optionMatrix.map((g) => (
                          <label key={g.name} className="block">
                            <span className="mb-0.5 block text-[11px] text-muted-foreground">
                              {g.name}
                            </span>
                            <select
                              value={variantFilter[g.name] ?? ""}
                              onChange={(e) =>
                                setVariantFilter((prev) => ({
                                  ...prev,
                                  [g.name]: e.target.value,
                                }))
                              }
                              className="input h-9"
                            >
                              <option value="">All</option>
                              {g.values.map((val) => (
                                <option key={val} value={val}>
                                  {val}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                        {Object.values(variantFilter).some(Boolean) && (
                          <button
                            type="button"
                            onClick={() => setVariantFilter({})}
                            className="h-9 rounded-lg px-3 text-xs text-muted-foreground underline hover:text-foreground"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>

                      {/* Bulk update */}
                      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/30 p-3">
                        <span className="w-full text-xs font-medium text-muted-foreground">
                          Bulk update the {filteredCombos.length} shown combination
                          {filteredCombos.length !== 1 ? "s" : ""}
                        </span>
                        <label className="block">
                          <span className="mb-0.5 block text-[11px] text-muted-foreground">Price (₹)</span>
                          <input
                            type="number"
                            min={0}
                            value={bulk.price}
                            onChange={(e) => setBulk((b) => ({ ...b, price: e.target.value }))}
                            className="input h-9 w-28"
                            placeholder="—"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-0.5 block text-[11px] text-muted-foreground">Stock</span>
                          <input
                            type="number"
                            min={0}
                            value={bulk.stock}
                            onChange={(e) => setBulk((b) => ({ ...b, stock: e.target.value }))}
                            className="input h-9 w-24"
                            placeholder="—"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-0.5 block text-[11px] text-muted-foreground">Availability</span>
                          <select
                            value={bulk.available}
                            onChange={(e) => setBulk((b) => ({ ...b, available: e.target.value }))}
                            className="input h-9"
                          >
                            <option value="">No change</option>
                            <option value="yes">Available</option>
                            <option value="no">Unavailable</option>
                          </select>
                        </label>
                        <Button type="button" variant="outline" size="sm" onClick={applyBulk}>
                          Apply
                        </Button>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                              <th className="px-3 py-2.5 font-medium">Combination</th>
                              <th className="w-20 px-3 py-2.5 text-center font-medium">
                                Available
                              </th>
                              <th className="w-28 px-3 py-2.5 text-center font-medium">
                                Use base price
                              </th>
                              <th className="w-32 px-3 py-2.5 font-medium">Price (₹)</th>
                              <th className="w-28 px-3 py-2.5 font-medium">Stock</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {filteredCombos.map((combo) => {
                              const key = comboKey(combo);
                              const v = variantOf(key);
                              const useBase = v.price === "";
                              return (
                                <tr key={key} className={v.available ? "" : "opacity-50"}>
                                  <td className="px-3 py-2 align-top">
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                                      {Object.entries(combo).map(([name, value]) => (
                                        <span
                                          key={name}
                                          className="rounded-full bg-muted px-2.5 py-0.5 text-xs"
                                          title={name}
                                        >
                                          {value}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center align-top">
                                    <input
                                      type="checkbox"
                                      checked={v.available}
                                      onChange={(e) =>
                                        setVariantField(key, {
                                          available: e.target.checked,
                                        })
                                      }
                                      className="mt-2 h-4 w-4 accent-[var(--accent)]"
                                      title="Do you make this combination?"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center align-top">
                                    <input
                                      type="checkbox"
                                      checked={useBase}
                                      onChange={(e) =>
                                        setVariantField(key, {
                                          price: e.target.checked ? "" : String(base || 0),
                                        })
                                      }
                                      disabled={!v.available}
                                      className="mt-2 h-4 w-4 accent-[var(--accent)]"
                                      title="Inherit the product base price"
                                    />
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    <div className="relative">
                                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                        ₹
                                      </span>
                                      <input
                                        type="number"
                                        min={0}
                                        value={v.price}
                                        onChange={(e) =>
                                          setVariantField(key, { price: e.target.value })
                                        }
                                        className="input h-9 pl-6"
                                        placeholder={form.price || "0"}
                                        disabled={!v.available || useBase}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 align-top">
                                    <input
                                      type="number"
                                      min={0}
                                      value={v.stock}
                                      onChange={(e) =>
                                        setVariantField(key, { stock: e.target.value })
                                      }
                                      className="input h-9"
                                      placeholder={form.stock || "0"}
                                      disabled={!v.available}
                                      title="Blank inherits the product stock"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Showing {filteredCombos.length} of {combos.length}. Blank price →
                        base price ({formatINR(base)}); blank stock → product stock.
                      </p>
                    </div>
                  )}
                </>
              )}
            </Card>
          )}

      {/* ── Media ── */}
      {tab === "media" && (
        <Card title="Media">
          {optionMatrix.length > 1 && (
            <label className="block max-w-xs">
              <span className="label">Which option controls the images?</span>
              <select
                value={imageDrivingOption}
                onChange={(e) => setImageOption(e.target.value)}
                className="input"
              >
                {optionMatrix.map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted-foreground">
                Galleries below are organised by this option&apos;s values. Combos
                that differ only by the other options reuse the same photos.
              </span>
            </label>
          )}
          <p className="-mt-1 mb-4 text-xs text-muted-foreground">
            Manage photos by <b>{imageDrivingOption || "variant"}</b> — not by every
            combination. Every combination sharing the same{" "}
            {imageDrivingOption || "value"} automatically uses that value&apos;s
            gallery. Images with no variant tag go in the Common Gallery (packaging,
            lifestyle, dimensions).
          </p>
          <VariantMediaTab
            options={options}
            visualOptionName={imageDrivingOption}
            state={visualGallery}
            onChange={setVisualGallery}
            productCategory={form.category}
            productSubcategory={
              subcategories.find((s) => s.id === form.subcategoryId)?.name
            }
          />
        </Card>
      )}

      {/* ── Actions (save / cancel — always visible) ── */}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="flex-1 sm:flex-none" size="lg">
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
