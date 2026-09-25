-- Migration for databases created before the XXL catalogue: adds the sub-category column.
-- Run once in the Supabase SQL editor, then (optionally) re-run seed.sql to load the full catalogue.
alter table public.products add column if not exists sub text default '';
create index if not exists products_sub_idx on public.products(sec, sub);
