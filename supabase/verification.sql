-- ═══════════════════════════════════════════════════════════════
-- AgricWorld Verified Business Program
-- Run AFTER schema.sql (safe to re-run). Adds:
--   • business profile fields (logo, website, socials, country/state/city, business type)
--   • verification_tiers        – admin-configurable names, pricing, duration, benefits, badge
--   • verification_applications – full application workflow
--   • verification_payments     – fee / tier / renewal payments (NEVER grant the badge)
--   • verification_history      – audit trail (admin only)
--   • admin_decide_verification – the ONLY path that sets companies.ver
-- Payments never verify a business: only an admin decision does.
-- ═══════════════════════════════════════════════════════════════

-- ───────────── company profile upgrades ─────────────
alter table public.companies add column if not exists logo       text default '';
alter table public.companies add column if not exists website    text default '';
alter table public.companies add column if not exists socials    jsonb default '{}'::jsonb;
alter table public.companies add column if not exists country    text default 'Nigeria';
alter table public.companies add column if not exists state      text default '';
alter table public.companies add column if not exists city       text default '';
alter table public.companies add column if not exists btype      text default '';
alter table public.companies add column if not exists ver_tier   text default '';
alter table public.companies add column if not exists ver_since  timestamptz;
alter table public.companies add column if not exists ver_until  timestamptz;
alter table public.companies add column if not exists ver_status text not null default 'unverified';

-- ver, ver_tier, ver_since, ver_until, ver_status can only change through admin / security-definer paths
create or replace function public.protect_company_ver() returns trigger language plpgsql as $$
begin
  if not public.is_admin() then
    new.ver := old.ver; new.ver_tier := old.ver_tier; new.ver_since := old.ver_since; new.ver_until := old.ver_until; new.ver_status := old.ver_status;
  end if;
  return new;
end $$;
drop trigger if exists companies_protect_ver on public.companies;
create trigger companies_protect_ver before update on public.companies for each row execute function public.protect_company_ver();

-- ───────────── tiers (admin-configurable) ─────────────
create table if not exists public.verification_tiers (
  id              text primary key,                      -- slug, e.g. 'business'
  name            text not null,                         -- admin can rename freely
  tagline         text default '',
  price           numeric,                               -- null = not priced yet (shown as "pricing to be confirmed"); 0 = free
  application_fee numeric default 0,
  renewal_price   numeric,                               -- null = same as price
  currency        text not null default 'NGN',
  duration_days   int not null default 365,
  eligibility     text[] default '{}',
  requirements    text[] default '{}',
  benefits        text[] default '{}',                   -- only benefits the platform actually implements
  badge           text not null default 'green' check (badge in ('green','gold','platinum','global')),
  placement       int not null default 0,                -- directory/search boost rank (higher = earlier)
  featured        boolean not null default false,        -- eligible for "Verified businesses" home strip
  active          boolean not null default true,
  sort            int not null default 0,
  updated_at      timestamptz not null default now()
);
alter table public.verification_tiers enable row level security;
drop policy if exists "tiers: public read" on public.verification_tiers;
create policy "tiers: public read" on public.verification_tiers for select using (true);
drop policy if exists "tiers: admin write" on public.verification_tiers;
create policy "tiers: admin write" on public.verification_tiers for all using (public.is_admin()) with check (public.is_admin());

-- default tiers: names are editable, prices deliberately NOT set (null) until the owner configures them
insert into public.verification_tiers (id, name, tagline, badge, placement, featured, sort, duration_days, eligibility, requirements, benefits) values
 ('business',     'Verified Business',        'For registered farms, shops and agro-dealers',            'green',    1, false, 1, 365,
   array['Registered business or cooperative','Active AgricWorld storefront','Reachable phone, WhatsApp or email'],
   array['CAC / business registration certificate','Valid ID of the owner or director','Proof of business address'],
   array['Verified badge on profile, listings, search and directory','Verified filter in search and directory','Verification status shown to every buyer']),
 ('professional', 'Verified Professional',    'For vets, agronomists, consultants and service providers', 'gold',     2, false, 2, 365,
   array['Licensed or certified professional','Professional service listings on AgricWorld'],
   array['Professional licence or certificate','Valid ID','Proof of practice address'],
   array['Verified badge on profile, listings, search and directory','Verified filter in search and directory','Higher placement in directory results']),
 ('enterprise',   'Verified Enterprise',      'For processors, manufacturers, importers and large farms', 'platinum', 3, true,  3, 365,
   array['Registered company with staff and physical premises','Multiple product lines or facilities'],
   array['CAC certificate and TIN','Director ID','Proof of premises','Product or facility certifications where applicable'],
   array['Verified badge on profile, listings, search and directory','Verified filter in search and directory','Higher placement in directory results','Eligible for the Verified businesses section on the homepage']),
 ('global',       'Verified Global Business', 'For exporters, importers and international traders',        'global',   4, true,  4, 365,
   array['Export or import documentation','Registered company in its home country'],
   array['Company registration','Export / import licence or NEPC registration','Director ID','Proof of premises'],
   array['Verified badge on profile, listings, search and directory','Verified filter in search and directory','Top placement in directory results','Eligible for the Verified businesses section on the homepage'])
on conflict (id) do nothing;

-- ───────────── applications ─────────────
create table if not exists public.verification_applications (
  id              bigserial primary key,
  company_id      text not null references public.companies(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  tier_id         text references public.verification_tiers(id) on delete set null,
  legal_name      text not null default '',
  reg_number      text default '',
  reg_type        text default '',                      -- CAC BN / RC / Cooperative / Licence …
  tax_id          text default '',
  address         text default '',
  country         text default 'Nigeria',
  state           text default '',
  city            text default '',
  contact_name    text default '',
  contact_phone   text default '',
  contact_email   text default '',
  website         text default '',
  socials         jsonb default '{}'::jsonb,
  business_type   text default '',
  sectors         text[] default '{}',
  category        text default '',
  description     text default '',
  docs            jsonb default '[]'::jsonb,            -- [{name, url, kind}]
  status          text not null default 'pending' check (status in ('pending','verified','rejected','expired','suspended')),
  docs_requested  text default '',                      -- non-empty while admin waits for more documents
  admin_note      text default '',
  reviewed_by     uuid,
  reviewed_at     timestamptz,
  verified_at     timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists ver_app_company on public.verification_applications(company_id, created_at desc);
alter table public.verification_applications enable row level security;
drop policy if exists "verapp: own or admin read" on public.verification_applications;
create policy "verapp: own or admin read" on public.verification_applications for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "verapp: own insert" on public.verification_applications;
create policy "verapp: own insert" on public.verification_applications for insert
  with check (user_id = auth.uid() and exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));
drop policy if exists "verapp: own update while pending" on public.verification_applications;
create policy "verapp: own update while pending" on public.verification_applications for update
  using (user_id = auth.uid() and status = 'pending') with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "verapp: admin update" on public.verification_applications;
create policy "verapp: admin update" on public.verification_applications for update using (public.is_admin());

-- applicants can edit their own pending application, but never its decision fields
create or replace function public.protect_ver_app() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if not public.is_admin() then
    new.status := old.status; new.docs_requested := old.docs_requested; new.admin_note := old.admin_note;
    new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at; new.verified_at := old.verified_at; new.expires_at := old.expires_at;
  end if;
  return new;
end $$;
drop trigger if exists ver_app_protect on public.verification_applications;
create trigger ver_app_protect before update on public.verification_applications for each row execute function public.protect_ver_app();

-- ───────────── payments (never grant verification) ─────────────
create table if not exists public.verification_payments (
  id              bigserial primary key,
  application_id  bigint references public.verification_applications(id) on delete set null,
  company_id      text not null references public.companies(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  tier_id         text,
  kind            text not null check (kind in ('application_fee','tier','renewal')),
  amount          numeric not null check (amount >= 0),
  currency        text not null default 'NGN',
  method          text not null default 'paystack' check (method in ('paystack','stripe','transfer')),
  reference       text unique,
  status          text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);
alter table public.verification_payments enable row level security;
drop policy if exists "verpay: own or admin read" on public.verification_payments;
create policy "verpay: own or admin read" on public.verification_payments for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "verpay: own insert" on public.verification_payments;
create policy "verpay: own insert" on public.verification_payments for insert with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "verpay: admin update" on public.verification_payments;
create policy "verpay: admin update" on public.verification_payments for update using (public.is_admin());
-- the browser can never mark a verification payment paid: only the service role (api/verification-pay.js) or an admin
create or replace function public.protect_ver_payment() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status and not public.is_admin() then new.status := old.status; new.paid_at := old.paid_at; end if;
  return new;
end $$;
drop trigger if exists ver_pay_protect on public.verification_payments;
create trigger ver_pay_protect before update on public.verification_payments for each row execute function public.protect_ver_payment();

-- ───────────── history / audit (admin-only) ─────────────
create table if not exists public.verification_history (
  id              bigserial primary key,
  application_id  bigint,
  company_id      text,
  action          text not null,
  from_status     text,
  to_status       text,
  note            text default '',
  actor           uuid,
  created_at      timestamptz not null default now()
);
alter table public.verification_history enable row level security;
drop policy if exists "verhist: own or admin read" on public.verification_history;
create policy "verhist: own or admin read" on public.verification_history for select
  using (public.is_admin() or exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));

create or replace function public.log_ver_app() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into verification_history(application_id, company_id, action, from_status, to_status, actor) values (new.id, new.company_id, 'submitted', null, new.status, auth.uid());
  elsif new.status is distinct from old.status or new.docs_requested is distinct from old.docs_requested then
    insert into verification_history(application_id, company_id, action, from_status, to_status, note, actor)
      values (new.id, new.company_id, case when new.docs_requested <> '' and new.docs_requested is distinct from old.docs_requested then 'documents_requested' else new.status end, old.status, new.status, coalesce(nullif(new.docs_requested, ''), new.admin_note, ''), auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists ver_app_log on public.verification_applications;
create trigger ver_app_log after insert or update on public.verification_applications for each row execute function public.log_ver_app();

-- ───────────── the only path that grants / removes the badge ─────────────
-- action: approve | reject | request_docs | suspend | revoke | reinstate | renew
create or replace function public.admin_decide_verification(p_app bigint, p_action text, p_note text default '')
returns json language plpgsql security definer set search_path = public as $$
declare a verification_applications%rowtype; t verification_tiers%rowtype; days int := 365;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select * into a from verification_applications where id = p_app;
  if a.id is null then raise exception 'application not found'; end if;
  select * into t from verification_tiers where id = a.tier_id;
  if t.id is not null then days := t.duration_days; end if;

  if p_action = 'approve' or p_action = 'renew' or p_action = 'reinstate' then
    update verification_applications set status = 'verified', docs_requested = '', admin_note = coalesce(p_note, ''), reviewed_by = auth.uid(), reviewed_at = now(),
      verified_at = coalesce(case when p_action = 'approve' then now() else verified_at end, now()),
      expires_at = case when p_action = 'renew' then greatest(coalesce(expires_at, now()), now()) + make_interval(days => days) else now() + make_interval(days => days) end
      where id = p_app;
    update companies set ver = true, ver_tier = coalesce(a.tier_id, ''), ver_since = coalesce(ver_since, now()), ver_status = 'verified',
      ver_until = (select expires_at from verification_applications where id = p_app) where id = a.company_id;
  elsif p_action = 'reject' then
    update verification_applications set status = 'rejected', docs_requested = '', admin_note = coalesce(p_note, ''), reviewed_by = auth.uid(), reviewed_at = now() where id = p_app;
    update companies set ver = false, ver_status = 'rejected' where id = a.company_id and ver_status <> 'verified';
  elsif p_action = 'request_docs' then
    update verification_applications set status = 'pending', docs_requested = coalesce(nullif(p_note, ''), 'Additional documents requested'), reviewed_by = auth.uid(), reviewed_at = now() where id = p_app;
    update companies set ver_status = 'pending' where id = a.company_id and not ver;
  elsif p_action = 'suspend' then
    update verification_applications set status = 'suspended', admin_note = coalesce(p_note, ''), reviewed_by = auth.uid(), reviewed_at = now() where id = p_app;
    update companies set ver = false, ver_status = 'suspended' where id = a.company_id;
  elsif p_action = 'revoke' then
    update verification_applications set status = 'rejected', admin_note = coalesce(nullif(p_note, ''), 'Verification revoked'), reviewed_by = auth.uid(), reviewed_at = now() where id = p_app;
    update companies set ver = false, ver_tier = '', ver_until = null, ver_status = 'unverified' where id = a.company_id;
  else
    raise exception 'unknown action %', p_action;
  end if;
  return json_build_object('ok', true, 'application', p_app, 'action', p_action);
end $$;

-- mirror a NEW application onto the company card (pending) — runs as definer so the ver trigger allows it
create or replace function public.mark_company_pending() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update companies set ver_status = 'pending' where id = new.company_id and not ver;
  return new;
end $$;
drop trigger if exists ver_app_pending on public.verification_applications;
create trigger ver_app_pending after insert on public.verification_applications for each row execute function public.mark_company_pending();

-- expiry sweep: call from admin dashboard load (idempotent, cheap)
create or replace function public.expire_verifications() returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with e as (update verification_applications set status = 'expired' where status = 'verified' and expires_at is not null and expires_at < now() returning company_id)
  update companies c set ver = false, ver_status = 'expired' from e where c.id = e.company_id;
  get diagnostics n = row_count;
  return n;
end $$;

-- stats: pending applications instead of the legacy request table
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
    'pending_ver',(select count(*) from verification_applications where status = 'pending') + (select count(*) from verification_requests where status = 'pending'),
    'ver_revenue',(select coalesce(sum(amount),0) from verification_payments where status = 'paid'),
    'open_contact',(select count(*) from contact_messages where not handled),
    'subscribers',(select count(*) from subscribers),
    'monthly',    (select coalesce(json_agg(json_build_object('m', m, 'v', v) order by m), '[]'::json) from
                    (select to_char(date_trunc('month', created_at), 'YYYY-MM') m, sum(total) v from orders
                     where status in ('paid','processing','shipped','delivered') and created_at > now() - interval '9 months' group by 1) t)
  ) into r;
  return r;
end $$;
