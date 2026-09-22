import { cache } from "react";
import type { CategorySlug, Product } from "@/types/product";
import { getPublicClient } from "@/lib/supabase/server";
import { MOCK_PRODUCTS } from "@/lib/mock-products";

export const PRODUCT_SELECT = `
  id, product_code, slug, name, subtitle, category, description,
  features, specifications, price, available, featured, archived, created_at, updated_at,
  images:product_images ( id, image_url, alt_text, sort_order )
`;

export function normalizeProduct(row: Product): Product {
  return {
    ...row,
    features: Array.isArray(row.features) ? row.features : [],
    specifications: Array.isArray(row.specifications) ? row.specifications : [],
    images: [...(row.images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  };
}

/** Available first, then newest. */
function sortCatalog(list: Product[]): Product[] {
  return [...list].sort(
    (a, b) => Number(b.available) - Number(a.available) || b.created_at.localeCompare(a.created_at),
  );
}

export async function getProducts(opts: { category?: CategorySlug } = {}): Promise<Product[]> {
  const db = getPublicClient();
  if (!db) {
    const list = opts.category ? MOCK_PRODUCTS.filter((p) => p.category === opts.category) : MOCK_PRODUCTS;
    return sortCatalog(list);
  }
  let q = db.from("products").select(PRODUCT_SELECT);
  if (opts.category) q = q.eq("category", opts.category);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load products: ${error.message}`);
  return sortCatalog((data as unknown as Product[]).map(normalizeProduct));
}

export async function getFeaturedProduct(): Promise<Product | null> {
  const all = await getProducts();
  return all.find((p) => p.featured) ?? all[0] ?? null;
}

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const db = getPublicClient();
  if (!db) return MOCK_PRODUCTS.find((p) => p.slug === slug) ?? null;
  const { data, error } = await db.from("products").select(PRODUCT_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`Failed to load product: ${error.message}`);
  return data ? normalizeProduct(data as unknown as Product) : null;
});

export async function getProductCounts(): Promise<Record<CategorySlug, number>> {
  const counts: Record<CategorySlug, number> = { sharee: 0, jewellery: 0, combo: 0, "3pics": 0 };
  for (const p of await getProducts()) counts[p.category]++;
  return counts;
}
