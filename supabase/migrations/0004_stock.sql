-- অবয়ব — Oboyob · stock quantity + automatic sold out
-- products.stock is the single source of truth. `available` is derived from
-- it (stock > 0), so a product shows "Sold out" the moment the last piece
-- is ordered, and comes back when an order is cancelled or stock is added.

-- ------------------------------------------------------------------ stock
alter table products add column stock integer not null default 0 check (stock >= 0);

-- Existing products: 1 piece if they were marked in stock. Update these in
-- the admin dashboard to the real count.
update products set stock = case when available then 1 else 0 end;

alter table products drop column available;
alter table products add column available boolean generated always as (stock > 0) stored;

-- ------------------------------------------------------------ place order
-- Takes stock and inserts the order in one transaction, locking the product
-- row, so two customers can never both buy the last piece. Raises
-- OUT_OF_STOCK:<remaining> when there isn't enough.
create or replace function place_order(
  p_product_id uuid,
  p_quantity integer,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_email text,
  p_note text
) returns orders
language plpgsql security definer set search_path = public as $$
declare p products; o orders;
begin
  select * into p from products where id = p_product_id and not archived for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  if p.stock < p_quantity then raise exception 'OUT_OF_STOCK:%', p.stock; end if;

  update products set stock = stock - p_quantity where id = p.id;

  insert into orders (product_id, product_code, product_name, unit_price, quantity,
                      customer_id, customer_name, customer_phone, customer_address, customer_email, note)
  values (p.id, p.product_code, p.name, p.price, p_quantity,
          p_customer_id, p_customer_name, p_customer_phone, p_customer_address, p_customer_email, p_note)
  returning * into o;
  return o;
end $$;

-- Only the server (service-role key) may place orders.
revoke all on function place_order(uuid, integer, uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function place_order(uuid, integer, uuid, text, text, text, text, text) to service_role;

-- -------------------------------------------------- cancelled orders restock
-- Cancelling an order puts its pieces back; un-cancelling takes them again.
create or replace function orders_restock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.product_id is null or new.status is not distinct from old.status then return new; end if;
  if new.status = 'cancelled' then
    update products set stock = stock + new.quantity where id = new.product_id;
  elsif old.status = 'cancelled' then
    update products set stock = stock - new.quantity where id = new.product_id and stock >= new.quantity;
    if not found then raise exception 'OUT_OF_STOCK: not enough stock to restore this order'; end if;
  end if;
  return new;
end $$;

create trigger orders_restock after update of status on orders
  for each row execute function orders_restock();
