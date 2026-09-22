import type { Product } from "@/types/product";

// Mirrors supabase/seed.sql. Used only when Supabase env vars are not set,
// so the storefront can be designed and previewed without a database.
export const MOCK_PRODUCTS: Product[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    product_code: "OB-C-001",
    slug: "saptapadi",
    name: "সপ্তপদী",
    subtitle: "Sharee + Jewellery Combo",
    category: "combo",
    description:
      "দেশীয় ঐতিহ্য আর আরামের সুন্দর সমন্বয় — অরিজিনাল তাঁতের পিওর সুতি শাড়ি। 💫\n\n🎁 প্রিয় মানুষকে উপহার দেওয়ার জন্যও হতে পারে দারুণ একটি কম্বো। ✨",
    features: [
      "দক্ষ কারিগরের হাতে তৈরি দেশীয় তাঁতের সুতি শাড়ি",
      "১৪ হাত লম্বা শাড়ি",
      "সাথে রয়েছে রানিং ব্লাউজ পিস",
      "শতভাগ কালার গ্যারান্টি — নিয়মিত ব্যবহারের উপযোগী",
      "নরম, আরামদায়ক ও হালকা",
      "শীত, গ্রীষ্ম কিংবা বসন্ত — সব ঋতুতেই পরার উপযোগী 🌿",
    ],
    specifications: [
      { label: "Material", value: "Pure Cotton" },
      { label: "Weave", value: "Tant / Handloom" },
      { label: "Length", value: "14 Hath" },
      { label: "Blouse Piece", value: "Included" },
      { label: "Color Guarantee", value: "Yes" },
      { label: "Suitable For", value: "Regular Use" },
      { label: "Delivery", value: "All over Bangladesh" },
    ],
    price: null, // not provided — do not invent
    stock: 3,
    available: true,
    featured: true,
    images: [
      {
        id: "00000000-0000-0000-0000-0000000000a1",
        image_url: "/images/products/saptapadi-1.jpg",
        alt_text: "সপ্তপদী কম্বো — বহুরঙা পাড়ের তাঁতের সুতি শাড়ি, সাথে কড়ি ও কাপড়ের গহনা",
        sort_order: 0,
      },
    ],
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  },
];
