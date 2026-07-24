// A choice within an option group, e.g. { label: "Large", priceDelta: 500 }
// `image` (optional) is a product image URL shown when this choice is picked.
export type OptionChoice = {
  label: string;
  priceDelta: number;
  image?: string | null;
};
// A per-product option group, e.g. { name: "Size", choices: [...] }
export type ProductOption = { name: string; choices: OptionChoice[] };
// An exact price for one full combination of choices, keyed by option name.
// e.g. { combo: { Size: "S", Type: "A" }, price: 2000 }  (legacy)
export type VariantPrice = { combo: Record<string, string>; price: number };
// A full product variant: one combination of choices with its own price,
// availability and photos. e.g.
// { combo: { Size: "4 inch", Vatki: "1" }, price: 599, available: true, images: [...] }
export type Variant = {
  combo: Record<string, string>;
  price: number;
  available: boolean;
  images: string[];
};
// A customer's picked option on a cart/order line, e.g. { name: "Size", value: "Large" }
export type SelectedOption = { name: string; value: string };

export type CartItem = {
  lineId: string; // productId + selected options — unique per variant combination
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number; // unit price INCLUDING selected option price deltas
  quantity: number;
  stock: number;
  options?: SelectedOption[];
  note?: string;
};

export type ProductDTO = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  secondaryCategory: string | null;
  tags: string[];
  options: ProductOption[];
  variantPrices: VariantPrice[];
  variants: Variant[];
  price: number;
  compareAtPrice: number | null;
  images: string[];
  stock: number;
  isFeatured: boolean;
  isActive: boolean;
};

export type SettingsDTO = {
  brandName: string;
  tagline: string;
  logoUrl: string | null;
  heroHeadline: string;
  heroSubtext: string;
  aboutText: string;
  contactEmail: string;
  contactPhone: string;
  whatsapp: string | null;
  address: string | null;
  instagram: string | null;
  facebook: string | null;
  adminNotifyEmail: string;
  currency: string;
  shippingFee: number;
  freeShippingThreshold: number | null;
  codEnabled: boolean;
  announcement: string | null;
};
