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

### Popularity signal (GitHub stars / HN points) collected by radar, discarded before it reaches a record
- **Status:** OPEN
- **Seen in:** not a competitor pattern this time — found auditing `radar/`
  itself for the same "data collected, never shown" shape that produced the
  already-shipped `discoveredAt`/Fresh-Finds gap. G2/Capterra-style review
  counts and Product Hunt's own upvote counts are the competitor analog (a
  numeric popularity signal displayed next to every listing), but the honest
  framing here is a pipeline bug, not a missing feature: Toolnaut already
  fetches a real popularity number for two of its four sources and throws it
  away one function later.
- **Gap:** `radar/sources/github.js:25` fetches
  `raw: { stars: repo.stargazers_count, lang: repo.language, owner:
  repo.owner?.login }` for every GitHub candidate, and
  `radar/sources/hackernews.js:27` fetches `raw: { points: hit.points, author:
  hit.author }` for every HN candidate — both real, already-paid-for API
  calls (`sort=stars&order=desc` is literally in the GitHub query URL).
  But `enrich()` (`radar/enrich.js:12-36`) only ever reads `candidate.raw` to
  pull `dev`/`owner` out of it (`enrich.js:116,140`) — the `stars`/`points`
  values themselves never get assigned onto the `record` object being built,
  and `makeToolRecord()`'s field list (`radar/schema.js:53-61`) has no slot
  for them at all. Once `enrich()` returns, `candidate.raw` goes out of scope
  and the number is gone permanently — unlike `discoveredAt` (which *was*
  captured correctly and only got stripped later, at the sync/hydrate layer),
  this signal never survives past the single function that already has it in
  hand. Product Hunt (`producthunt.js:27`, `raw: {}`) and RSS
  (`rss.js:26`, `raw: { feed }`) genuinely have no equivalent number to give,
  which is fine — this gap only ever applies to GitHub- and
  Hacker-News-sourced tools, the same subset that already gets a
  `discoveredAt` stamp.
- **Why it matters:** it's free signal a directory competitor would pay an API
  quota for, sitting one line away from a real "trending" badge, and it
  compounds the value of the already-shipped Fresh Finds strip — a new tool
  with 2,400 GitHub stars in its first week is a materially stronger signal
  than a new tool with 12, and today Toolnaut can't tell a visitor which is
  which even though the number was already in memory during enrichment.
- **Smallest useful version (what to actually build):**
  - `radar/schema.js`: add `popularity: null, popularityLabel: ''` to
    `makeToolRecord()`'s content fields (next to `note`/`tags`, not in
    `HASHED_FIELDS` — a star count isn't part of a tool's identity and
    shouldn't retrigger change detection). `popularity` is a plain number for
    sorting/thresholding, `popularityLabel` a short pre-formatted string
    (`"★ 2.4k GitHub stars"`, `"142 HN points"`) so the app never needs to
    know unit-formatting rules for two different source APIs.
  - `radar/enrich.js`: in `enrich()`, before building `record`, compute
    `popularity`/`popularityLabel` from `candidate.source` +
    `candidate.raw` — `github` → `candidate.raw.stars` (format large numbers
    with a small local `k`-suffix helper, no new dependency), `hackernews` →
    `candidate.raw.points` (append `" HN points"`); any other source (or a
    missing/non-numeric value) leaves both `null`/`''`, never a fabricated
    zero — same "don't render a fake number" principle the still-open
    ratings-gap already commits to for average ratings. Spread both into the
    `record` object alongside the existing `discoveredAt`/`updatedAt` lines.
  - `radar/scripts/sync-to-app.js` and `src/utils/liveCatalog.js`: add
    `'popularity'` and `'popularityLabel'` to both `FIELDS` arrays (mirrors
    exactly how `discoveredAt` was plumbed through in the shipped Fresh-Finds
    gap — two one-line additions, same two files).
  - `Discover.jsx`: a small badge next to the existing 🆕 NEW pill
    (`Discover.jsx:212-217`, same card position) reading `tool.popularityLabel`
    when `tool.popularity` is truthy — reuses the pill's existing visual
    language, no new component. Since this only ever applies to
    radar-discovered tools, it naturally co-occurs with the NEW badge rather
    than needing its own separate strip.
    **Correction (see 2026-09-01 21:20 UTC deepening below): this line number
    and this file are both stale — the actual target is `ToolCard.jsx`'s badge
    row.**
  - **What this would NOT include** (kept out to bound the diff): no
    backfilling popularity for the 704 bundled baseline tools (they were
    never radar-discovered, so there's no honest number to give them — same
    reasoning the shipped `isNewTool()` util already applies by design); no
    re-fetching/refreshing an existing tool's star count over time (`radar/
    dedup.js`'s own rule is nothing gets re-enriched after first sight — a
    stamped-once "stars at discovery" number, same spirit as the stamped-once
    `discoveredAt`); no cross-source popularity ranking or leaderboard page
    (GitHub stars and HN points aren't comparable units — this is a per-card
    badge, not a sortable "trending" tab); no change to `personaGenerator.js`
    scoring — this is a display-only signal in v1, the same scope limit the
    tool-status-note gap above already applies to its own `note` field.
- **Build size:** S — one schema field pair, ~10 lines in `enrich.js`, two
  one-line `FIELDS` additions (radar + app, exactly mirroring the shipped
  Fresh-Finds plumbing), one badge on `Discover.jsx`. No backend, no new
  dependency, no new route, no radar source changes (the fetches already
  happen).
- **Found:** 2026-08-27 03:06 UTC
- **Deepened 2026-09-01 21:20 UTC:** the radar/schema/enrich half of this plan
  (`radar/schema.js`, `radar/enrich.js`, the two `FIELDS` arrays) is untouched
  by anything that's shipped since and still exactly accurate — re-confirmed
  `enrich()` still never reads `stars`/`points` off `candidate.raw` beyond the
  `dev`/`owner` extraction, and neither `FIELDS` array carries `popularity`.
  Only the app-side render target is wrong, for the identical reason just
  logged against the neighboring "Tool status warning" gap above: `Discover.jsx`
  was refactored to extract a shared `<ToolCard>` component
  (`src/components/app/ToolCard.jsx`, used by both `Discover.jsx` and
  `Favorites.jsx`), so `Discover.jsx:212-217` is now the category-pill filter
  row, not card markup — there is no "existing 🆕 NEW pill" location left in
  that file to add a sibling badge next to. The real NEW pill now lives at
  `ToolCard.jsx:46-53`, inside the badge wrapper `<span className="flex
  shrink-0 items-center gap-1.5">` at `ToolCard.jsx:45-67`. **Corrected
  target:** render `tool.popularityLabel` as a fourth possible badge in that
  same wrapper (alongside NEW, the fit-band pill, and the UNCERTAIN badge the
  status-warning gap above also now targets there), gated on `tool.popularity`
  being truthy. All three badges are non-interactive text pills sitting above
  the card's whole-card stretched-link overlay in DOM order, so — same
  reasoning as the status-warning correction — no `z-10` wrapping is needed,
  unlike the actionable controls lower in the card. This also means whoever
  builds this gap and the status-warning gap in the same run should write
  both badges into that one wrapper together rather than two separate patches
  landing on the same six lines back-to-back.
- **Verification 2026-09-19 21:20 UTC:** re-checked the whole plan against
  current code, since three weeks and several ships (including the
  status-warning gap this entry's badge wrapper is shared with, SHIPPED
  `c60fd8d` on 2026-09-17) had passed since the last check. Every part of the
  plan still holds, only the exact line numbers moved:
  - `radar/sources/github.js:25` and `radar/sources/hackernews.js:27` still
    fetch `stars`/`points` into `candidate.raw` untouched.
  - `radar/enrich.js` and `radar/schema.js` still have no `popularity` field
    anywhere — grepped both files fresh, zero hits.
  - Both `FIELDS` plumbing arrays (`radar/scripts/sync-to-app.js:12-16`,
    `src/utils/liveCatalog.js:7-10`) are unchanged in shape and still lack
    `popularity`/`popularityLabel` — though `liveCatalog.js`'s array has since
    grown three new radar-evaluation fields (`scorecard`, `integration`,
    `verdict`) not present when this gap was written, confirming the "append
    a field name to two arrays" plumbing pattern is still exactly how new
    radar fields reach the app today.
  - `ToolCard.jsx`'s badge wrapper (the corrected 2026-09-01 target) is at
    `ToolCard.jsx:45-78` now, not 44-73: the NEW pill at 46-53, the fit-band
    pill at 58-65, and the status pill — the one the SHIPPED status-warning
    gap actually landed — at 69-76, all three still siblings inside the same
    `<span className="flex shrink-0 items-center gap-1.5">` at line 45. A
    fourth `tool.popularityLabel` pill still drops into that exact wrapper
    with no structural changes needed.
