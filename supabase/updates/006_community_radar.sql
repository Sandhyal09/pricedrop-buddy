-- Update 6: Community Price Radar.
-- One shopper's price report alerts everyone who bought the same item.
-- Run once in Supabase → SQL Editor. Safe to run again.

alter table public.purchases add column if not exists item_key text;
alter table public.purchases add column if not exists community_alerted_price numeric(10, 2);
create index if not exists purchases_item_key_idx on public.purchases (item_key) where status = 'tracking';

-- Shared price reports. Who reported is stored (to stop abuse) but never shown.
create table if not exists public.price_reports (
  id          uuid primary key default gen_random_uuid(),
  store_id    text not null,
  item_key    text not null,
  price       numeric(10, 2) not null check (price > 0),
  source      text not null check (source in ('auto', 'user')),
  reporter_id uuid references auth.users (id) on delete set null default auth.uid(),
  reported_at timestamptz not null default now()
);
create index if not exists price_reports_item_idx on public.price_reports (item_key, reported_at desc);

alter table public.price_reports enable row level security;
revoke all on public.price_reports from anon, authenticated;
-- Logged-in users can see prices, but not the reporter column.
grant select (id, store_id, item_key, price, source, reported_at) on public.price_reports to authenticated;
grant insert (store_id, item_key, price, source) on public.price_reports to authenticated;
grant select, insert on public.price_reports to service_role;

drop policy if exists "Logged-in users read price reports" on public.price_reports;
create policy "Logged-in users read price reports" on public.price_reports
  for select to authenticated using (true);

drop policy if exists "Users add their own reports" on public.price_reports;
create policy "Users add their own reports" on public.price_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and source = 'user');

-- Fill in item keys for purchases saved before this update.
update public.purchases set item_key = case
  when store_id = 'target' and product_url ~ '/A-\d{6,10}'
    then 'target:' || substring(product_url from '/A-(\d{6,10})')
  when store_id = 'bestbuy' and product_url ~ 'skuId=\d{6,9}'
    then 'bestbuy:' || substring(product_url from 'skuId=(\d{6,9})')
  when store_id = 'bestbuy' and product_url ~ '/\d{6,9}\.p'
    then 'bestbuy:' || substring(product_url from '/(\d{6,9})\.p')
  when store_id = 'homedepot' and product_url ~ '/p/.*\d{9}'
    then 'homedepot:' || substring(product_url from '/(\d{9})(?:[/?#]|$)')
  when store_id = 'costco' and product_url ~ '\.product\.\d{6,12}\.html'
    then 'costco:' || substring(product_url from '\.product\.(\d{6,12})\.html')
  when store_id = 'bestbuy' and length(regexp_replace(coalesce(sku, ''), '\D', '', 'g')) >= 5
    then 'bestbuy:' || regexp_replace(sku, '\D', '', 'g')
  when store_id <> 'other' and length(regexp_replace(coalesce(sku, ''), '\D', '', 'g')) >= 5
    then store_id || ':sku:' || regexp_replace(sku, '\D', '', 'g')
  else item_key
end
where item_key is null;
