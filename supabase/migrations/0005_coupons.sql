-- অবয়ব — Oboyob · coupons + automatic product URLs
-- Run after 0004_stock.sql.

-- ------------------------------------------------------- automatic slug
-- Admins no longer type a URL slug: new products get lower(product_code),
-- e.g. OB-S-002 → /product/ob-s-002. Existing slugs are kept.
create or replace function products_code_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.product_code is null then new.product_code := next_product_code(new.category); end if;
    if new.slug is null or new.slug = '' then new.slug := lower(new.product_code); end if;
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

-- ---------------------------------------------------------------- coupons
create table coupons (
  code          text primary key check (code ~ '^[A-Z0-9_-]{3,30}$'),  -- stored uppercase
  kind          text not null check (kind in ('percent', 'fixed')),
  value         integer not null check (value > 0),                   -- % or taka
  min_order     integer check (min_order is null or min_order >= 0),  -- taka, before discount
  max_discount  integer check (max_discount is null or max_discount > 0), -- cap for percent
  usage_limit   integer check (usage_limit is null or usage_limit > 0),
  used_count    integer not null default 0 check (used_count >= 0),
  expires_at    timestamptz,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);
alter table coupons enable row level security;
create policy "admin all coupons" on coupons for all using (is_admin()) with check (is_admin());
-- No public policy: customers check codes through the server (service role).

alter table orders add column coupon_code text;
alter table orders add column discount integer not null default 0 check (discount >= 0);

-- Discount for a subtotal, or an exception the site turns into a message:
-- COUPON_INVALID | COUPON_EXPIRED | COUPON_USED_UP | COUPON_MIN:<taka> | COUPON_NO_PRICE
create or replace function coupon_discount(c coupons, subtotal integer) returns integer
language plpgsql stable as $$
declare d integer;
begin
  if not c.active then raise exception 'COUPON_INVALID'; end if;
  if c.expires_at is not null and c.expires_at < now() then raise exception 'COUPON_EXPIRED'; end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then raise exception 'COUPON_USED_UP'; end if;
  if subtotal is null then raise exception 'COUPON_NO_PRICE'; end if;
  if c.min_order is not null and subtotal < c.min_order then raise exception 'COUPON_MIN:%', c.min_order; end if;
  if c.kind = 'percent' then
    d := floor(subtotal * c.value / 100.0);
    if c.max_discount is not null then d := least(d, c.max_discount); end if;
  else
    d := c.value;
  end if;
  return least(d, subtotal);
end $$;

-- ------------------------------------------------------------ place order
-- Same as 0004, plus an optional coupon: validated, applied and counted in
-- the same transaction as the stock.
drop function place_order(uuid, integer, uuid, text, text, text, text, text);
create function place_order(
  p_product_id uuid,
  p_quantity integer,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_email text,
  p_note text,
  p_coupon_code text default null
) returns orders
language plpgsql security definer set search_path = public as $$
declare p products; c coupons; o orders; d integer := 0; v_code text := nullif(upper(trim(p_coupon_code)), '');
begin
  select * into p from products where id = p_product_id and not archived for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if p.stock < p_quantity then raise exception 'OUT_OF_STOCK:%', p.stock; end if;

  if v_code is not null then
    select * into c from coupons where coupons.code = v_code for update;
    if not found then raise exception 'COUPON_INVALID'; end if;
    d := coupon_discount(c, p.price * p_quantity);
    update coupons set used_count = used_count + 1 where coupons.code = c.code;
  end if;

  update products set stock = stock - p_quantity where id = p.id;

  insert into orders (product_id, product_code, product_name, unit_price, quantity,
                      customer_id, customer_name, customer_phone, customer_address, customer_email, note,
                      coupon_code, discount)
  values (p.id, p.product_code, p.name, p.price, p_quantity,
          p_customer_id, p_customer_name, p_customer_phone, p_customer_address, p_customer_email, p_note,
          v_code, d)
  returning * into o;
  return o;
end $$;

revoke all on function place_order(uuid, integer, uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function place_order(uuid, integer, uuid, text, text, text, text, text, text) to service_role;

-- Preview for the order form: the discount this code would give (no side effects).
create or replace function check_coupon(p_code text, p_product_id uuid, p_quantity integer) returns integer
language plpgsql stable security definer set search_path = public as $$
declare c coupons; p products;
begin
  select * into c from coupons where code = upper(trim(p_code));
  if not found then raise exception 'COUPON_INVALID'; end if;
  select * into p from products where id = p_product_id and not archived;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  return coupon_discount(c, p.price * p_quantity);
end $$;
revoke all on function check_coupon(text, uuid, integer) from public, anon, authenticated;
grant execute on function check_coupon(text, uuid, integer) to service_role;

-- ---------------------------------------- cancelled orders give the coupon back
create or replace function orders_restock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status = 'cancelled' then
    if new.product_id is not null then
      update products set stock = stock + new.quantity where id = new.product_id;
    end if;
    if new.coupon_code is not null then
      update coupons set used_count = greatest(used_count - 1, 0) where code = new.coupon_code;
    end if;
  elsif old.status = 'cancelled' then
    if new.product_id is not null then
      update products set stock = stock - new.quantity where id = new.product_id and stock >= new.quantity;
      if not found then raise exception 'OUT_OF_STOCK: not enough stock to restore this order'; end if;
    end if;
    if new.coupon_code is not null then
      update coupons set used_count = used_count + 1 where code = new.coupon_code;
    end if;
  end if;
  return new;
end $$;
