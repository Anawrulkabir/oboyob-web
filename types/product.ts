export type CategorySlug = "sharee" | "jewellery" | "combo" | "3pics";

export interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  product_code: string;
  slug: string;
  name: string;
  subtitle: string | null;
  category: CategorySlug;
  description: string | null;
  features: string[];
  specifications: ProductSpec[];
  /** BDT, whole taka. null = price not set yet. */
  price: number | null;
  available: boolean;
  featured: boolean;
  archived?: boolean;
  images: ProductImage[];
  created_at: string;
  updated_at: string;
}
