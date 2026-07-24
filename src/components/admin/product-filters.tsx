"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

type FilterState = {
  q: string;
  category: string;
  status: string;
  stock: string;
  sort: string;
};

function fromParams(params: URLSearchParams): FilterState {
  return {
    q: params.get("q") ?? "",
    category: params.get("category") ?? "",
    status: params.get("status") ?? "",
    stock: params.get("stock") ?? "",
    sort: params.get("sort") ?? "newest",
  };
}

export function ProductFilters({ categories }: { categories: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<FilterState>(() => fromParams(params));

  const activeCount = [
    f.category,
    f.status,
    f.stock,
    f.sort !== "newest" ? f.sort : "",
  ].filter(Boolean).length;

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  function apply() {
    const next = new URLSearchParams();
    if (f.q) next.set("q", f.q.trim());
    if (f.category) next.set("category", f.category);
    if (f.status) next.set("status", f.status);
    if (f.stock) next.set("stock", f.stock);
    if (f.sort && f.sort !== "newest") next.set("sort", f.sort);
    router.replace(`${pathname}?${next.toString()}`);
  }

  function clearAll() {
    setF({
      q: "",
      category: "",
      status: "",
      stock: "",
      sort: "newest",
    });
    router.replace(pathname);
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      {/* Always-visible search + toggle */}
      <div className="flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={f.q}
            onChange={(e) => set("q", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="Search products by name, tag, or description…"
            className="input h-10 pl-9"
          />
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm hover:bg-muted"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters & Sort
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-xs text-background">
              {activeCount}
            </span>
          )}
        </button>
        <button
          onClick={apply}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Search
        </button>
      </div>

      {open && (
        <div className="border-t border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Category">
              <select
                value={f.category}
                onChange={(e) => set("category", e.target.value)}
                className="input h-10"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                value={f.status}
                onChange={(e) => set("status", e.target.value)}
                className="input h-10"
              >
                <option value="">Any Status</option>
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
              </select>
            </Field>

            <Field label="Stock Level">
              <select
                value={f.stock}
                onChange={(e) => set("stock", e.target.value)}
                className="input h-10"
              >
                <option value="">Any Stock Level</option>
                <option value="instock">In Stock ({">"}0)</option>
                <option value="lowstock">Low Stock (≤ 5)</option>
                <option value="outofstock">Out of Stock (0)</option>
              </select>
            </Field>

            <Field label="Sort By">
              <select
                value={f.sort}
                onChange={(e) => set("sort", e.target.value)}
                className="input h-10"
              >
                <option value="newest">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="stock-asc">Stock: Low to High</option>
                <option value="stock-desc">Stock: High to Low</option>
              </select>
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" /> Clear All
            </button>
            <button
              onClick={apply}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Apply filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
