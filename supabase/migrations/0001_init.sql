-- অবয়ব — Oboyob · initial schema
-- id           = internal UUID (all foreign keys point here)
-- product_code = stable, human-readable business code (OB-C-001). Never derived from name.
-- slug         = URL identifier. May change; product_code must not.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- categories
-- Reference table so new categories / code prefixes can be added without code changes.
create table categories (
  slug        text primary key,             -- sharee | jewellery | combo | 3pics
  code_prefix text unique not null,         -- S | J | C | 3P
  name_bn     text not null,
  name_en     text not null,
  blurb       text,
  sort_order  integer not null default 0
);

-- ------------------------------------------------------------------ products
create table products (
  id             uuid primary key default gen_random_uuid(),
  product_code   text unique not null
                 check (product_code ~ '^OB-[A-Z0-9]+-[0-9]{3,}$'),
  slug           text unique not null
                 check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name           text not null,
  subtitle       text,                       -- e.g. 'Sharee + Jewellery Combo'
  category       text not null references categories(slug),
  description    text,                       -- paragraphs separated by blank lines
  features       jsonb not null default '[]'::jsonb,  -- ["...", "..."]
  specifications jsonb not null default '[]'::jsonb,  -- [{"label": "...", "value": "..."}]
  price          integer check (price is null or price >= 0),  -- BDT, whole taka. NULL = not set yet
  available      boolean not null default true,
  featured       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index products_category_idx on products (category);
create index products_featured_idx on products (featured) where featured;

-- ------------------------------------------------------------ product_images
create table product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  image_url   text not null,
  alt_text    text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index product_images_product_idx on product_images (product_id, sort_order);

-- -------------------------------------------------------------------- orders
-- Lightweight order requests. Snapshot code/name/price so history survives edits.
create table orders (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid references products(id) on delete set null,
  product_code    text not null,
  product_name    text not null,
  unit_price      integer,
  quantity        integer not null check (quantity between 1 and 20),
  customer_name   text not null,
  customer_phone  text not null,
  customer_address text not null,
  note            text,
  status          text not null default 'new'
                  check (status in ('new','confirmed','shipped','delivered','cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index orders_status_idx on orders (status, created_at desc);

-- ------------------------------------------------------------- updated_at
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger products_updated_at before update on products
  for each row execute function set_updated_at();
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------- RLS
alter table categories     enable row level security;
alter table products       enable row level security;
alter table product_images enable row level security;
alter table orders         enable row level security;

-- Catalog is public read-only.
create policy "public read categories" on categories     for select using (true);
create policy "public read products"   on products       for select using (true);
create policy "public read images"     on product_images for select using (true);

-- orders: no public policies. Inserts happen only from the server action
-- using the service-role key (bypasses RLS). Add admin policies with auth later.
