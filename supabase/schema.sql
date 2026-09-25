-- ═══════════════════════════════════════════════════════════════
--  AgricWorld — Supabase schema (run once in SQL Editor)
--  Creates tables, row-level security, storage bucket and helpers.
--  Safe to re-run: every statement is idempotent.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ───────────────────────── helpers ─────────────────────────
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.owner_emails() returns text[]
language sql immutable as $$ select array['frankdenis607@gmail.com']::text[]; $$;

-- ───────────────────────── profiles ─────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null default '',
  phone       text default '',
  role        text not null default 'buyer' check (role in ('buyer','seller','company','admin')),
  avatar      text,
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
drop policy if exists "profiles: admin update" on public.profiles;
create policy "profiles: admin update" on public.profiles for update using (public.is_admin());

-- Create a profile row automatically for every new auth user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_role text := coalesce(new.raw_user_meta_data->>'role', 'buyer');
begin
  if v_role not in ('buyer','seller','company') then v_role := 'buyer'; end if;
  if lower(new.email) = any (public.owner_emails()) then v_role := 'admin'; end if;
  insert into public.profiles (id, email, name, phone, role)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), coalesce(new.raw_user_meta_data->>'phone',''), v_role)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ───────────────────────── companies (sellers) ─────────────────────────
create table if not exists public.companies (
  id          text primary key,
  owner_id    uuid references public.profiles(id) on delete set null,
  name        text not null,
  sector      text not null,
  loc         text default '',
  descr       text default '',
  ver         boolean not null default false,
  year        int,
  staff       text default '',
  products    text[] default '{}',
  services    text[] default '{}',
  cover       text default '',
  phone       text default '',
  email       text default '',
  whatsapp    text default '',
  created_at  timestamptz not null default now()
);
alter table public.companies enable row level security;
drop policy if exists "companies: public read" on public.companies;
create policy "companies: public read" on public.companies for select using (true);
drop policy if exists "companies: owner insert" on public.companies;
create policy "companies: owner insert" on public.companies for insert with check (owner_id = auth.uid());
-- one account manages one storefront
create unique index if not exists companies_one_owner on public.companies(owner_id) where owner_id is not null;
drop policy if exists "companies: owner update" on public.companies;
create policy "companies: owner update" on public.companies for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
drop policy if exists "companies: admin delete" on public.companies;
create policy "companies: admin delete" on public.companies for delete using (public.is_admin());
-- Only admins can flip the verification flag
create or replace function public.protect_company_ver() returns trigger language plpgsql as $$
begin
  if new.ver is distinct from old.ver and not public.is_admin() then new.ver := old.ver; end if;
  return new;
end $$;
drop trigger if exists companies_protect_ver on public.companies;
create trigger companies_protect_ver before update on public.companies for each row execute function public.protect_company_ver();

-- ───────────────────────── products ─────────────────────────
create table if not exists public.products (
  id          bigserial primary key,
  co          text not null references public.companies(id) on delete cascade,
  sec         text not null,
  sub         text default '',
  name        text not null,
  price       numeric(14,2) not null check (price >= 0),
  unit        text default '',
  old         numeric(14,2),
  img         text default '',
  gal         text[] default '{}',
  tag         text,
  qty         int,                       -- null = not tracked
  moq         int not null default 1,
  delivery    text default '',
  descr       text default '',
  specs       jsonb default '{}'::jsonb,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists products_sec_idx on public.products(sec);
create index if not exists products_co_idx on public.products(co);
alter table public.products enable row level security;
drop policy if exists "products: public read active" on public.products;
create policy "products: public read active" on public.products for select
  using (active or public.is_admin() or exists (select 1 from public.companies c where c.id = co and c.owner_id = auth.uid()));
drop policy if exists "products: owner write" on public.products;
create policy "products: owner write" on public.products for all
  using (public.is_admin() or exists (select 1 from public.companies c where c.id = co and c.owner_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.companies c where c.id = co and c.owner_id = auth.uid()));

-- ───────────────────────── orders ─────────────────────────
create table if not exists public.orders (
  id            bigserial primary key,
  ref           text unique not null,
  buyer_id      uuid references public.profiles(id) on delete set null,
  buyer_name    text not null,
  buyer_email   text not null,
  buyer_phone   text default '',
  address       text default '',
  state         text default '',
  ship_option   text default '',
  notes         text default '',
  subtotal      numeric(14,2) not null default 0,
  shipping      numeric(14,2) not null default 0,
  fee           numeric(14,2) not null default 0,
  total         numeric(14,2) not null default 0,
  currency      text not null default 'NGN',
  method        text not null default 'paystack' check (method in ('paystack','stripe','request')),
  status        text not null default 'pending_payment'
                check (status in ('pending_payment','requested','paid','processing','shipped','delivered','cancelled','refunded')),
  paystack_ref  text,             -- gateway reference (Paystack reference or Stripe payment_intent)
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);
create table if not exists public.order_items (
  id          bigserial primary key,
  order_id    bigint not null references public.orders(id) on delete cascade,
  product_id  bigint,
  seller_co   text,
  name        text not null,
  price       numeric(14,2) not null,
  qty         int not null,
  img         text default '',
  unit        text default ''
);
create index if not exists order_items_seller_idx on public.order_items(seller_co);
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create or replace function public.sells_in_order(p_order bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.order_items oi join public.companies c on c.id = oi.seller_co
                 where oi.order_id = p_order and c.owner_id = auth.uid());
$$;

drop policy if exists "orders: insert" on public.orders;
create policy "orders: insert" on public.orders for insert with check (buyer_id is null or buyer_id = auth.uid());
drop policy if exists "orders: read" on public.orders;
create policy "orders: read" on public.orders for select
  using (buyer_id = auth.uid() or public.is_admin() or public.sells_in_order(id));
drop policy if exists "orders: seller/admin update" on public.orders;
create policy "orders: seller/admin update" on public.orders for update
  using (public.is_admin() or public.sells_in_order(id));
-- Nobody but the server (service role) may mark an order paid.
create or replace function public.protect_order_payment() returns trigger language plpgsql as $$
begin
  if auth.role() <> 'service_role' then
    if new.status in ('paid') and old.status not in ('paid') then new.status := old.status; end if;
    new.paid_at := old.paid_at; new.paystack_ref := old.paystack_ref; new.total := old.total;
  end if;
  return new;
end $$;
drop trigger if exists orders_protect_payment on public.orders;
create trigger orders_protect_payment before update on public.orders for each row execute function public.protect_order_payment();

drop policy if exists "order_items: insert" on public.order_items;
create policy "order_items: insert" on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id is null or o.buyer_id = auth.uid())));
drop policy if exists "order_items: read" on public.order_items;
create policy "order_items: read" on public.order_items for select
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
         or exists (select 1 from public.companies c where c.id = seller_co and c.owner_id = auth.uid()));

-- ───────────────────────── reviews / follows ─────────────────────────
create table if not exists public.reviews (
  id          bigserial primary key,
  product_id  bigint not null references public.products(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  rating      int not null check (rating between 1 and 5),
  body        text default '',
  created_at  timestamptz not null default now(),
  unique (product_id, user_id)
);
alter table public.reviews enable row level security;
drop policy if exists "reviews: public read" on public.reviews;
create policy "reviews: public read" on public.reviews for select using (true);
drop policy if exists "reviews: own write" on public.reviews;
create policy "reviews: own write" on public.reviews for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid());

create table if not exists public.follows (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  company_id  text not null references public.companies(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, company_id)
);
alter table public.follows enable row level security;
drop policy if exists "follows: public read" on public.follows;
create policy "follows: public read" on public.follows for select using (true);
drop policy if exists "follows: own write" on public.follows;
create policy "follows: own write" on public.follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Aggregates the site reads (no per-row scans in the browser)
create or replace view public.product_stats as
  select product_id, round(avg(rating)::numeric, 1) as rating, count(*)::int as reviews from public.reviews group by product_id;
create or replace view public.company_stats as
  select company_id, count(*)::int as followers from public.follows group by company_id;

-- ───────────────────────── messages ─────────────────────────
create table if not exists public.messages (
  id          bigserial primary key,
  company_id  text not null references public.companies(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,   -- the buyer side of the thread
  sender      text not null check (sender in ('buyer','seller')),
  sender_name text not null default '',
  body        text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists messages_thread_idx on public.messages(company_id, user_id, created_at);
alter table public.messages enable row level security;
drop policy if exists "messages: participants" on public.messages;
create policy "messages: participants" on public.messages for select
  using (user_id = auth.uid() or public.is_admin() or exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));
drop policy if exists "messages: participants insert" on public.messages;
create policy "messages: participants insert" on public.messages for insert
  with check ((sender = 'buyer' and user_id = auth.uid()) or (sender = 'seller' and exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())));
drop policy if exists "messages: participants update" on public.messages;
create policy "messages: participants update" on public.messages for update
  using (user_id = auth.uid() or exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));

-- ───────────────────────── verification requests ─────────────────────────
create table if not exists public.verification_requests (
  id          bigserial primary key,
  company_id  text not null references public.companies(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  reg_number  text default '',
  docs        text[] default '{}',
  note        text default '',
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note  text default '',
  created_at  timestamptz not null default now()
);
alter table public.verification_requests enable row level security;
drop policy if exists "verification: own or admin" on public.verification_requests;
create policy "verification: own or admin" on public.verification_requests for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "verification: own insert" on public.verification_requests;
create policy "verification: own insert" on public.verification_requests for insert with check (user_id = auth.uid());
drop policy if exists "verification: admin update" on public.verification_requests;
create policy "verification: admin update" on public.verification_requests for update using (public.is_admin());

-- ───────────────────────── contact & newsletter ─────────────────────────
create table if not exists public.contact_messages (
  id          bigserial primary key,
  name        text not null,
  email       text not null,
  phone       text default '',
  subject     text default '',
  body        text not null,
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
drop policy if exists "contact: anyone insert" on public.contact_messages;
create policy "contact: anyone insert" on public.contact_messages for insert with check (true);
drop policy if exists "contact: admin read" on public.contact_messages;
create policy "contact: admin read" on public.contact_messages for select using (public.is_admin());
drop policy if exists "contact: admin update" on public.contact_messages;
create policy "contact: admin update" on public.contact_messages for update using (public.is_admin());

create table if not exists public.subscribers (
  email       text primary key,
  created_at  timestamptz not null default now()
);
alter table public.subscribers enable row level security;
drop policy if exists "subscribers: anyone insert" on public.subscribers;
create policy "subscribers: anyone insert" on public.subscribers for insert with check (true);
drop policy if exists "subscribers: admin read" on public.subscribers;
create policy "subscribers: admin read" on public.subscribers for select using (public.is_admin());

-- ───────────────────────── admin dashboard aggregate ─────────────────────────
create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select json_build_object(
    'users',      (select count(*) from profiles),
    'buyers',     (select count(*) from profiles where role = 'buyer'),
    'sellers',    (select count(*) from profiles where role in ('seller','company')),
    'companies',  (select count(*) from companies),
    'verified',   (select count(*) from companies where ver),
    'products',   (select count(*) from products where active),
    'orders',     (select count(*) from orders),
    'paid_orders',(select count(*) from orders where status in ('paid','processing','shipped','delivered')),
    'gmv',        (select coalesce(sum(total),0) from orders where status in ('paid','processing','shipped','delivered')),
    'pending_ver',(select count(*) from verification_requests where status = 'pending'),
    'open_contact',(select count(*) from contact_messages where not handled),
    'subscribers',(select count(*) from subscribers),
    'monthly',    (select coalesce(json_agg(json_build_object('m', m, 'v', v) order by m), '[]'::json) from
                    (select to_char(date_trunc('month', created_at), 'YYYY-MM') m, sum(total) v from orders
                     where status in ('paid','processing','shipped','delivered') and created_at > now() - interval '9 months' group by 1) t)
  ) into r;
  return r;
end $$;

-- Seller dashboard aggregate
create or replace function public.seller_stats(p_co text) returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not (public.is_admin() or exists (select 1 from companies where id = p_co and owner_id = auth.uid())) then raise exception 'not your company'; end if;
  select json_build_object(
    'revenue',   (select coalesce(sum(oi.price*oi.qty),0) from order_items oi join orders o on o.id = oi.order_id where oi.seller_co = p_co and o.status in ('paid','processing','shipped','delivered')),
    'orders',    (select count(distinct oi.order_id) from order_items oi where oi.seller_co = p_co),
    'pending',   (select count(distinct oi.order_id) from order_items oi join orders o on o.id = oi.order_id where oi.seller_co = p_co and o.status in ('paid','requested','processing')),
    'products',  (select count(*) from products where co = p_co and active),
    'customers', (select count(distinct o.buyer_email) from order_items oi join orders o on o.id = oi.order_id where oi.seller_co = p_co),
    'rating',    (select coalesce(round(avg(r.rating)::numeric,1),0) from reviews r join products p on p.id = r.product_id where p.co = p_co),
    'reviews',   (select count(*) from reviews r join products p on p.id = r.product_id where p.co = p_co),
    'followers', (select count(*) from follows where company_id = p_co),
    'monthly',   (select coalesce(json_agg(json_build_object('m', m, 'v', v) order by m), '[]'::json) from
                   (select to_char(date_trunc('month', o.created_at), 'YYYY-MM') m, sum(oi.price*oi.qty) v from order_items oi join orders o on o.id = oi.order_id
                    where oi.seller_co = p_co and o.status in ('paid','processing','shipped','delivered') and o.created_at > now() - interval '9 months' group by 1) t)
  ) into r;
  return r;
end $$;

-- ───────────────────────── storage ─────────────────────────
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true) on conflict (id) do nothing;
drop policy if exists "uploads: public read" on storage.objects;
create policy "uploads: public read" on storage.objects for select using (bucket_id = 'uploads');
drop policy if exists "uploads: authenticated write" on storage.objects;
create policy "uploads: authenticated write" on storage.objects for insert to authenticated with check (bucket_id = 'uploads');
drop policy if exists "uploads: owner delete" on storage.objects;
create policy "uploads: owner delete" on storage.objects for delete to authenticated using (bucket_id = 'uploads' and owner = auth.uid());

grant usage on schema public to anon, authenticated;
grant select on public.product_stats, public.company_stats to anon, authenticated;
