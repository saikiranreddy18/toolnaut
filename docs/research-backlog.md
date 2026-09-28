- **Why this is REJECTED rather than logged OPEN:** an actual email digest
  needs a transactional/marketing email provider (Resend, Postmark,
  Mailchimp, etc.), a server-held API key the same `VITE_`-prefix-is-public
  problem the chat-assistant rejection already names, and — the part no
  amount of client code can substitute for — someone or something deciding
  *what* goes in each week's digest, which is an ongoing editorial/ops task,
  not a one-time build. "Personalized alerts" additionally implies either
  web push (needs a push service + subscription storage, i.e. a backend) or
  email again. Both fail this file's own ranking rule: "a gap that needs a
  backend is usually REJECTED."
- **What would actually be honest to ship, if anyone wants to close this
  later (a finding, not a proposed build):** a static third-party
  newsletter-signup embed (e.g. a Mailchimp/Buttondown form `action=`
  pointing off-site) could plausibly capture emails with zero backend code
  in this repo, but that only solves list-building — it still needs a human
  or a separate automation to actually author and send a weekly digest, so
  it would not, by itself, make the pricing copy true. The honest fix
  remains a copy correction: soften "digest email" / "personalized alerts"
  to describe what's actually live (the in-app "New this week" strip) until
  real delivery infrastructure exists, the same move already flagged for
  the chat-assistant/Team-tier copy above. No edit made — flagged for
  whoever owns pricing copy.
- **Build size (original, stale):** L (needs a transactional email or push
  provider, a server-held secret, and an ongoing content/ops process — none
  of which a client-only SPA change can provide) — out of scope for this
  backlog's client-only SPA model.
- **Found:** 2026-08-26 15:15 UTC
- **Deepened 2026-09-01 09:06 UTC — the rejection's entire premise is gone,
  and the harder 90% of the work already shipped:** this run's job was
  research, not building, but the finding here was too concrete to leave as
  a one-line reopen. Re-audited every claim the REJECTED verdict made
  against the *current* repo, not the 2026-08-26 one:
  - "no `api/` directory" — false today. The unrelated payments work
    (Razorpay + Supabase entitlements, shipped 2026-08-31/09-01) created
    `api/` as a real Vercel serverless-functions directory with a
    server-held-secret pattern already proven in production
    (`api/_razorpay.js`, `api/_supabase.js`). The email-alerts REJECTED
    verdict's core objection — "an API key shipped in a `VITE_`-prefixed
    client bundle is a public secret" — is exactly the problem `api/`
    already solves for a different feature.
  - More than that: **the email-alerts backend itself already exists**,
    fully built, and appears to have shipped without ever being logged as
    closing this backlog entry. `api/alerts-subscribe.js` (POST, origin
    allowlist + per-IP rate limit + email validation, upserts into
    `alert_subscribers` on conflict), `api/alerts-unsubscribe.js` (GET with
    a per-subscriber uuid token, one click deletes the row, no login), and
    `api/alerts-send.js` (the actual digest: a Vercel cron —
    `vercel.json`'s `crons: [{ path: '/api/alerts-send', schedule: '30 3
    * * *' }]` — reads the *same* `/tools.json` the app itself reads,
    matches each subscriber's chosen domain(s) against tools discovered
    since their `last_notified_at` watermark capped at 7 days so a
    subscriber never gets the same tool twice, and sends via Resend's REST
    API, no SDK dependency, capped at 80 sends/run to stay under Resend's
    free 100/day). Schema is `supabase/alert_subscribers.sql`: RLS enabled
    with **zero** anon policies, so the browser's anon key cannot read or
    write the subscriber list at all — only the service-role key the
    serverless functions hold can, which closes exactly the "a list of
    email addresses must not be publicly readable" risk a naive version of
    this feature would create.
  - What's actually still missing, confirmed by grepping `alert` (case
    insensitive) across all of `src/`: **zero UI calls either endpoint.**
    The only hits are `capabilityMatrix.js`/`CapabilityMatrix.jsx` (still
    correctly showing "Alerts" as `planned`, not live — this part of the
    pricing page is still honest) and `planData.js`'s two `planned(...)`
    copy lines. There is no subscribe form, no email input, no domain
    picker, anywhere in the app. A fully working, abuse-hardened,
    duplicate-safe email pipeline is sitting behind a closed door with no
    handle on it.
  - This means the "ongoing editorial/ops task" objection from the
    original rejection is also gone — `alerts-send.js` already answers
    "what goes in each week's digest" algorithmically (radar's own
    `discoveredAt` + each subscriber's domain picks), the same trustworthy
    signal the (shipped) "Weekly Fresh Finds" in-app strip already reads.
    No human curation step exists or is needed; the cron is already live
    and firing daily regardless of whether anyone can subscribe.
  - **Smallest useful version left to build — genuinely S now, not L:**
    a subscribe form, nothing else.
    - New `src/utils/alertsApi.js`: two small async functions,
      `subscribeToAlerts({ email, domains })` → `POST /api/alerts-subscribe`
      and returns `{ ok, error }` (translating the endpoint's 503
      "not configured yet" into a distinct `ok:false, reason:'unconfigured'`
      so the form can render an honest "alerts aren't live yet" state
      instead of a generic error — mirrors how `entitlement.js` already
      surfaces `payments_enabled` as its own explicit field rather than
      collapsing it into a normal error). No `unsubscribe` call needed
      client-side — that link only ever needs to work from inside an email,
      which `alerts-unsubscribe.js` already serves as a self-contained HTML
      page requiring no app code at all.
    - New small form on `Settings.jsx` (already imports `BillingCard` and
      renders it in its own `<section>`, `Settings.jsx:22-23` /
      `~258-294` block pattern — a "🔔 Alerts" section fits the same
      `sticker`/`section` visual rhythm as the existing BILLING and account
      sections on that page, no new visual primitive needed): an email
      input (defaults to the signed-in session's email if one exists via
      `loadSession()`, already imported), six checkboxes for the domain
      keys (`code`/`design`/`writing`/`data`/`automation`/`learning` —
      reuse `CATEGORY_META` names/colors from `toolsCatalog.js:10-16`
      exactly as `SkillGraph.jsx` already does on this same page, not a new
      label map), and a submit button calling `subscribeToAlerts()`. Empty
      domain selection is valid and means "alert on everything" per
      `_alerts.js`'s own comment. Success state: a short confirmation line
      ("You're subscribed — check your inbox tomorrow" or similar,
      matching this page's existing copy voice) rather than a redirect;
      unconfigured state (503): the section still renders but says alerts
      aren't live yet, same honest-degradation pattern `BillingCard.jsx`
      already uses when Supabase/payments aren't configured.
    - Once this ships, `planData.js:35` (`planned('Weekly discovery digest
      email')`) and `planData.js:59` (`planned('Weekly trending tools +
      personalized alerts')`) and the matching `capabilityMatrix.js:50-53`
      `Alerts` row become the next honest-copy fix — flip `planned` to a
      live claim — but that copy edit is a one-line follow-up once the
      feature is real, not part of this build (same "don't fix the copy
      before the feature exists" discipline this file already applies
      elsewhere).
    - **What this would NOT include** (kept out to bound the diff): no
      unsubscribe/preferences UI inside the app itself (the emailed link
      already handles it end to end); no per-user tie-in to the signed-in
      session beyond pre-filling the email (subscribers are a separate
      table, not linked to `authStore`'s session — matches how the backend
      was already built, email-address-keyed, no `user_id` column in
      `alert_subscribers.sql`); no change to `alerts-send.js`, the cron
      schedule, or the domain-matching logic — all of that is already
      correct and already running; no new route, so no `scripts/smoke.mjs`
      addition needed (this lives inside the existing `/app/settings`
      route).
  - **One real caveat to flag, not a blocker:** whether `RESEND_API_KEY`,
    `RESEND_FROM`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET` are
    actually set in the live Vercel project is unverifiable from inside
    this repo/session (per `.env.example`'s own framing, these are
    server-only secrets a human sets in the Vercel dashboard, not files
    checked in here). If unset, `alertsConfigured` is `false` and every
    endpoint already answers 503 honestly rather than pretending to work —
    so shipping the form is safe either way, but whoever ships it should
    say plainly in the digest/commit whether alerts are confirmed *actually
    sending* in production or only wired-and-waiting-on-config, per this
    routine's own "visible on the deployed site today" instruction. This is
    exactly analogous to the payments kill-switch pattern already in this
    codebase (`PAYMENTS_ENABLED` defaults off, fails open, never fakes a
    live feature) — the alerts backend was clearly built with the same
    discipline.
- **Build size (corrected):** S — one small util (`alertsApi.js`), one new
  form section on the existing `Settings.jsx` page reusing `CATEGORY_META`
  and the page's existing `sticker`/`section` markup. No backend work (it's
  already built and already running on a cron), no new dependency, no new
  route.
- **Deepened 2026-09-02 21:09 UTC — the "smallest useful version" above got
  built, differently, and outside this routine:** `git log` on `master`
  shows a `saikiranreddy18`-authored burst today building exactly this
  capability: `cf458a9` ("feat(alerts): notification toggle in Settings, and
  the truth about email"), `06330ec` and `68a7f1e` (sender-domain fixes),
  all released by `v0.62.1`. Read the result in full against the shape
  proposed above:
  - `src/components/app/AlertSettings.jsx` (new) renders inside a new
    NOTIFICATIONS section on `Settings.jsx` (`Settings.jsx:393-407`) — an
    on/off switch plus the same six domain chips this entry already
    proposed (`code`/`design`/`writing`/`data`/`automation`/`learning`),
    matching the page's existing visual rhythm as predicted. It differs from
    the proposed shape in one deliberate way: it's **session-token-gated**
    (`getAccessToken()`, shows "Sign in to turn on tool alerts" for guests)
    against new endpoints `api/alerts-status.js` (GET, resolves the email
    from the verified Supabase token server-side, never the client) and
    `api/alerts-toggle.js`, rather than the anonymous email-input form this
    entry proposed against the older `api/alerts-subscribe.js`. Both API
    paths now coexist in `api/` — the shipped one is arguably the safer
    choice (ties the subscription to a real account instead of an
    unauthenticated email string) and needed no separate build from this
    backlog's perspective; noting the difference only so nobody goes
    looking for the originally-spec'd `alertsApi.js`/email-input version and
    concludes nothing shipped.
  - The one real defect the shipping commit itself flagged, and fixed in the
    same burst: `alert_subscribers.sql` existed only as a loose file outside
    the applied-migrations lineage, so — per `cf458a9`'s own commit message —
    "the cron has been firing daily into a table that is not there,
    subscribe would fail, and nobody has ever received anything." Today's
    later `842313d` ("fix: unify the migration lineage...") folded it into
    the lineage proper as `supabase/migrations/0007_alert_subscribers.sql`
    (confirmed on disk) and `supabase/README.md` now documents the
    apply-in-order process plus `node scripts/supabase-verify.mjs` as the
    way to confirm a given deployment actually has it. Whether that
    migration has been run against the **live** Supabase project is not
    something this repo can answer (same operational-fact ceiling this
    file's Settings-sync entry and payments-copy entry both already hit) —
    but the code path itself is complete and internally consistent now,
    which it demonstrably was not a few commits ago.
  - **What still doesn't match the promise, re-reading `api/alerts-send.js`
    in full:** the cron it names itself "The daily alert run" (`alerts-send.js:1`)
    — it runs once a day (`vercel.json`'s cron entry), not weekly, and a
    given subscriber can go multiple days between emails only because
    `WINDOW_DAYS`/`last_notified_at` gate on *new tools existing*, not on a
    weekly schedule. And it is **not** trend-based: the only signal it reads
    per tool is `discoveredAt` freshness within a 7-day window
    (`alerts-send.js:126-129`) matched against the subscriber's chosen
    domains — there is no join against stars, HN points, or any popularity
    field (the separate, still-OPEN "popularity signal discarded before it
    reaches a record" gap elsewhere in this file covers exactly that missing
    signal). So `planData.js:61`/`:80` ("Weekly discovery digest email") and
    `planData.js:104` ("Weekly trending tools + personalized alerts") both
    still describe a cadence and a ranking method that were never built —
    the shipped feature is closer to "personalized new-tool alerts, sent as
    they're found" than either literal phrase.
  - `capabilityMatrix.js`'s own Alerts row (`capabilityMatrix.js:50-54`)
    needs no change — its free-tier text ("General new-tool feed") was
    already correctly `live` and describes the in-app strip, not this email
    feature, and its `pro`/`team` rows ("Price changes, better alternatives,
    stack drift" / "Org-wide renewal and risk alerts") are still genuinely
    unbuilt, separate capabilities from what shipped. Only `planData.js`'s
    three per-plan feature lines are stale.
  - **Corrected smallest useful version — a copy fix, not a build, and only
    once the migration is confirmed live:** reword (not just flip the status
    of) `planData.js:61`, `:80`, and `:104` to describe what actually ships —
    e.g. `live('New tool alerts, by email')` for the Founder/Student lines
    and `live('Personalized new-tool alerts by email')` for the Pro line,
    dropping "weekly" and "trending" rather than keeping false specifics
    under a `live` status, which would trade an undersell for an oversell.
    Flipping status without fixing the wording would repeat the exact
    mistake this backlog keeps finding elsewhere (promising more than what's
    built) — so this is a finding, not a proposed edit to make blind; left
    for whoever can confirm the migration's production state to pair with
    the copy change in one commit.
  - **Build size (re-corrected):** S — three one-line copy edits in
    `planData.js`, contingent on confirming `0007_alert_subscribers.sql` is
    applied in production first (operational check, not a code change).
- **Verified live 2026-09-12 21:07 UTC, this run — the one blocking caveat
  is now confirmed, copy corrected:** the production check the entry above
  called unverifiable from inside the repo turned out to be answerable two
  ways
  without any credentials: an unauthenticated `GET
  https://toolnaut.xyz/api/alerts` returned `401 {"error":"Sign in to read
  your alert settings"}` rather than the `200 {"configured":false,...}`
  `alerts.js` returns when `alertsConfigured` is false — `alertsConfigured`
  is true in production today, so `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` are both set live. Separately, `7a6b301`
  (2026-09-11, "fix(alerts): stop link scanners unsubscribing people")
  diagnoses a real production incident against this exact feature and
  states plainly: "live tools.json carried 145 tools inside the 7-day
  window, the alerts API was configured, and Resend's DKIM and SPF records
  were published" — i.e. real subscribers, a real send, a real bug found by
  watching it run, now fixed. The migration lineage and the send pipeline
  are demonstrably live, not just wired-and-waiting.
  - Applied the corrected copy in `src/utils/planData.js`: the Founder and
    Student lines both flip from `planned('Weekly discovery digest email')`
    to `live('New tool alerts, by email')`; the Pro line flips from
    `planned('Weekly trending tools + personalized alerts')` to
    `live('Personalized new-tool alerts, by email')` — dropping "weekly"
    (the send is daily-checked, freshness-triggered, not calendar-weekly)
    and "trending" (the ranking signal is `discoveredAt` recency only, no
    stars/points join yet — that's the separate, still-OPEN "popularity
    signal" gap) per this entry's own "don't oversell either" reasoning.
  - `capabilityMatrix.js` needed no change, as already noted above — its
    Alerts row was already correctly `live` for the free-tier in-app strip
    and correctly still `planned` for the Pro/Team-specific capabilities
    (price-change alerts, stack-drift, org-wide alerts) that were never part
    of this claim.
  - Grepped `Weekly discovery digest|Weekly trending tools` across `src/`
    and `test/` after the edit: no other reference to the stale phrasing
    exists to update.

### Final-page CTA broke its own "no signup wall" promise
- **Status:** FIXED (this commit) — small demonstrable bug, fixed in this run
  rather than logged as OPEN; entry kept for the record per this backlog's
  own audit trail.
- **Seen in:** not a competitor pattern — found while auditing every
  `src/components/sections/*` file for unbacked marketing claims (the same
  sweep style that already produced the shipped Compare/Fresh-Finds/Skills-
  Graph gaps and the still-open per-route-meta gap), specifically checking
  the two marketing sections (`HeroSection.jsx`, `CTASection.jsx`,
  `HowItWorksSection.jsx`, `AudienceSection.jsx`) not yet individually
  audited in this file.
- **Gap:** `CTASection.jsx` — the very last thing a visitor sees before the
  footer — reads "Map your stack in about 60 seconds — no signup wall to get
  your first chart," directly above a "🚀 Open the app" button that linked to
  `/app/stack`. But `AppShell.jsx:57-58` hard-redirects any visitor with no
  session to `/auth/login?next=...`, which requires clicking "Continue with
  Google/GitHub" or submitting an email before anything renders — a wall,
  even though the session it creates is fake/local (`authStore.js`). Compare
  this to `HeroSection.jsx`'s primary CTA, which calls `onEnter()` →
  `navigate('/goal')` (`Landing.jsx:75-76`) — the actual quiz, reachable with
  zero session. So the identical "no signup wall" promise was true for the
  first CTA on the page and false for the last one: any first-time visitor
  who scrolled past the hero without taking the quiz and clicked the bottom
  CTA instead hit exactly the wall the copy told them didn't exist.
- **Why it matters:** this is the same "promise vs. product" mismatch shape
  as every other audited-copy gap in this file, except self-contained inside
  one component — the button's own destination contradicts the sentence
  directly above it, with no cross-file reasoning needed to see the bug.
- **Fix shipped this run:** `CTASection.jsx` now reads
  `loadSession() ? '/app/stack' : '/goal'` and routes the button there —
  a returning user with a session goes straight to their stack (unchanged
  behavior), a first-time visitor goes to the session-free quiz that actually
  delivers "your first chart" in 60 seconds, matching the copy. One-line
  behavioral change plus one import; no new component, no new route, no
  layout change. Verified via `npm run smoke` (0 console errors, all 15
  routes) alongside `npm test` (102/102) and `npm run build`.
- **Found & fixed:** 2026-08-26 21:15 UTC
