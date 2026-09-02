-- 0009 — promo codes that grant access without a payment.
--
-- WHY THIS IS NOT A DISCOUNT
-- A discount reduces what Razorpay charges. These codes charge nothing at all:
-- they hand out a plan directly. That makes redemption an ENTITLEMENT GRANT,
-- which is the single most sensitive write in the product — the RLS tests exist
-- precisely to prove no user can perform one. So a code is redeemed by the
-- server, with the service role, after the server has checked it. The browser
-- sends a string and nothing else.
--
-- WHAT STOPS ABUSE
--   * promo_redemptions has a unique (code, user_id): the same person cannot
--     redeem the same code twice, and the constraint is what enforces it rather
--     than a check the endpoint might forget.
--   * max_redemptions caps the total. A code that leaks on social media stops
--     working instead of granting unlimited free Pro.
--   * expires_at ends the campaign without a deploy.
--   * active is the kill switch, for the same reason PAYMENTS_ENABLED exists.
--
-- NOBODY CAN READ THE CODES
-- RLS is enabled with no select policy for anon or authenticated. Being able to
-- list promo_codes would mean being able to discover every valid code, so the
-- table is service-role only — the same treatment webhook_events gets.

create table if not exists public.promo_codes (
  code            text primary key,
  plan_code       text not null,
  -- How long the granted access lasts. Independent of the plan's own
  -- period_days on purpose: a campaign can hand out one month of a plan that
  -- normally sells in a different length.
  period_days     integer not null check (period_days > 0),
  -- Null means unlimited. A number is the ceiling across all users.
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  expires_at      timestamptz,
  active          boolean not null default true,
  note            text,
  created_at      timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  id         bigint generated always as identity primary key,
  code       text not null references public.promo_codes (code) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  granted_until timestamptz,
  created_at timestamptz not null default now(),
  -- The anti-abuse rule, in the database rather than in a handler.
  constraint promo_redemptions_once_per_user unique (code, user_id)
);

create index if not exists promo_redemptions_user_idx
  on public.promo_redemptions (user_id, created_at desc);
create index if not exists promo_redemptions_code_idx
  on public.promo_redemptions (code);

alter table public.promo_codes       enable row level security;
alter table public.promo_redemptions enable row level security;

-- promo_codes: NO policies at all. Service role only — listing the codes would
-- be handing them out.

-- promo_redemptions: a person may see that they redeemed something, and
-- nothing more. No insert policy: only the server may grant.
drop policy if exists promo_redemptions_select_own on public.promo_redemptions;
create policy promo_redemptions_select_own on public.promo_redemptions
  for select to authenticated using (auth.uid() = user_id);

-- ── the launch codes ────────────────────────────────────────────────────────
-- One month of the matching plan, free. Capped and dated so a leak is bounded
-- in both volume and time; raise or extend either with an update, not a deploy.
-- Public launch codes: one month, high caps, meant to be shared.
-- Internal codes: two and three months for employees, testers and early
-- backers. Capped at 50 each because they are handed out deliberately, one
-- person at a time — a cap that low turns a leak into a nuisance rather than
-- a revenue hole, and it is the number to raise if the team grows.
insert into public.promo_codes (code, plan_code, period_days, max_redemptions, expires_at, note) values
  ('pro26',  'guru',    30, 500,  '2026-12-31T23:59:59Z', 'Launch: one month of Pro, free'),
  ('stu26',  'shishya', 30, 1000, '2026-12-31T23:59:59Z', 'Launch: one month of Student, free'),
  ('team60', 'guru',    60, 50,   '2026-12-31T23:59:59Z', 'Internal: two months of Pro — employees and testers'),
  ('team90', 'guru',    90, 50,   '2026-12-31T23:59:59Z', 'Internal: three months of Pro — employees and testers')
on conflict (code) do update
  set plan_code       = excluded.plan_code,
      period_days     = excluded.period_days,
      max_redemptions = excluded.max_redemptions,
      expires_at      = excluded.expires_at,
      note            = excluded.note;

do $$
begin
  if not exists (select 1 from public.promo_codes where code = 'pro26' and plan_code = 'guru') then
    raise exception 'pro26 did not seed correctly';
  end if;
  if not exists (select 1 from public.promo_codes where code = 'stu26' and plan_code = 'shishya') then
    raise exception 'stu26 did not seed correctly';
  end if;
  if not exists (select 1 from public.promo_codes where code = 'team60' and period_days = 60) then
    raise exception 'team60 did not seed correctly';
  end if;
  if not exists (select 1 from public.promo_codes where code = 'team90' and period_days = 90) then
    raise exception 'team90 did not seed correctly';
  end if;
end $$;
