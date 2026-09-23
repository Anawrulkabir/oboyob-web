-- অবয়ব — Oboyob · new-product emails to past customers
-- Run after 0006_cart_checkout.sql.

-- When the "new product" email went out (so it's never sent twice) and to how many.
alter table products add column announced_at timestamptz;
alter table products add column announced_count integer;

-- Customers who clicked "unsubscribe" in a new-product email. Order emails
-- (confirmation, slip, status) still reach them; only announcements stop.
create table email_optouts (
  email      text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table email_optouts enable row level security;
create policy "admin read optouts" on email_optouts for select using (is_admin());
-- Inserts come from the server (service role) via the unsubscribe link.

-- Everyone we can email about new products: order emails + account emails,
-- minus opt-outs. Called by the server (service role) after the admin check.
create or replace function announcement_recipients() returns table (email text, name text)
language sql stable security definer set search_path = public as $$
  select distinct on (e.email) e.email, e.name
  from (
    select lower(trim(customer_email)) as email, customer_name as name, created_at as seen
      from orders where customer_email is not null and customer_email <> ''
    union all
    select lower(trim(email)), full_name, updated_at
      from profiles where email is not null and email <> ''
  ) e
  where e.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and not exists (select 1 from email_optouts o where o.email = e.email)
  order by e.email, e.seen desc
$$;
revoke all on function announcement_recipients() from public, anon, authenticated;
grant execute on function announcement_recipients() to service_role;
