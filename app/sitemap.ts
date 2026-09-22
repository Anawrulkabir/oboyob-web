import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";
import { CATEGORIES } from "@/lib/categories";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  return [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/shop`, changeFrequency: "weekly", priority: 0.8 },
    ...CATEGORIES.map((c) => ({ url: `${site.url}/shop?category=${c.slug}`, priority: 0.6 })),
    ...products.map((p) => ({ url: `${site.url}/product/${p.slug}`, lastModified: p.updated_at, priority: 0.9 })),
  ];
}
