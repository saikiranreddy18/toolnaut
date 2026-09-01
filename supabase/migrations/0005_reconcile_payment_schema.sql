-- 0005 — reconcile the payment schema onto one canonical source.
--
-- WHY THIS EXISTS
-- The payment tables were defined TWICE, in two files that disagreed:
--
--   supabase/migrations/0004_payments.sql   (the migration)
--   supabase/payments.sql                   (a bootstrap script)
--
-- Production was built from BOTH. A live probe on 2026-09-01 established
-- exactly which parts came from where:
--
--   payment_transactions, user_entitlements, webhook_events  <- 0004
--     (proved by user_entitlements.features existing; payments.sql has no
--      such column, and 0004 does)
--   plans                                                     <- payments.sql
--     (proved by the table existing at all; 0004 never creates it)
--
-- So production is a HYBRID, and neither file alone reproduces it. A fresh
-- database built from migrations would come up with no `plans` table, and a
-- fresh database built from payments.sql would come up with a WEAKER
-- user_entitlements: nullable user_id, no delete cascade, no partial unique
-- index, no features column, and a status constraint that rejects the
-- 'refunded' value the webhook writes on every refund.
--
-- WHAT THIS MIGRATION DOES
-- Forward-only, additive, idempotent. It ports the one object that only
-- exists in the bootstrap file (`plans`) into the migration lineage, so that
-- migrations alone reproduce production. It drops nothing and rewrites no
-- history: 0004 is already applied and must stay exactly as it is.
--
-- On production this is a near no-op — every `if not exists` finds its object
-- already there. On a fresh database it is the difference between a working
-- schema and a missing table.

-- ── plans ────────────────────────────────────────────────────────────────────
-- Canonical catalogue of what can be bought. Mirrors src/utils/planData.js;
-- the server prices orders from that module, and this table is the durable
-- record the rest of the schema and any future reporting can join against.
--
-- period_days is 30 for every plan and that is deliberate: Toolnaut sells a
-- one-time 30-day pass, not a subscription (see docs/adr/0001-billing-model.md).
-- It lives here so the grant length is data rather than a literal buried in
-- api/_supabase.js.
create table if not exists public.plans (
  plan_code    text primary key,
  name         text not null,
  amount_paise integer not null check (amount_paise >= 0),
  currency     text not null default 'INR',
  period_days  integer not null default 30 check (period_days > 0),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Seed/refresh the three plans. Idempotent: re-running updates the display
-- fields and never duplicates a row.
insert into public.plans (plan_code, name, amount_paise, period_days) values
  ('shishya', 'Student', 29900,  30),
  ('guru',    'Pro',     79900,  30),
  ('pandava', 'Team',   499900,  30)
on conflict (plan_code) do update
  set name         = excluded.name,
      amount_paise = excluded.amount_paise,
      period_days  = excluded.period_days;

-- Public catalogue data — the pricing page shows it to everyone, signed in or
-- not. Reads are open; writes belong to the service role only, which bypasses
-- RLS and therefore needs no policy of its own.
alter table public.plans enable row level security;

drop policy if exists plans_select_all on public.plans;
create policy plans_select_all on public.plans
  for select using (true);

-- Deliberately NO foreign key from payment_transactions.plan_code or
-- user_entitlements.plan_code to plans(plan_code). Those columns are an audit
-- trail of what someone actually bought; retiring a plan from the catalogue
-- must never be blocked by, or cascade into, historical payment records.
-- 0004 made the same choice and this migration does not reverse it.

-- ── assertions ───────────────────────────────────────────────────────────────
-- A migration that silently half-applies on one environment is how the two
-- files diverged in the first place. This block fails loudly instead.
do $$
begin
  if to_regclass('public.plans') is null then
    raise exception 'reconcile failed: plans table missing after migration';
  end if;
  if to_regclass('public.payment_transactions') is null then
    raise exception 'reconcile failed: payment_transactions missing — apply 0004 first';
  end if;
  if to_regclass('public.user_entitlements') is null then
    raise exception 'reconcile failed: user_entitlements missing — apply 0004 first';
  end if;
  if to_regclass('public.webhook_events') is null then
    raise exception 'reconcile failed: webhook_events missing — apply 0004 first';
  end if;

  -- The column that proves 0004 (not the bootstrap file) built the entitlement
  -- table. If this is absent the database was built from supabase/payments.sql
  -- and refunds cannot revoke access — see the file header.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'user_entitlements'
      and column_name  = 'features'
  ) then
    raise exception
      'reconcile failed: user_entitlements.features missing. This database was built from the retired supabase/payments.sql. Rebuild from supabase/migrations/ instead.';
  end if;

  -- The refund path writes status = refunded. If the constraint rejects it,
  -- every refund throws, the webhook retries forever, and the refunded
  -- customer keeps paid access.
  begin
    perform 1 from public.user_entitlements where status = 'refunded' limit 1;
  exception when others then
    raise exception 'reconcile failed: user_entitlements.status cannot hold refunded';
  end;

  if (select count(*) from public.plans) < 3 then
    raise exception 'reconcile failed: expected the three seeded plans';
  end if;
end $$;
