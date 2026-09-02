# Database

`migrations/` is the only source of truth. Applied in order, they reproduce
production exactly — that is the property worth protecting, and it was briefly
untrue.

## History worth knowing

The payment tables were once defined twice: in `0004_payments.sql` and in a
bootstrap script `payments.sql` that disagreed with it. Production was built
from BOTH, so neither file alone reproduced it — a fresh database came up
either missing `plans` or with a weaker `user_entitlements` whose status
constraint rejected the `refunded` value the webhook writes on every refund.

`0005_reconcile_payment_schema.sql` ported the missing object into the lineage
and `payments.sql` is now deleted. `alert_subscribers.sql` moved in as `0007`
for the same reason: a schema file outside the lineage is one nobody applies in
order, and eventually one nobody applies at all — which is exactly what
happened to it, leaving the daily alerts cron firing into a table that did not
exist.

## Applying

Paste a migration into the Supabase SQL editor, in order, once each. Then:

```
node scripts/supabase-verify.mjs
```

It checks every object exists and that RLS actually denies anonymous reads —
the schema being present is not the same as it being safe.

## Rules

- **Forward-only.** Never edit an applied migration; add a new one.
- **Idempotent.** `if not exists` throughout, so re-running is harmless.
- **RLS on every user table**, and the `payment_*` tables carry SELECT-only
  policies — every write goes through the service role, because a user who
  could insert their own entitlement row would grant themselves the paid plan.
