const bn = new Intl.NumberFormat("en-IN"); // 1,250 · 12,500 · 1,25,000

/** 1250 → "৳ 1,250". null → null (price not set). */
export function formatPrice(price: number | null): string | null {
  if (price == null) return null;
  return `৳ ${bn.format(price)}`;
}

export const PRICE_ON_REQUEST = "দাম জানতে মেসেজ করুন";
