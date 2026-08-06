"use client";

import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { searchProductsAction } from "@/app/actions/admin";

type ProductResult = {
  id: string;
  name: string;
  category: string;
  subcategoryName: string | null;
  options: { name: string; choices: { label: string }[] }[] | null;
};

export function ProductSearchCombobox({
  onSelect
}: {
  onSelect: (product: ProductResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchProductsAction(query);
        setResults(res);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          className="input h-8 pl-8 pr-8 text-xs w-full"
          placeholder="Search products..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {loading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />}
      </div>
      
      {open && query.length >= 2 && (
        <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {results.length === 0 && !loading && (
            <div className="p-3 text-xs text-muted-foreground text-center">No products found</div>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex flex-col gap-0.5 border-b border-border last:border-0"
              onClick={() => {
                onSelect(p);
                setOpen(false);
                setQuery("");
              }}
            >
              <span className="font-medium text-foreground">{p.name}</span>
              <span className="text-muted-foreground text-[10px]">
                {p.category} {p.subcategoryName ? `> ${p.subcategoryName}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
