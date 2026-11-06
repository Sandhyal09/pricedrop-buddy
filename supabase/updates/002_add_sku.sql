-- Update 2: store the item number (SKU) read from receipts.
-- Run once in Supabase → SQL Editor. Safe to run again.
alter table public.purchases add column if not exists sku text;
