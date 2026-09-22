-- অবয়ব — Oboyob · admin access, archiving, auto product codes, image storage

-- ------------------------------------------------------------------ admins
create table admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table admins enable row level security;
create policy "read own admin row" on admins for select using (user_id = auth.uid());

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;

-- --------------------------------------------------------------- archiving
-- "Delete" in the dashboard archives: hidden from the shop, kept for order history.
alter table products add column archived boolean not null default false;

-- ------------------------------------------------------- product codes
-- Next code for a category: OB-C-001 → OB-C-002. Never reuses numbers of
-- archived products, because archived rows still exist.
create or replace function next_product_code(p_category text) returns text
language plpgsql security definer set search_path = public as $$
declare pfx text; n integer;
begin
  select code_prefix into pfx from categories where slug = p_category;
  if pfx is null then raise exception 'unknown category %', p_category; end if;
  select coalesce(max((regexp_match(product_code, '^OB-' || pfx || '-([0-9]+)$'))[1]::int), 0) + 1
    into n from products where product_code ~ ('^OB-' || pfx || '-[0-9]+$');
  return 'OB-' || pfx || '-' || lpad(n::text, 3, '0');
end $$;

-- Assign on insert when not given; lock code + category afterwards.
create or replace function products_code_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.product_code is null then new.product_code := next_product_code(new.category); end if;
  else
    if new.product_code is distinct from old.product_code then
      raise exception 'product_code is permanent and cannot be changed';
    end if;
    if new.category is distinct from old.category then
      raise exception 'category is fixed once a product has a code';
    end if;
  end if;
  return new;
end $$;

create trigger products_code_guard before insert or update on products
  for each row execute function products_code_guard();

-- --------------------------------------------------------------------- RLS
drop policy "public read products" on products;
create policy "read products" on products for select using (not archived or is_admin());
create policy "admin write products" on products for all using (is_admin()) with check (is_admin());

create policy "admin write images" on product_images for all using (is_admin()) with check (is_admin());

create policy "admin read orders"   on orders for select using (is_admin());
create policy "admin update orders" on orders for update using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------- storage
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "admin upload product images" on storage.objects
  for insert to authenticated with check (bucket_id = 'products' and public.is_admin());
create policy "admin update product images" on storage.objects
  for update to authenticated using (bucket_id = 'products' and public.is_admin());
create policy "admin delete product images" on storage.objects
  for delete to authenticated using (bucket_id = 'products' and public.is_admin());

-- ---------------------------------------------------------- make yourself admin
-- 1. Supabase dashboard → Authentication → Users → Add user (email + password).
-- 2. Run:
--    insert into admins (user_id) select id from auth.users where email = 'you@example.com';
