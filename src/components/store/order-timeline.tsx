import { Check, Package, Truck, Home, Clock, XCircle } from "lucide-react";

const FLOW = [
  { key: "pending", label: "Order placed", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
] as const;

export type StatusEntry = { status: string; note?: string; at: string };

export function OrderTimeline({
  status,
  history,
}: {
  status: string;
  history?: StatusEntry[];
}) {
  if (status === "cancelled") {
    const at = history?.find((h) => h.status === "cancelled")?.at;
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4">
        <XCircle className="h-6 w-6 shrink-0 text-danger" />
        <div>
          <p className="font-medium text-danger">Order cancelled</p>
          {at && (
            <p className="text-xs text-muted-foreground">
              {new Date(at).toLocaleString("en-IN")}
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentIndex = FLOW.findIndex((s) => s.key === status);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  // Map status -> timestamp from history (last occurrence wins).
  const stampFor = (key: string) => {
    const entry = [...(history ?? [])].reverse().find((h) => h.status === key);
    return entry?.at;
  };

  return (
    <ol className="relative">
      {FLOW.map((step, i) => {
        const done = i <= activeIndex;
        const isCurrent = i === activeIndex;
        const Icon = done && !isCurrent ? Check : step.icon;
        const at = stampFor(step.key);
        const last = i === FLOW.length - 1;
        return (
          <li key={step.key} className="flex gap-4 pb-6 last:pb-0">
            <div className="flex flex-col items-center">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                  done
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {!last && (
                <span
                  className={`mt-1 w-0.5 flex-1 ${
                    i < activeIndex ? "bg-accent" : "bg-border"
                  }`}
                />
              )}
            </div>
            <div className="pt-1.5">
              <p
                className={`text-sm font-medium ${
                  done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-normal text-accent">
                    Current
                  </span>
                )}
              </p>
              {at && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(at).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
