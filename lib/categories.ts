import type { CategorySlug } from "@/types/product";

export interface Category {
  slug: CategorySlug;
  /** Label used in navigation / filters, as specified by the brand. */
  label: string;
  nameEn: string;
  codePrefix: string;
  blurb: string;
}

// Mirrors the `categories` table. Kept in code because it drives static
// navigation and URL validation; update both when adding a category.
export const CATEGORIES: Category[] = [
  { slug: "sharee", label: "শাড়ি", nameEn: "Sharee", codePrefix: "S", blurb: "ঐতিহ্য ও স্বাচ্ছন্দ্যের মেলবন্ধন" },
  { slug: "jewellery", label: "Jewellery", nameEn: "Jewellery", codePrefix: "J", blurb: "ছোট্ট ছোঁয়ায় সম্পূর্ণ হোক সাজ" },
  { slug: "combo", label: "Combo", nameEn: "Combo", codePrefix: "C", blurb: "শাড়ি ও গহনার যত্নে বেছে নেওয়া সমন্বয়" },
  { slug: "3pics", label: "3 Pics", nameEn: "3 Pics", codePrefix: "3P", blurb: "সহজ, সুন্দর ও স্বাচ্ছন্দ্যের সংগ্রহ" },
];

export function getCategory(slug: string | undefined | null): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
