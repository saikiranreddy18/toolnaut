# Toolnaut dev log

One section per day, written by the autonomous dev routine at its end-of-day
run (16:51 UTC / 22:21 IST). Newest day first.

Each day records what was researched, which competitive gap was chosen, what
shipped, and what is queued next. The ranked gap list itself lives in
[docs/research-backlog.md](docs/research-backlog.md).

---

## 2026-08-30

**Radar health:** OK per `npm run radar:health` — 2 runs in the last 26h,
but 0 tools published in the most recent one; last actual publish was
2026-08-29 23:35 UTC (~19h before this run), feed holds 94 tools. Not a
false-positive miss (below the health script's threshold), but worth
watching tomorrow if a full day passes with nothing new landing.

**No 2026-08-29 digest found:** GitHub issue #9, "Dev digest 2026-08-28,"
is still open — there is no "Dev digest 2026-08-29" issue and no DEVLOG
entry for that date. Issue #12 ("master is red: prerender bakes a runtime
three.js modulepreload into dist/index.html," opened and closed 2026-08-29)
suggests that day's run went into fixing a red build rather than finishing
the digest step. Flagging rather than reconstructing a day this run wasn't
present for — closing #9 now and starting today's digest fresh.

**This run:** CI on master was green, `radar:health` returned OK, and no
`agent-fixable` issues were open, so no urgent work took priority — went
straight to the feature run.

**Shipped:** pricing-page honesty reconciliation —
[`c04149e`](https://github.com/saikiranreddy18/toolnaut/commit/c04149e).
Picked the highest-value OPEN gap in the backlog: `CapabilityMatrix.jsx`
already says plainly, right below `PricingSection` on `/pricing`, that
Toolnaut takes no payment and most Pro/Team rows are `planned`, not live —
but `PricingSection` itself (also mounted on the homepage, with no
corroborating section there) still listed "AI-powered chat assistant,"
the entire Team tier, PDF export, digest email/alerts and tiered human
support as unqualified, live features. The two sections contradicted each
other on the same page. Reused `CapabilityMatrix`'s own `live`/`planned`
vocabulary instead of inventing a second one: `planData.js`'s
`PLANS[].features` are now `{ text, status }` objects and `COMPARISON`
cells can be `'planned'` as well as `true`/`false`, both rendered with the
same dimmed "planned" pill `CapabilityMatrix.jsx` already uses (in
`PricingPillar.jsx` and `PricingSection.jsx`'s `Cell`). Also swapped
"Discord" out of "Community access" (no Discord server exists; the in-app
forum does) and fixed a stale `Pricing.jsx` comment claiming
`PricingSection` was removed from the landing flow, which it wasn't.
**Live on toolnaut.xyz** now that it's on master — pure display-layer
change, no backend, no new dependency, no new route. `npm test` (60/60),
`npm run build`, and `npm run smoke` (20/20 routes, 0 console errors,
`/pricing` included) all green before push.

**Queued next:** per-tool ratings & reviews, community-submitted tools
("Suggest a tool"), PDF roadmap export, per-route page title/meta
description, recently-viewed tools, the tool-status-note-reason gap, the
tool graveyard page, embeddable "Featured on Toolnaut" badge, per-tool
Alternatives SEO pages, structured data (JSON-LD), public search, tags as
clickable filters, first-session onboarding checklist, command palette,
Discover facet-counts, and the popularity-signal (GitHub stars/HN points)
pipeline gap all remain OPEN. Weekly digest email/alerts, Pro chat
assistant/Team tier, Discord community, and vendor deal codes stay
REJECTED-for-build (no backend, or need a standing external commitment) —
their honest-copy fixes are now largely covered by today's ship, since the
pricing page no longer sells any of them as live.

---

## 2026-08-28

**Radar health:** OK — 1 run in the last 26h, published 13 new tools. Feed
sits at 60 tools in `public/tools.json`, last run 09:13 UTC. Catalogue is
growing normally, no action needed.

**Researched today:** three research-hour runs continued the backlog. Found
the embeddable "Featured on Toolnaut" badge gap (03:15 UTC) — the standard
directory backlink loop (G2 badges, Product Hunt embeds) is entirely
missing, and the honest zero-backend version can link straight to the
already-public `/s/:slug` route. Found and specced per-tool "Alternatives"
SEO pages (06:10 UTC) — "chatgpt alternatives"-style queries are some of the
highest-intent searches in this category and Toolnaut has zero pages
targeting them, even though `ToolDetail.jsx`'s own related-tools logic
already computes the exact same list behind a session wall. Found the public
"new tools" feed gap (12:20 UTC) — the freshest-tools data and the util to
query it (`getNewTools()`) both already exist and are already tested, but
the only place either renders is `Discover.jsx`'s gated strip, invisible to
a crawler or a cold shared link.

**Shipped:** public `/new` feed —
[`f075d88`](https://github.com/saikiranreddy18/toolnaut/commit/f075d88).
Picked the freshest-found gap over the two older, larger ones because it
was the cheapest in the file's own terms: zero new data, zero new store, and
a page template (`CategoryLanding.jsx`) already proven twice this week for
"take `TOOLS`, filter it, render a public read-only grid." New public
`/new` route and `NewTools.jsx`, no session required, reusing the
already-tested `getNewTools(30)` util (Discover's own strip calls the same
function at a 7-day window). Each card now also shows a relative "Added Xd
ago" caption via `communityData.js`'s existing `timeAgo()`. Added `/new` to
`sitemap.xml` (`changefreq daily`, since this is the one public page whose
content can change every time radar runs) and to `scripts/smoke.mjs`'s
route list, plus a "See the full feed →" link from Discover's gated strip
into the new public page. **Live on toolnaut.xyz** — pure client-side
routing off the bundled + radar-hydrated catalog; smoke-tested it rendered
41.5KB of real card content, confirming the 30-day window wasn't empty.
Kept to this run's spec: no RSS/Atom feed, no per-source badges, no
pagination beyond the 30-day window, no email digest — this page is the
honest, backend-free substitute for the already-REJECTED "digest email"
pricing claim, not an attempt to sneak it back in.

**Queued next:** per-tool Alternatives SEO pages and the embeddable
Featured-on-Toolnaut badge are both fresh, fully specced OPEN gaps and the
natural picks for tomorrow. First-session onboarding checklist, per-tool
ratings & reviews, community-submitted tools ("Suggest a tool"), PDF
roadmap export, recently-viewed tools, the tool-status-note-reason gap, the
tool graveyard page, command palette, Discover facet-counts, and the
two-thirds-scoped per-route-meta-tags gap all remain OPEN. Pro chat
assistant / Team tier, weekly digest email, and Discord community stay
REJECTED-for-build, open only as copy-correction tasks for whoever owns
pricing copy. PR #3 (community pill submit-fix, bot/claude branch) is still
open and outside this routine's scope, same as noted previously.

---

## 2026-08-27

**Radar health:** OK — 1 run in the last 26h, published 21 new tools. Feed
sits at 47 tools in `public/tools.json`, last run 06:10 UTC. Catalogue is
growing normally, no action needed.

**Researched today:** three research-hour runs continued the backlog, all
appended without needing to re-open anything. Found the "Discover's filter
chips carry no facet counts" gap (15:07 UTC) — category/price/level pills
show no result-count preview before a click, a standard faceted-search
pattern (Amazon, G2, Algolia) missing from Toolnaut's highest-traffic page.
Found and specced "Popularity signal (GitHub stars / HN points) collected by
radar, discarded before it reaches a record" (03:06 UTC) — a real pipeline
bug, not just a missing feature: `radar/sources/github.js` and
`hackernews.js` both fetch a real popularity number per candidate and
`enrich()` throws it away one function later without ever assigning it onto
the record. Also logged "Community access (Discord & forum)" as REJECTED
(09:35 UTC) — half the claim (forum) already ships, the missing half (a
Discord server) needs a human to stand up and moderate an external
community indefinitely, not a code change, following this backlog's own
precedent for un-buildable pricing-page claims.

**Shipped:** public category/role landing pages —
[`927ee5b`](https://github.com/saikiranreddy18/toolnaut/commit/927ee5b).
Picked over the popularity-signal and facet-count gaps because yesterday's
run had already flagged it as the single biggest unclaimed surface in the
whole backlog: every tool-bearing route sat behind `AppShell`'s fake session
gate, so the 700+ tool catalog had zero crawlable listing pages for a
search engine or a shared link to land on. New public `/tools/:domain`
route (one per `CATEGORY_META` domain — code/design/writing/data/
automation/learning) and `CategoryLanding.jsx`, reusing `SharedStack.jsx`'s
existing read-only card pattern, no session required. `RolesSection.jsx`'s
six landing-page cards — previously pure decoration with zero links — now
route to the domain closest to each role (a judgment call, documented in
`rolesData.js`, since the quiz's own domain answer doesn't map 1:1 from
role name). Added all 6 URLs to `sitemap.xml` and one example route to
`scripts/smoke.mjs`. **Live on toolnaut.xyz** — pure client-side routing
off the bundled catalog, nothing waits on radar or a separate deploy step.
Kept to this run's spec: no all-26-source-category expansion, no per-route
meta tags (that's the separate, still-open `usePageMeta` gap), no
pagination — just the 6 domain pages and the real links into them.

**Queued next:** popularity-signal badge and Discover facet-counts are both
still-open, fully specced S-size gaps, either a natural pick for tomorrow's
run. Per-tool ratings & reviews, command palette, recently-viewed tools,
tool-status-note reason, PDF roadmap export, and the two-thirds-scoped
per-route meta-tags gap (blocked on a `ToolDetail`/`Compare` public-route
decision) remain OPEN. Discord/chat-assistant/Team-tier/digest-email
findings stay REJECTED-for-build, open only as copy-correction tasks for
whoever owns pricing copy.

---

## 2026-08-26

**Radar health:** OK — 1 run in the last 26h, published 21 new tools. Feed
sits at 26 tools in `public/tools.json` since the last run (02:18 UTC);
catalogue is growing normally, no action needed.

**Researched today:** four research-hour runs plus one deeper audit pass.
Found and specced: recently-viewed tools (Amazon/G2-style "continue
browsing" rail — the signal already exists on every `ToolDetail` mount, it's
just never captured); a tool-status warning with no reason attached (52
catalog entries are marked "Uncertain" and 47 of them already have a
one-sentence editorial reason in `note`, but nothing ever renders it — an
easy trust win, data already written); command palette / ⌘K quick-jump
(700+ tools deep with no way to jump to one without nav-then-filter); and
category/role landing pages ("best AI tools for X" — the single biggest
unclaimed SEO surface found so far, since every tool-bearing route sits
behind the fake session gate and `RolesSection`'s six cards are pure
decoration with zero links). A fifth pass re-audited `planData.js` one more
time and found the Student/Pro tiers' "weekly digest email" and
"personalized alerts" promises have nothing behind them — logged
**REJECTED** (needs real email/push infrastructure this repo has none of),
same treatment as the chat-assistant/Team-tier finding from yesterday.

**Shipped:** skills graph —
[`bf156a0`](https://github.com/saikiranreddy18/toolnaut/commit/bf156a010e614b2d5399ad30a187c731e5cf352f).
Picked over the newer research-hour finds because it closes the last
unbacked claim on the homepage's FeaturesSection — "Progress Tracking: a
skills graph that grows with you and shows exactly where the gaps are" had
nothing behind it except per-tool progress rings, no aggregate view across
the 6 galaxy domains. New pure `skillCoverage.js` (`getDomainCoverage`)
groups the resolved stack by domain and scores mean progress per domain;
new `SkillGraph.jsx` renders one bar per domain with a color chip, a
tool-count badge, and — for any domain with zero tools — an "Explore →"
link straight into Discover pre-filtered to that domain. Wired into
`Stack.jsx` between the streak card and today's drop. **Live on
toolnaut.xyz** — client-rendered off existing `localStorage` state, nothing
waits on the radar pipeline or a separate deploy step.

**Queued next:** category/role landing pages is now the highest-value OPEN
item — it's the biggest unclaimed SEO surface in the backlog, already
speced as a public `/tools/:domain` route reusing `SharedStack.jsx`'s card
pattern. First-session onboarding checklist, per-tool ratings & reviews,
command palette, recently-viewed tools, tool-status-note reason, PDF
roadmap export, and per-route meta tags are all still OPEN and fully
specced. The Pro chat assistant / Team tier and the weekly-digest-email
findings remain REJECTED-for-build but open as copy-correction tasks for
whoever owns pricing copy.

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
