"use client";

import { createContext, useContext, useState } from "react";

type ProductViewValue = {
  /** The set of images the gallery should currently show (the selected variant's). */
  images: string[];
  setImages: (images: string[]) => void;
};

const ProductViewContext = createContext<ProductViewValue>({
  images: [],
  setImages: () => {},
});

/**
 * Shares the "currently shown images" between the option picker
 * (ProductPurchase) and the gallery, so choosing a variant swaps the whole
 * set of photos — not just one.
 */
export function ProductViewProvider({
  initialImages = [],
  children,
}: {
  initialImages?: string[];
  children: React.ReactNode;
}) {
  const [images, setImages] = useState<string[]>(initialImages);
  return (
    <ProductViewContext.Provider value={{ images, setImages }}>
      {children}
    </ProductViewContext.Provider>
  );
}

export function useProductView() {
  return useContext(ProductViewContext);
}
