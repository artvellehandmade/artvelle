export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  stock: number;
  note?: string;
};

export type ProductDTO = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
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
