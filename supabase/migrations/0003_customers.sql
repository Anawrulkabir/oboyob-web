-- অবয়ব — Oboyob · customer accounts + order ownership + notification contact

-- -------------------------------------------------------------- profiles
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,          -- 01XXXXXXXXX
  email      text,
  address    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "read own profile"   on profiles for select using (id = auth.uid());
create policy "update own profile" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "admin read profiles" on profiles for select using (is_admin());

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile for every new sign-in (email, phone or Facebook).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare p text := nullif(new.phone, '');
begin
  -- Supabase stores phones as 8801XXXXXXXXX; keep local format.
  if p is not null and p like '880%' then p := substr(p, 3); end if;
  insert into profiles (id, email, phone, full_name)
  values (
    new.id, nullif(new.email, ''), p,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------- orders
alter table orders add column customer_id uuid references auth.users(id) on delete set null;
alter table orders add column customer_email text;
create index orders_customer_idx on orders (customer_id, created_at desc);

create policy "customers read own orders" on orders for select using (customer_id = auth.uid());
