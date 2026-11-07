-- Update 5: price checking (automatic and one-tap) and claimed refunds.
-- Run once in Supabase → SQL Editor. Safe to run again.

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
