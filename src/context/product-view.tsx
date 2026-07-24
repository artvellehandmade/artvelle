"use client";

import { createContext, useContext, useState } from "react";
import type { Selection } from "@/lib/variants";

type ProductViewValue = {
  /** The customer's (possibly partial or empty) variant selection. */
  selection: Selection;
  setSelection: (s: Selection) => void;
};

const ProductViewContext = createContext<ProductViewValue>({
  selection: {},
  setSelection: () => {},
});

/**
 * Shares the variant selection between the option picker (ProductPurchase) and
 * the gallery, so the two stay in sync both ways: picking an option filters the
 * photos, and clicking a photo can pin the matching variant. Starts with
 * nothing selected — the customer browses everything, then narrows down.
 */
export function ProductViewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selection, setSelection] = useState<Selection>({});
  return (
    <ProductViewContext.Provider value={{ selection, setSelection }}>
      {children}
    </ProductViewContext.Provider>
  );
}

export function useProductView() {
  return useContext(ProductViewContext);
}
