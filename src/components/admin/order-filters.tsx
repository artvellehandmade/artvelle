"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];
const PAYMENT_METHODS = ["COD", "UPI", "Razorpay"];

type FilterState = {
  q: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  from: string;
  to: string;
  min: string;
  max: string;
  match: "all" | "any";
};

function fromParams(params: URLSearchParams): FilterState {
  return {
    q: params.get("q") ?? "",
    status: params.get("status") ?? "",
    paymentStatus: params.get("paymentStatus") ?? "",
    paymentMethod: params.get("paymentMethod") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    min: params.get("min") ?? "",
    max: params.get("max") ?? "",
    match: (params.get("match") as "all" | "any") ?? "all",
  };
}

export function OrderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<FilterState>(() => fromParams(params));

  const activeCount = [
    f.q,
    f.status,
    f.paymentStatus,
    f.paymentMethod,
    f.from,
    f.to,
    f.min,
    f.max,
  ].filter(Boolean).length;

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  function apply() {
    const next = new URLSearchParams();
    if (f.q) next.set("q", f.q.trim());
    if (f.status) next.set("status", f.status);
    if (f.paymentStatus) next.set("paymentStatus", f.paymentStatus);
    if (f.paymentMethod) next.set("paymentMethod", f.paymentMethod);
    if (f.from) next.set("from", f.from);
    if (f.to) next.set("to", f.to);
    if (f.min) next.set("min", f.min);
    if (f.max) next.set("max", f.max);
    if (activeCount > 1) next.set("match", f.match);
    router.replace(`${pathname}?${next.toString()}`);
  }

  function clearAll() {
    setF({
      q: "",
      status: "",
      paymentStatus: "",
      paymentMethod: "",
      from: "",
      to: "",
      min: "",
      max: "",
      match: "all",
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
            placeholder="Search order #, name, email or phone…"
            className="input h-10 pl-9"
          />
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm hover:bg-muted"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Order status">
              <select
                value={f.status}
                onChange={(e) => set("status", e.target.value)}
                className="input h-10"
              >
                <option value="">Any status</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Payment status">
              <select
                value={f.paymentStatus}
                onChange={(e) => set("paymentStatus", e.target.value)}
                className="input h-10"
              >
                <option value="">Any</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </Field>

            <Field label="Payment method">
              <select
                value={f.paymentMethod}
                onChange={(e) => set("paymentMethod", e.target.value)}
                className="input h-10"
              >
                <option value="">Any</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="From date">
              <input
                type="date"
                value={f.from}
                onChange={(e) => set("from", e.target.value)}
                className="input h-10"
              />
            </Field>

            <Field label="To date">
              <input
                type="date"
                value={f.to}
                onChange={(e) => set("to", e.target.value)}
                className="input h-10"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Min total (₹)">
                <input
                  type="number"
                  min={0}
                  value={f.min}
                  onChange={(e) => set("min", e.target.value)}
                  className="input h-10"
                  placeholder="0"
                />
              </Field>
              <Field label="Max total (₹)">
                <input
                  type="number"
                  min={0}
                  value={f.max}
                  onChange={(e) => set("max", e.target.value)}
                  className="input h-10"
                  placeholder="—"
                />
              </Field>
            </div>
          </div>

          {/* Match mode (AND / OR) */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Match</span>
              <div className="inline-flex overflow-hidden rounded-full border border-border">
                <button
                  onClick={() => set("match", "all")}
                  className={`px-3 py-1.5 text-xs ${
                    f.match === "all"
                      ? "bg-foreground text-background"
                      : "hover:bg-muted"
                  }`}
                >
                  ALL conditions (AND)
                </button>
                <button
                  onClick={() => set("match", "any")}
                  className={`px-3 py-1.5 text-xs ${
                    f.match === "any"
                      ? "bg-foreground text-background"
                      : "hover:bg-muted"
                  }`}
                >
                  ANY condition (OR)
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" /> Clear
              </button>
              <button
                onClick={apply}
                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
              >
                Apply filters
              </button>
            </div>
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
