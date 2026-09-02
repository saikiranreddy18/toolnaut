-- Toolnaut subscription metrics.
-- Paste into Supabase -> SQL Editor and Run. READ-ONLY: SELECTs only.
--
-- WHY SQL AND NOT A DASHBOARD PAGE
-- These numbers are business data, not user data. A page inside the app would
-- need an admin role that does not exist yet, and building one to show revenue
-- is a larger security surface than the reporting is worth today. Postgres
-- already answers every question below; the SQL Editor is the dashboard.
--
-- ONE THING TO KNOW BEFORE READING THE NUMBERS
-- Toolnaut sells one-time passes, not subscriptions. There is no recurring
-- charge, so "MRR" is not literally monthly recurring revenue — it is revenue
-- collected in a period. Calling it MRR would flatter the business by implying
-- money that arrives again next month without anyone deciding to buy. The
-- queries below say "collected" instead, on purpose.

-- ============================================================
-- 1. ACTIVE ENTITLEMENTS — who can use paid features right now
-- ============================================================
select
  plan_code,
  count(*)                                            as active_now,
  min(ends_at)                                        as next_expiry,
  count(*) filter (where ends_at < now() + interval '7 days')  as expiring_within_7d,
  count(*) filter (where ends_at is null)              as never_expires
from public.user_entitlements
where status = 'active'
  and (ends_at is null or ends_at > now())
group by plan_code
order by active_now desc;


-- ============================================================
-- 2. REVENUE COLLECTED — by month, by plan
--    amount_paise / 100 = rupees. Only captured payments count;
--    created and failed rows are attempts, not money.
-- ============================================================
select
  date_trunc('month', paid_at)      as month,
  plan_code,
  count(*)                          as payments,
  sum(amount_paise) / 100.0         as inr_collected
from public.payment_transactions
where status = 'captured' and paid_at is not null
group by 1, 2
order by 1 desc, inr_collected desc;


-- ============================================================
-- 3. CHECKOUT FUNNEL — the conversion rate that matters
--    No separate event table is needed: payment_transactions
--    already records every attempt. 'created' is a started
--    checkout, 'captured' a completed one, 'failed' a failure.
-- ============================================================
select
  date_trunc('week', created_at)                          as week,
  count(*)                                                as checkouts_started,
  count(*) filter (where status = 'captured')             as completed,
  count(*) filter (where status = 'failed')               as failed,
  count(*) filter (where status = 'created')              as abandoned_or_pending,
  round(
    100.0 * count(*) filter (where status = 'captured') / nullif(count(*), 0), 1
  )                                                       as completion_pct
from public.payment_transactions
group by 1
order by 1 desc;


-- ============================================================
-- 4. THE FAILURE THAT COSTS MONEY — paid but not provisioned
--    A captured payment with no active entitlement means someone
--    was charged and did not get access. This should always be
--    empty. If it is not, those people need contacting today.
-- ============================================================
select
  t.id,
  t.user_id,
  t.plan_code,
  t.amount_paise / 100.0  as inr,
  t.paid_at,
  t.razorpay_payment_id
from public.payment_transactions t
left join public.user_entitlements e
  on e.user_id = t.user_id and e.status = 'active'
where t.status = 'captured'
  and e.id is null
order by t.paid_at desc;


-- ============================================================
-- 5. LAPSE RATE — the honest version of churn
--    For one-time passes, churn is "did not buy again". A person
--    whose pass ended and who has not bought since has lapsed.
-- ============================================================
with ended as (
  select distinct user_id
  from public.user_entitlements
  where ends_at is not null and ends_at < now()
),
still_active as (
  select distinct user_id
  from public.user_entitlements
  where status = 'active' and (ends_at is null or ends_at > now())
)
select
  (select count(*) from ended)                                          as ever_lapsed,
  (select count(*) from ended e
     where not exists (select 1 from still_active s where s.user_id = e.user_id))
                                                                        as lapsed_and_not_returned,
  (select count(*) from still_active)                                   as currently_active;


-- ============================================================
-- 6. REFUNDS — volume and value
-- ============================================================
select
  count(*)                    as refunds,
  sum(amount_paise) / 100.0   as inr_refunded
from public.payment_transactions
where status = 'refunded';


-- ============================================================
-- 7. WEBHOOK HEALTH — silent failure detector
--    Anything not 'processed' means Razorpay told us something
--    and we did not finish acting on it.
-- ============================================================
select
  processing_status,
  event_type,
  count(*)          as events,
  max(created_at)   as most_recent
from public.webhook_events
group by 1, 2
order by 1, events desc;
