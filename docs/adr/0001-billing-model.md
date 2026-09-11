# ADR-0001: Toolnaut billing model

**Status:** Accepted · **Date:** 2026-09-01 · **Supersedes:** PRs #24, #26 (closed)

## Context

Three billing directions existed in the repository at once: a deployed Razorpay
one-time payment pipeline on `master`, an open PR proposing Stripe subscriptions
with its own entitlement schema, and an older Razorpay PR with parallel
endpoints. A fourth direction — "monthly plans" — existed only in the pricing
copy and matched none of the code.

That ambiguity is dangerous in a payment system. Merging any stale branch could
have bypassed the verification, webhook and entitlement safety already live, and
the Stripe branch additionally shipped a `0004_subscriptions.sql` colliding with
the already-applied `0004_payments.sql`.

## Decision

**Toolnaut sells a one-time 30-day Founding Pass through Razorpay. It does not
auto-renew.**

### Supported

- Razorpay Standard Checkout, order created server-side from canonical plan data
- HMAC-SHA256 signature verification with a fetch-back reconcile of payment and
  order (status, amount, currency, linkage)
- Raw-body webhook verification, idempotent through a unique Razorpay event id
- Durable `payment_transactions`, `user_entitlements`, `webhook_events`
- A flat 30-day entitlement grant per verified payment

### Not supported (must not be implied by any copy)

- Auto-renewing subscriptions · Razorpay Subscriptions · Stripe billing
- Team per-seat recurring billing
- Cancellation of a recurring charge — there is no recurring charge to cancel

## Rules

1. The payment amount is derived server-side from canonical plan data. A
   client-supplied amount is ignored.
2. Entitlements are granted only from verified server-side payment state.
   Browser state never grants paid access.
3. Refunds are processed in the Razorpay dashboard until a support workflow
   exists. The `refund.processed` webhook revokes access.
4. Product copy must describe a one-time 30-day pass. The words *monthly*,
   *per month*, *subscription*, *auto-renew*, *recurring* and *cancel anytime*
   must not appear on any payment surface while this ADR stands.
5. The payment schema has exactly one source: `supabase/migrations/`.
   `supabase/payments.sql` is retired.
6. Any provider migration, or any move to recurring billing, requires a new ADR
   and a fresh design review against current `master` — not a rebase of a
   closed branch.

## Consequences

**Good.** One coherent billing sentence everywhere. Copy matches code, so no
customer can form an expectation the software cannot honour. Contributors and
agents have an unambiguous answer to "which billing direction is live?".

**Cost.** No recurring revenue until a future ADR adopts it. Each renewal is a
deliberate repurchase, so retention must be earned by product value rather than
by billing inertia — which is the honest position for a product whose recurring
value loop is not yet built.

**Follow-ups this ADR does not decide:** support contact and refund policy
(needs an operating decision), provisioning/fulfillment state on
`payment_transactions`, and the weekly digest that would justify a repurchase.
