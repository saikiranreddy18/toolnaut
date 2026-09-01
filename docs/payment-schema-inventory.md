# Payment schema inventory

Three-way comparison of the two schema files against the live database, taken
before writing `0005_reconcile_payment_schema.sql`.

**Method.** Production was probed read-only through PostgREST with the public
anon key. A request for a column that does not exist returns PostgREST error
`42703` naming it; a column that exists but is hidden by RLS returns `[]`. That
difference makes column presence testable without any privileged access and
without reading a single row of anyone's data.

**Date:** 2026-09-01 · **Probed project:** the production Supabase instance
behind toolnaut.xyz.

---

## The finding

Production is a **hybrid of both files**, and neither file alone reproduces it.

| Object | `payments.sql` | `migrations/0004_payments.sql` | Production | Came from | Canonical decision |
|---|---|---|---|---|---|
| `plans` | **creates it** | never creates it | **exists** | `payments.sql` | **Port into `0005`** |
| `payment_transactions` | weaker | stronger | matches 0004 | `0004` | Keep 0004 |
| `user_entitlements` | weaker | stronger | matches 0004 | `0004` | Keep 0004 |
| `webhook_events` | weaker | stronger | matches 0004 | `0004` | Keep 0004 |
| `current_entitlement()` fn | absent | **present** | assumed present | `0004` | Keep 0004 |

### How provenance was proved

| Probe | Result | Conclusion |
|---|---|---|
| `user_entitlements?select=features` | `[]` (exists) | Only 0004 defines `features` → entitlements came from 0004 |
| `payment_transactions?select=payment_type` | `42703` absent | Neither file has it; confirms no third source |
| `plans?select=plan_code` | returns rows | `plans` exists, and 0004 never creates it → came from `payments.sql` |
| `webhook_events?select=signature_valid` | `[]` (exists) | Only 0004 defines it → webhook table came from 0004 |

---

## Column-level production state (all verified present)

| Table | Columns confirmed in production |
|---|---|
| `plans` | `plan_code`, `name`, `amount_paise`, `currency`, `period_days`, `active`, `created_at` |
| `payment_transactions` | `id`, `user_id`, `plan_code`, `amount_paise`, `currency`, `status`, `razorpay_order_id`, `razorpay_payment_id`, `metadata`, `paid_at` |
| `user_entitlements` | `id`, `user_id`, `plan_code`, `status`, `source`, `starts_at`, `ends_at`, `payment_transaction_id`, `features` |
| `webhook_events` | `id`, `razorpay_event_id`, `event_type`, `payload`, `signature_valid`, `processing_status`, `error_message`, `processed_at` |

Confirmed **absent** in production: `payment_transactions.razorpay_subscription_id`,
`payment_transactions.entitlement_status`, `payment_transactions.payment_type`.

---

## Where the two files disagree, and why it matters

| Aspect | `payments.sql` | `0004_payments.sql` | Consequence of the weaker version |
|---|---|---|---|
| `user_entitlements.status` | `active, expired, revoked` | `active, expired, cancelled, refunded` | **The webhook writes `refunded`.** Under the bootstrap constraint every refund throws, the webhook 500-loops, and the refunded customer keeps paid access indefinitely. |
| `user_entitlements.user_id` | nullable, no cascade | `not null`, `on delete cascade` | Orphan entitlements survive account deletion |
| `user_entitlements` uniqueness | plain `unique(user_id)` | partial unique index on active rows only | The plain constraint forbids keeping expired history at all |
| `user_entitlements.features` | absent | `jsonb not null default '{}'` | Per-plan feature flags have nowhere to live |
| `payment_transactions.user_id` | nullable | `not null`, cascade | Payments not attributable to an account |
| `payment_transactions.razorpay_order_id` | `unique` | `not null unique` | A transaction row with no order id |
| `webhook_events.signature_valid` | absent | present | No record of whether a delivery verified |
| `current_entitlement()` | absent | present, `security invoker` | Callers reimplement the status/date logic |

The refund row is the dangerous one: it costs real money for every day it goes
unnoticed, and it fails silently from the user's point of view.

---

## What `0005` does, and does not do

**Does:** creates `plans` if absent, seeds the three plans idempotently, enables
RLS with a public read policy, and asserts the critical invariants — including a
guard that fails loudly if it detects a database built from the retired
bootstrap file.

**Does not:** drop anything, rewrite `0004`, add foreign keys from the payment
tables to `plans` (those columns are an audit trail and must not be constrained
by catalogue changes), or introduce provisioning state. Fulfillment state is a
separate, later migration by design.

**On production** it is effectively a no-op. **On a fresh database** it is the
difference between a working schema and a missing table.

---

## Retirement of `supabase/payments.sql`

The file is **not deleted in this change**. It stays in place, marked obsolete
at the top, until `0005` has been applied to production and a fresh-database
rebuild has been verified against it. Deleting it before then would remove the
only definition of `plans` that any environment has actually used.

Once both are done, delete it in a follow-up and remove the mention from
`docs/payments-pipeline.md`.

---

## Verification

`test/payment-schema.test.mjs` enforces, in CI:

1. Every table the API writes to is created by some file in `supabase/migrations/`.
2. `plans` is created by a migration, not only by the bootstrap file.
3. Every status literal the API code writes is permitted by that table's CHECK.
4. `supabase/payments.sql` carries its obsolete marker and is not referenced as
   a setup step by any doc or script.

What CI **cannot** prove is that production matches the migrations. That needs
either a shadow-database rebuild or a periodic live probe like the one that
produced this document.
