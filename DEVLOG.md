# Toolnaut dev log

One section per day, written by the autonomous dev routine at its end-of-day
run (16:51 UTC / 22:21 IST). Newest day first.

Each day records what was researched, which competitive gap was chosen, what
shipped, and what is queued next. The ranked gap list itself lives in
[docs/research-backlog.md](docs/research-backlog.md).

---

## 2026-08-25

**Radar health:** OK — 1 run in the last 24h, published 5 new tools (73
candidates seen, 12 passed filtering, 0 stuck in review). Catalogue is
growing normally.

**Researched today:** the 00:15 UTC run found and specced a new gap
(per-route page title/meta description — every page from `ToolDetail` to
the just-shipped `Compare`/`SharedStack` shares one static `<title>` and
`og:description` from `index.html`, which both hurts long-tail SEO and
undercuts the share-stack feature's own social previews). The 15:35 UTC run
re-audited `planData.js` after finding two prior false claims there
(favorites, PDF export) and found two more — the Pro chat assistant (an
honest, self-labelled "canned replies" stub in `ChatPanel.jsx` sold on
`/pricing` as live Claude-powered Q&A) and the entire Team tier (needs real
multi-user accounts this SPA has none of) — both logged **REJECTED**, since
both need a backend this repo can't build, per this backlog's own ranking
rule. No new PR-facing bug found today; a stale bugfix PR (#3, three days
old) sits outside this routine's scope since it pushes to master directly
rather than through PRs.

**Shipped:** favorites/bookmarks —
[`4fe402f`](https://github.com/saikiranreddy18/toolnaut/commit/4fe402f).
Picked over the skills-graph and onboarding-checklist gaps because it's a
direct, checkable false claim on `/pricing` today (Student tier promises
"Save up to 10 favorite tools", Pro promises "Unlimited") with genuinely
nothing behind it — worse than a features-section platitude, it's a
paying-tier claim. New `favoritesStore.js` mirrors `stackStore.js`'s exact
shape (localStorage, try/catch on throw). A heart-toggle button now sits
next to "⚡ ADD" on every `Discover.jsx` card and next to "ADD TO MY STACK"
on `ToolDetail.jsx`, both wired to the new store. New `/app/favorites`
page renders a read-only-ish card grid (unfavorite + add-to-stack per
card) and a "SAVED" entry now sits in `AppShell`'s nav (bottom nav grid
bumped from 5 to 6 columns to fit it). Shipped ungated — no plan-tier cap
enforcement, since there's no billing system in this codebase to hang a
10-tool limit off of; same scope limit already applied when the PDF-export
gap shipped. **Live on toolnaut.xyz** — client-rendered on the existing
static catalog, nothing waits on the radar pipeline.

**Queued next:** skills-graph coverage view and the first-session
onboarding checklist remain OPEN and fully specced. Per-tool ratings &
reviews (S/M) and per-route page title/meta (SEO) are also OPEN. The Pro
chat assistant / Team tier finding is REJECTED for a build but still open
as a copy-correction task for whoever owns pricing copy (soften "Claude-
powered Q&A" or gate it behind "Coming soon," per the finding's own note) —
not something this routine does unasked.

---

## 2026-08-24

**Researched today:** two runs deepened the backlog rather than adding
shallow new entries. The 06:07 UTC run specced per-tool ratings & reviews
(G2/Capterra pattern) — a `toolReviewsStore.js` mirroring the existing
`communityStore.js` layering, seed data, and a rating badge + review list +
star-picker form on `ToolDetail.jsx`. The 12:07 UTC run re-checked the
already-OPEN side-by-side comparison gap directly against
`FeaturesSection.jsx`'s marketing copy and found it was the one headline
capability ("Live Tool Comparison") with nothing behind it — the other five
either ship or had specs — making it the single highest-priority item in
the file, not just competitive parity with G2/Capterra.

**Shipped:** side-by-side tool comparison —
[`50b0471`](https://github.com/saikiranreddy18/toolnaut/commit/50b0471).
Picked it for exactly the reason the 12:07 UTC research flagged: it's the
last unbacked promise on the landing page. `Discover.jsx` gets a "Compare"
checkbox per result card (capped at 4, matching Capterra's own cap) and a
floating bottom bar once 2+ are selected, linking to a new
`/app/compare?tools=slug1,slug2` route. The new `Compare.jsx` page resolves
slugs from the query string, drops unknown ones silently, and renders a
field-by-field table (category, price, level, dev, year, audience, status,
tags, plus a Match row when the quiz is complete) as a real grid on tablet+
and stacked per-tool cards on mobile — reusing `CATEGORY_META`/
`PRICE_LABELS`/`LEVEL_LABELS` and the stack-toggle logic verbatim, no new
label maps or stores. **Live on toolnaut.xyz** — this is a client-rendered
route on the same static catalog already in the bundle, nothing waits on
the radar pipeline.

While validating, `npm run smoke` genuinely failed the new route
(`/app/compare?tools=chatgpt,claude`) with a false "redirected to
/app/compare" — `scripts/smoke.mjs`'s guarded-route check compared
`page.url()`'s bare pathname against the *raw route string including its
query string*, which can never match. This is the first authed route in
the smoke list to carry a query param, so the bug had never fired before.
Fixed the comparison to strip the query on both sides before matching;
re-ran smoke clean afterward. Folded into the same commit since it was
blocking verification of the feature itself, not a drive-by.

The repo advanced mid-run (a radar retry-timeout fix and a `v0.6.1` release
bump landed on `master` while this was in flight) — rebased cleanly, reran
all three checks against the new base, then pushed.

**Queued next:** three OPEN gaps remain, all specced to file paths — a
skills-graph coverage view for the "Progress Tracking" promise, a
first-session onboarding checklist (Notion/Linear pattern), and
favorites/bookmarks (sold on `/pricing` today, not built). Per-tool
ratings & reviews is specced but not yet ranked against the other three for
the next run.

---

## 2026-08-22

Two feature-ship cycles landed today — the schedule fired an end-of-day run
at both 12:03 and 18:03 UTC. Recorded together since they're the same
calendar day.

**Researched today:** three gaps landed in `docs/research-backlog.md`, all
specced to file paths/line numbers — share/export a personal stack
(StackShare/Futurepedia pattern), side-by-side tool comparison (Capterra/G2
pattern), and surfacing tool freshness ("new this week", Product
Hunt/Futurepedia/There's An AI For That pattern).

**Shipped (12:03 UTC run):** surface tool freshness on Discover —
[`2d7d192`](https://github.com/saikiranreddy18/toolnaut/commit/2d7d192f7f8b9d3a3110e8dcbb33117c23bf5b2e).
Picked over the other two OPEN gaps because it was the cheapest by the
backlog's own ranking rule (users touched × obviousness ÷ build size): radar
already stamps a correct, once-only `discoveredAt` on every tool
(`radar/enrich.js`), it just never reached the app, so `FeaturesSection.jsx`'s
"Weekly Fresh Finds" line had nothing behind it. Plumbed `discoveredAt`
through both `FIELDS` boundaries (`radar/scripts/sync-to-app.js`,
`src/utils/liveCatalog.js`), added a pure `src/utils/newTools.js`
(`isNewTool`/`getNewTools`), and surfaced it on `Discover.jsx` as a "🆕 New
this week" strip plus a per-card badge. No backend, no new dependency, no
new route — 61 lines. All three checks green (102 radar tests, build,
11-route smoke) before push.

**Shipped (18:03 UTC run):** share your stack via a public read-only link —
[`42bdc99`](https://github.com/saikiranreddy18/toolnaut/commit/42bdc9942cd9738c792b164b07d365e92f4dde80).
Next-highest-ranked OPEN gap after tool freshness shipped. A stack was stuck
in localStorage with no way out — no share link, no export — while
StackShare's whole growth loop is public stack URLs. Added a pure
`src/utils/shareStack.js` (`encodeStackSlugs`/`decodeStackSlugs`, slugs only
so an old link survives persona/quiz changes), a new public `/s/:slugs`
route (`src/pages/SharedStack.jsx`, outside `AppShell`'s session guard,
degrades quietly on an unknown slug instead of crashing), and a "🔗 Share"
button on `Stack.jsx` that copies the link — mirrors `Learning.jsx`'s
existing copy-to-clipboard/transient-label pattern, no new UI primitive.
Visible on the live site immediately: no pipeline dependency, static
client-side routing only. 92 lines. All three checks green (102 radar
tests, build, 12-route smoke incl. the new `/s/:slugs` route) before push.

**Queued next:** side-by-side tool comparison (Capterra/G2 pattern) is the
one remaining OPEN gap, fully specced (new page + route, checkbox selection
capped at 4, S/M build size) — good pick for the next feature run.

---

## 2026-08-22 — baseline

Set up by hand; the routine writes every section after this one.

**Shipped today (before this log existed):** 20 commits — 15 test-coverage
additions across the radar pipeline, 2 perf memoizations (Discover,
ToolDetail), a chat-panel keyboard-focus and Escape fix, a duplicate-input-id
fix, and an InstallPrompt localStorage guard.

**Observation that prompted this change:** three quarters of the work was test
coverage. Tests are the safest thing an hourly agent can always find, and the
radar module is nearly exhausted. From tomorrow the hourly runs research the
market instead, and the last run of each day ships a feature from the gap list.

**Queued:** first research pass populates docs/research-backlog.md.
