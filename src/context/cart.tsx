"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { CartItem } from "@/lib/types";

const STORAGE_KEY = "artvelle_cart";
const VISITOR_KEY = "artvelle_vid";

type CartContextType = {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const recordLead = useCallback((item: Omit<CartItem, "quantity">, qty: number) => {
    // Fire-and-forget: log an "interested customer" lead + notify admin.
    try {
      fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.productId,
          productName: item.name,
          productImage: item.image,
          quantity: qty,
          price: item.price,
          visitorId: getVisitorId(),
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        if (existing) {
          return prev.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: Math.min(i.quantity + qty, i.stock || 99) }
              : i
          );
        }
        // Only record a lead the first time a product is added.
        recordLead(item, qty);
        return [...prev, { ...item, quantity: qty }];
      });
      setOpen(true);
    },
    [recordLead]
  );

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.max(0, Math.min(qty, i.stock || 99)) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        subtotal,
        isOpen,
        setOpen,
        addItem,
        removeItem,
        updateQty,
        clear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
