-- জীনাহ — Zeenah · bargaining: personal coupons, admin-created orders, price edits
-- Run after 0007_announcements.sql.

-- ---------------------------------------------------------------- coupons
-- A "bargain" coupon is for one customer and one product: usable only with
-- that phone number (if set) and only on that product (if set), where the
-- discount can't exceed that product's line in the cart.
alter table coupons add column phone      text check (phone is null or phone ~ '^01[3-9][0-9]{8}$');
alter table coupons add column product_id uuid references products(id) on delete cascade;
alter table coupons add column note       text;   -- admin's reminder, e.g. "Rahim, Messenger, agreed 1000"

-- --------------------------------------------------------------- orders
alter table orders drop constraint if exists orders_delivery_zone_check;
alter table orders add constraint orders_delivery_zone_check
  check (delivery_zone in ('inside_dhaka', 'outside_dhaka', 'pickup'));

alter table orders add column admin_discount integer not null default 0 check (admin_discount >= 0); -- "special discount"
alter table orders add column source     text not null default 'website' check (source in ('website', 'admin'));
alter table orders add column channel    text check (channel in ('facebook', 'phone', 'whatsapp', 'in_person', 'other'));
alter table orders add column price_note text;           -- internal: why the price differs
alter table orders add column priced_at  timestamptz;    -- last admin price edit

-- Catalog price at the time of the order, so a bargained unit_price shows as a discount.
alter table order_items add column list_price integer check (list_price is null or list_price >= 0);
update order_items set list_price = unit_price where list_price is null;

-- Pickup ("hand to hand") is admin-only; the website offers the two delivery zones.
create or replace function delivery_fee(zone text) returns integer
language sql immutable as $$
  select case zone when 'inside_dhaka' then 80 when 'outside_dhaka' then 110 when 'pickup' then 0 end
$$;

-- ----------------------------------------------------- coupon on a cart
-- Discount a coupon gives on this cart, or a COUPON_* exception:
--   COUPON_PHONE (another customer's coupon) | COUPON_PRODUCT (product not in cart)
--   plus the ones from coupon_discount().
create or replace function cart_coupon_discount(c coupons, p_items jsonb, p_phone text) returns integer
language plpgsql stable security definer set search_path = public as $$
declare v_sub integer; v_line integer;
begin
  if c.phone is not null and c.phone is distinct from p_phone then raise exception 'COUPON_PHONE'; end if;
  select sum(pr.price * l.quantity) into v_sub from cart_lines(p_items) l join products pr on pr.id = l.product_id;
  if c.product_id is null then return coupon_discount(c, v_sub); end if;
  select pr.price * l.quantity into v_line from cart_lines(p_items) l join products pr on pr.id = l.product_id
    where pr.id = c.product_id;
  if v_line is null then raise exception 'COUPON_PRODUCT'; end if;
  -- Minimum order still looks at the whole cart; the discount only at this product.
  if c.min_order is not null and v_sub < c.min_order then raise exception 'COUPON_MIN:%', c.min_order; end if;
  return least(coupon_discount(c, v_line), v_line);
end $$;

-- Checkout "Apply": what this code takes off this cart for this phone (no side effects).
drop function if exists check_coupon(text, integer);
create or replace function check_coupon(p_code text, p_items jsonb, p_phone text default null) returns integer
language plpgsql stable security definer set search_path = public as $$
declare c coupons;
begin
  select * into c from coupons where code = upper(trim(p_code));
  if not found then raise exception 'COUPON_INVALID'; end if;
  -- No phone typed yet: don't reveal whose coupon it is, just ask for the number.
  if c.phone is not null and nullif(p_phone, '') is null then raise exception 'COUPON_NEED_PHONE'; end if;
  return cart_coupon_discount(c, p_items, p_phone);
end $$;
revoke all on function check_coupon(text, jsonb, text) from public, anon, authenticated;
grant execute on function check_coupon(text, jsonb, text) to service_role;

-- ------------------------------------------------------ website order
-- Same as 0006, plus bargain coupons and list_price on each line.
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
  if v_fee is null or p_zone = 'pickup' then raise exception 'BAD_ZONE'; end if;

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
    v_disc := cart_coupon_discount(c, p_items, p_customer_phone);
    update coupons set used_count = used_count + 1 where coupons.code = c.code;
  end if;

  insert into orders (customer_id, customer_name, customer_phone, customer_address, customer_email, note,
                      coupon_code, discount, delivery_zone, delivery_charge, subtotal, total, payment_method)
  values (p_customer_id, p_customer_name, p_customer_phone, p_customer_address, p_customer_email, p_note,
          v_code, v_disc, p_zone, v_fee, v_sub, v_sub - v_disc + v_fee, 'cod')
  returning * into o;

  insert into order_items (order_id, product_id, product_code, product_name, unit_price, list_price, quantity)
  select o.id, pr.id, pr.product_code, pr.name, pr.price, pr.price, l.quantity
  from cart_lines(p_items) l join products pr on pr.id = l.product_id;

  update products pr set stock = pr.stock - l.quantity from cart_lines(p_items) l where pr.id = l.product_id;
  return o;
end $$;

-- -------------------------------------------------- admin-created order
-- For customers who ordered on Facebook / phone / in person.
-- p_items: [{"product_id": "...", "quantity": 1, "unit_price": 1000}, ...]
--   unit_price is the agreed price per piece; leave it out for the catalog price.
-- Errors: NOT_ADMIN | EMPTY_CART | BAD_ZONE | BAD_PRICE | BAD_STATUS | PRODUCT_NOT_FOUND |
--         PRICE_MISSING:<code> | OUT_OF_STOCK:<code>:<left> | DISCOUNT_TOO_BIG
create or replace function admin_create_order(
  p_items jsonb,
  p_zone text,
  p_delivery_charge integer,     -- null = the zone's normal charge
  p_admin_discount integer,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_email text,
  p_note text,
  p_price_note text,
  p_channel text,
  p_status text                  -- 'new' or 'confirmed'
) returns orders
language plpgsql security definer set search_path = public as $$
declare
  it record; p products; o orders; v_price integer;
  v_sub integer := 0; v_list integer := 0;
  v_fee integer := coalesce(p_delivery_charge, delivery_fee(p_zone));
  v_disc integer := coalesce(p_admin_discount, 0);
  v_customer uuid;
begin
  if not is_admin() then raise exception 'NOT_ADMIN'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 30 then raise exception 'EMPTY_CART'; end if;
  if delivery_fee(p_zone) is null or v_fee < 0 then raise exception 'BAD_ZONE'; end if;
  if v_disc < 0 then raise exception 'BAD_PRICE'; end if;
  if coalesce(p_status, 'new') not in ('new', 'confirmed') then raise exception 'BAD_STATUS'; end if;

  -- One line per product (quantities added, first price given wins).
  create temp table if not exists _admin_lines (product_id uuid, quantity integer, unit_price integer) on commit drop;
  truncate _admin_lines;
  insert into _admin_lines
    select (e->>'product_id')::uuid, sum((e->>'quantity')::int)::int,
           (array_agg((e->>'unit_price')::int) filter (where e ? 'unit_price' and e->>'unit_price' <> ''))[1]
    from jsonb_array_elements(p_items) e group by 1;

  for it in select * from _admin_lines order by product_id loop
    if it.quantity is null or it.quantity < 1 or it.quantity > 99 then raise exception 'EMPTY_CART'; end if;
    select * into p from products where id = it.product_id for update;
    if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
    v_price := coalesce(it.unit_price, p.price);
    if v_price is null then raise exception 'PRICE_MISSING:%', p.product_code; end if;
    if v_price < 0 then raise exception 'BAD_PRICE'; end if;
    if p.stock < it.quantity then raise exception 'OUT_OF_STOCK:%:%', p.product_code, p.stock; end if;
    update _admin_lines set unit_price = v_price where product_id = it.product_id;
    v_sub := v_sub + v_price * it.quantity;
  end loop;
  if v_disc > v_sub then raise exception 'DISCOUNT_TOO_BIG'; end if;

  -- The customer's account, if they have one with this phone number.
  select id into v_customer from profiles where phone = p_customer_phone order by created_at limit 1;

  insert into orders (customer_id, customer_name, customer_phone, customer_address, customer_email, note,
                      discount, admin_discount, delivery_zone, delivery_charge, subtotal, total, payment_method,
                      source, channel, price_note, status, priced_at)
  values (v_customer, p_customer_name, p_customer_phone, p_customer_address, nullif(p_customer_email, ''), p_note,
          0, v_disc, p_zone, v_fee, v_sub, v_sub - v_disc + v_fee, 'cod',
          'admin', p_channel, nullif(p_price_note, ''), coalesce(nullif(p_status, ''), 'new'), now())
  returning * into o;

  insert into order_items (order_id, product_id, product_code, product_name, unit_price, list_price, quantity)
  select o.id, pr.id, pr.product_code, pr.name, l.unit_price, pr.price, l.quantity
  from _admin_lines l join products pr on pr.id = l.product_id;

  update products pr set stock = pr.stock - l.quantity from _admin_lines l where pr.id = l.product_id;
  return o;
end $$;
revoke all on function admin_create_order(jsonb, text, integer, integer, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function admin_create_order(jsonb, text, integer, integer, text, text, text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------- admin price edit
-- Change agreed prices / special discount / delivery on an existing order
-- (not once delivered or cancelled). Quantities don't change here.
-- p_prices: [{"item_id": "...", "unit_price": 1000}, ...]
create or replace function admin_update_order_pricing(
  p_order_id uuid,
  p_prices jsonb,
  p_admin_discount integer,
  p_zone text,
  p_delivery_charge integer,
  p_price_note text
) returns orders
language plpgsql security definer set search_path = public as $$
declare o orders; e jsonb; v_sub integer; v_fee integer;
begin
  if not is_admin() then raise exception 'NOT_ADMIN'; end if;
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.status in ('delivered', 'cancelled') then raise exception 'ORDER_LOCKED'; end if;
  if delivery_fee(p_zone) is null then raise exception 'BAD_ZONE'; end if;
  v_fee := coalesce(p_delivery_charge, delivery_fee(p_zone));
  if v_fee < 0 or coalesce(p_admin_discount, 0) < 0 then raise exception 'BAD_PRICE'; end if;

  for e in select * from jsonb_array_elements(coalesce(p_prices, '[]'::jsonb)) loop
    if (e->>'unit_price')::int < 0 then raise exception 'BAD_PRICE'; end if;
    update order_items set unit_price = (e->>'unit_price')::int
      where id = (e->>'item_id')::uuid and order_id = o.id;
  end loop;

  select sum(unit_price * quantity) into v_sub from order_items where order_id = o.id;
  -- A coupon applied at checkout keeps its amount, but never more than the new subtotal.
  o.discount := least(o.discount, v_sub);
  if o.discount + coalesce(p_admin_discount, 0) > v_sub then raise exception 'DISCOUNT_TOO_BIG'; end if;

  update orders set
    subtotal = v_sub, discount = o.discount, admin_discount = coalesce(p_admin_discount, 0),
    delivery_zone = p_zone, delivery_charge = v_fee,
    total = v_sub - o.discount - coalesce(p_admin_discount, 0) + v_fee,
    price_note = nullif(p_price_note, ''), priced_at = now()
  where id = o.id
  returning * into o;
  return o;
end $$;
revoke all on function admin_update_order_pricing(uuid, jsonb, integer, text, integer, text) from public, anon;
grant execute on function admin_update_order_pricing(uuid, jsonb, integer, text, integer, text) to authenticated;
