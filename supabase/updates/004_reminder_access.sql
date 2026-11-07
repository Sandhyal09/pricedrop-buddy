-- Update 4: let the daily reminder program (which uses the secret key)
-- read purchases and mark reminders as sent.
-- Run once in Supabase → SQL Editor. Safe to run again.
grant select, update on public.purchases to service_role;
