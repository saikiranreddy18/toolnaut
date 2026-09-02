-- 0008 — the Founder plan, and its duration as data.
--
-- The founder offer is a real purchasable plan (₹29,999, one payment, reachable
-- through the ribbon rather than the pricing grid) and it was missing from the
-- plans catalogue entirely. Every other plan had a row; this one existed only
-- in src/utils/planData.js, so the database could not answer "what did this
-- person buy, and for how long" for the single most expensive thing on sale.
--
-- TEN YEARS, NOT FOREVER
-- It is sold as lifetime access and granted as 3650 days. A promise of literal
-- infinity is one a pre-revenue product cannot underwrite, and an ends_at of
-- null makes the billing screen show no date at all — the buyer of the most
-- expensive plan would be the only customer who cannot see what they are
-- entitled to. Ten years reads the same to a buyer, shows a real date, and is a
-- commitment that can actually be kept.
--
-- Every user-facing surface says "10 years of access" to match: the ribbon, the
-- pricing pillar, the paywall, and the plan's own feature list. The number lives
-- once, in planData.js, and both the server grant and this row read it.

insert into public.plans (plan_code, name, amount_paise, period_days, active) values
  ('founder', 'Founder', 2999900, 3650, true)
on conflict (plan_code) do update
  set name         = excluded.name,
      amount_paise = excluded.amount_paise,
      period_days  = excluded.period_days,
      active       = excluded.active;

do $$
begin
  if not exists (
    select 1 from public.plans where plan_code = 'founder' and period_days = 3650
  ) then
    raise exception 'founder plan missing or not granted 3650 days';
  end if;
end $$;
