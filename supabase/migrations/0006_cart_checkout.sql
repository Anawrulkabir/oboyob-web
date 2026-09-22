-- অবয়ব — Oboyob · cart checkout: multi-item orders, delivery charge, COD, slips
-- Run after 0005_coupons.sql.

-- ------------------------------------------------------------ order items
create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  product_id   uuid references products(id) on delete set null,
  product_code text not null,           -- snapshot, survives product edits
  product_name text not null,
  unit_price   integer not null check (unit_price >= 0),
  quantity     integer not null check (quantity between 1 and 20)
);
create index order_items_order_idx on order_items (order_id);
alter table order_items enable row level security;
create policy "admin read order items" on order_items for select using (is_admin());
create policy "customers read own order items" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid()));

-- ----------------------------------------------------------------- orders
-- The single-product columns stay for old rows; new orders use order_items.
alter table orders alter column product_code drop not null;
alter table orders alter column product_name drop not null;
alter table orders alter column quantity drop not null;

alter table orders add column delivery_zone   text check (delivery_zone in ('inside_dhaka', 'outside_dhaka'));
alter table orders add column delivery_charge integer not null default 0 check (delivery_charge >= 0);
alter table orders add column subtotal        integer;   -- items, before discount
alter table orders add column total           integer;   -- subtotal - discount + delivery
alter table orders add column payment_method  text not null default 'cod' check (payment_method = 'cod');
alter table orders add column slip_token      uuid not null default gen_random_uuid(); -- guest link to the slip
alter table orders add column emailed_at      timestamptz;

-- Old single-product orders → one item each, with totals filled in.
insert into order_items (order_id, product_id, product_code, product_name, unit_price, quantity)
select id, product_id, product_code, product_name, coalesce(unit_price, 0), quantity
from orders where product_code is not null and quantity is not null;
update orders set subtotal = unit_price * quantity, total = unit_price * quantity - discount
where unit_price is not null and subtotal is null;

-- --------------------------------------------------------------- delivery
-- Charges live here so the database decides the total. Keep lib/delivery.ts in sync.
create or replace function delivery_fee(zone text) returns integer
language sql immutable as $$
  select case zone when 'inside_dhaka' then 80 when 'outside_dhaka' then 110 end
$$;

-- ------------------------------------------------------------ place order
-- [{"product_id": "...", "quantity": 2}, ...] → one row per product (duplicates merged).
create or replace function cart_lines(p_items jsonb) returns table (product_id uuid, quantity integer)
language sql immutable as $$
  select (e->>'product_id')::uuid, sum((e->>'quantity')::int)::int
  from jsonb_array_elements(p_items) e group by 1
$$;

-- p_items: [{"product_id": "...", "quantity": 2}, ...]
-- Locks every product, checks price and stock, applies the coupon to the
-- subtotal, adds delivery, writes the order + items and takes the stock —
-- all in one transaction. Errors the site turns into messages:
--   EMPTY_CART | BAD_ZONE | PRODUCT_NOT_FOUND | PRICE_MISSING:<code> |
--   OUT_OF_STOCK:<code>:<left> | COUPON_* (see coupon_discount)
drop function if exists place_order(uuid, integer, uuid, text, text, text, text, text, text);
create or replace function place_cart_order(
  p_items jsonb,
  p_zone text,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_email text,
  p_note text,
  p_coupon_code text default null
) returns orders
language plpgsql security definer set search_path = public as $$
declare
  it record; p products; c coupons; o orders;
  v_sub integer := 0; v_disc integer := 0; v_fee integer := delivery_fee(p_zone);
  v_code text := nullif(upper(trim(p_coupon_code)), '');
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 20 then raise exception 'EMPTY_CART'; end if;
  if v_fee is null then raise exception 'BAD_ZONE'; end if;

  -- Duplicate lines are merged; products are locked in id order so
  -- concurrent orders can't deadlock.
  for it in select * from cart_lines(p_items) l order by product_id loop
    if it.quantity is null or it.quantity < 1 or it.quantity > 20 then raise exception 'EMPTY_CART'; end if;
    select * into p from products where id = it.product_id and not archived for update;
    if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
    if p.price is null then raise exception 'PRICE_MISSING:%', p.product_code; end if;
    if p.stock < it.quantity then raise exception 'OUT_OF_STOCK:%:%', p.product_code, p.stock; end if;
    v_sub := v_sub + p.price * it.quantity;
  end loop;

  if v_code is not null then
    select * into c from coupons where coupons.code = v_code for update;
    if not found then raise exception 'COUPON_INVALID'; end if;
    v_disc := coupon_discount(c, v_sub);
    update coupons set used_count = used_count + 1 where coupons.code = c.code;
  end if;

  insert into orders (customer_id, customer_name, customer_phone, customer_address, customer_email, note,
                      coupon_code, discount, delivery_zone, delivery_charge, subtotal, total, payment_method)
  values (p_customer_id, p_customer_name, p_customer_phone, p_customer_address, p_customer_email, p_note,
          v_code, v_disc, p_zone, v_fee, v_sub, v_sub - v_disc + v_fee, 'cod')
  returning * into o;

  insert into order_items (order_id, product_id, product_code, product_name, unit_price, quantity)
  select o.id, pr.id, pr.product_code, pr.name, pr.price, l.quantity
  from cart_lines(p_items) l join products pr on pr.id = l.product_id;

  update products pr set stock = pr.stock - l.quantity from cart_lines(p_items) l where pr.id = l.product_id;
  return o;
end $$;

revoke all on function place_cart_order(jsonb, text, uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function place_cart_order(jsonb, text, uuid, text, text, text, text, text, text) to service_role;

-- Coupon preview on the checkout page, for a cart subtotal (no side effects).
drop function if exists check_coupon(text, uuid, integer);
create or replace function check_coupon(p_code text, p_subtotal integer) returns integer
language plpgsql stable security definer set search_path = public as $$
declare c coupons;
begin
  select * into c from coupons where code = upper(trim(p_code));
  if not found then raise exception 'COUPON_INVALID'; end if;
  return coupon_discount(c, p_subtotal);
end $$;
revoke all on function check_coupon(text, integer) from public, anon, authenticated;
grant execute on function check_coupon(text, integer) to service_role;

-- ------------------------------------------- cancel / un-cancel → stock + coupon
create or replace function orders_restock() returns trigger
language plpgsql security definer set search_path = public as $$
declare short integer;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status = 'cancelled' then
    update products pr set stock = pr.stock + i.quantity
      from order_items i where i.order_id = new.id and pr.id = i.product_id;
    if new.coupon_code is not null then
      update coupons set used_count = greatest(used_count - 1, 0) where code = new.coupon_code;
    end if;
  elsif old.status = 'cancelled' then
    select count(*) into short from order_items i join products pr on pr.id = i.product_id
      where i.order_id = new.id and pr.stock < i.quantity;
    if short > 0 then raise exception 'OUT_OF_STOCK: not enough stock to restore this order'; end if;
    update products pr set stock = pr.stock - i.quantity
      from order_items i where i.order_id = new.id and pr.id = i.product_id;
    if new.coupon_code is not null then
      update coupons set used_count = used_count + 1 where code = new.coupon_code;
    end if;
  end if;
  return new;
end $$;
