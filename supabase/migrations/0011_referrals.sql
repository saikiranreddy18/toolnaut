-- Referral / invite-a-friend. One row per successfully redeemed invite — see
-- docs/research-backlog.md ("No referral / invite-a-friend growth loop").
--
-- NOBODY WRITES THIS FROM A BROWSER, same shape as payment_transactions and
-- webhook_events in 0004: RLS is enabled with zero policies. Only
-- api/entitlement.js, through the service-role key, ever inserts a row.
--
-- referred_id is UNIQUE, not a composite key: that is the entire integrity
-- guarantee this feature needs. One account can be credited as "referred"
-- at most once, ever, so a retried request just hits the constraint and
-- no-ops instead of crediting a referrer twice for the same friend.
create table if not exists public.referrals (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users (id) on delete cascade,
  referred_id uuid not null unique references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- The per-referrer lookup (counting successful invites, capped server-side)
-- is the only query pattern this table serves.
create index if not exists referrals_referrer_idx
  on public.referrals (referrer_id);

alter table public.referrals enable row level security;
-- (intentionally no policies — service role only)
