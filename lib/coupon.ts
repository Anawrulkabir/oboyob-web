import { formatPrice } from "@/lib/format";

/** Coupon codes are stored uppercase: A–Z, 0–9, _ and -, 3–30 long. */
export const normalizeCouponCode = (raw: string) => raw.trim().toUpperCase();
export const COUPON_CODE = /^[A-Z0-9_-]{3,30}$/;

/** Turns the database's COUPON_* errors into a message for the customer. */
export function couponErrorMessage(dbMessage: string | undefined): string | null {
  if (!dbMessage?.includes("COUPON_")) return null;
  if (dbMessage.includes("COUPON_EXPIRED")) return "এই কুপনের মেয়াদ শেষ।";
  if (dbMessage.includes("COUPON_USED_UP")) return "এই কুপনটি আর ব্যবহার করা যাবে না।";
  if (dbMessage.includes("COUPON_NO_PRICE")) return "এই পণ্যে কুপন প্রযোজ্য নয় — দাম ফোনে জানানো হবে।";
  if (dbMessage.includes("COUPON_NEED_PHONE")) return "এই কুপনটি একটি নির্দিষ্ট নম্বরের জন্য — আগে আপনার মোবাইল নম্বর লিখুন, তারপর আবার প্রয়োগ করুন।";
  if (dbMessage.includes("COUPON_PHONE")) return "এই কুপনটি অন্য একটি মোবাইল নম্বরের জন্য দেওয়া। যে নম্বর দিয়ে কথা বলেছিলেন সেটি লিখুন।";
  if (dbMessage.includes("COUPON_PRODUCT")) return "এই কুপনটি একটি নির্দিষ্ট পণ্যের জন্য — সেই পণ্যটি কার্টে নেই।";
  const min = dbMessage.match(/COUPON_MIN:(\d+)/)?.[1];
  if (min) return `কমপক্ষে ${formatPrice(Number(min))} অর্ডারে এই কুপন চলবে।`;
  return "কুপন কোডটি সঠিক নয়।";
}
