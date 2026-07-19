"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { updateOrderStatus, updatePaymentStatus } from "@/app/actions/admin";

export type AdminOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  note: string | null;
  createdAt: string;
};

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

const statusColor: Record<string, string> = {
  pending: "bg-accent/15 text-accent",
  confirmed: "bg-blue-500/15 text-blue-500",
  shipped: "bg-purple-500/15 text-purple-500",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-danger/15 text-danger",
};

export function OrdersTable({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function changeStatus(id: string, status: string) {
    start(async () => {
      const res = await updateOrderStatus(id, status);
      if (res.ok) {
        toast.success("Order status updated");
        router.refresh();
      } else toast.error(res.error || "Failed");
    });
  }

  function togglePaid(id: string, current: string) {
    start(async () => {
      await updatePaymentStatus(id, current === "paid" ? "pending" : "paid");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const open = openId === o.id;
        return (
          <div
            key={o.id}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <button
              onClick={() => setOpenId(open ? null : o.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{o.customerName}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                      statusColor[o.status] ?? "bg-muted"
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {o.orderNumber} · {new Date(o.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
              <span className="text-right font-medium">
                {formatINR(o.total)}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>

            {open && (
              <div className="border-t border-border px-5 py-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
                      Items
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm">
                      {o.items.map((it, i) => (
                        <li key={i} className="flex justify-between">
                          <span>
                            {it.name} × {it.quantity}
                          </span>
                          <span>{formatINR(it.price * it.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 space-y-1 border-t border-border pt-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatINR(o.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Shipping</span>
                        <span>
                          {o.shipping === 0 ? "Free" : formatINR(o.shipping)}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Total</span>
                        <span>{formatINR(o.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
                      Customer
                    </h4>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <p className="text-foreground">{o.customerName}</p>
                      <p>{o.email}</p>
                      <p>{o.phone}</p>
                      <p className="mt-1">
                        {o.address}, {o.city}, {o.state} - {o.pincode}
                      </p>
                      {o.note && (
                        <p className="mt-2 rounded-lg bg-muted p-2 text-foreground">
                          Note: {o.note}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        Status
                        <select
                          value={o.status}
                          disabled={pending}
                          onChange={(e) => changeStatus(o.id, e.target.value)}
                          className="input h-9 w-auto"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        onClick={() => togglePaid(o.id, o.paymentStatus)}
                        disabled={pending}
                        className={`rounded-full px-3 py-1.5 text-xs ${
                          o.paymentStatus === "paid"
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {o.paymentMethod} ·{" "}
                        {o.paymentStatus === "paid" ? "Paid" : "Mark paid"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
