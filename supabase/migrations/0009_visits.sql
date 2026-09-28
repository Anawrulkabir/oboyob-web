-- Visitor log for the admin "ভিজিটর" page. Kept forever (no 30-day limit).
-- No IP address or personal data: just an anonymous browser id, the page,
-- rough location (from Vercel's IP lookup), device and where they came from.

create table if not exists visits (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  visitor_id  uuid not null,            -- random id kept in a cookie, not linked to a person
  path        text not null,
  product_slug text,                    -- set on /product/<slug> pages
  entry       boolean not null default false,  -- first page of a visit (source is set here)
  source      text,                     -- facebook | instagram | google | whatsapp | direct | other site
  country     text,                     -- ISO code, e.g. BD
  region      text,
  city        text,
  device      text                      -- mobile | tablet | desktop
);

create index if not exists visits_created_at on visits (created_at desc);
create index if not exists visits_product on visits (product_slug) where product_slug is not null;

-- Only the server (service role) writes; nobody reads the raw rows through the API.
alter table visits enable row level security;

-- Everything the admin page shows, in one call. p_days null = all time.
create or replace function visit_stats(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  since timestamptz := case when p_days is null then '-infinity'::timestamptz
                            else date_trunc('day', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka'
                                 - make_interval(days => p_days - 1) end;
  result jsonb;
begin
  if not coalesce(is_admin(), false) then raise exception 'not allowed'; end if;

  with v as (select * from visits where created_at >= since)
  select jsonb_build_object(
    'visitors',   (select count(distinct visitor_id) from v),
    'views',      (select count(*) from v),
    'visits',     (select count(*) from v where entry),
    'online',     (select count(distinct visitor_id) from visits where created_at > now() - interval '5 minutes'),
    'today',      (select count(distinct visitor_id) from visits
                    where created_at >= date_trunc('day', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka'),
    'days', coalesce((select jsonb_agg(d order by d->>'day') from (
        select jsonb_build_object('day', (created_at at time zone 'Asia/Dhaka')::date,
                                  'visitors', count(distinct visitor_id), 'views', count(*)) d
        from v group by (created_at at time zone 'Asia/Dhaka')::date) x), '[]'),
    'cities', coalesce((select jsonb_agg(c) from (
        select jsonb_build_object('city', coalesce(city, 'অজানা'), 'country', country, 'visitors', count(distinct visitor_id)) c
        from v group by city, country order by count(distinct visitor_id) desc limit 20) x), '[]'),
    'countries', coalesce((select jsonb_agg(c) from (
        select jsonb_build_object('country', coalesce(country, '?'), 'visitors', count(distinct visitor_id)) c
        from v group by country order by count(distinct visitor_id) desc limit 15) x), '[]'),
    'sources', coalesce((select jsonb_agg(c) from (
        select jsonb_build_object('source', coalesce(source, 'direct'), 'visits', count(*)) c
        from v where entry group by coalesce(source, 'direct') order by count(*) desc limit 12) x), '[]'),
    'devices', coalesce((select jsonb_agg(c) from (
        select jsonb_build_object('device', coalesce(device, 'desktop'), 'visitors', count(distinct visitor_id)) c
        from v group by coalesce(device, 'desktop') order by count(distinct visitor_id) desc) x), '[]'),
    'products', coalesce((select jsonb_agg(c) from (
        select jsonb_build_object('slug', product_slug, 'views', count(*), 'visitors', count(distinct visitor_id)) c
        from v where product_slug is not null group by product_slug order by count(*) desc limit 15) x), '[]'),
    'pages', coalesce((select jsonb_agg(c) from (
        select jsonb_build_object('path', path, 'views', count(*)) c
        from v where product_slug is null group by path order by count(*) desc limit 10) x), '[]')
  ) into result;
  return result;
end $$;

revoke all on function visit_stats(int) from public, anon;
grant execute on function visit_stats(int) to authenticated;
