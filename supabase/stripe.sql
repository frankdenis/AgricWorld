-- AgricWorld — enable Stripe as a second payment gateway.
-- Run this ONCE in Supabase → SQL editor if you created the database before Stripe support was added.
-- (Fresh installs of schema.sql already include it.)
alter table public.orders drop constraint if exists orders_method_check;
alter table public.orders add constraint orders_method_check check (method in ('paystack','stripe','request'));
comment on column public.orders.paystack_ref is 'Gateway reference: Paystack transaction reference or Stripe payment_intent id';
