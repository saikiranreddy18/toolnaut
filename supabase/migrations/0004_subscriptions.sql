-- Subscriptions — the only place a paid plan is allowed to be true.
--
-- WHY THE BROWSER CANNOT WRITE HERE
-- Today src/state/authStore.js hardcodes plan: 'shishya' on the client, which
-- is fine while nothing is gated and catastrophic the day something is: anyone
-- with devtools could grant themselves a paid plan by editing a value in their
-- own browser. So this table has a SELECT policy and nothing else. There is
-- deliberately no insert, update or delete policy for the anon or authenticated
-- roles, which means the only writer is the Stripe webhook running with the
-- service-role key, which bypasses RLS entirely.
--
-- The rule that follows from that: the client may READ this row to decide what
-- to show. It may never be the thing that decides what someone is allowed to
-- do. That check belongs on the server, against this table.

create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  -- Stripe's own vocabulary, stored verbatim rather than mapped to ours, so a
  -- support question can be answered by comparing this against the Stripe
  -- dashboard without a translation table in between.
  -- active | trialing | past_due | canceled | incomplete | incomplete_expired | unpaid
  status                 text not null,
  price_id               text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  -- Guards against out-of-order webhook delivery. Stripe does not promise
  -- ordering, so a stale "updated" event arriving after a "deleted" one would
  -- otherwise resurrect a cancelled subscription.
  event_created          timestamptz,
  updated_at             timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Read your own row. That is the entire client surface.
drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- Deliberately absent: any insert/update/delete policy. The webhook writes with
-- the service-role key. If you ever find yourself adding a write policy here,
-- something has gone wrong upstream.

create index if not exists subscriptions_customer_idx
  on public.subscriptions (stripe_customer_id);

-- Server-side entitlement check, callable from a serverless function with the
-- user's own JWT. Returns true only for states that should unlock paid
-- features. `past_due` is deliberately still true: the card failed, the person
-- has not cancelled, and locking them out mid-dunning loses the customer and
-- the recovery. `canceled` at period end stays true until the period actually
-- ends, which is what current_period_end is for.
create or replace function public.has_active_subscription()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and status in ('active', 'trialing', 'past_due')
      and (current_period_end is null or current_period_end > now())
  );
$$;

grant execute on function public.has_active_subscription() to authenticated;
