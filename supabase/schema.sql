-- =============================================================
--  PriceDrop Buddy database setup
--  How to use: Supabase → SQL Editor → New query → paste ALL of this → Run.
--  Safe to run more than once.
-- =============================================================

create table if not exists public.purchases (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  store_id      text not null,
  store_name    text not null,
  product_name  text not null check (char_length(product_name) between 1 and 200),
  product_url   text,
  order_number  text,
  sku           text,
  price_paid    numeric(10, 2) not null check (price_paid > 0),
  purchase_date date not null,
  window_days   integer not null check (window_days between 1 and 365),
  status        text not null default 'tracking'
                check (status in ('tracking', 'claimed', 'no_drop')),
  created_at    timestamptz not null default now()
);

create index if not exists purchases_user_id_idx on public.purchases (user_id);

-- Let logged-in users reach this table through the API.
-- (Needed because new tables are not exposed automatically.)
-- Logged-out visitors get no access at all.
revoke all on public.purchases from anon;
grant select, insert, update, delete on public.purchases to authenticated;
-- The daily reminder program (secret key) reads purchases and marks reminders sent.
grant select, update on public.purchases to service_role;

-- Row level security: each person can only see and change their own purchases.
alter table public.purchases enable row level security;

drop policy if exists "Users read own purchases" on public.purchases;
create policy "Users read own purchases" on public.purchases
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users add own purchases" on public.purchases;
create policy "Users add own purchases" on public.purchases
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own purchases" on public.purchases;
create policy "Users update own purchases" on public.purchases
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own purchases" on public.purchases;
create policy "Users delete own purchases" on public.purchases
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Added for receipt scanning (safe if the column already exists).
alter table public.purchases add column if not exists sku text;

-- Added for reminder emails (safe if the columns already exist).
alter table public.purchases add column if not exists reminded_3d boolean not null default false;
alter table public.purchases add column if not exists reminded_1d boolean not null default false;

-- Added for price checking (see supabase/updates/005_price_checks.sql).
alter table public.purchases add column if not exists last_price numeric(10, 2);
alter table public.purchases add column if not exists last_checked_at timestamptz;
alter table public.purchases add column if not exists last_check_status text;   -- ok | no_drop | blocked | not_allowed | no_price | error
alter table public.purchases add column if not exists last_check_source text;   -- auto | user
alter table public.purchases add column if not exists drop_alerted_price numeric(10, 2);
alter table public.purchases add column if not exists claimed_amount numeric(10, 2);

-- Every price seen, so we can show history and prove a drop.
create table if not exists public.price_checks (
  id          uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  price       numeric(10, 2),
  status      text not null,
  source      text not null check (source in ('auto', 'user')),
  checked_at  timestamptz not null default now()
);
create index if not exists price_checks_purchase_idx on public.price_checks (purchase_id, checked_at desc);

alter table public.price_checks enable row level security;
revoke all on public.price_checks from anon;
grant select, insert on public.price_checks to authenticated;
grant select, insert on public.price_checks to service_role;

drop policy if exists "Users read own price checks" on public.price_checks;
create policy "Users read own price checks" on public.price_checks
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users add checks to own purchases" on public.price_checks;
create policy "Users add checks to own purchases" on public.price_checks
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.purchases p
      where p.id = purchase_id and p.user_id = (select auth.uid())
    )
  );

-- Added for Community Price Radar (see supabase/updates/006_community_radar.sql).
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

-- Added for accounts (see supabase/updates/007_accounts.sql).
-- One profile per user: name, phone and email settings.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text check (char_length(full_name) <= 80),
  phone        text check (char_length(phone) <= 20),
  email_alerts boolean not null default true,
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to service_role;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Users create own profile" on public.profiles;
create policy "Users create own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Make a profile for every new account, using the name typed at sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 80), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles for accounts made before this update.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- "Delete my account": removes the logged-in user only. Their purchases and
-- price history are deleted with them; shared Radar prices stay, with no name.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
