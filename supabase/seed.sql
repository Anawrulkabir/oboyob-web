-- Seed data. Safe to re-run.

insert into categories (slug, code_prefix, name_bn, name_en, blurb, sort_order) values
  ('sharee',    'S',  'শাড়ি',    'Sharee',    'ঐতিহ্য ও স্বাচ্ছন্দ্যের মেলবন্ধন',              1),
  ('jewellery', 'J',  'গহনা',    'Jewellery', 'ছোট্ট ছোঁয়ায় সম্পূর্ণ হোক সাজ',                2),
  ('combo',     'C',  'কম্বো',    'Combo',     'শাড়ি ও গহনার যত্নে বেছে নেওয়া সমন্বয়',          3),
  ('3pics',     '3P', 'থ্রি পিস', '3 Pics',    'সহজ, সুন্দর ও স্বাচ্ছন্দ্যের সংগ্রহ',            4)
on conflict (slug) do update set
  name_bn = excluded.name_bn, name_en = excluded.name_en,
  blurb = excluded.blurb, sort_order = excluded.sort_order;

-- ⚠️ PRICE: the real selling price has not been provided.
-- price is left NULL on purpose; the site shows "দাম জানতে মেসেজ করুন".
-- Set it before launch:
--   update products set price = <TAKA> where product_code = 'OB-C-001';
-- Run after all migrations (stock comes from 0004_stock.sql).
insert into products
  (product_code, slug, name, subtitle, category, description, features, specifications, price, stock, featured)
values (
  'OB-C-001',
  'saptapadi',
  'সপ্তপদী',
  'Sharee + Jewellery Combo',
  'combo',
  E'দেশীয় ঐতিহ্য আর আরামের সুন্দর সমন্বয় — অরিজিনাল তাঁতের পিওর সুতি শাড়ি। 💫\n\n🎁 প্রিয় মানুষকে উপহার দেওয়ার জন্যও হতে পারে দারুণ একটি কম্বো। ✨',
  '[
    "দক্ষ কারিগরের হাতে তৈরি দেশীয় তাঁতের সুতি শাড়ি",
    "১৪ হাত লম্বা শাড়ি",
    "সাথে রয়েছে রানিং ব্লাউজ পিস",
    "শতভাগ কালার গ্যারান্টি — নিয়মিত ব্যবহারের উপযোগী",
    "নরম, আরামদায়ক ও হালকা",
    "শীত, গ্রীষ্ম কিংবা বসন্ত — সব ঋতুতেই পরার উপযোগী 🌿"
  ]'::jsonb,
  '[
    {"label": "Material",        "value": "Pure Cotton"},
    {"label": "Weave",           "value": "Tant / Handloom"},
    {"label": "Length",          "value": "14 Hath"},
    {"label": "Blouse Piece",    "value": "Included"},
    {"label": "Color Guarantee", "value": "Yes"},
    {"label": "Suitable For",    "value": "Regular Use"},
    {"label": "Delivery",        "value": "All over Bangladesh"}
  ]'::jsonb,
  null,
  1,     -- pieces in stock: set the real count in the admin dashboard
  true
)
on conflict (product_code) do nothing;

insert into product_images (product_id, image_url, alt_text, sort_order)
select id, '/images/products/saptapadi-1.jpg',
       'সপ্তপদী কম্বো — বহুরঙা পাড়ের তাঁতের সুতি শাড়ি, সাথে কড়ি ও কাপড়ের গহনা', 0
from products p
where product_code = 'OB-C-001'
  and not exists (select 1 from product_images i where i.product_id = p.id);

-- More images: upload to Supabase Storage (public bucket, e.g. "products"), then:
-- insert into product_images (product_id, image_url, alt_text, sort_order)
-- select id, 'https://YOUR-PROJECT.supabase.co/storage/v1/object/public/products/saptapadi-1.jpg',
--        'সপ্তপদী — তাঁতের সুতি শাড়ি ও গহনার কম্বো', 0
-- from products where product_code = 'OB-C-001';

