# Security

How Toolnaut is secured, what was verified, and the settings that live outside
the code. Last reviewed 14 September 2026.

## Architecture in one paragraph

The site is a static React app on Vercel. Sign-in, sessions and passwords are
handled entirely by **Supabase Auth** (Google OAuth and email magic links) —
this codebase never receives, hashes or stores a password. Data lives in
Supabase Postgres behind **row-level security**. The browser holds only the
public `anon` key; everything privileged runs in Vercel functions under `api/`
with the `service_role` key, which never reaches the browser.

## What was verified (14 Sep 2026)

| Area | Result |
|---|---|
| Secrets in tracked files | None |
| Secrets anywhere in git history (587 commits, all branches) | None |
| Keys in the live production bundle | Only the Supabase `anon` key (public by design). No `service_role`. |
| Env vars read by frontend code | Only public ones: Supabase URL/anon key, GA4 id, Sentry DSN, payments flag |
| Anonymous read of every private table (live) | Returns `[]` — RLS holds |
| Anonymous writes to entitlements, payments, subscribers (live) | 401 |
| Email verification | On (`mailer_autoconfirm: false`) |
| HTTPS | http → https 308, HSTS 2 years |
| SQL / filter injection | All request-derived values in PostgREST paths are URL-encoded, regex-validated UUIDs, or come from the auth server / database |
| Command injection | No shell execution in server code |
| File uploads | None exist |
| Script injection | No `dangerouslySetInnerHTML`; HTML emails escape user content |
| Open redirect after sign-in | Same-origin paths only (`safeNextPath`) |
| Ownership (IDOR) | Every user endpoint takes identity from the verified token, never the body. Browser writes go through RLS policies that check `auth.uid() = user_id`. Payment verification credits the user recorded on the order, not one named in the request. |

## Controls in code

- **Rate limits** (`api/_security.js`, per warm instance, per client IP):
  AI chat 20/min · payments 10/min · account deletion 10/min · alert settings
  30/min · entitlement 120/min (generous for shared mobile/campus IPs).
  Account deletion also has a per-account code cooldown (60s) and 5 attempts.
- **Security logging**: one JSON line per event with `"security":true` — search
  Vercel logs for `security`. Events: `auth_token_rejected`, `rate_limited`
  (first hit per client per window), `origin_rejected`, `admin_secret_rejected`.
  IPs are HMAC-hashed, never logged raw.
- **Admin endpoints** (`/api/metrics`, cron `/api/alerts-send`) compare their
  bearer secret in constant time and are closed when the secret is unset.
- **Headers**: HSTS, nosniff, X-Frame-Options, Referrer-Policy,
  Permissions-Policy, Cross-Origin-Opener-Policy, and a Content-Security-Policy
  in **Report-Only** mode.

## Known limits (stated honestly)

- Rate limits are **per serverless instance**, not global. They stop one
  client hammering one instance; a distributed attack needs Vercel Firewall or
  a shared store (Upstash / Vercel KV).
- The CSP is **report-only**. Watch the browser console on real flows
  (sign-in, checkout, analytics) for violations, then switch the header name to
  `Content-Security-Policy` to enforce it.
- The tool catalogue (`/tools.json`, category pages) is public on purpose — it
  is the product's SEO surface — so it is not protected against scraping.

## Settings you must configure outside the code

### Supabase dashboard
1. **Authentication → Sessions**: set JWT expiry (1 hour is sensible) and keep
   refresh-token rotation on with reuse detection.
2. **Authentication → Rate Limits**: confirm limits on sign-ups, magic-link and
   OTP emails, and token refreshes.
3. **Authentication → Attack Protection**: enable CAPTCHA (Cloudflare Turnstile
   is free) to stop scripted sign-ups; enable leaked-password protection and a
   minimum password length. The app offers no password sign-in, but the email
   provider still accepts password sign-ups through the API.
4. **Database → Network Restrictions**: allow direct Postgres connections only
   from your own IPs. The app never connects to Postgres directly (it uses the
   REST API), so this blocks nothing it needs.
5. **Database → SSL**: enforce SSL connections.
6. **Migrations**: `0008_account_deletion.sql` was **not applied** in production
   on 14 Sep 2026 (the `account_deletion_codes` table did not exist), so
   account deletion does not work live until it is run.

### Vercel dashboard
1. **Environment variables**: mark every server secret as *Sensitive*
   (`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`,
   `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `FEATHERLESS_API_KEY`,
   `CRON_SECRET`, `METRICS_SECRET`). Never give any of them a `VITE_` or
   `NEXT_PUBLIC_` prefix — those are compiled into the public bundle.
2. Add `LOG_HASH_SALT` (any long random string) so logged IP hashes cannot be
   reversed.
3. **Firewall**: add rate-limit rules for `/api/chat` and `/api/create-order`
   for a global limit on top of the per-instance one.
4. Set up a **log drain or alert** on lines containing `"security":true` so a
   spike in `auth_token_rejected` or `rate_limited` reaches you.
