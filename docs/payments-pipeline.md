# The payment-to-entitlement pipeline

> **Core rule:** Razorpay confirms payment, Supabase records and verifies it,
> entitlements control access, and premium behaviour begins only after the
> entitlement becomes active.

This documents what is BUILT and where, step by step, so the next change
starts from reality. The architecture note's Supabase Edge Functions run here
as **Vercel functions** (`api/*.js`) — same trust boundary: every secret
(`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`)
exists only server-side.

## The flow

```text
User signs in (Supabase Auth, Google/magic link)
  ↓
AppShell asks GET /api/entitlement            "has this user paid?"
  ↓ (payments on + no active plan)
/pay — the paywall page                        picks a plan, nothing more
  ↓
POST /api/create-order  {planId}              server prices the plan,
  + Authorization: Bearer <supabase jwt>       writes user_id into ORDER NOTES,
  ↓                                            inserts a pending transaction
Razorpay Checkout (browser)
  ↓ success callback
POST /api/verify-payment {order,payment,sig}  HMAC check + fetch-back
  ↓                                            reconcile amount/currency/status,
  ↓                                            mark captured, activate entitlement
user_entitlements.status = active             THE thing the app checks
  ↓
navigate('/app/stack')                         user is in

Separately (authoritative, browser-independent):
Razorpay → POST /api/razorpay-webhook          raw-body HMAC, idempotent by
  payment.captured / payment.failed /          event id via webhook_events,
  refund.processed                             settles the same records
```

## Step 1 — tables (`supabase/migrations/`)

Run once in Supabase → SQL Editor. Creates:

| table | purpose |
|---|---|
| `plans` | catalogue mirror of `src/utils/planData.js` (paise, never floats) |
| `payment_transactions` | one row per checkout attempt, `created → captured/failed/refunded` |
| `user_entitlements` | one row per user — **the only access authority** |
| `webhook_events` | unique event ids make webhook processing idempotent |

RLS: users `select` their own transactions/entitlement (that is how the
Billing card reads history with the anon client); **no** insert/update
policies exist — only the service role writes.

## Step 2 — who is paying (`api/_supabase.js`)

`getUserFromRequest(req)` resolves `Authorization: Bearer <supabase jwt>` by
asking Supabase's auth server (`/auth/v1/user`) — revoked sessions and expiry
are its problem. Never decode-and-trust locally.

`activateEntitlement({userId, planCode, transactionId})` is the ONE function
that grants access — verify-payment and the webhook both call it, and renewal
extends from the current `ends_at` so paying early never eats days.

## Step 3 — order creation (`api/create-order.js`)

The browser sends `{planId}` and NOTHING about money. The server:

1. kill switch: `PAYMENTS_ENABLED !== 'true'` → 503, no order, no charge
2. prices the plan from `planData.js` (same file the pricing page renders)
3. resolves the user from the JWT and writes `notes: {plan, user_id}` on the
   Razorpay order — **server-written, unforgeable by the browser**
4. inserts the pending `payment_transactions` row BEFORE checkout opens
5. returns `order_id`, amount, currency, public `key_id`

## Step 4 — checkout (`src/hooks/useRazorpay.js`)

Loads Razorpay's script on demand, opens Standard Checkout, and treats the
browser's "success" as a CLAIM: nothing is paid until `/api/verify-payment`
says so. Passes the Supabase access token through to create-order.

## Step 5 — verification (`api/verify-payment.js`)

1. constant-time HMAC-SHA256 over `order_id|payment_id`
2. fetches payment AND order back from Razorpay: status captured/authorized,
   amount, currency and order linkage must all reconcile
3. marks the transaction `captured`, then `activateEntitlement(...)` using the
   user id from the ORDER NOTES — a stolen signature triple can only ever
   activate the account that created the order
4. deliberately NOT gated by the kill switch (a payment already in flight
   must still confirm — see the note in the file)

## Step 6 — the webhook (`api/razorpay-webhook.js`)

The durable half: arrives server-to-server, so a payer whose browser died
still gets their plan.

- `bodyParser: false` — the HMAC is over the RAW bytes
- idempotent: insert event id into `webhook_events` with
  `on conflict do nothing`; only the request that lands the row processes
- `payment.captured` → capture + activate; `payment.failed` → mark failed;
  `refund.processed` → mark refunded + revoke entitlement
- processing failure deletes the claim and answers 500 so Razorpay retries

Configure in Razorpay Dashboard → Account & Settings → Webhooks →
`https://toolnaut.xyz/api/razorpay-webhook`, subscribe to exactly those three
events, set `RAZORPAY_WEBHOOK_SECRET`.

## Step 7 — access + billing UI

- `GET /api/entitlement` — the one question, answered from
  `user_entitlements` (never browser state): `{active, plan, ends_at,
  payments_enabled, configured}`, `Cache-Control: no-store`.
- `src/shells/AppShell.jsx` — the paywall gate: signed-in real user + payments
  enabled + no active plan → `/pay`. Fails OPEN for guests, dev sessions,
  network errors and payments-off deployments: the paywall must never lock
  anyone in front of a gateway that cannot charge.
- `src/pages/Pay.jsx` — the paywall: plan picker → checkout → `/app/stack`.
- `src/components/app/BillingCard.jsx` (ME → BILLING) — current plan, paid-
  until date, payment history read via RLS with the user's own session.

## Switching it on

```text
1. Apply supabase/migrations/ in order   (Supabase → SQL Editor)
   0004_payments.sql then 0005_reconcile_payment_schema.sql.
   NOT supabase/payments.sql — it is retired and builds a schema
   where refunds cannot revoke access. See docs/payment-schema-inventory.md.
2. Vercel env:
   PAYMENTS_ENABLED=true                 exact string, anything else = off
   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET rzp_test_* pair first
   RAZORPAY_WEBHOOK_SECRET               from the webhook you configure
   SUPABASE_SERVICE_ROLE_KEY             already set for alerts
3. Redeploy. Sign in → /pay → Razorpay test card → entitlement active.
```

Going live = swapping to the `rzp_live_` pair (requires completed Razorpay
KYC). The kill switch works the same in both modes.

## Test checklist (Razorpay test mode)

- [ ] happy path: pay → verified → entitlement active → app open
- [ ] payment failed in checkout → transaction `failed`, no entitlement
- [ ] close browser after paying → webhook alone activates
- [ ] duplicate webhook delivery → one activation (webhook_events dedupe)
- [ ] tampered signature → 400, loud log, nothing unlocked
- [ ] refund in dashboard → `refunded` + entitlement `revoked`
- [ ] `ends_at` in the past → /api/entitlement says inactive → paywall again
- [ ] guest browsing → never gated

## Not built yet (deliberately, in spec order)

8. Razorpay **recurring** Subscriptions (today each payment buys 30 days;
   `plans.period_days` and `activateEntitlement` are already period-aware)
9. cancellation UI (expiry works via `ends_at`; refund already revokes)
10-12. post-payment product jobs: premium onboarding generation, monitoring
   enrollment, stack-health reports — hang them off entitlement activation.
