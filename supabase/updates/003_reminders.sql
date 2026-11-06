-- Update 3: remember which reminder emails were already sent.
-- Run once in Supabase → SQL Editor. Safe to run again.
alter table public.purchases add column if not exists reminded_3d boolean not null default false;
alter table public.purchases add column if not exists reminded_1d boolean not null default false;
