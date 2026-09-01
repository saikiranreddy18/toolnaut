-- Payment-to-entitlement pipeline (run in Supabase -> SQL Editor).
--
-- THE CORE RULE (docs/razorpay.md, and the architecture note this implements):
--   Razorpay confirms payment, these tables record and verify it, entitlements
--   control access, and premium features check user_entitlements — never the
--   browser, never "did checkout look successful".
--
-- All writes happen through the server-side /api functions using the service
-- role. RLS is enabled with READ-ONLY policies scoped to the owner: a user can
-- see their own payment history and plan, and can alter none of it. There are
-- deliberately NO insert/update/delete policies — the service role bypasses
-- RLS, and nothing else may write.

-- ── plans ────────────────────────────────────────────────────────────────────
-- Mirrors src/utils/planData.js (the pricing page + create-order both price
-- from that file; this table is the durable record the transactions reference).
-- If a price changes in planData.js, update it here in the same commit.
create table if not exists public.plans (
  plan_code    text primary key,          -- shishya | guru | pandava
  name         text not null,
  amount_paise integer not null check (amount_paise >= 0),
  currency     text not null default 'INR',
  period_days  integer not null default 30,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

insert into public.plans (plan_code, name, amount_paise) values
  ('shishya', 'Student', 29900),
  ('guru',    'Pro',     79900),
  ('pandava', 'Team',   499900)
on conflict (plan_code) do update
  set name = excluded.name, amount_paise = excluded.amount_paise;

-- ── payment_transactions ─────────────────────────────────────────────────────
-- One row per checkout attempt, created 'created' by /api/create-order before
-- Razorpay's window opens, settled by /api/verify-payment and (authoritatively)
-- by /api/razorpay-webhook. Amounts in paise, never floats.
create table if not exists public.payment_transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id),
  plan_code           text references public.plans(plan_code),
  status              text not null default 'created'
    check (status in ('created','pending','authorized','captured','failed',
                      'cancelled','refunded','verification_failed')),
  amount_paise        integer,
  currency            text default 'INR',
  razorpay_order_id   text unique,
  razorpay_payment_id text unique,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  paid_at             timestamptz
);
create index if not exists payment_transactions_user_idx
  on public.payment_transactions (user_id, created_at desc);

-- ── user_entitlements ────────────────────────────────────────────────────────
-- THE thing the app checks. One row per user (unique), refreshed on every
-- successful payment: ends_at = greatest(now, previous ends_at) + period, so
-- renewing early extends rather than resets.
create table if not exists public.user_entitlements (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users(id),
  plan_code              text not null references public.plans(plan_code),
  status                 text not null default 'active'
    check (status in ('active','expired','revoked')),
  source                 text not null default 'razorpay_order',
  starts_at              timestamptz not null default now(),
  ends_at                timestamptz,
  payment_transaction_id uuid references public.payment_transactions(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ── webhook_events ───────────────────────────────────────────────────────────
-- Razorpay retries deliveries; the unique event id makes processing idempotent
-- (insert first, on conflict do nothing, act only when the insert landed).
create table if not exists public.webhook_events (
  id                uuid primary key default gen_random_uuid(),
  razorpay_event_id text unique not null,
  event_type        text not null,
  payload           jsonb not null,
  processing_status text not null default 'received',
  error_message     text,
  created_at        timestamptz not null default now(),
  processed_at      timestamptz
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.plans                enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.user_entitlements    enable row level security;
alter table public.webhook_events       enable row level security;

-- Plans are public catalogue data (the pricing page shows them to everyone).
drop policy if exists "plans are readable" on public.plans;
create policy "plans are readable" on public.plans
  for select using (true);

-- Users read ONLY their own rows; nobody but the service role writes anything.
drop policy if exists "own transactions" on public.payment_transactions;
create policy "own transactions" on public.payment_transactions
  for select using (auth.uid() = user_id);

drop policy if exists "own entitlement" on public.user_entitlements;
create policy "own entitlement" on public.user_entitlements
  for select using (auth.uid() = user_id);

-- webhook_events: no policies at all — service role only.
