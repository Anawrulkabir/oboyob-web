import { cache } from "react";
import { unstable_cache } from "next/cache";
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

/** Cache tag for catalog reads; admin saves call revalidateTag(PRODUCTS_TAG). */
export const PRODUCTS_TAG = "products";
const CATALOG_TTL = 300; // seconds, same as the pages' revalidate

// The whole catalog is small, so fetch it once and filter in memory: every
// category tab on /shop is then served from Next's data cache, not Supabase.
const loadCatalog = unstable_cache(
  async (): Promise<Product[]> => {
    const db = getPublicClient();
    if (!db) return MOCK_PRODUCTS;
    const { data, error } = await db.from("products").select(PRODUCT_SELECT).order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to load products: ${error.message}`);
    return (data as unknown as Product[]).map(normalizeProduct);
  },
  ["catalog"],
  { revalidate: CATALOG_TTL, tags: [PRODUCTS_TAG] },
);

export async function getProducts(opts: { category?: CategorySlug } = {}): Promise<Product[]> {
  const all = await loadCatalog();
  return sortCatalog(opts.category ? all.filter((p) => p.category === opts.category) : all);
}

export async function getFeaturedProduct(): Promise<Product | null> {
  const all = await getProducts();
  return all.find((p) => p.featured) ?? all[0] ?? null;
}

export const getProductBySlug = cache(
  unstable_cache(
    async (slug: string): Promise<Product | null> => {
      const db = getPublicClient();
      if (!db) return MOCK_PRODUCTS.find((p) => p.slug === slug) ?? null;
      const { data, error } = await db.from("products").select(PRODUCT_SELECT).eq("slug", slug).maybeSingle();
      if (error) throw new Error(`Failed to load product: ${error.message}`);
      return data ? normalizeProduct(data as unknown as Product) : null;
    },
    ["product-by-slug"],
    { revalidate: CATALOG_TTL, tags: [PRODUCTS_TAG] },
  ),
);

export async function getProductCounts(): Promise<Record<CategorySlug, number>> {
  const counts: Record<CategorySlug, number> = { sharee: 0, jewellery: 0, combo: 0, "3pics": 0 };
  for (const p of await getProducts()) counts[p.category]++;
  return counts;
}
