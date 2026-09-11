# Tool alerts — email setup

The radar emails people when it finds a tool matching what they do. Daily cron
at 03:30 UTC (`vercel.json`), Resend over HTTP, no email dependency.

## Status

The code is complete. As of 2 Sep 2026 it has **never sent anything**, because
`alert_subscribers` was never created in Supabase — the cron was firing daily
into a table that did not exist.

## What has to be true for a single email to go out

1. `alert_subscribers` exists in Supabase (`supabase/migrations/0007_alert_subscribers.sql`)
2. `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in Vercel — already set
3. `CRON_SECRET` in Vercel
4. `RESEND_API_KEY` in Vercel
5. The **sending domain is verified in Resend**
6. Somebody has actually subscribed (Settings → Notifications)

Any one missing and nothing arrives. Steps 5 and 6 fail silently in different
ways, which is why `sendEmail` now names a rejected sender explicitly in the
logs rather than printing a bare status code.

## Sending from the company address

Mail goes out as `info@toolnaut.xyz`, overridable with `RESEND_FROM`.

### DNS

Nameservers are `ns1/ns2.vercel-dns.com`, so records go in
**Vercel → Project → Settings → Domains → toolnaut.xyz → DNS**, not at the
registrar.

Add `toolnaut.xyz` in Resend and copy the records it shows — they are generated
per account and cannot be written down here in advance. To SEND, only two
matter:

| Type | Name (roughly)       | Purpose |
|------|---------------------|---------|
| TXT  | `resend._domainkey` | DKIM public key, signs each message |
| TXT  | `@` or `send`       | SPF, authorises Resend to send as the domain |

### The one thing that can break your normal email

Resend may also offer an **MX** record, for bounce and complaint feedback. It is
not required to send.

`toolnaut.xyz` already has `MX 1 smtp.google.com` for Google Workspace. **Lower
priority numbers win**, so if a Resend MX is added it must carry a HIGHER number
(10, say) than Google's 1. Getting that backwards routes real company mail away
from Workspace — inbound mail to info@ and everything else would start
disappearing. If in doubt, skip the MX record entirely: sending works without
it, only bounce reporting is lost.

If SPF already exists at the root for Workspace, do not add a second SPF record.
A domain may publish only one; merge the include instead:

```
v=spf1 include:_spf.google.com include:amazonses.com ~all
```

### The root domain has no SPF, and no DMARC

Unrelated to the radar, but worth knowing: `toolnaut.xyz` currently publishes
**no SPF record and no DMARC record at all**, while sending real mail through
Google Workspace. That means nothing tells receiving servers which hosts may
send as the domain, and nothing tells them what to do about forgeries. It is a
standing deliverability and spoofing problem for ordinary company mail, not just
this feature.

Minimum worth adding at the root:

```
TXT  @        v=spf1 include:_spf.google.com ~all
TXT  _dmarc   v=DMARC1; p=none; rua=mailto:dmarc@toolnaut.xyz
```

`p=none` only reports; it changes nothing about delivery. Read the reports for a
few weeks before tightening to `quarantine`.

## Verifying it works

```bash
curl -s -X GET https://toolnaut.xyz/api/alerts-send \
  -H "Authorization: Bearer $CRON_SECRET"
```

`{"ok":true,"sent":N,...}` — N is how many went out. `sent: 0` with
`"nothing new this window"` means the pipeline is fine and the radar simply
found nothing; that is a pass, not a failure.

A 503 means step 3 or 4 is missing. A 401 means the secret is wrong or unset.

## How a subscriber is matched

`tool.category` against the domains they chose in Settings (code, design,
writing, data, automation, learning). No domains chosen means everything.

Each subscriber carries `last_notified_at`, so nobody sees the same tool twice,
and it is stamped only **after** a successful send — a failed one retries on the
next run rather than being silently skipped.
