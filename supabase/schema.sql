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
  price_paid    numeric(10, 2) not null check (price_paid > 0),
  purchase_date date not null,
  window_days   integer not null check (window_days between 1 and 365),
  status        text not null default 'tracking'
                check (status in ('tracking', 'claimed', 'no_drop')),
  created_at    timestamptz not null default now()
);

create index if not exists purchases_user_id_idx on public.purchases (user_id);

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
