-- Durable payment records and server-side entitlement.
--
-- WHY THIS EXISTS
-- Razorpay checkout works, but a payment currently leaves no trace: verify runs
-- only if the browser survives the redirect, and nothing is written down. Close
-- the tab after paying and the money has moved with no record in the product.
-- These tables are what a webhook writes to, and what a paid feature reads.
--
-- THREE TABLES, NOT FOUR — THERE IS NO plans TABLE
-- The obvious design adds one. It would be a second copy of src/utils/planData.js,
-- which is already the single source both the pricing page and /api/create-order
-- read from. Two copies of a price is exactly the drift this codebase keeps
-- getting bitten by, so plan_code is stored as text and planData.js stays
-- canonical. A plans table can arrive later if plans ever need to be edited
-- without a deploy.
--
-- NOBODY WRITES THESE FROM A BROWSER
-- Every table below has RLS enabled and SELECT-only policies. There are
-- deliberately no INSERT/UPDATE/DELETE policies at all: writes happen through
-- the service role (the webhook and the payment endpoints), which bypasses RLS
-- by design and never ships to a client. A user who could insert their own
-- entitlement row would simply grant themselves the paid plan.

-- ── payment transactions ───────────────────────────────────────────────────
-- One row per attempted payment, created BEFORE checkout opens so an abandoned
-- attempt is still visible. user_id is NOT NULL: a payment nobody can be
-- attributed to cannot grant access and cannot be supported. That means
-- checkout must require a session before payments are re-enabled — today it
-- does not, and that has to change in the same release.
create table if not exists public.payment_transactions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users (id) on delete cascade,
  plan_code                text not null,
  -- Paise, never rupees, and never a float. Money in a floating point column is
  -- how 299.00 becomes 298.99999999999994.
  amount_paise             integer not null check (amount_paise >= 100),
  currency                 text not null default 'INR',
  status                   text not null default 'created' check (status in (
    'created', 'pending', 'authorized', 'captured',
    'failed', 'cancelled', 'refunded', 'verification_failed'
  )),
  razorpay_order_id        text not null unique,
  -- Unique so the same payment cannot be recorded twice from two directions:
  -- the browser callback and the webhook both arrive, and only one may win.
  razorpay_payment_id      text unique,
  metadata                 jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  paid_at                  timestamptz
);

create index if not exists payment_transactions_user_idx
  on public.payment_transactions (user_id, created_at desc);

alter table public.payment_transactions enable row level security;

-- Read your own payment history. Nothing else.
drop policy if exists payment_transactions_select_own on public.payment_transactions;
create policy payment_transactions_select_own on public.payment_transactions
  for select to authenticated using (auth.uid() = user_id);

-- ── entitlements ───────────────────────────────────────────────────────────
-- The single answer to "what may this account actually do". Every premium check
-- reads this table server-side. It is never derived from a browser claim, and
-- profiles.plan stays display-only.
create table if not exists public.user_entitlements (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  plan_code              text not null,
  status                 text not null default 'active' check (status in (
    'active', 'expired', 'cancelled', 'refunded'
  )),
  source                 text not null default 'razorpay_payment',
  starts_at              timestamptz not null default now(),
  -- Null means it does not expire — a one-time purchase. A subscription sets it.
  ends_at                timestamptz,
  payment_transaction_id uuid references public.payment_transactions (id) on delete set null,
  features               jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- One ACTIVE entitlement per account. Historical rows (expired/cancelled/
-- refunded) are unconstrained — they are the audit trail. Same shape as the
-- current-claim index in 0003.
create unique index if not exists user_entitlements_one_active_idx
  on public.user_entitlements (user_id)
  where status = 'active';

alter table public.user_entitlements enable row level security;

drop policy if exists user_entitlements_select_own on public.user_entitlements;
create policy user_entitlements_select_own on public.user_entitlements
  for select to authenticated using (auth.uid() = user_id);

-- ── webhook events ─────────────────────────────────────────────────────────
-- The audit trail, and the idempotency guard. Razorpay retries deliveries, so
-- the same event WILL arrive more than once; the unique id is what stops one
-- payment being credited twice.
--
-- No policies at all. Not even select — a webhook payload carries payment
-- metadata that no browser has any business reading.
create table if not exists public.webhook_events (
  id                uuid primary key default gen_random_uuid(),
  razorpay_event_id text not null unique,
  event_type        text not null,
  payload           jsonb not null,
  signature_valid   boolean not null default false,
  processing_status text not null default 'received' check (processing_status in (
    'received', 'processed', 'ignored', 'failed'
  )),
  error_message     text,
  processed_at      timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists webhook_events_type_idx
  on public.webhook_events (event_type, created_at desc);

alter table public.webhook_events enable row level security;
-- (intentionally no policies — service role only)

-- ── the entitlement question, answered in one place ────────────────────────
-- Callers ask this instead of reasoning about statuses and dates themselves.
-- security invoker, so it runs as the caller and RLS still applies: it can only
-- ever see the asker's own rows.
create or replace function public.current_entitlement()
  returns table (plan_code text, status text, ends_at timestamptz)
  language sql
  stable
  security invoker
  set search_path = public
as $$
  select e.plan_code, e.status, e.ends_at
  from public.user_entitlements e
  where e.user_id = auth.uid()
    and e.status = 'active'
    and (e.ends_at is null or e.ends_at > now())
  limit 1;
$$;

grant execute on function public.current_entitlement() to authenticated;
