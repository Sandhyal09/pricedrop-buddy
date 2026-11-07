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
