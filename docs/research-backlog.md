# Research backlog — competitive gaps

Appended to by the hourly research runs, drained by the end-of-day feature run.

**How this file is used:** each hourly run studies ONE competitor or one
problem area and appends a finding below. The end-of-day run reads the whole
file, picks the highest-value unbuilt gap, builds it, and marks it SHIPPED
with the commit sha.

Status values: `OPEN` (candidate), `SHIPPED <sha>`, `REJECTED <reason>`.

Rank by: how many Toolnaut users would touch it × how obviously it is missing,
divided by build size. A gap that needs a backend is usually REJECTED — this is
a client-side SPA with a static tool catalogue.

---

## Format

```
### <short gap name>
- **Status:** OPEN
- **Seen in:** <competitor(s), with URL>
- **Gap:** <what they do that Toolnaut does not>
- **Why it matters:** <who benefits and when>
- **Build size:** <S | M | L> — <what it would touch>
- **Found:** <YYYY-MM-DD HH:MM UTC>
```

---

<!-- Findings are appended below this line, newest last. -->

### Share / export your stack
- **Status:** SHIPPED 42bdc9942cd9738c792b164b07d365e92f4dde80
- **Seen in:** StackShare (stackshare.io/stacks — its entire product is
  public tech-stack profiles built to be shared, no export button needed
  because every stack already has a permanent URL); Futurepedia and There's
  An AI For That both let a signed-out visitor copy/export a shortlist as
  plain text before asking them to sign up.
- **Gap:** A Toolnaut user builds a personal stack on `/app/stack` (add/remove
  tools, per-tool progress, a persona, a streak) but has no way to get it out
  of their own browser. There is no share link, no copy-to-clipboard summary,
  no downloadable image/markdown/CSV, nothing to post when they want to show
  someone their AI stack or roadmap. Checked `src/pages/app/Stack.jsx`,
  `src/pages/app/ToolDetail.jsx`, and `src/pages/QuizResult.jsx` — none import
  or render anything share/export-shaped (grepped for share|export|compare|CSV|PDF,
  zero hits outside Discover's own filter state).
- **Why it matters:** Every visitor who finishes the quiz or curates a stack
  is a free acquisition channel the moment they can show it to someone else —
  StackShare's whole growth loop is public stacks getting shared. Right now a
  Toolnaut stack dies in localStorage the moment the tab closes.
- **Smallest useful version (what to actually build):**
  - A stack is just a list of tool slugs. `stackStore.js` already keeps
    added-tool slugs; the starter-stack tools from `generatePersona()` also
    resolve to catalog entries with a `.slug`. Union both lists, dedupe, and
    that's the whole payload — no persona name, quiz answers, or progress
    state needs to travel. Keeping the payload to slugs only means an old
    shared link never breaks even if `personaGenerator.js` or the quiz
    questions change later.
  - Encode as comma-joined slugs, URI-encoded, mirroring the plain-readable
    style `Discover.jsx` already uses for `?q=`/`?cat=` (`src/pages/app/
    Discover.jsx:36-39`) rather than base64 — slugs are already URL-safe
    (kebab-case) and a readable link is more shareable than an opaque blob.
    New route `/s/:slugs` (e.g. `/s/notion-ai,perplexity,cursor`), public
    (outside `AppShell`'s session guard, next to `/quiz/result` in
    `src/App.jsx:70-94`).
  - New `src/pages/SharedStack.jsx`: reads `:slugs` from `useParams()`,
    resolves each through `getTool()` from `src/utils/toolsCatalog.js`
    (`toolsCatalog.js:757`), drops unknown/renamed slugs silently (a stale
    link degrades, it doesn't crash), and renders a read-only card grid —
    same visual language as the "Added from Discover" section in
    `Stack.jsx:276-315` (glass cards, blurb, category chip) but with no
    progress ring, no remove button, and no localStorage writes. Ends with a
    "Build your own stack" CTA linking to `/quiz`, since the visitor has no
    session.
  - New `src/utils/shareStack.js` with two functions: `encodeStackSlugs(
    slugs)` → path string, `decodeStackSlugs(param)` → slug array (split on
    comma, filter empty). Pure functions, easy to unit test with `node
    --test` alongside the existing radar tests' style.
  - On `Stack.jsx`, add one "Copy share link" button near the top (next to
    the streak sticker) that builds the union of starter + added slugs,
    writes `${location.origin}/s/${encodeStackSlugs(slugs)}` to the
    clipboard via `navigator.clipboard.writeText`, and flips a button label
    to "Copied!" for ~2s (same transient-feedback pattern already used for
    the progress-cycle buttons, no new UI primitive needed).
  - `scripts/smoke.mjs:32` hardcodes the 11 routes it renders — adding `/s/
    :slugs` means adding one literal example URL (e.g. `/s/notion-ai`) to
    that array, or the new route ships untested. This is the one place easy
    to forget.
  - **What this would NOT include** (explicitly out of scope for a first
    cut, to keep the diff small): no OG/social preview image generation, no
    "download as PNG" (would need a canvas/screenshot dependency this
    project doesn't have), no CSV/PDF export, no editable/collaborative
    shared stacks, no view counts or analytics on shared links, no
    persistence beyond what's in the URL (so a 200-tool stack would make an
    ugly URL — cap or truncate rather than solving that now).
- **Build size:** S/M — one new page (`SharedStack.jsx`), one new util
  (`shareStack.js`), one new public route in `App.jsx`, a share button on
  `Stack.jsx`, and one line in `scripts/smoke.mjs`'s route list. No backend,
  no new dependency.
- **Found:** 2026-08-22 09:58 UTC
- **Deepened:** 2026-08-22 10:55 UTC

### Side-by-side tool comparison
- **Status:** SHIPPED 50b0471
- **Seen in:** Capterra (side-by-side comparison tool lets buyers compare up
  to four products at once on features, pricing model and target user size —
  this "pick up to N, see a table" pattern is the de-facto standard across
  G2/Capterra's whole category-page UX); There's An AI For That and similar
  directories run individual "X vs Y" comparison pages for the same reason —
  a visitor evaluating tools wants two or three options next to each other,
  not one detail page at a time.
- **Gap:** Toolnaut's `TOOLS` catalog already carries every field a
  comparison table needs (`price`, `pricing`, `level`, `dev`, `year`,
  `audience`, `status`, `tags` — confirmed in `src/utils/toolsCatalog.js:48+`)
  and `Discover.jsx` already lets a visitor filter down to a shortlist, but
  there is no way to put two or three of those results next to each other.
  The only per-tool views are `Discover.jsx`'s card grid and
  `ToolDetail.jsx`'s single-tool page (confirmed by grepping
  `compare|comparison` across `src/` — zero hits outside this file).
  Evaluating "Claude vs ChatGPT vs Gemini" today means opening three
  `ToolDetail` pages in sequence and holding the differences in your head.
- **Why it matters:** Comparison is the single highest-intent action in a
  tool-discovery flow — it's the last step before someone commits, which is
  exactly the moment Toolnaut most wants to be useful. It's also the step
  every serious competitor (G2, Capterra) treats as core UX rather than a
  nice-to-have.
- **Smallest useful version (what to actually build):**
  - Add a compare checkbox next to the existing "⚡ ADD" stack button on each
    `Discover.jsx` result card (`Discover.jsx:185-190`). Selection is local
    `useState` array of slugs, capped at **4** (matches Capterra's cap —
    disable/grey out further checkboxes past 4 rather than silently
    dropping or erroring).
  - When 2+ tools are selected, show a floating bottom bar (same fixed/sticky
    pattern would be new to this file, but the "pill row" visual language
    already exists via the `Pill` component) reading "Compare (n) →" that
    links to `/app/compare?tools=slug1,slug2,slug3`. Comma-joined slugs in
    the query string mirrors `Discover.jsx`'s own `q`/`cat`/`price`/`level`
    param style (`Discover.jsx:33-36`) — no new encoding scheme.
  - New page `src/pages/app/Compare.jsx`, registered in `src/App.jsx`
    alongside the other `AppShell`-guarded routes (same auth gate as
    `Discover`/`Stack`, since this is a within-session comparison action, not
    a public share artifact like the separate share-stack gap above). Reads
    `tools` from `useSearchParams()`, resolves each slug via `getTool()`,
    drops unknown slugs silently (consistent with how the share-stack gap
    plans to degrade stale links).
  - Table layout: one column per tool (max 4, so it never needs horizontal
    scroll tricks beyond what a 4-column grid already needs on mobile —
    stack columns vertically under `sm:`), one row per field: category,
    price tier + `pricing` detail string, level, dev, year, audience, status,
    tags. Reuse `CATEGORY_META`/`PRICE_LABELS`/`LEVEL_LABELS` exactly as
    `Discover.jsx` and `ToolDetail.jsx` already do — no new label maps. If
    the quiz is complete, add a "Match" row using the existing
    `matchScore()` util so the table doubles as a personalised tiebreaker.
  - Each column gets its own "⚡ ADD TO STACK" button (reuse
    `addToStack`/`removeFromStack` from `stackStore.js` verbatim) and a small
    "✕ remove from comparison" control that re-filters the `tools` param and
    replaces the URL — so trimming the comparison down doesn't need a trip
    back to Discover.
  - `scripts/smoke.mjs:32`'s hardcoded route array needs one addition, e.g.
    `/app/compare?tools=chatgpt,claude`, or the new route ships untested —
    same footgun flagged on the share-stack gap.
  - **What this would NOT include** (kept out to bound the diff): no
    limit-free comparison (hard cap at 4), no comparing across categories
    with wildly different fields (the table just renders "—" for anything
    absent, no per-category schema), no persisted/named comparisons (state
    lives entirely in the URL, same as Discover's filters), no exporting the
    table as an image/PDF/CSV, no live pricing lookups — everything comes
    from the static catalog already in the bundle.
- **Build size:** S/M — one new page (`Compare.jsx`), a checkbox + floating
  bar addition to `Discover.jsx`, one new route in `App.jsx`, one line in
  `scripts/smoke.mjs`. No backend, no new dependency, no new label/meta maps.
- **Found:** 2026-08-22 11:55 UTC
- **Deepened 2026-08-24 12:07 UTC:** this is actually a promise-gap, not just
  competitive parity — should have been cited against the marketing copy from
  the start. `src/components/sections/FeaturesSection.jsx:8` sells "Live Tool
  Comparison — Side-by-side capability, pricing, and integration comparisons
  kept current" as one of six headline capabilities on the landing page today,
  and this is the one FEATURES card with literally nothing behind it (the
  other five either ship — Role-Aware Discovery, Smart Learning Paths, Signal
  over Noise, Weekly Fresh Finds — or have an OPEN spec already, Progress
  Tracking above). That makes this the single highest-priority item in this
  backlog: it is not a "nice competitive addition," it is the last unbacked
  claim on the homepage.
  One real wrinkle found while re-checking the field list against that exact
  promise: the word "integration comparisons" has no data behind it at all.
  Grepped `toolsCatalog.js` for an `integrations` field — zero hits; the only
  matches are the substring `"integration"` inside a couple of tool `blurb`/
  `tags` strings (e.g. `composio`'s blurb), never a structured field on any of
  the 700+ entries. The comparison table as specced above (price, level, dev,
  year, audience, status, tags) is the honest maximum buildable from the
  catalog today — it should ship without inventing an "Integrations" row, and
  the marketing copy's "integration comparisons" phrase is mildly overstated
  against what the table can actually show. Not a reason to hold the build:
  flagging it here so whoever ships this doesn't try to backfill a fake
  integrations field to match the copy, and so the copy itself is a candidate
  for a follow-up wording pass (out of scope for this feature — a one-line
  content edit, not a build) once the table ships and the bigger mismatch
  (comparison exists at all) is closed.

### Surface tool freshness ("new this week")
- **Status:** SHIPPED 2d7d192f7f8b9d3a3110e8dcbb33117c23bf5b2e
- **Seen in:** Product Hunt's whole homepage is daily-launches-first; There's
  An AI For That runs a dedicated "Newest AI Tools" feed; Futurepedia sorts
  its directory by "Newest" as a first-class filter, not a buried option —
  freshness is core UX in every AI-tool directory because the category moves
  fast enough that "when was this added" is itself a signal worth surfacing.
- **Gap:** Toolnaut's own marketing already promises this and doesn't deliver
  it. `src/components/sections/FeaturesSection.jsx:11` advertises "Weekly
  Fresh Finds — New tools matched to your evolving role, delivered in one
  scannable digest," but grepping `src/` for `Fresh Finds|new tool|changelog`
  turns up only that one marketing string — no route, no page, no component
  reads it. The underlying data already exists and is already correct: every
  radar-discovered tool gets a `discoveredAt` timestamp stamped exactly once
  (`radar/enrich.js:30`, fed by `radar/pipeline.js:69`), and `radar/dedup.js`'s
  `classify()` guarantees a slug is only ever enriched/upserted the first time
  it's seen (comment at `radar/dedup.js:6`: "nothing gets re-enriched day
  after day... refreshing an existing tool's data is a separate dedicated
  job") — so `discoveredAt` is a trustworthy first-published date, not a
  rolling "last touched" stamp. It just never reaches the app: neither
  `radar/scripts/sync-to-app.js`'s `FIELDS` list nor `src/utils/
  liveCatalog.js`'s `FIELDS` list includes `discoveredAt`, so it's stripped
  before `public/tools.json` is written and stripped again on merge into the
  in-app catalog. The 704-tool bundled `TOOLS` array in `toolsCatalog.js`
  never had this field either. Net effect: the data pipeline is the one thing
  that actually differentiates Toolnaut from a static directory, and it is
  completely invisible in the product today.
- **Why it matters:** it's the cheapest possible win in this file — no new
  tracking to add, no schema change, no pipeline logic to touch, just two
  `FIELDS` arrays and a UI surface for data that's already correct. It also
  closes a real gap between marketing copy and shipped product, which is a
  small trust liability the longer it sits (a visitor who reads "weekly fresh
  finds" and finds nothing built around it notices).
- **Smallest useful version (what to actually build):**
  - `radar/scripts/sync-to-app.js`: add `'discoveredAt'` to its `FIELDS`
    array so it survives into `public/tools.json`. One line.
  - `src/utils/liveCatalog.js`: add `'discoveredAt'` to its own `FIELDS`
    array so `hydrateCatalog()` keeps it on merged tools. One line.
  - New `src/utils/newTools.js`: a pure `isNewTool(tool, days = 7)` (valid
    `discoveredAt`, parses to a date, within `days` of now) and
    `getNewTools(days = 7)` that filters `TOOLS` (from `toolsCatalog.js`) and
    sorts newest-first. Tools from the bundled 704-entry baseline have no
    `discoveredAt` at all and correctly never qualify — no backfill needed,
    no special-casing.
  - `Discover.jsx`: a "🆕 New" badge on any card whose tool passes
    `isNewTool()` (reuses existing card markup, no new visual primitive), plus
    — to actually match the "scannable digest" promise in the marketing copy
    rather than just a quiet badge — a short horizontal strip above the
    filter bar, "🆕 New this week," rendering up to ~8 cards from
    `getNewTools(7)` when it returns anything, hidden entirely when it's
    empty (most weeks with a slow radar day should render nothing, not an
    empty section).
  - **What this would NOT include** (kept out to bound the diff): no
    dedicated `/app/new` route or page in v1 — inline on Discover only; no
    email or push digest delivery (no backend to send one); no
    per-user "since your last visit" personalization (would need visit
    tracking Toolnaut doesn't have); no changes to `radar/dedup.js` or
    `upsertTool` — `discoveredAt` is already stamped correctly once, this is
    purely a plumb-it-through-and-render job.
- **Build size:** S — two one-line `FIELDS` additions (radar + app), one new
  pure util (`newTools.js`), a badge + one small strip on `Discover.jsx`. No
  backend, no new dependency, no radar pipeline logic change.
- **Found:** 2026-08-22 12:15 UTC

### Skills graph / coverage gaps (Progress Tracking promise)
- **Status:** SHIPPED bf156a010e614b2d5399ad30a187c731e5cf352f
- **Seen in:** Coursera for Business's Skills Dashboard and LinkedIn Learning's
  skill-gap dashboards both give an individual a single aggregate view of
  proficiency across skill categories rather than a bare completion
  percentage — the point is to answer "what am I missing," not just "how far
  am I through the course." That's the same shape of promise Toolnaut already
  makes for itself.
- **Gap:** `src/components/sections/FeaturesSection.jsx:9` advertises
  "Progress Tracking — A skills graph that grows with you and shows exactly
  where the gaps are," but nothing in `src/` renders anything of the kind
  (grepped `radar chart|category.*progress|coverage|gap analysis`, zero
  hits). What actually exists: `Stack.jsx`'s `ProgressRing` draws one ring
  per tool card (`Stack.jsx:61-77`), cycling through `Not started → Exploring
  → Using weekly → Mastered` per tool name in `localStorage['exus_progress_v1']`
  (`Stack.jsx:32-37`); `Learning.jsx` shows one linear "X of Y steps" bar
  across the whole 4-week roadmap (`Learning.jsx:257-279`). Neither
  aggregates across categories, and nothing ever tells the user which of
  their six galaxy domains (`code`/`design`/`writing`/`data`/`automation`/
  `learning` — `toolsCatalog.js:9-16`) has zero tools in their stack. A user
  who has only ever added Writing tools has no way to discover that from the
  app itself.
- **Why it matters:** same "promised in the marketing copy, absent from the
  product" pattern as the Weekly Fresh Finds gap (now shipped) — a visitor
  who reads "shows exactly where the gaps are" and finds only per-card rings
  notices the mismatch. It also doubles as a soft cross-sell: a domain with
  zero coverage is a one-tap link into Discover pre-filtered to exactly that
  category, which nothing on Stack.jsx does today.
- **Smallest useful version (what to actually build):**
  - New pure util `src/utils/skillCoverage.js`: `getDomainCoverage(tools,
    progress)` — `tools` is the resolved starter ∪ added stack (same shape
    `Stack.jsx` already builds at `Stack.jsx:116-119`), `progress` is the
    existing `{ [toolName]: statusIndex }` map. Groups tools by `.category`
    (one of the 6 `CATEGORY_META` keys) and returns one entry per domain:
    `{ domain, name, color, count, avgStatus }` where `avgStatus` is the mean
    `statusIndex / (STATUSES.length - 1)` for that domain's tools (0 if
    `count` is 0). Pure, easy to `node --test` like the share-stack util.
  - New `src/components/app/SkillGraph.jsx`: six horizontal bars, one per
    domain, sorted by `count` descending. Each bar: domain name + color chip
    (reuse `CATEGORY_META` colors, same dot pattern already used in
    `Learning.jsx:329-334`), a fill sized by `avgStatus`, a tool-count badge,
    and — only for domains with `count === 0` — a muted "Explore →" link to
    `/app/discover?cat=<domain>`, reusing `Discover.jsx`'s existing `cat`
    query param (`Discover.jsx:33-36`) so the CTA actually filters instead of
    just linking to the generic page.
  - Wire it into `Stack.jsx` under a `tape-label` "📊 Skills graph" header,
    placed between the streak card and "today's drop" — same sticker-card
    visual language as the streak block right above it (`Stack.jsx:198-219`),
    no new visual primitive needed.
  - **What this would NOT include** (kept out to bound the diff): no
    time-series / historical view (the promise's "grows with you" reads as
    real-time reflecting current stack state, not a week-over-week trend —
    that would need snapshotting progress over time, a real v2); no
    cross-user or role-benchmark comparison; no self-assessed proficiency
    quiz; no change to how progress is stored or keyed (stays per-tool-name
    in `localStorage`, same footgun the existing code already has and this
    doesn't need to fix).
- **Build size:** S — one pure util (`skillCoverage.js`), one new small
  component (`SkillGraph.jsx`), ~15 lines wiring it into `Stack.jsx`. No
  backend, no new dependency, no new route.
- **Found:** 2026-08-23 00:15 UTC

### First-session onboarding checklist
- **Status:** OPEN
- **Seen in:** Notion's and Linear's "Getting Started" checklists both convert
  a new signup into an activated user by naming the 3-5 actions that predict
  retention and showing live progress against them, instead of leaving the
  user to discover the product's own surfaces on their own; HubSpot's
  onboarding checklist is the same pattern applied to a much colder, more
  transactional signup than Toolnaut's quiz flow. It's one of the most
  studied activation patterns in SaaS precisely because scattering the "what
  do I do next" burden across a UI (which is what Toolnaut does today) loses
  users at every extra click.
- **Gap:** confirmed no checklist/onboarding-progress component exists
  (grepped `checklist|getting.started|onboard` across `src/`; only hits are
  `OnboardingShell.jsx`, which is a layout wrapper for the quiz/login route
  transition — no persistent nudge UI, `App.jsx:79`). What exists instead is
  scattered and inconsistent: `Stack.jsx`'s "Next up" card (`Stack.jsx:337-356`)
  only ever nudges toward Discover or the roadmap, `QuizResult.jsx` presumably
  nudges once at quiz completion and is never seen again, and Community,
  Settings, and "post your first thread" are never surfaced as onboarding
  steps anywhere. A brand-new user who finishes the quiz lands on `Stack.jsx`
  with a starter stack already filled in and no signal for what to do next
  beyond the one generic "Next up" paragraph — nothing tells them the
  roadmap, the community, or adding a second tool from Discover are things
  worth doing today.
- **Why it matters:** the quiz already does the hard work of getting someone
  to a filled-in persona and stack — the highest-effort step is behind them —
  but nothing in the product capitalizes on that momentum by giving them an
  explicit, checkable list of next actions. This is pure activation/retention
  upside with zero backend need: every signal a checklist needs already lives
  in localStorage behind existing stores.
- **Smallest useful version (what to actually build):**
  - New pure util `src/utils/onboardingSteps.js`: `getOnboardingSteps()`
    returns a fixed ordered list of `{ id, label, done, href }` computed from
    stores that already exist — no new persistence:
    - `quiz` — `loadQuiz().completed` (`src/state/quizStore.js`)
    - `first_tool` — `loadStack().length > 0` (added a tool beyond the
      starter stack, via `src/state/stackStore.js:6`)
    - `roadmap_step` — any step done in `loadRoadmapProgress()` via
      `allStepsDone`/`isStepDone` helpers already exported from
      `src/state/roadmapStore.js:7-28` (checking "at least one step toggled"
      rather than a full milestone, since this is a "get started" nudge, not
      a completion tracker — `Learning.jsx` already owns milestone
      completion)
      community — whether the user has posted; `communityStore.js` has no
      export for this today (its `THREADS_KEY` user threads are read only
      inside `loadThreads()`/`getThread()`), so this step needs one new
      one-line export, e.g. `hasPostedThread()` reading `exus_threads_v1`
      directly, mirroring the existing `read()` helper at
      `communityStore.js:9-16`.
  - New `src/components/app/OnboardingChecklist.jsx`: a dismissible sticker
    card (same visual language as the streak card, `Stack.jsx:199-219`) shown
    on `Stack.jsx` only while incomplete — hides itself entirely once every
    step is done, and stores a "dismissed" flag in localStorage
    (`exus_onboarding_dismissed_v1`) so a user who closes it manually doesn't
    have it reappear. Each row is a checkmark (done/not-done, same dot
    pattern as `ProgressRing`'s use elsewhere) plus a label and a link to the
    relevant page (`/app/discover`, `/app/learning`, `/app/community`) for
    any step not yet done.
  - Wire into `Stack.jsx` directly under the streak card, above "today's
    drop" — matches where the streak/skills-graph gap above is already
    planned to live, so this and the skills-graph gap should not both ship in
    the same run without checking they don't crowd the same section.
  - **What this would NOT include** (kept out to bound the diff): no
    step-specific rewards/badges beyond the checkmark itself; no email or
    push reminder if a user never returns; no server-tracked activation
    funnel/analytics beyond the existing `useAnalytics` event pattern (a
    single `CTA_CLICK`-style event on dismiss would be enough, no new event
    taxonomy); no per-role customization of which steps appear — same four
    steps for every persona in v1.
- **Build size:** S — one pure util (`onboardingSteps.js`), one small
  component (`OnboardingChecklist.jsx`), one new one-line export in
  `communityStore.js`, ~10 lines wiring it into `Stack.jsx`. No backend, no
  new dependency, no new route.
- **Found:** 2026-08-23 06:06 UTC
- **Deepened 2026-08-28 21:20 UTC:** the original placement plan is now stale
  and needs correcting before this gets built, not after — this run re-read
  `Stack.jsx` as it exists today, not as it existed when this entry was
  written. The plan said "wire into `Stack.jsx` directly under the streak
  card... matches where the streak/skills-graph gap above is already planned
  to live, so this and the skills-graph gap should not both ship in the same
  run" — a hedge against a collision that has since become a certainty: the
  Skills Graph gap shipped five days later (`bf156a0`) and that exact slot is
  now occupied. Confirmed in the current file: the streak sticker renders at
  `Stack.jsx:181-204`, and `<SkillGraph>` mounts immediately after it at
  `Stack.jsx:207-210` ("Skills graph — coverage across the 6 galaxy domains"),
  directly above the "⚡ your kit" tool grid at `Stack.jsx:221`. There is no
  gap left between the streak card and the skills graph to insert a third
  sticker into without pushing every returning user's actual stack further
  down the page just to serve a nudge that stops applying to them after their
  first session.
  Also worth naming while re-reading this file: `Stack.jsx:319-353`'s existing
  "NEXT UP" section already covers two of this gap's four proposed steps in
  unconditional prose — "Add a tool in FIND" when `addedTools.length === 0`
  (mirrors the `first_tool` step) and "Continue week N" / "Start your 4-week
  path" (mirrors `roadmap_step`) — but it has no quiz-completion or
  community-post awareness, no checkmarks, no dismiss state, and (being
  unconditional per-bullet rather than an all-steps-done gate) never fully
  disappears once "you're activated" the way a checklist should. This doesn't
  make the checklist redundant — the two serve different jobs, "what to do
  right now" (NEXT UP, permanent) vs. "are you activated yet" (checklist,
  self-hiding) — but a builder should know NEXT UP exists and looks similar
  before adding a second, overlapping nudge system in the same viewport.
  **Corrected placement:** mount `OnboardingChecklist` between the persona
  header (`Stack.jsx:158-178`, ends after the tagline `<p>`) and the streak
  sticker (`Stack.jsx:181`) — above both the streak and the skills graph,
  not between them. Reasoning: this component's entire job is orienting a
  visitor before anything else on the page, so only the persona name/tagline
  (who you are) belongs above it; the streak and skills graph are both
  "status so far" widgets that only mean something once a user has an actual
  session history, which is exactly what the checklist is helping a
  brand-new user build. Placing it first also means it is the one card that
  visually disappears (once all steps are done) rather than permanently
  pushing the streak card down for every returning visit, which the original
  "under the streak card" plan would have done — a returning user with the
  checklist already complete sees the exact same page as today, unchanged.
  No change to the rest of the original spec (steps, dismiss-flag key,
  `communityStore.js` export) — this deepening only fixes the one paragraph
  that had gone stale, and flags the NEXT UP overlap as something to be aware
  of, not something to build a dedup for in this pass.

### Favorites / bookmarks (sold on the pricing page, absent from the app)
- **Status:** SHIPPED 4fe402f
- **Seen in:** Futurepedia has a dedicated "Favorites" button on every tool
  that saves it to the visitor's profile for later, separate from anything
  transactional — the point is a lightweight save-for-later a visitor can do
  before they've committed to using a tool, not after.
- **Gap:** Toolnaut already sells this to itself. `src/utils/planData.js:22`
  promises "Save up to 10 favorite tools" on the Student tier and
  `planData.js:46` promises "Unlimited favorite tools" on Pro, and the
  comparison table at `planData.js:83` repeats it as a plan-differentiating
  row ("Saved favorites: 10 / Unlimited / Unlimited"). `src/pages/Pricing.jsx`
  renders `PLANS`/`COMPARISON` directly, so this copy is live on
  `/pricing` today. But grepping `src/pages` and `src/components` for
  `favorite|bookmark|heart` turns up nothing — no heart icon, no saved-list
  page, no store. The only "save a tool" mechanic that exists is
  `stackStore.js`'s add-to-stack, which is a different, heavier action: it
  seeds `Stack.jsx`'s progress rings, the skills-graph gap above, and the
  onboarding-checklist gap above — i.e. "I'm actively using/learning this,"
  not "I want to remember this for later." A visitor skimming Discover for
  candidates has no lightweight way to shortlist five tools without
  triggering all of that. This is the same "marketing promises it, product
  doesn't have it" shape as the (now-shipped) Weekly Fresh Finds gap and the
  still-open Skills Graph gap — except this one is sold on the pricing page
  itself, which makes the mismatch a direct, checkable false claim rather
  than a features-section platitude.
- **Why it matters:** it's a real trust gap (a paying-tier feature that
  literally does not exist, discoverable by anyone who reads `/pricing`
  closely), and it's also a missing low-friction on-ramp: Discover's only
  action today is the all-or-nothing "⚡ ADD" into the stack (`Discover.jsx:217-222`),
  which is more commitment than "I might want this later" — a lighter save
  action likely gets used more often and earlier in a visitor's session than
  the stack does.
- **Smallest useful version (what to actually build):**
  - New `src/state/favoritesStore.js`, mirroring `stackStore.js`'s exact
    shape (`localStorage` key `exus_favorites_v1`, array of slugs):
    `loadFavorites()`, `addFavorite(slug)`, `removeFavorite(slug)`,
    `isFavorite(slug)`. Same try/catch-on-throw pattern as `stackStore.js:7-17`
    (must tolerate `localStorage` throwing, per this repo's own
    `src/state/*` rule) — no plan-based cap enforced anywhere, since there is
    no billing/subscription system in this codebase at all (confirmed:
    zero hits for `stripe|checkout|subscription|billing` under `src/`) — the
    10-tool cap in the copy is unenforceable today and out of scope; this
    gap is only about the feature existing, not about gating it.
  - A heart-icon toggle button next to the existing "⚡ ADD" button on each
    Discover card (`Discover.jsx:217-222`) and next to the "ADD TO STACK"
    button on `ToolDetail.jsx:136`. Filled heart when `isFavorite(tool.slug)`,
    outline otherwise; click toggles and stops propagation same as
    `toggleStack` already does at `Discover.jsx:218`.
  - New `src/pages/app/Favorites.jsx` + route `/app/favorites` (registered
    next to `stack`/`discover` in `src/App.jsx:87-88`), reusing the same
    read-only-ish card grid pattern `SharedStack.jsx` already established for
    rendering a list of resolved tools, but with the heart-toggle (remove)
    and an "⚡ ADD TO STACK" button per card instead of a "build your own"
    CTA. Empty state links to `/app/discover`.
  - One nav entry for Favorites wherever `AppShell` currently lists
    Stack/Discover/Learning/Community links (needs a quick check of
    `AppShell.jsx`'s nav array when built — not yet located precisely).
  - `scripts/smoke.mjs`'s hardcoded route array needs `/app/favorites` added,
    same footgun flagged on every gap above.
  - **What this would NOT include** (kept out to bound the diff): no plan-tier
    enforcement of the 10-tool cap (no billing system exists to hang it off
    of — if that ever gets built, it's a separate gap); no favoriting from the
    galaxy/3D explorer view; no notes-per-favorite (Futurepedia has this, but
    it's an added-complexity v2, not needed to close the core gap); no
    syncing favorites into the share-stack or comparison URL state — favorites
    stay a separate, private, local list.
- **Build size:** S — one new store (`favoritesStore.js`), one new page
  (`Favorites.jsx`), one new route, a heart-button addition to two existing
  files (`Discover.jsx`, `ToolDetail.jsx`), one nav link, one line in
  `scripts/smoke.mjs`. No backend, no new dependency.
- **Found:** 2026-08-23 12:04 UTC

### Per-tool ratings & reviews
- **Status:** OPEN
- **Seen in:** G2 and Capterra are built around per-product star ratings and
  written reviews as the primary trust signal on every category and detail
  page — it's the single biggest reason buyers land there instead of a
  vendor's own site. Product Hunt's comment threads sit directly under each
  launch for the same reason: social proof from other users, not just the
  vendor's own copy, is what a visitor evaluating a specific tool weighs most.
- **Gap:** Toolnaut has zero rating or review surface anywhere. Grepped
  `toolsCatalog.js` for `rating|score` — the only hits are unrelated substring
  matches inside tool blurbs (`ambience`, `crewai`, `google-assistant`), no
  rating field on any of the 700+ catalog entries. `ToolDetail.jsx` already
  shows a personalised `matchScore()` badge (`ToolDetail.jsx:86-93`) and a
  "WHY IT FITS" reasons list (`ToolDetail.jsx:141-160`), but those are both
  algorithmic — Toolnaut's own opinion of the fit, never another user's. The
  closest thing that exists is `communityStore.js`'s discussion threads
  (seeded `THREADS` + local user posts, upvoted, layered exactly like this
  gap would need), but threads have no `tool` field at all — `Community.jsx`
  and `communityStore.js` have no way to attach a post to a specific catalog
  slug, so "what do other users think of Notion AI specifically" has no home
  even inside the one social feature Toolnaut already ships.
- **Why it matters:** review content is the most-cited reason G2/Capterra
  convert better than a plain directory — a star average plus a couple of
  real sentences from someone who tried the tool is a stronger nudge toward
  "add to stack" than another algorithmic match score. It also gives
  Community's existing local-first crowdsourcing pattern (seed content +
  per-browser user additions, already accepted for threads) a second, more
  frequently-touched surface: a visitor lands on `ToolDetail` for a specific
  tool far more often than they open Community cold.
- **Smallest useful version (what to actually build):**
  - New `src/utils/toolReviewsData.js`: a small seed array (~20-30 entries
    across ~15 well-known slugs — `chatgpt`, `claude`, `notion-ai`,
    `perplexity`, `cursor`, etc., cross-checked against real slugs in
    `toolsCatalog.js` before writing any) of `{ id, slug, author, rating (1-5
    int), body, at }`, mirroring `communityData.js`'s `THREADS` shape exactly
    so the layering logic below can copy `communityStore.js`'s pattern
    verbatim rather than invent a new one.
  - New `src/state/toolReviewsStore.js`: same `read`/`write` localStorage
    helpers as `communityStore.js:9-19` (must tolerate `localStorage`
    throwing, this repo's own `src/state/*` rule), new key
    `exus_tool_reviews_v1`. `getReviews(slug)` merges seed + user reviews for
    that slug, newest first. `getAverageRating(slug)` returns `null` when a
    tool has zero reviews (never render "0.0 stars" — an empty state is
    honest, a fabricated zero isn't) or the mean rounded to one decimal.
    `addReview(slug, { rating, body, author })` pushes to the user list,
    capped at one review per slug per browser (check existing user reviews
    for that slug + author combo before pushing, same "no duplicate" spirit
    as `toggleUpvote`'s toggle-not-append design).
  - `ToolDetail.jsx`: an average-rating badge (star icon + `X.X` + review
    count) next to the existing MATCH/status badges at
    `ToolDetail.jsx:81-102`, shown only when `getAverageRating(slug)` is not
    null. A new "REVIEWS" sticker section after "WHY IT FITS"
    (`ToolDetail.jsx:141-160`) listing each review (author, star rating,
    body, relative time via `communityData.js`'s existing `timeAgo()`) and,
    below the list, a small inline form — 5-star click picker (new, small,
    reusable) + one-line textarea — reusing `Community.jsx`'s `Composer`
    visual language (`Community.jsx:159-221`: `glass` card, plain `input`/
    `textarea`, `nb-btn` submit) rather than inventing new form chrome.
  - **What this would NOT include** (kept out to bound the diff): no rating
    surfaced on `Discover.jsx` cards in v1 (real product value is on the
    detail page where someone is already deciding; a card-grid star badge is
    a natural, separate follow-up once this ships and doesn't block it); no
    moderation/reporting/edit/delete on submitted reviews; no verified-user
    or "used this tool" gating on who can review — same trust model
    Community threads already ship with; no review syncing into the
    share-stack or comparison gaps above; no per-category rating rollups.
- **Build size:** S/M — one seed data file (`toolReviewsData.js`), one new
  store (`toolReviewsStore.js`, closely mirrors `communityStore.js`), a
  rating badge + reviews section + small star-picker form added to
  `ToolDetail.jsx`. No backend, no new dependency, no new route.
- **Found:** 2026-08-24 06:06 UTC

### Community-submitted tools ("Suggest a tool")
- **Status:** OPEN
- **Seen in:** There's An AI For That runs a prominent "Submit a Tool" flow as
  a primary nav item; Futurepedia accepts vendor/user tool submissions into
  its directory; Product Hunt's entire growth loop is community-submitted
  launches, not a centrally curated list — in every comparable AI-tool
  directory, letting users hand the catalog new entries is treated as a core
  growth channel, not an afterthought.
- **Gap:** Toolnaut's catalog only grows through `radar`'s automated
  GitHub/HN/Product-Hunt/RSS scouting (`radar/README.md:3-6`) — there is no
  user-facing way to suggest a tool anywhere in the product. Grepped
  `submit|suggest|request` (tool-related) across `src/`: zero hits. The
  clearest missed moment is `Discover.jsx`'s empty state
  (`Discover.jsx:170-180`): when a search returns nothing, the user has just
  told Toolnaut about a real gap in its own catalog, and today the product
  only offers "Try a broader search or clear the filters" — it throws that
  signal away instead of capturing it.
- **Why it matters:** it turns a dead-end (zero results) into an engagement
  point instead of a bounce, and it's free top-of-funnel sourcing that costs
  nothing to build: this repo's own automation already runs entirely off
  GitHub issues (the `agent-fixable` label, the daily dev-digest issues in
  `.github/workflows/agent-*.yml`), so a submission mechanism that lands as a
  GitHub issue slots into infrastructure that already exists rather than
  requiring a new backend.
- **Smallest useful version (what to actually build):**
  - Add a `GITHUB_REPO_URL` constant to `src/config.js` (which today only
    holds `BRAND`/`BRAND_SHORT` — confirmed nothing in `src/` currently
    references a GitHub URL at all, so this is a first-of-its-kind value;
    whoever builds this must verify it against the actual repo slug before
    hardcoding it, rather than assuming).
  - New pure util `src/utils/suggestTool.js`: `buildSuggestToolUrl({ name,
    url, note })` → a GitHub `issues/new` URL with `title`, a structured
    `body` (tool name / URL / note, clearly labelled so a human triaging
    issues doesn't have to guess the shape), and `labels=tool-submission`,
    all URI-encoded via `URLSearchParams`. Pure and testable the same way as
    `shareStack.js`/`newTools.js`.
  - Inline form in `Discover.jsx`'s empty state (`Discover.jsx:170-180`) —
    not a new page/route, kept light: "🔭 Don't see it? Suggest a tool" with
    two inputs (tool name, optional URL), a submit button that calls
    `buildSuggestToolUrl()` and opens the result in a new tab
    (`window.open(url, '_blank', 'noopener')`) — no local persistence, no
    submission history, because the GitHub issue itself is the store.
  - One small persistent link for users who aren't mid-search — `Settings.jsx`
    is the natural home (reuses `nb-btn` styling, same pattern as the
    existing external "VISIT WEBSITE" link on `ToolDetail.jsx:120-132`).
  - **What this would NOT include** (kept out to bound the diff): no in-app
    submission status/history ("your suggestion is pending"); no moderation
    queue inside the app — the GitHub issue tracker is the queue; no
    automatic radar ingestion of submitted issues in v1 (a human, or a
    future separate agent workflow, triages them — wiring radar to read
    GitHub issues is a distinct, larger piece of work, not this gap); no
    separate vendor/company submission path.
- **Build size:** S — one new config constant, one pure util
  (`suggestTool.js`), a small form added to `Discover.jsx`'s existing empty
  state, one link on `Settings.jsx`. No backend, no new dependency, no new
  route.
- **Found:** 2026-08-25 00:15 UTC
- **Deepened 2026-08-31 06:20 UTC:** the tags-clickable deepening (below)
  already flagged that `Discover.jsx`'s empty state had "changed shape" since
  this entry was written and left it for whoever picks this up to re-check —
  did that re-check this run, and it clears the plan rather than blocking it.
  Re-read the current `Discover.jsx` in full: the empty state now lives at
  `Discover.jsx:227-254` (was `170-180`), and it's grown two things this plan
  didn't originally account for — a `suggestedCats` row of category buttons
  (up to 6, only categories that actually have tools) and a "CLEAR ALL
  FILTERS" button, both added by the pagination/faceting work that landed
  after this entry was written. Neither changes the plan's shape, only its
  exact insertion point: the "🔭 Don't see it? Suggest a tool" form still
  fits as one more block inside the same `results.length === 0` branch
  (`Discover.jsx:227-254`), placed after the `suggestedCats` buttons and the
  clear-filters button — a user has already been offered the two "maybe you
  just filtered too hard" escape routes by that point, so the submission
  form reads as the last resort for someone who tried both and still found
  nothing, not a distraction competing with them for attention first.
  Also resolved the one open uncertainty this entry flagged instead of
  assuming: confirmed via `git remote -v` that the actual repo slug is
  `saikiranreddy18/toolnaut` (`https://github.com/saikiranreddy18/toolnaut`)
  — whoever builds this can hardcode `GITHUB_REPO_URL =
  'https://github.com/saikiranreddy18/toolnaut'` in `src/config.js` directly,
  no verification step left to do. Confirmed `src/config.js` still has no
  such constant and `src/utils/suggestTool.js` still doesn't exist, so this
  gap is exactly as unbuilt and exactly as buildable as when it was first
  logged — only the target line numbers and the repo-URL blank needed
  filling in. `ToolDetail.jsx:143-145`'s "VISIT WEBSITE" `nb-btn dark` link,
  cited above as the style to reuse for the `Settings.jsx` link, is also
  still at that exact location, unchanged.

### PDF roadmap export (sold on Pro, does not exist)
- **Status:** OPEN
- **Seen in:** this isn't a competitor pattern so much as a Toolnaut-only
  false claim — flagged while re-auditing `planData.js` for other unbacked
  rows after the favorites gap (found there is not the only one). Print/
  export-to-PDF as a client-only feature (no server render, no PDF library)
  is a standard web pattern via a dedicated print stylesheet + `window.print()`
  — GitHub's own "Print" on rendered Markdown and countless invoice/reports
  pages use exactly this, no backend involved.
- **Gap:** `src/utils/planData.js:49` promises "Export learning roadmaps as
  PDF" on the Pro tier, repeated as a comparison-table row at
  `planData.js:87` (`['PDF roadmap export', false, true, true]`) — live today
  on `/pricing` via `PricingSection.jsx`. Grepped the whole `src/` tree for
  `print(|PDF|jspdf|download` (case-insensitive): the only hits are those two
  `planData.js` copy lines and unrelated tool-catalog blurbs (`toolsCatalog.js:469`
  matches "Blueprint AI", a false positive). `src/pages/app/Learning.jsx`
  already renders the full 4-week roadmap (`generateRoadmap()` → `milestones`
  with `week`/`title`/`focus`/`steps`/`tool`, `Learning.jsx:224-385`) and
  already has one export-adjacent action — `share()` at `Learning.jsx:243-250`
  copies a one-line brag string, not the roadmap content itself. There is no
  `package.json` PDF dependency (`jspdf`, `html2canvas`, etc. — confirmed
  zero hits) and no `@media print` rule anywhere in `src/index.css` (509
  lines, checked in full) or any component file. A Pro subscriber who reads
  the pricing page and looks for this gets nothing.
- **Why it matters:** same category of issue as the favorites gap — a
  specific, checkable claim on the pricing page with zero product behind it,
  discoverable by anyone who actually tries to use what they're told they're
  paying for. It's also a real, if secondary, retention aid on its own
  merits: a roadmap someone can save/print survives outside the browser tab
  the same way the (shipped) stack-share link does, useful for someone who
  wants to follow their 4-week plan without Toolnaut open.
- **Smallest useful version (what to actually build):**
  - No new dependency — use the browser's native print-to-PDF via
    `window.print()`, which every modern browser already exposes as "Save as
    PDF" in its print destination picker. This is the only approach
    consistent with every other gap in this file staying dependency-free.
  - Add a scoped `@media print` block to `src/index.css` (or a small
    `Learning.jsx`-only `<style>` — whichever keeps the block visibly tied to
    the one page it affects) that hides everything print doesn't need: the
    galaxy/3D background canvas, `AppShell`'s nav chrome, the "How ▾" lesson
    disclosure toggles, the checkpoint quiz forms, and all the sticker
    box-shadow/rotate decoration (`transform: rotate(...)`, `box-shadow`
    inherited from the `.sticker` class) that reads as visual noise on paper
    — keep milestone title, week, focus, step list with done/not-done state,
    and the tool link. Force light-on-white text color for print (the app is
    dark-theme-only; printing white text on a transparent/dark background as-is
    would be unreadable/wasteful on paper).
  - One "🖨️ Export as PDF" button on `Learning.jsx`, near the existing
    "🎓 SHARE MY BADGE" button's visual slot (`Learning.jsx:398-400`) —
    always visible (not gated behind `allCleared`, since exporting an
    in-progress roadmap is at least as useful as a completed one), calling
    `window.print()` directly. No new component needed beyond the button and
    the print stylesheet.
  - **What this would NOT include** (kept out to bound the diff): no actual
    PDF-library-generated file (no `jspdf`/`html2canvas`, no client-side
    binary PDF construction) — `window.print()` → "Save as PDF" is the
    honest, dependency-free way to deliver this and is what "export as PDF"
    means to a user regardless of mechanism; no plan-tier gating (same
    reasoning as the favorites gap — no billing system exists to enforce
    Student vs. Pro against, so this ships ungated for everyone, same as
    favorites would); no print styling for any other page (Stack, Discover,
    ToolDetail) in v1, scoped to `Learning.jsx` only since that's the exact
    page the copy names ("roadmaps"); no server-rendered/emailed PDF.
- **Build size:** S — one `@media print` stylesheet block, one button on
  `Learning.jsx` calling `window.print()`. No backend, no new dependency, no
  new route, no new store.
- **Found:** 2026-08-25 03:20 UTC

### Per-route page title & meta description (SEO/social, every page shares one)
- **Status:** SHIPPED (this run, sha to follow the DEVLOG-visible fix commit)
  — the hook, its prerender bug fix, and all five originally-scoped call
  sites (plus the two blocked ones' own resolution) are now done; see the
  2026-08-31 12:22 UTC deepening below for the closing piece.
- **Seen in:** every directory competitor treats per-listing metadata as
  table stakes because it's their primary organic-search channel — G2 and
  Capterra generate a unique `<title>`/description per product page keyed off
  the product name, and There's An AI For That / Futurepedia do the same per
  tool listing. This is also standard for any content-per-URL site (a blog
  post, a Notion public page) — the page title matches what the page is
  actually showing, not a fixed site-wide string.
- **Gap:** confirmed by reading `index.html:11-27` and grepping `document.title|
  react-helmet|<title>|og:title|og:description` across `src/`: the only
  `<title>`, `<meta name="description">`, and every `og:*`/`twitter:*` tag are
  static, hardcoded once in `index.html` for the root `/` route, and nothing
  in `package.json` provides `react-helmet`/`react-helmet-async` or any other
  per-route head manager. Of `src/App.jsx`'s 15 routes (`App.jsx:73-98`), only
  one — `NexusLanding.jsx:518-523` — ever touches `document.title` at all, via
  a raw `useEffect` that sets it to a fixed string on mount and restores the
  previous value on unmount; it never touches `<meta name="description">` or
  any `og:*`/`twitter:*` tag, and social crawlers (which don't execute JS —
  `index.html`'s own comment at line 15 says so) never see the change anyway.
  Net effect: `ToolDetail.jsx` (one route, 700+ distinct tool slugs),
  `Pricing.jsx`, `About.jsx`, `SharedStack.jsx` (the just-shipped share-stack
  feature above), and `Compare.jsx` all render with the exact same tab title
  ("Toolnaut — Your AI Stack, Personalized") and the exact same social-preview
  card as the homepage, regardless of which tool, stack, or comparison is
  actually on screen.
- **Why it matters:** two distinct costs, both real and both free to name
  precisely. (1) SEO: Google's crawler does render JS during indexing (unlike
  Twitter/Facebook's crawlers), so a correct per-route `document.title` and
  `<meta name="description">` would genuinely help long-tail search — someone
  searching "Notion AI review" or "Notion AI alternatives" has a real reason
  to land on a Toolnaut `ToolDetail` page today, but that page's `<title>`
  never mentions the tool name at all, which is a meaningful ranking signal
  left on the table across 700+ pages. (2) Social/share quality: the
  share-stack gap above (shipped) built `/s/:slugs` specifically to be
  "something to post when they want to show someone their AI stack," but a
  pasted share link previews as the generic homepage card in every chat app
  and social feed — the exact feature meant to drive sharing undercuts itself
  the moment it's actually shared. Same problem for `ToolDetail` links pasted
  into a Slack channel or DM.
- **Smallest useful version (what to actually build):**
  - New `src/hooks/usePageMeta.js`: a small hook, `usePageMeta({ title,
    description })`, that in a `useEffect` sets `document.title` and finds-or-
    creates a `<meta name="description">` tag via `document.querySelector`,
    writing the previous values and restoring them on unmount — same
    restore-on-unmount shape `NexusLanding.jsx:518-523` already established,
    generalized into one reusable hook instead of every page hand-rolling the
    same `useEffect`. Pure DOM manipulation, no dependency (`react-helmet-
    async` would be the "correct" long-term answer but is a new dependency
    for a change this size — out of scope for a first cut per this file's own
    dependency-free bias).
  - Call it from `ToolDetail.jsx` with `${tool.name} — Toolnaut` / `tool.blurb`
    (both already loaded for the page), `Pricing.jsx` with a pricing-specific
    title/description, `About.jsx`, `SharedStack.jsx` (title naming the tools
    in the stack, e.g. "My AI stack: Notion AI, Cursor, Perplexity —
    Toolnaut"), and `Compare.jsx` (title naming the compared tools). Each call
    site supplies its own strings — no shared copy table needed for five call
    sites.
  - Replace `NexusLanding.jsx`'s hand-rolled `document.title` `useEffect`
    (`NexusLanding.jsx:518-523`) with the same hook, so there is exactly one
    place this logic lives.
  - **What this would NOT include** (kept out to bound the diff): no dynamic
    `og:*`/`twitter:*` tag updates — those need a crawler that executes JS,
    which social crawlers don't, so updating them client-side would be dead
    code that looks like it works and doesn't; fixing *those* for real needs
    either a Vercel Edge Middleware/serverless function injecting per-route
    HTML or a prerender step, which is a backend-shaped change this backlog's
    own ranking rule says to reject — flagging it here as the honest reason
    social previews stay generic, not silently working around it with fake
    client-side OG tags; no per-category or per-audience meta variants beyond
    the five call sites above; no sitemap/structured-data (`JSON-LD`) work,
    a separate and larger SEO project; no i18n/locale variants.
- **Build size:** S — one new hook (`usePageMeta.js`), five call sites
  (`ToolDetail.jsx`, `Pricing.jsx`, `About.jsx`, `SharedStack.jsx`,
  `Compare.jsx`) plus replacing `NexusLanding.jsx`'s existing ad hoc version.
  No backend, no new dependency, no new route.
- **Found:** 2026-08-25 12:09 UTC
- **Deepened 2026-08-25 21:09 UTC:** two of this gap's five call sites
  (`ToolDetail.jsx`, `Compare.jsx`) get zero real SEO value from the hook as
  specced, because the pages themselves are unreachable by a crawler today —
  a problem one level below meta tags. `AppShell.jsx:57-59` hard-redirects
  any visitor with no session straight to `/auth/login`, and both routes are
  nested under `<Route path="/app" element={<AppShell />}>` in `App.jsx:87-98`.
  `authStore.js:6-25` confirms the session is entirely fake/local — `signIn()`
  just writes a localStorage flag, no real credential check, no backend call
  — but a crawler doesn't click "Continue with Google" or "Send magic link"
  (`Login.jsx:78-87,96-114`) any more than a real unauthenticated user would,
  so it never gets one. `scripts/smoke.mjs:75-77` already documents this
  exact failure mode in its own comment — it seeds a fake session via
  `page.addInitScript` before visiting any `/app/*` route specifically
  "[without one] every one of these renders the login page instead" — the
  smoke suite had to route around the same wall this finding is about. Net
  effect: a Google crawl of `toolnaut.xyz/app/tools/notion-ai` today renders
  the **login page's** HTML (title "Enter your command center", generic
  description), never the tool's. Same failure for a `ToolDetail` link
  pasted into Slack/Discord — the recipient who isn't already signed in
  clicks through to a login screen, not the tool page they were sent, which
  is a worse outcome than the "generic preview card" problem the base gap
  already names for `SharedStack` links (that route is correctly public,
  outside `AppShell`, at `App.jsx:79`).
  This does **not** invalidate the base gap — `Pricing.jsx`, `About.jsx`,
  and `SharedStack.jsx` are all top-level public routes (`App.jsx:74-79`,
  outside `AppShell`) and get the hook's full SEO/social value with no
  further change. It scopes the gap: ship `usePageMeta` for those three
  first since they're immediately net-positive, and treat `ToolDetail`/
  `Compare` as blocked on a separate, smaller decision rather than silently
  wiring the hook into two pages a crawler can't reach and calling it done.
  **Smallest real fix for the two blocked pages:** the session gate buys no
  actual security today (there's no real account, no billing, nothing
  private to protect — `planData.js`'s Team-tier admin/seat claims are
  already REJECTED above as needing real accounts this app doesn't have),
  and `ToolDetail.jsx` already degrades cleanly with no session: `quiz.completed
  ? quiz.answers : null` (`ToolDetail.jsx:51-52`) already falls back to a
  "Take the quiz" prompt instead of a match score, and stack/favorites default
  to empty arrays rather than throwing. So `ToolDetail` (at minimum — `Compare`
  is a smaller win since a comparison URL is a less likely inbound/shared link)
  could render outside the guard entirely: pull it out of the `AppShell`-nested
  route and give it its own top-level public route (mirroring `SharedStack`'s
  pattern exactly), keeping the nav/nudge chrome only for the fields that
  need it (add-to-stack/favorite buttons already check `session` implicitly
  via their stores, not via a hard redirect, so they'd just no-op to
  localStorage for a guest same as any first-time visitor). **What this would
  NOT include:** no change to `AppShell`'s guard for `Stack`/`Discover`/
  `Learning`/`Community`/`Favorites`/`Settings` — those pages assume an
  active persona/session-scoped state in a way a single tool page does not,
  and reworking the guard wholesale is a much larger, riskier change than
  this file's own S/M sizing bias allows; no removal of the login flow
  itself. **Build size of the follow-up fix:** S/M — move `ToolDetail`'s
  route to top-level (public) in `App.jsx`, decide what nav chrome (if any)
  a guest sees instead of the full `AppShell`, add its route to
  `scripts/smoke.mjs`'s unauthed section. Should ship together with or
  right after the base `usePageMeta` gap, not as a separate backlog line —
  same feature, one more file (`App.jsx`'s route table) than originally
  scoped.
- **Deepened 2026-08-31 00:20 UTC — the hook shipped, and it shipped with a
  bug that undid most of its own point; found and fixed this run.** This gap
  was written before `src/utils/head.js` existed. Re-reading the current
  repo: a `useHead({ title, description, path, jsonLd })` hook (hand-rolled,
  not `react-helmet` — exactly what this gap's own "smallest useful version"
  proposed) is real and already wired into six pages — `CategoryLanding.jsx`,
  `NewTools.jsx`, `Pricing.jsx`, `About.jsx`, `Methodology.jsx`,
  `NotFound.jsx` — none of which are recorded in DEVLOG or this backlog under
  this gap's name, so it shipped as part of some other, unlogged piece of
  work (most likely the prerender effort below, same commit per `git log`).
  Of this gap's original five call sites: `Pricing`/`About` done;
  `ToolDetail`/`Compare` still correctly blocked on the session-gate problem
  the previous deepening above already named; `SharedStack.jsx` — public,
  ungated, no blocker at all — was simply never wired and is the one real
  remaining gap here (see below).
  The bigger finding is a real, shipped bug, not a scoping gap. A second new
  file, `scripts/prerender.mjs` (also unlogged under any gap), runs the
  `vite build` output through a headless browser per public route and writes
  the rendered HTML back into `dist/` so crawlers get real content instead of
  an empty `<div id="root">` — necessary, and it correctly names the exact
  problem this gap's own "why it matters" predicted (a shared canonical
  "asks Google to treat them all as duplicates of the homepage and index
  none of them"). But it deliberately rebuilds every route from the
  **pristine, pre-hydration shell** captured before any route mounts, to keep
  Vite's per-route `<link rel="modulepreload">` tags out of the static
  output (the three.js-preload bug this repo's CLAUDE.md warns about,
  `prerender.mjs`'s own comment names it explicitly). Side effect:
  `useHead()`'s `document.head` writes — title, description, canonical,
  `og:*`/`twitter:*`, the JSON-LD script — all happen inside the exact
  browser session `prerender.mjs` throws away. **Verified by building it**:
  before this run's fix, `dist/tools/design/index.html` shipped the
  homepage's `<title>`, a canonical pointing at `https://toolnaut.xyz/` (not
  `/tools/design`), and zero `application/ld+json` — identical across all 14
  prerendered routes, the exact "every page shares one" failure this gap is
  named for, just moved one layer below where it was originally written
  against. `scripts/verify-prerender.mjs` (a real, purpose-built
  crawler-view checker) never caught it — it only asserts body text length
  and h1 content, no `<title>`/canonical assertion at all — and it isn't
  wired into `npm test` or CI regardless (checked `package.json` and
  `.github/workflows/`).
  **Fixed this run**, in `scripts/prerender.mjs` (already built and
  verified, not a proposal): after rendering each route, `page.evaluate()`
  reads back what `useHead()` just wrote (`document.title`, the live
  description/canonical/og/twitter tag content, `#route-jsonld`'s text), and
  a small `patchHead()` applies those as string substitutions onto the
  pristine shell's already-declared static tags — no live DOM is
  serialised, so the modulepreload bug this design exists to avoid stays
  avoided. Verified by rebuilding and grepping `dist/tools/design/index.html`,
  `dist/new/index.html`, `dist/pricing/index.html`: each now carries its own
  title/description/canonical/`og:*`, `/tools/design` carries a real
  `CollectionPage`/`ItemList` JSON-LD block, and `dist/index.html` (no
  `useHead()` call) is unchanged — confirmed via `npm test` (162/162),
  `npm run build`, and `npm run smoke`, all green.
  **What's still open, now correctly scoped to one item:** wire `useHead()`
  into `SharedStack.jsx` — public, ungated, on the same tier as the pages
  already done, but not in `prerender.mjs`'s `ROUTES` list (correctly —
  `/s/:slugs`' content depends on the URL param, and that file's own comment
  already excludes it for that reason), so this is a client-side-only
  `useHead()` call (e.g. title naming the shared tools: "My AI stack: Notion
  AI, Cursor, Perplexity — Toolnaut"), not a prerender change. One import,
  one hook call, using data the page already has resolved.
- **Deepened 2026-08-31 12:22 UTC — the last call site shipped; closing this
  gap.** `SharedStack.jsx` now calls `useHead()` (title naming up to 5 tools
  by name plus a "+N more" tail, a description listing all of them, `path:
  /s/:slugs`, and an `ItemList` JSON-LD of the shared tools) when the link
  resolves to at least one real tool, and just a bare `path` (site defaults)
  for a stale/unrecognized link — never a fabricated title for zero tools.
  Confirmed via `npm run smoke`: `/s/chatgpt` still renders clean (0 console
  errors); this route is client-only per the design above, so there's no
  `dist/` output to grep the way the prerendered routes were checked. All
  five of this gap's originally-scoped call sites are now done, and the two
  routes this deepening's own earlier note found blocked (`ToolDetail`,
  `Compare`) remain the one open follow-up — still gated behind `AppShell`,
  still a separate, larger routing decision, not part of this gap's scope.

### Pro chat assistant & the entire Team tier are unbacked and unbuildable client-side
- **Status:** OPEN (Gap 1 only) — PARTIALLY REOPENED 2026-09-01 15:20 UTC. Gap
  1's blocking reason ("no `api/` directory, no serverless function, no
  server-held key") is now false — see the deepening below. **Gap 2 (the
  Team tier) is unaffected and stays REJECTED**: re-checked `authStore.js`
  this run, still zero team/org/seat modeling.
- **Original rejection (now stale for Gap 1 only, kept for history):**
  REJECTED — needs a backend/multi-user system; logged so future research
  hours don't re-spend an hour rediscovering this, and so it's visible to a
  human rather than silently sitting on the pricing page.
- **Seen in:** not a competitor pattern — this entry exists because
  re-auditing `planData.js` for other unbacked rows (after the favorites and
  PDF-export gaps, both found the same way) turned up two more categories of
  false claim, one bigger than either of those.
- **Gap 1 — "AI-powered chat assistant (Claude-powered Q&A)" (Pro tier,
  `planData.js:44`, repeated at `planData.js:84`):** `src/components/app/
  ChatPanel.jsx` exists and is wired into the app (persistent panel, opens
  from `AppShell`, context-aware greeting using the user's persona name), but
  it is an explicit, self-labelled stub — its own header renders "Preview —
  replies are canned" (`ChatPanel.jsx:53`) and every reply is the same
  hardcoded string regardless of what's typed (`ChatPanel.jsx:41-45`: "I come
  online with the backend integration..."). The code is honest about this to
  the user in-product; the pricing page is not — `/pricing` sells it as a
  live Claude-powered feature with no such caveat.
- **Gap 2 — the whole Team tier (`planData.js:52-76`, `pandava` plan, $50/mo,
  repeated across 7 rows of the comparison table at `planData.js:88-92`):**
  every one of "Team stack standardization," "Role-based team onboarding,"
  "Team analytics dashboard," "Collaborative tool-evaluation workspace,"
  "Admin controls + member management," "Shared progress + team
  leaderboards," "Quarterly AI stack audit reports," and "API access for
  integrations" requires the thing this codebase fundamentally does not have:
  a multi-user account system. Confirmed by reading `src/state/authStore.js`
  and `src/utils/toolsCatalog.js` — there is no team/org entity, no seats, no
  server-side user record at all; "login" is local-only (grepped
  `team|seat|org|member` across `src/state`, zero hits beyond the `pandava`
  plan copy itself). None of these are gaps a client-side SPA change can
  close — they need real accounts, a database, and a permissions model.
- **Why this is REJECTED rather than logged OPEN like the favorites/PDF
  gaps:** those two were closeable with a `localStorage` store and a
  `window.print()` call — genuinely client-only. This isn't: a real chat
  assistant needs a server-held Anthropic API key (an API key shipped in a
  `VITE_`-prefixed client bundle is a public secret — `radar/.env.example`'s
  own comment on `src/.env.example` warns "these are baked into the client
  bundle... only ever put PUBLIC values here"), which means a Vercel
  serverless function under a new `api/` directory (none exists today —
  `vercel.json` has no `functions` config, confirmed) plus a secret only a
  human with Vercel project access can set. The Team tier needs actual
  backend accounts. Both are exactly the shape this file's own ranking rule
  says to reject: "A gap that needs a backend is usually REJECTED."
- **What would actually be honest to ship, if anyone wants to close this
  later (not proposed as this run's build — flagged for whoever owns pricing
  copy):** the cheapest real fix is a copy correction, not a feature build —
  either soften "Claude-powered Q&A" to something like "AI copilot (preview)"
  until the backend lands, or gate the whole claim behind a "Coming soon"
  qualifier the way `HeroSection.jsx`'s "✦ LAUNCHING SOON ✦" tape-label
  already does elsewhere on this site. Same for the Team tier: either build
  the minimum real slice (which is out of scope for any single feature run
  under this backlog's own S/M sizing) or mark it "Coming soon" until it's
  real. This backlog's job is to find buildable product gaps, not rewrite
  pricing copy unasked, so no edit was made — this is a finding, not a fix.
- **Build size:** L (chat: needs a serverless function + secret Vercel-side
  config outside this repo's reach; Team tier: needs full multi-user
  accounts) — out of scope for this backlog's client-only SPA model.
- **Found:** 2026-08-25 15:35 UTC
- **Deepened 2026-09-01 15:20 UTC — Gap 1's own blocker no longer exists:**
  the payments work that reopened the weekly-alerts gap above (same
  precedent, different feature) also built an `api/` directory — it has 12
  serverless functions now, not zero — and one of them, `api/chat.js`, is a
  live, working Vercel function that calls an LLM server-side with a secret
  key (`FEATHERLESS_API_KEY`) that is already configured in production,
  since the `/goal` onboarding flow depends on it today (`src/utils/
  goalChat.js` calls it to classify free-text quiz replies). Read
  `api/chat.js` in full: it already has everything Gap 1 was rejected for
  lacking — origin allowlisting scoped to this project's own domains
  (`originAllowed()`), a per-IP sliding-window rate limit, strict payload-size
  and field-length caps, a hard timeout with a graceful `source: 'unconfigured'
  | 'upstream_error' | 'timeout'` fallback so a slow/broken model never
  strands the caller, and a JSON-only prompt contract. That is a proven,
  production-hardened template for "expose an LLM call to the browser
  safely" — reusing it is materially smaller than building the same safety
  scaffolding from zero, which is what made this an "L" in the original
  entry.
  **What `api/chat.js` is NOT, so this isn't already done:** it's scoped
  narrowly to one job — classify a free-text quiz reply into one of that
  question's option keys ("you are not choosing tools, only understanding
  the person," per its own system prompt) — and is called from nowhere but
  `GoalChat.jsx`. `ChatPanel.jsx` (the Pro-tier "AI Copilot," confirmed still
  self-labelled "Preview — replies are canned" at `ChatPanel.jsx:53`, its
  `send()` still a hardcoded string with zero `fetch` calls) is a completely
  separate, unwired component. Building Gap 1 means a **second**, differently
  -prompted endpoint, not flipping a switch on the first one.
  **Smallest useful version:** new `api/copilot.js`, copying `api/chat.js`'s
  security scaffolding verbatim (origin allowlist, rate limiter, size caps,
  timeout+fallback) but with its own prompt: given the caller's resolved
  stack (tool names + categories, sourced the same way `Stack.jsx` already
  builds that list at `Stack.jsx:116-119` — slugs only, resolved server-side
  or client-side via `getTool()`, never trust free-text tool names from the
  client) plus a short message history, answer a freeform question in 1-3
  sentences; return `{ reply, source }` (`source` mirrors `api/chat.js`'s
  vocabulary) instead of a classification key. New `src/utils/copilotChat.js`
  mirroring `goalChat.js`'s `askServer` shape (POST, catch network errors,
  return a typed result). Wire `ChatPanel.jsx`'s `send()` to call it,
  appending the real reply on `source: 'llm'` and falling back to a plain
  "I'm not able to answer that right now" message on anything else — same
  never-strand-the-user contract `api/chat.js` already guarantees for the
  quiz flow. Drop the "Preview — replies are canned" header once wired.
  **One thing this does NOT fix, flagged so nobody assumes it does:** the
  pricing copy specifically says "Claude-powered Q&A" (`planData.js:44`), but
  the only LLM path proven to exist and work in this codebase — `api/chat.js`
  — calls Featherless-hosted open models (Qwen2.5-7B-Instruct), the same
  choice `radar/`'s own enrichment made for cost/latency reasons documented
  in that file. Building this gap with the same provider makes the feature
  real but leaves "Claude-powered" still false; that's a one-line copy fix
  for whoever ships this, not a reason to hold the build, and not something
  this research pass is doing unasked (same stance this file already took on
  the Team-tier copy below).
  **Build size, corrected:** M — one new serverless function (largely copied
  scaffolding, new prompt + response shape), one new client util, wiring
  `ChatPanel.jsx`'s existing `send()` to it. Down from the original "L": the
  hard parts (secret management, abuse limits, origin checks, a Vercel
  function that actually works in production) are now a proven pattern in
  this exact repo, not new infrastructure.

### Recently viewed tools
- **Status:** OPEN
- **Seen in:** Amazon's "Recently viewed items" rail is the canonical version
  of this pattern; G2 and Capterra both surface a "recently viewed" strip on
  category pages so a buyer comparing several product pages in one session can
  jump back without re-searching; Product Hunt's own profile keeps a viewed-
  launches history for the same reason. It's a standard directory/e-commerce
  pattern precisely because evaluating options means opening several detail
  pages in sequence, then wanting to return to one without redoing the search.
- **Gap:** confirmed absent — grepped `recently.viewed|recent.{0,10}history|
  view.{0,10}history` across `src/`, zero hits, and read `ToolDetail.jsx` in
  full: it reads `slug` via `useParams()` and computes `related` (same-category
  neighbours, `ToolDetail.jsx:29-34`) but writes nothing anywhere recording
  that the tool was opened. `favoritesStore.js` and `stackStore.js` are both
  deliberate, explicit user actions (heart-click, add-to-stack); neither
  captures the passive "I looked at this" signal a detail-page visit already
  is. A Toolnaut user comparing four ChatGPT-alternative pages in one session
  today has no way back to the first one except the browser's own back button
  or re-running the same Discover search.
- **Why it matters:** it's the cheapest kind of personalization — the signal
  (a `ToolDetail` mount) already exists on every single page view, it just
  isn't captured. It also pairs naturally with two already-shipped features
  without duplicating either: unlike Favorites (an explicit "save this") or
  Stack (an explicit "I'm using/learning this"), Recently Viewed needs no
  click at all, so it fills the gap for a visitor who is still just browsing
  and hasn't decided to save anything yet — the exact moment before a
  favorite/stack action happens, not a replacement for either.
- **Smallest useful version (what to actually build):**
  - New `src/state/recentlyViewedStore.js`, same shape as `favoritesStore.js`
    (`localStorage` key `exus_recently_viewed_v1`, try/catch on every read and
    write per this repo's own `src/state/*` rule): `loadRecentlyViewed()`
    returns the array of slugs, most-recent-first; `recordView(slug)` moves
    `slug` to the front if already present (no duplicate entries, "seen again"
    just re-surfaces it) or unshifts it if new, then truncates to a fixed cap
    (12 — enough for a short strip, small enough the localStorage value never
    grows unbounded).
  - `ToolDetail.jsx`: one `useEffect(() => { if (tool) recordView(tool.slug)
    }, [tool?.slug])` — records on mount and whenever the slug changes (e.g.
    clicking a related-tool link keeps the component mounted per the existing
    comment at `ToolDetail.jsx:26-28`), never on the "tool not found" branch.
  - Render strip: **not** on `Stack.jsx` — the skills-graph and onboarding-
    checklist gaps above are both already targeting space directly under the
    streak card there, and a third card competing for that slot is worse UX
    than picking a different, equally natural home. `Discover.jsx` already has
    exactly this shape of strip for the shipped "New this week" feature
    (`freshTools`/`getNewTools(7)`, rendered above the filter bar) — add a
    second, similarly-collapsed strip "👀 Continue browsing" using
    `loadRecentlyViewed()` resolved through `getTool()`, capped at ~6 cards,
    rendered only when non-empty, placed below the "New this week" strip so
    the personalised-to-you row reads after the catalog-wide freshness row.
    Reuses the same small-card visual language already established for that
    strip — no new component needed beyond a `.map()` over resolved tools.
  - **What this would NOT include** (kept out to bound the diff): no
    cross-device sync (stays local to the browser, same as every other
    `src/state/*` store); no "clear history" control in v1 (Settings.jsx is
    the natural home for that later, not required to ship the core feature);
    no time-decay/expiry on entries beyond the 12-item cap; no view-count or
    "viewed 3 times" annotation, just presence and recency; no surfacing on
    `Compare.jsx` or `SharedStack.jsx` — this is a Discover-only convenience
    rail, not a data feed other features need to read.
- **Build size:** S — one new store (`recentlyViewedStore.js`, closely mirrors
  `favoritesStore.js`), a four-line `useEffect` in `ToolDetail.jsx`, one new
  strip added to `Discover.jsx` reusing the "New this week" strip's existing
  markup pattern. No backend, no new dependency, no new route.
- **Found:** 2026-08-26 00:35 UTC

### Tool status warning has no reason attached ("note" field collected, never shown)
- **Status:** OPEN
- **Seen in:** ToolDirectory.AI (a 2026 AI-tool directory competitor, studied
  fresh this run) markets "every entry reviewed, dated, and re-tested" and
  moves dead/rebranded tools to an explicit "graveyard" rather than letting
  stale listings rot silently — the point being a directory's credibility
  rests on telling a visitor *when and why* a listing stopped being current,
  not just quietly delisting or vaguely flagging it. Toolnaut already collects
  exactly this signal per-tool but throws away the "why" half of it before it
  ever reaches a user.
- **Gap:** `toolsCatalog.js` already carries a `status` field (`"Active"` on
  652 of 704 tools, `"Uncertain"` on the other 52) *and* a `note` field giving
  the specific reason for 47 of those 52 — e.g. Pi: `"Core team moved to
  Microsoft (2024); app in maintenance"`, Baichuan: `"Pivoted toward medical
  AI"`, Krutrim: `"Reports of restructuring (2025)"`. This is real, already-
  written editorial content, not something that needs research to produce.
  But grepping `note\b` across every page in `src/pages/app/` — `ToolDetail.jsx`,
  `Compare.jsx`, `Discover.jsx` — turns up zero renders of `tool.note` anywhere.
  `ToolDetail.jsx:108-115` renders a hot-pink "UNCERTAIN" pill when
  `status !== 'Active'`, but nothing below it explains why; `Compare.jsx:47`
  puts `"Status"` in the comparison table as a bare word (`t.status || '—'`)
  with no second row for the reason; `Discover.jsx` never surfaces `status` at
  all, so a card grid can carry an "Uncertain" tool with literally no visual
  distinction from an actively-maintained one until a user clicks all the way
  into its detail page. `personaGenerator.js:99` already *uses* `status` to
  quietly deprioritize non-Active tools in scoring, so the signal is trusted
  enough to affect ranking — it just isn't trusted enough to show its work.
- **Why it matters:** a "why" turns a vague warning into something a user can
  actually act on. "UNCERTAIN" alone reads as Toolnaut being unsure of its own
  data (a trust cost); "UNCERTAIN — core team moved to Microsoft, app in
  maintenance" reads as Toolnaut having done real diligence (a trust gain) —
  same badge, opposite effect on credibility, and the only difference is
  whether the one sentence Toolnaut already wrote gets rendered. It's also a
  discovery-time problem, not just a detail-page one: today a user could
  filter Discover, land on a card for one of the 52 non-Active tools, and add
  it to their stack with zero signal anything is off, since the warning only
  exists on a page they haven't navigated to yet.
- **Smallest useful version (what to actually build):**
  - `ToolDetail.jsx:108-115` — when `tool.status !== 'Active'` and `tool.note`
    is non-empty, render the note as a small line directly under the existing
    pill (e.g. `<p className="mt-2 text-xs text-slate-400">{tool.note}</p>`),
    matching the muted-caption style already used elsewhere on this page for
    secondary text. When `note` is empty (5 of the 52), the pill alone is
    still honest — don't fabricate a reason.
  - `Compare.jsx`: extend the existing `Status` row's `get()` to append the
    note in parentheses when present — `t.status === 'Active' ? 'Active' :
    \`${t.status}${t.note ? \` (${t.note})\` : ''}\`` — one row, no new row
    added to the table, so the grid layout is untouched.
  - `Discover.jsx`: add the same hot-pink "UNCERTAIN"-style badge
    `ToolDetail.jsx` already has (reuse its exact style object, don't invent a
    second one) next to the existing NEW/score badges on any card whose
    `tool.status !== 'Active'`, so the signal exists at the point a user is
    deciding whether to open or add a tool, not only after. Full note text
    stays detail-page-only (card space is tight); the card badge's job is just
    "look closer before you commit to this one."
  - **What this would NOT include** (kept out to bound the diff): no new
    catalog data or backfilled notes for the 5 `Uncertain` tools missing one —
    render what exists, don't invent editorial content; no filter/exclude-
    Uncertain-tools toggle on Discover (a separate, larger UX decision about
    whether to hide rather than flag); no change to `personaGenerator.js`'s
    existing scoring penalty; no retroactive "graveyard" page listing all
    non-Active tools — that's a bigger, distinct feature this gap doesn't
    require to be useful.
- **Build size:** S — a few lines added to two existing conditionals
  (`ToolDetail.jsx`, `Compare.jsx`) plus one reused badge on `Discover.jsx`'s
  card grid. No new store, no new util, no new route, no backend, no new
  dependency.
- **Found:** 2026-08-26 06:20 UTC
- **Deepened 2026-09-01 21:20 UTC:** the `ToolDetail.jsx`/`Compare.jsx` half of
  this plan is intact but its line numbers have drifted — re-read both files
  in full rather than trusting the numbers below blindly. The status pill this
  plan targets is now `ToolDetail.jsx:112-119` (was `108-115`; a `score != null`
  MATCH badge was added above it since this entry was written), and the
  `Compare.jsx` Status row is now at `Compare.jsx:52` (was `47`) — same
  `{ label: 'Status', get: (t) => t.status || '—' }` shape, just shifted.
  Neither file's actual change needed is any different, only the anchor lines.
  The "reused badge on `Discover.jsx`'s card grid" half is flatly wrong now,
  not just stale, for the same reason the tags-clickable gap's 2026-08-30
  deepening already caught for two *other* entries in this file (facet counts,
  suggest-a-tool) but never checked whether it also applied here — it does.
  `Discover.jsx` was refactored to extract a shared `<ToolCard>` component
  (`src/components/app/ToolCard.jsx`, its own header comment: "The one tool
  card, shared by Discover and Favorites") — `Discover.jsx` no longer contains
  any inline card markup at all, so there is nothing at a "card grid" location
  in that file to add a badge to. Confirmed by reading `ToolCard.jsx` in full:
  its existing badge row already lives at `ToolCard.jsx:45-67` (a `NEW` pill
  at `:46-53` when `isNewTool(tool)`, a fit-band pill at `:58-66` when
  `showFit` and a score exists) — neither is `status`-aware today. **Corrected
  target:** add the `UNCERTAIN` badge as a third sibling inside that same
  `<span className="flex shrink-0 items-center gap-1.5">` wrapper
  (`ToolCard.jsx:45-67`), gated on `tool.status && tool.status !== 'Active'`,
  reusing `ToolDetail.jsx`'s exact style object as originally planned. Unlike
  the interactive controls lower in the card (`ToolCard.jsx:95-128`, wrapped in
  `relative z-10` to clear the whole-card stretched-link overlay per that
  file's own comment at `:9-19`), this badge is non-interactive and sits above
  the overlay in DOM order already, so it needs no `z-10` treatment — plain
  insertion into the existing badge row is enough. Fixing it here also closes
  the gap on `Favorites.jsx` for free (it renders the same `ToolCard`, three
  call sites per the tags-clickable deepening's own count), which the original
  "Discover.jsx card grid" plan never covered since `Favorites.jsx` didn't
  exist when this entry was written.

### Command palette / ⌘K quick jump
- **Status:** OPEN
- **Seen in:** Linear, Notion, Vercel, GitHub and Raycast all ship a ⌘K/Ctrl+K
  overlay as a first-class navigation surface — type a few letters from
  anywhere in the app, land on the exact page or record instantly, no menu
  hunting. It's specifically called out as "a standard UX convention across
  modern SaaS applications" (see sources) precisely because it collapses
  navigation-by-clicking into navigation-by-typing the moment an app has more
  than a handful of destinations — which Toolnaut already does, at 700+ tools
  deep.
- **Gap:** confirmed absent by reading `src/shells/AppShell.jsx` in full and
  grepping `keydown|Cmd\+K|command.palette|cmdk` across `src/` (case-
  insensitive): three files already hand-roll their own single-purpose
  `keydown` listener — `ChatPanel.jsx`, `InstallPrompt.jsx`,
  `GalaxyExplorer.jsx` — but none is a global quick-jump; each only handles
  its own local widget (closing on Escape, etc). `Discover.jsx:42-101` already
  has real search-and-filter logic keyed off `?q=`, but it only works once a
  user has already navigated to `/app/discover` — there's no way to jump
  straight to a specific tool or page from `Stack.jsx`, `Learning.jsx`, or
  anywhere else without first clicking FIND in the nav, then typing. No shared
  `Modal`/`Dialog` component exists either (glob for `Modal*` under
  `src/components/ui/` — zero hits), so every overlay in this codebase,
  `ChatPanel`'s mobile bottom sheet included, is hand-rolled per-component,
  which is the existing precedent this gap's own overlay should match rather
  than introduce a new abstraction for.
- **Why it matters:** the catalog is Toolnaut's actual asset (700+ tools, a
  number every competitor in this file is smaller than on a per-directory
  basis), but today the only path to any specific tool is
  nav-to-Discover-then-filter or already knowing its `/app/tools/:slug` URL.
  A returning user who knows they want "Cursor" or "Perplexity" pays a
  multi-click tax every time. This is pure power-user retention UX — the
  exact users who come back daily (the ones the streak/skills-graph gaps
  above are already trying to reward) are the ones who'd use this most.
- **Smallest useful version (what to actually build):**
  - New `src/components/app/CommandPalette.jsx`: a controlled overlay
    (`open`/`onClose` props, same shape as `ChatPanel`'s `onClose` prop) —
    fixed inset-0 backdrop + centered panel, autofocused text input, and a
    result list built from two sources filtered by the same lowercase
    substring match `Discover.jsx:86-97` already uses: (1) the 6 `NAV` entries
    already defined in `AppShell.jsx:14-21` (label + route, shown first,
    labelled "GO TO"), and (2) `TOOLS` imported directly from
    `toolsCatalog.js` (same import `Discover.jsx:3` already does — since
    `hydrateCatalog()` mutates `TOOLS` in place, `toolsCatalog.js:760-762`,
    radar-published tools are searchable with zero extra wiring), capped at
    ~8 matches. Arrow-key up/down moves a local `selected` index, Enter
    navigates via `useNavigate()` to the nav route or `/app/tools/:slug` and
    closes, Escape closes — same keyboard contract `ChatPanel`'s bottom sheet
    already implies via its `role="dialog"` pattern.
  - Wire into `AppShell.jsx`: one `const [paletteOpen, setPaletteOpen] =
    useState(false)`, one `useEffect` global `keydown` listener for
    `(e.metaKey || e.ctrlKey) && e.key === 'k'` → `e.preventDefault()` +
    open — the same per-component-listener pattern `ChatPanel.jsx`/
    `InstallPrompt.jsx`/`GalaxyExplorer.jsx` each already establish, just at
    the shell level instead of a leaf component. Add one small trigger
    button under the persona sticker in the desktop sidebar
    (`AppShell.jsx:86-100`, "🔎 Quick jump ⌘K") and one in the mobile top bar
    (`AppShell.jsx:118-128`, icon-only, since Cmd/Ctrl+K isn't reachable on a
    touch keyboard) — mobile users need a visible tap target, not just a
    hidden shortcut.
  - No new dependency — a hand-rolled input+filter+list matches every other
    gap in this file's dependency-free bias (`cmdk` would be the "correct"
    long-term library but isn't needed for a first cut this small).
  - **What this would NOT include** (kept out to bound the diff): no fuzzy/
    subsequence matching (Raycast-grade) — plain substring match, same
    algorithm `Discover.jsx` already uses, good enough at this catalog size;
    no in-palette actions beyond navigation (no add-to-stack/favorite-toggle
    from inside the palette — pure quick-jump in v1); no recent/frequency
    ranking of results (would pair naturally with the still-open "Recently
    viewed tools" gap above once shipped, but doesn't depend on it and isn't
    required to be useful on its own); no availability outside `/app/*` — the
    public marketing pages don't have enough navigable depth to need this;
    no shared `Modal` abstraction extracted from this or `ChatPanel` — matches
    existing per-component precedent, a real dedup pass is a separate
    refactor this backlog's own "no drive-by refactors" rule would reject
    bundling in here.
- **Build size:** S — one new component (`CommandPalette.jsx`), ~20 lines
  wiring state + a global keydown listener + two trigger buttons into
  `AppShell.jsx`. No backend, no new dependency, no new route.
- **Found:** 2026-08-26 09:06 UTC

### Category/role landing pages ("Best AI tools for X") — zero crawlable listing pages exist
- **Status:** SHIPPED 927ee5b
- **Seen in:** every AI-tool directory in this file's comparison set runs its
  organic-acquisition funnel through category/use-case listing pages, not the
  homepage: Futurepedia and There's An AI For That both structure their whole
  site around per-category pages ("AI Writing Tools," "AI Video Tools," etc.)
  that rank independently in search; G2/Capterra's category pages are the
  single biggest inbound-traffic surface either site has, well ahead of any
  individual product page. The pattern works because a long-tail search like
  "best AI tools for marketing" or "AI coding tools" has real, high-intent
  search volume that a generic homepage can never rank for — you need one URL
  per category, each with real content and real links.
- **Gap:** Toolnaut has no page like this at all — not gated, not public, not
  in any form. Confirmed three ways: (1) every tool-bearing route
  (`discover`, `compare`, `tools/:slug`, `favorites`) is nested under
  `<Route path="/app">` in `src/App.jsx:90-100`, which `AppShell.jsx:57-58`
  hard-redirects to `/auth/login` for anyone without a (fake, local-only)
  session — so even a gated version of a category page doesn't exist, only
  the single-tool-and-search machinery behind the login wall. (2) The one
  page that visually gestures at "roles" is purely decorative:
  `RolesSection.jsx` on the homepage renders six sticker cards (Student, PM,
  Designer, Marketer, Engineer, Founder — `starchartData.js:38-45`) as an SVG
  constellation graphic with **zero links or tool content** — no `<a>`,
  no `Link`, nothing clickable, confirmed reading the full 60-line file. It
  exists purely as landing-page decoration, not a navigation surface. (3) the
  hand-maintained `public/sitemap.xml` lists exactly 5 URLs — `/`, `/quiz`
  (itself stale; the real route is `/goal` per the redirect at
  `App.jsx:85` and the just-shipped entry-point fix), `/pricing`, `/about`,
  `/starchart` — confirming there is no category/tool-listing content for a
  crawler to discover even if it existed. A 700+-tool catalog with 26 real
  source categories (`toolsCatalog.js:19-45`, each already carrying a
  `domain` and a `count` — e.g. `"Marketing, SEO & Sales"`, 41 tools,
  `"AI Coding & Development"`, 62 tools) currently has exactly one indexable
  page total.
- **Why it matters:** this is Toolnaut's single biggest unclaimed SEO/
  acquisition surface, larger than the already-open per-route-meta gap
  (which only fixes `<title>`/description on pages that already exist).
  Every one of the 26 source categories is a plausible long-tail search
  query with a real, differentiated tool list behind it today — the content
  to answer "best AI tools for HR and recruiting" or "AI video generation
  tools" already sits in the bundled catalog, unreachable by anyone who
  isn't already a signed-in Toolnaut user. Right now the *only* way to see
  Toolnaut's tools filtered by anything is to sit through the quiz/chat or
  fake-sign-in first — there is no top-of-funnel page a search engine, a
  shared link, or a curious first-time visitor can land on and immediately
  see real, useful, filtered content.
- **Smallest useful version (what to actually build):**
  - New public route `/tools/:domain` in `src/App.jsx`, alongside `/s/:slugs`
    (`App.jsx:79`) — outside `AppShell`, no session needed, same tier as the
    share-stack page. Scope `:domain` to the 6 `CATEGORY_META` keys
    (`code`/`design`/`writing`/`data`/`automation`/`learning`,
    `toolsCatalog.js:9-16`) rather than all 26 `SOURCE_CATEGORIES` for v1 —
    6 clean, pre-existing, human-readable slugs versus 26 that would need new
    URL-safe slugging and copy for names like `"Presentations, Design &
    Websites"`. The 26-category version is a natural, larger follow-up once
    this pattern proves out, not required for a first cut.
  - New `src/pages/CategoryLanding.jsx`: reads `:domain` via `useParams()`,
    validates against `CATEGORY_META`, redirects unknown domains to `/`
    (same silent-degrade spirit as `SharedStack.jsx`'s unknown-slug
    handling). Filters `TOOLS` (imported directly from `toolsCatalog.js`,
    same import `Discover.jsx:3` already does) by `.category === domain`,
    renders a heading ("Best AI tools for {CATEGORY_META[domain].name}"), a
    one-line description, and a read-only card grid reusing
    `SharedStack.jsx`'s existing public card markup (glass card, blurb,
    category chip — already the one precedent in this codebase for
    "show tool cards to a visitor with no session"). No add-to-stack/
    favorite actions (those need a session) — just a "Take the 60-second
    quiz for your personal stack →" CTA to `/goal` at the top and bottom,
    matching the already-shipped entry-point-consistency fix's own reasoning
    for why every CTA should point at `/goal` directly.
  - Wire `RolesSection.jsx`'s six cards to link somewhere real: since the
    marketing `ROLES` array (Student/PM/Designer/.../Founder) doesn't map
    1:1 onto the 6 data `CATEGORY_META` domains, the smallest honest fix is
    giving each `Tilt` card a `Link` to the domain it's closest to in spirit
    (e.g. Engineer → `/tools/code`, Designer → `/tools/design`, Marketer →
    `/tools/writing`) rather than inventing a second role taxonomy — a
    judgment call for whoever builds this to confirm against
    `personaGenerator.js`'s own role→domain weighting before wiring, so the
    mapping is consistent with what the quiz itself already believes.
  - Add all 6 new URLs to `public/sitemap.xml` (which also needs its stale
    `/quiz` entry corrected to `/goal` while touching this file, and the
    already-shipped `/s/:slugs`... though a share link is per-user and
    shouldn't be in a static sitemap — just the 6 new category URLs plus the
    `/quiz`→`/goal` fix).
  - `scripts/smoke.mjs`'s hardcoded route array needs one example URL added
    (e.g. `/tools/code`), same footgun flagged on every gap in this file that
    adds a route.
  - **What this would NOT include** (kept out to bound the diff): no all-26-
    source-category expansion in v1 (noted above as the natural follow-up);
    no per-category unique long-form copy beyond a one-line description (a
    real content/SEO pass with 6 hand-written paragraphs is a copywriting
    task, not an engineering one, and shouldn't block shipping the page
    structure); no pagination/sorting/filtering controls on these pages (that
    is what the existing gated `Discover.jsx` is for — these are top-of-
    funnel landing pages, not a second search UI); no per-route meta tags
    beyond what this gap's own heading provides unless the separately-open
    `usePageMeta` hook gap ships first, in which case these 6 pages are
    natural additional call sites for it, not a reason to block on it now.
- **Build size:** S/M — one new page (`CategoryLanding.jsx`), one new public
  route in `App.jsx`, a `Link` wiring change in `RolesSection.jsx`, 6 new
  lines + 1 fix in `sitemap.xml`, one line in `scripts/smoke.mjs`. No
  backend, no new dependency.
- **Found:** 2026-08-26 12:15 UTC

### Weekly discovery digest email & personalized alerts (Student/Pro tiers, unbuildable client-side)
- **Status:** OPEN (copy-accuracy only) — MOSTLY SHIPPED, discovered this run
  (2026-09-02 21:09 UTC). The subscribe UI and delivery pipeline this entry's
  2026-09-01 deepening spec'd as "smallest useful version" already exist,
  built directly on `master` between this routine's runs (not by this
  routine) — see the second deepening below for the full trace. What's left
  is not a build, it's three stale `planned(...)` copy lines that now
  undersell a real feature, plus a literal-accuracy mismatch ("weekly" /
  "trending") between the promised copy and what actually ships. Do not
  mark this fully SHIPPED or re-reject it without reading the second
  deepening below.
- **Original rejection (now stale, kept for history):** REJECTED — needs a
  backend/email-delivery system; logged so future research hours don't
  re-spend an hour rediscovering this, same reason the Pro chat assistant /
  Team tier finding above was logged rather than left silently on the
  pricing page.
- **Seen in:** not a competitor pattern — found while auditing `planData.js`
  for other unbacked rows (the same file that already produced the
  now-shipped Favorites gap, the still-open PDF-export gap, and the
  REJECTED chat/Team-tier gap above). This is the same audit, later pass,
  same file.
- **Gap:** `planData.js:21` promises "Weekly discovery digest **email**" on
  the Student tier, and `planData.js:45` promises "Weekly trending tools +
  personalized **alerts**" on the Pro tier — both are live on `/pricing`
  today via `Pricing.jsx` → `PLANS`. Neither is delivered anywhere. This is
  distinct from the (shipped) "Weekly Fresh Finds" gap above: that gap built
  an in-app strip on `Discover.jsx` that a user only sees if they open the
  app that week — it is not an email and not a push alert, so it does not
  close either pricing-page promise. Confirmed no delivery mechanism exists:
  no `api/` directory, no `functions` block in `vercel.json` (checked in
  full — it only has `rewrites` and cache-control `headers`, nothing
  serverless), and grepping `notification|web.?push` across all of `src/`
  returns zero hits. There is no email-sending capability anywhere in this
  repo (`radar/` sends nothing either — it only writes `public/tools.json`)
  and no push-subscription/service-worker-push code (`public/sw.js` handles
  only cache install/activate/fetch, confirmed against this file's own
  CLAUDE.md note on what the fetch handler is allowed to touch).
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

### "Community access (Discord & forum)" — half the claim doesn't exist
- **Status:** REJECTED — the real half (forum) already ships; the missing half
  (a Discord server) is not a code gap, it's a standing external community a
  human has to create and commit to moderating. Logged as a finding, not an
  OPEN build, following the same shape as the Pro-chat-assistant/Team-tier and
  digest-email entries above — this backlog's own precedent for "false claim,
  no code fix closes it."
- **Seen in:** not a competitor pattern — found continuing this backlog's own
  running audit of `planData.js` (the file that already produced the shipped
  Favorites gap and the still-open PDF-export/chat/Team-tier/digest-email
  findings). `LeaderboardSection.jsx` and `StatsSection.jsx` were also checked
  this run against the same "promise vs. product" test and are both clean —
  the leaderboard explicitly self-labels its sample data ("Sample — not real
  users yet," `LeaderboardSection.jsx:9-15`) and the stats section computes
  every number live off real data (`TOOLS.length`, `SOURCE_CATEGORIES.length`,
  `QUESTIONS.length`, `StatsSection.jsx:6-18`) rather than hardcoding a claim.
  That leaves `planData.js` as the one remaining source of unaudited copy, and
  it had one more row nobody had checked yet.
- **Gap:** `planData.js:20` lists "Community access (Discord & forum)" as the
  Student tier's very first feature bullet (inherited by Pro/Team via "plus:
  Everything in Student"). Grepped `[Dd]iscord` across the entire repo
  (source, docs, `package.json`, `index.html`) — the only hit anywhere is this
  backlog's own unrelated sentence about pasting a share link into Slack/
  Discord (line 768). No invite link, no `VITE_DISCORD_URL` config value, no
  Discord icon in `Settings.jsx`/footer/`About.jsx` — nothing. The "forum"
  half of the claim is real: `src/pages/app/Community.jsx` + `communityStore.js`
  is a genuine, working in-app forum (seeded threads, real user posts,
  upvoting, categories). But it's also completely ungated — since this
  codebase has no billing/plan enforcement at all (confirmed by the
  REJECTED Team-tier entry above), every visitor with a fake local session
  already gets full Community access regardless of which tier's copy claims
  to sell it, so the bullet is doubly inaccurate: half invents a channel that
  doesn't exist, half sells as a paid differentiator something already free
  to anyone.
- **Why this is REJECTED rather than logged OPEN like the favorites/PDF gaps:**
  those two were closeable with a `localStorage` store and a `window.print()`
  call — genuinely client-only code. A real Discord community needs a human to
  create the server, set up channels/roles, and then actually show up to
  moderate and answer people in it indefinitely — that's an ongoing ops/product
  commitment no code change can substitute for or fake, the same reason the
  digest-email finding above rejected "someone has to author the newsletter
  every week" as unbuildable-by-a-coding-run.
- **What would actually be honest to ship, if anyone wants to close this
  later (a finding, not a proposed build):** two independent, cheap options,
  neither requires touching app code: (1) stand up a real Discord server and
  drop its invite link into `planData.js`/`Settings.jsx`/footer — a few
  minutes of manual setup, zero engineering, but a real standing commitment;
  or (2) the copy-only fix matching this backlog's own precedent for every
  other unbacked claim — drop "Discord" from the bullet, keep "forum" (e.g.
  "Community access (in-app forum)"), which is instantly true with a one-line
  content edit and needs no infrastructure decision. No edit made this run —
  flagged for whoever owns pricing copy, same as the chat-assistant/Team-tier/
  digest-email findings above.
- **Build size:** N/A (external community setup) or trivial (one-line copy
  edit) — neither is a client-side feature build, so out of scope for this
  backlog's build-and-ship model.
- **Found:** 2026-08-27 09:35 UTC

### Discover's filter chips carry no facet counts
- **Status:** OPEN
- **Seen in:** faceted-search result counts next to every filter value are
  standard across directory/e-commerce UX — Amazon's left-rail filters show
  `(1,204)` next to each brand/category, G2 and Capterra's filter sidebars do
  the same for category/pricing-model/deployment facets, and Algolia's own
  faceting docs (algolia.com/doc/guides/managing-results/refine-results/
  faceting) describe result counts as the baseline expectation for any
  faceted-filter UI, not an advanced option — the point being a filter chip
  that doesn't tell you how many results it leads to forces a click-and-see
  loop instead of letting a user route straight to a non-empty result set.
  This is also a named pattern in this backlog's own remit ("general SaaS
  patterns Toolnaut lacks... search, filtering, personalisation") that hasn't
  been covered by any shipped or OPEN entry yet — Compare and per-tool
  Discover badges (Fresh Finds, popularity, status) all touch result *cards*,
  none touch the filter controls themselves.
- **Gap:** `Discover.jsx`'s three filter rows — category (`CATEGORY_META`
  entries, `Discover.jsx:161-165`), price (`PRICES`, `:170-174`), and level
  (`LEVELS`, `:176-180`) — render each `Pill` with a bare label and nothing
  else (confirmed reading `Pill` at `Discover.jsx:18-28`: two props, `active`
  and `children`, no count slot). A user has no way to tell, before clicking,
  whether "Advanced" or "Paid" narrows the current search to 80 tools or to
  zero — they have to click, look at the grid, and click back out if it's not
  useful. This gets worse compounded with search: typing a narrow query like
  "healthcare" and then trying category/price/level chips means blindly
  guessing which combination isn't a dead end, since `results.length === 0`
  only shows *after* a filter is already applied (`Discover.jsx:183-193`).
  Grepped `count|facet` across `src/pages/app/Discover.jsx` and
  `src/utils/toolsCatalog.js` — zero hits related to this; the only counts
  anywhere in the app are `TOOLS.length` in the page heading (`:112`, a fixed
  total, not per-filter) and `SOURCE_CATEGORIES`' own static `count` field
  (`toolsCatalog.js:19+`, a hand-authored catalog-wide tally unrelated to the
  live-filtered result set).
- **Why it matters:** this is friction on the single highest-traffic page in
  the app — `Discover.jsx` is where every quiz-completer and every
  Compare-curious visitor ends up — and it's friction with no user-facing
  payoff, since Toolnaut already computes the exact number needed
  (`results.length`) for the *currently selected* combination every render;
  it just never breaks that number down per candidate filter value before the
  user commits to clicking one. Cheap to close because no new data exists to
  wire in — this is a pure client-side count over the same `TOOLS` array
  `results` already filters, not a new signal like the popularity or
  status-note gaps above.
- **Smallest useful version (what to actually build):**
  - New pure util `src/utils/facetCounts.js`: `getFacetCounts(tools, { q, cat,
    price, level })` → `{ categories: { [id]: count }, prices: { [id]: count
    }, levels: { [id]: count } }`. Standard faceted-search semantics: each
    group's count is computed with the *other* active filters (plus the text
    search) applied but that group's own filter cleared — e.g. the price
    facet's counts answer "how many results if I picked this price, given my
    current category/level/search," not "how many results total across the
    whole catalog." Pure function, no DOM/React import, unit-testable with
    `node --test` the same way `shareStack.js`/`newTools.js` already are.
    Reuses the exact same predicate logic `Discover.jsx`'s `results` `useMemo`
    already has (`Discover.jsx:85-101`) rather than inventing a second
    filtering algorithm — factor that predicate out of `Discover.jsx` into the
    new util and have both `results` and `getFacetCounts` call it, instead of
    keeping two copies of the same four-condition filter in sync by hand.
  - `Discover.jsx`: one more `useMemo(() => getFacetCounts(TOOLS, { q, cat,
    price, level }), [q, cat, price, level])`, same dependency array shape
    already used for `results`.
  - `Pill`: add an optional `count` prop, rendered as a small trailing number
    in a muted tone (e.g. `<span className="ml-1 opacity-60">{count}</span>`)
    — no new visual primitive, just one more span inside the existing button
    markup. The "All" pill shows the query-only count (facets ignored, mirrors
    how "All" already behaves as a filter-clearing action); every other pill
    shows its computed facet count.
  - Zero-count pills: keep them clickable (a user might still want to clear
    down to that combination and adjust the search) but visually deprioritize
    with reduced opacity — same non-destructive "still usable, just
    deprioritized" pattern the Uncertain-tool status-badge gap above already
    commits to, never a disabled/unclickable control.
  - **What this would NOT include** (kept out to bound the diff): no
    multi-select per facet group (category/price/level all stay
    single-select, exactly today's interaction model — this gap only changes
    what's rendered next to each option, not how many can be active at once);
    no faceting on fields with no filter UI today (`tags`, `audience`, `dev`)
    — only the three groups that already have chips; no server-side
    computation (700-900 tools times 3 small filter passes is trivial
    in-memory work, no perf concern, no new dependency); no persisting facet
    preferences or remembering which combinations a user tried.
- **Build size:** S — one new pure util (`facetCounts.js`, plus factoring the
  existing filter predicate out of `Discover.jsx` so both call sites share it),
  a `count` prop added to `Pill`, ~15 lines wiring the new `useMemo` and count
  props into the three existing filter rows. No backend, no new dependency, no
  new route, no new store.
- **Found:** 2026-08-27 15:07 UTC
- **Deepened 2026-08-31 03:20 UTC:** every line reference in this entry is now
  stale — flagged as likely by the tags-clickable gap's own 2026-08-30
  deepening above, confirmed here by reading the current 333-line
  `Discover.jsx` in full. The page picked up pagination and a `ToolCard`
  extraction since this entry was written (both visible in the file: a
  `PAGE_SIZE`/`visible`/`remaining` block and an imported `ToolCard`
  component that replaced inline card markup). Corrected locations:
  `Pill` is now `Discover.jsx:26-36` (was `:18-28`); the filter predicate to
  extract is the `.filter(...)` call inside the `results` `useMemo` at
  `Discover.jsx:97-108` (was `:85-101` — the `useMemo` itself now spans
  `:95-114` because a `.map()` for `matchScore` and a `.sort()` for
  prominence tiebreak run after the filter, so the util extraction should
  pull out only the `.filter()` predicate, not the whole memo body); the
  category/price/level pill rows are now `:204-210`, `:213-218`, `:219-224`
  (was `:161-165`, `:170-174`, `:176-180`); the zero-results block referenced
  for "only shows after a filter is already applied" is now `:227-254` (was
  `:183-193`) and, like the tags gap already noted for the community-
  submission gap's empty state, now computes `suggestedCats` and a "clear all
  filters" button that didn't exist when this entry was first written.
  Substance is unaffected — `Pill` still takes only `active`/`onClick`/
  `children` (confirmed, no `count` slot today), and no shared search
  predicate util exists yet anywhere in `src/` (checked `src/utils/` for a
  `search.js`/`facetCounts.js` file and grepped for `matchesQuery` — zero
  hits), so the plan to extract the filter predicate into a reusable pure
  function is still exactly the right shape, just pointed at the right
  lines now. Worth naming for whoever builds this: the still-OPEN "No public
  search" gap (`docs/research-backlog.md:2099`) independently proposes
  extracting the *same* predicate into a shared `matchesQuery()` helper for
  its own `SearchTools.jsx` page — if either gap ships first, the other
  should reuse its extracted helper rather than factoring the predicate out
  twice into two slightly different utils.
- **Deepened 2026-09-01 06:20 UTC:** the "No public search" gap shipped
  first (`a16375691`, `/search`), and it extracted exactly the helper this
  entry's own note predicted — `src/utils/search.js` now exports
  `matchesQuery(tool, q)`, and `Discover.jsx` already imports and calls it
  (`Discover.jsx:7,102`) instead of an inline text-match condition. Re-read
  both files in full to check what that leaves for this gap to build, since
  the note above assumed a single shared predicate covering all four filter
  conditions and that is not quite what shipped.
  Two corrections. First, line numbers again (the pagination/`ToolCard`
  refactor cited in the last deepening is now joined by this search
  extraction): the current 329-line `Discover.jsx` has `Pill` at
  `Discover.jsx:27-37`, the `results` `useMemo` at `Discover.jsx:96-111`
  with the filter predicate at `Discover.jsx:98-103`, the category pill row
  at `Discover.jsx:200-207`, and the price/level pill row at
  `Discover.jsx:209-222`.
  Second, and more useful than a line fix: `matchesQuery()` only covers the
  free-text half of the filter — name/blurb/sourceCategory/dev/tags
  substring matching (`search.js:6-16`). The `cat`/`price`/`level`
  conditions this gap's own plan also needs are still three inline equality
  checks at `Discover.jsx:99-101` (`tool.category === cat`, `tool.price ===
  price`, `tool.level === level`), never extracted anywhere, because
  `matchesQuery()` was built only for `SearchTools.jsx`'s use case, which
  has no category/price/level filters at all (confirmed: `SearchTools.jsx`
  has no `cat`/`price`/`level` param — it's `q`-only per its own spec above).
  So the "factor the predicate out of Discover.jsx" step this entry
  originally planned is now **smaller than specced, not already done**:
  `getFacetCounts()` should import and call `matchesQuery(tool, q)` for the
  text half (no second implementation of that substring logic, matching
  this file's own no-duplicate-predicates principle), then apply its own
  three equality checks for `cat`/`price`/`level` inline — those three
  one-line comparisons are simple enough that duplicating them in the new
  util isn't a real drift risk the way the five-field substring match was,
  so no further extraction of `Discover.jsx:99-101` into a shared helper is
  needed before this gap can be built. Net effect: this gap's build size
  shrinks slightly (one fewer extraction step, one function to import
  instead of write), and whoever picks it up should start from
  `matchesQuery()` rather than re-deriving the text-match logic.
- **Deepened 2026-09-02 00:07 UTC:** the "Discover sort control" gap shipped
  since the last deepening (`docs/research-backlog.md:3192`, this file's own
  neighboring entry) and moved every line number in this entry's plan a
  third time — re-read the current 348-line `Discover.jsx` in full rather
  than trust the numbers above. `Pill` is now `:35-45`; the `results`
  `useMemo` is `:105-123` with the filter predicate at `:107-112`
  (`matchesQuery(tool, q)` plus the three `cat`/`price`/`level` equality
  checks, substance unchanged from the last deepening — still not extracted
  into a shared helper anywhere); the category pill row is `:212-219`.
  One structural change that matters for the build, not just a line-number
  shift: price and level used to be the only two groups in their shared row
  div — now that div (`:221-240`) also contains a third pill group, Sort
  (`:234-239`, `SORTS.map(...)`, added by the just-shipped sort gap), inside
  the *same* `<div className="...flex items-center gap-2...">` wrapper as
  price (`:223-227`) and level (`:229-233`). A builder adding the `count`
  prop to `Pill` needs to make sure it only ever renders on the price and
  level pills in that row, not the three Sort pills sharing the same
  container and component — "Top match" / "Newest" / "A-Z" are order
  choices, not filters, and none of them narrows `results.length`, so a
  count next to a sort option would be either meaningless (same number on
  all three) or actively confusing (reads as if choosing "Newest" changes
  how many tools you get). This wasn't a risk when this gap was first
  written because Sort didn't exist yet; it's a real one now that all three
  pill groups render from the same `.map()`-over-array pattern in the same
  markup block. Concretely: gate the new `count` prop's render inside `Pill`
  itself on `count != null` (never pass one for Sort's `SORTS.map()` call
  site), rather than relying on every future call site to remember not to
  pass it.
  The zero-results block (`suggestedCats` + "CLEAR ALL FILTERS", cited by
  the tags gap's own 2026-08-30 deepening as `:227-254`) is now `:242-269`.
  Also worth noting for `getFacetCounts()`'s implementation: the `results`
  `useMemo`'s dependency array grew a `sort` entry
  (`[q, cat, price, level, sort, answersKey, tieBreak]`) for the sort
  feature — irrelevant to facet counts (sort never changes which tools
  match, only their order), so the new `useMemo(() => getFacetCounts(...),
  [q, cat, price, level])` this gap's original plan calls for should
  deliberately *not* add `sort` to its own dependency array, or it would
  recompute three count objects on every sort-order change for no reason.

### Tool "graveyard" page — deferred by the status-note gap, worth its own build
- **Status:** OPEN
- **Seen in:** studied fresh this run: `ToolDirectory.ai` (a 2026 AI-tool
  directory competitor) runs a dedicated "graveyard" section listing 62
  shutdown/discontinued tools with dated reasons, treated as a first-class
  content surface rather than a quiet delisting — cited by Fast.io's 2026
  directory comparison as one of that site's defining features alongside its
  side-by-side comparison tool (already shipped here) and "published review
  dates showing verification recency" (the same freshness signal the shipped
  `discoveredAt`/Fresh-Finds gap already surfaces). The same comparison piece
  also flagged Toolify.ai's dynamic "Most Saved"/"Most Used" ranking pages and
  FutureTools.io's per-tool upvoting — both need real cross-visitor usage data
  this local-only, no-backend SPA can't honestly produce (this app's own
  favorites/stack stores are per-browser, not aggregated anywhere), so neither
  is a buildable gap here; the graveyard pattern is the one from this sweep
  that's genuinely closeable client-side.
- **Gap:** this backlog's own already-OPEN "Tool status warning has no reason
  attached" gap (found 2026-08-26, still unbuilt) explicitly named this and
  deferred it: "no retroactive graveyard page listing all non-Active tools —
  that's a bigger, distinct feature this gap doesn't require to be useful."
  It was never logged as its own entry, so it's been sitting unbuilt and
  untracked since. The data is exactly the same 52 already-written `status`/
  `note` pairs on `toolsCatalog.js` entries (confirmed by direct grep: 52
  `"status": "Uncertain"` entries, each carrying a `note` field with 47 of the
  52 explaining why — e.g. Pi: `"Core team moved to Microsoft (2024); app in
  maintenance"`, Sourcegraph Cody: `"Deprioritized as Sourcegraph pivoted to
  Amp (2025)"`, Magic: `"No broadly available product yet"`) — real editorial
  content already written, currently reachable only one tool at a time via
  `ToolDetail.jsx`, and only once the (still-unbuilt) inline note gap ships.
  There is no aggregate view anywhere a visitor — or a search crawler — can
  see "here are the AI tools that stalled or pivoted away," even though
  Toolnaut has already done the work of tracking which 52 of its 704 catalog
  entries that applies to.
- **Why it matters:** it's genuine, differentiated, crawlable content that
  costs nothing new to produce (same "data exists, never surfaced" shape as
  the shipped Fresh-Finds and the still-open popularity-signal gaps), and it
  directly reinforces Toolnaut's own credibility angle — a directory that
  visibly tracks and explains its own stale listings reads as more
  trustworthy than one that just quietly keeps everything live, the same
  trust argument the status-note gap already makes for the inline version.
  It's also free top-of-funnel SEO surface in the same family as the shipped
  category-landing pages ("AI tools that shut down" / "AI tools that
  pivoted" are real, distinct long-tail searches neither `/tools/:domain` nor
  the homepage currently answers) — this is the cheapest kind of new indexable
  page this backlog has found: zero new data, one new template already proven
  by `CategoryLanding.jsx`.
- **Smallest useful version (what to actually build):**
  - New public route `/graveyard` in `src/App.jsx`, alongside `/tools/:domain`
    (`App.jsx:79`) — same tier as `SharedStack`/`CategoryLanding`, outside
    `AppShell`, no session needed.
  - New `src/pages/Graveyard.jsx`: filters `TOOLS` (same direct
    `toolsCatalog.js` import `CategoryLanding.jsx:2` already uses) to
    `status !== 'Active'`, sorted alphabetically (no recency data exists to
    sort by — the `note` text itself often carries a year, that's enough).
    Nearly line-for-line reuses `CategoryLanding.jsx`'s structure (heading,
    one-line intro, card grid, "Build my own stack" CTA) rather than
    inventing new page chrome — literally the same component shape with a
    different filter predicate and copy, which is why this is small even
    though it's a new route. Each card shows name, blurb, and the `note` text
    directly (no separate detail click needed — the whole point of this page
    is the reason, not just the list), skipping the 5 of 52 with no `note` by
    just showing the status pill alone for those (never fabricate a reason,
    same rule the status-note gap already commits to).
  - One small text link to `/graveyard` from wherever the status-note gap's
    inline "UNCERTAIN" badge ends up on `ToolDetail.jsx` (e.g. "See all
    stalled/pivoted tools →") — only wire this if the status-note gap has
    already shipped when this one is picked up; if not, this page still
    stands alone with no inbound in-app link required, since its primary
    value is as a standalone crawlable/shareable page, not in-app navigation.
  - Add `/graveyard` to `public/sitemap.xml` (same one-line addition pattern
    as the 6 category URLs) and to `scripts/smoke.mjs`'s route array — same
    footgun flagged on every route-adding gap in this file.
  - **What this would NOT include** (kept out to bound the diff): no new
    catalog data or backfilled notes for the 5 `Uncertain` tools missing one
    (same restraint the status-note gap already applies); no date-of-death
    field or sorting by when a tool actually stopped being active (`note`
    text is free-form prose, not a structured date — parsing one out is a
    separate, riskier change, not required for this page to be useful as-is);
    no separate `/graveyard/:slug` per-tool page (this is a listing page, the
    same one-page-per-domain pattern `CategoryLanding` already established,
    not a new detail-page type); no removal or archiving of these tools from
    Discover/Compare/the main catalog — they stay fully live everywhere else,
    this is purely an additional, honest way to browse the subset.
- **Build size:** S — one new page (`Graveyard.jsx`, closely modeled on the
  already-shipped `CategoryLanding.jsx`), one new public route in `App.jsx`,
  one sitemap line, one smoke-route line. No backend, no new dependency, no
  new store, no new util (reuses `TOOLS` directly, same as `CategoryLanding`).
- **Found:** 2026-08-28 00:15 UTC

### Embeddable "Featured on Toolnaut" badge — the standard directory backlink loop, missing entirely
- **Status:** OPEN
- **Seen in:** studied fresh this run, a problem area rather than one
  competitor. G2 badges (documentation.g2.com/docs/g2-badges) are embedded on
  a vendor's own product page and G2 explicitly recommends footer placement
  for single-product companies; Product Hunt badge embeds ("Featured on
  Product Hunt") are one of the most copy-pasted growth artifacts in SaaS —
  entire third-party tools (Poper, JustReview, Elfsight) exist purely to
  package and re-embed these; LaunchLoop's 2026 "Featured Founder" badges are
  the same pattern at a newer directory. The mechanism is identical everywhere:
  a directory gives a listed vendor a small self-serve embed snippet that
  links back to the directory, the vendor puts it on their own site because it
  functions as social proof for their visitors, and the directory gets a free,
  compounding backlink + referral-traffic stream for every vendor who embeds
  it — zero outbound cost per embed, unlike any paid acquisition channel.
- **Gap:** confirmed with `grep -rniE "badge|embed" src/pages src/components`
  — the only "badge" hits in the whole codebase are unrelated UI (level-up
  badges, pricing-plan ribbon copy, a canvas zoom-level readout in
  `GalaxyExplorer.jsx`); nothing generates or displays a copyable
  embed/backlink snippet anywhere. `ToolDetail.jsx` (the one page a vendor
  would actually check to see how their tool is presented) has no "get embed
  code," "share this listing," or "as seen on" affordance — its only outbound
  action is the existing "VISIT WEBSITE" link at `ToolDetail.jsx:120-132`,
  which points away from Toolnaut, not back to it. Toolnaut has zero mechanism
  today that turns "a vendor is listed" into "a vendor links back."
- **Why it matters:** every other growth-shaped gap already found in this file
  (share-stack, category landing pages, the graveyard page above) drives
  *visitors* to Toolnaut through Toolnaut's own surfaces. This is the one
  pattern that drives *other websites* to link to Toolnaut voluntarily — real
  backlinks from vendor marketing pages compound organic search authority in a
  way no in-app feature can, and it costs the vendor nothing to add (a
  three-line HTML snippet, no signup, no billing decision, no dependency on
  the still-nonexistent multi-user/claiming system the Team-tier gap above
  already rejected). It also sidesteps the login-wall problem the
  per-route-meta gap flagged for `ToolDetail`/`Compare`: the badge should link
  to the already-public, already-shipped `/s/:slug` route (`App.jsx:84`,
  built for the share-stack gap) rather than the gated `/app/tools/:slug` —
  `encodeStackSlugs([slug])` degrades cleanly to a single bare slug and
  `SharedStack.jsx` already renders a clean read-only card for exactly one
  tool with no session required, so a vendor's own visitor who clicks the
  badge lands on real Toolnaut content immediately instead of a login screen.
  This reuse is free: no new public route needed, no repeat of the
  ToolDetail-is-gated problem this backlog already flagged as a separate,
  larger fix.
- **Smallest useful version (what to actually build):**
  - New pure util `src/utils/embedBadge.js`: `buildEmbedSnippet(tool)` →
    a single HTML string — an `<a>` tag wrapping styled inline text (no
    external image, no iframe, no hosted badge-image endpoint this SPA has no
    server to generate), e.g. `<a href="https://toolnaut.xyz/s/<slug>"
    target="_blank" rel="noopener" style="...">🔭 Featured on Toolnaut</a>`
    with the inline `style` attribute carrying enough of its own CSS (padding,
    border-radius, background, font) to render correctly dropped into any
    third-party site with zero dependency on Toolnaut's own stylesheet ever
    loading. Pure function, easy to `node --test` like `shareStack.js`.
    Deliberately not an `<img>`/SVG badge in v1 — that needs either a
    checked-in static asset per style variant or a server-rendered badge
    endpoint (a `functions` route this `vercel.json` doesn't have, the same
    "no backend" wall the chat-assistant/digest-email gaps already hit) —
    an inline-styled anchor is the honest zero-infrastructure version.
  - `ToolDetail.jsx`: one small disclosure below the existing "VISIT WEBSITE"
    button (`ToolDetail.jsx:120-132`), labelled "🏷️ Get embed badge," that
    reveals a `<textarea readOnly>` containing `buildEmbedSnippet(tool)` plus
    a "Copy" button — same copy-to-clipboard + "Copied!" transient-label
    pattern already used twice in this codebase (`Stack.jsx:132-136`'s share
    link, `Learning.jsx:243-250`'s share-badge string), so no new interaction
    pattern, just a third call site of the same idea.
  - A tiny live preview of the badge (rendering the same HTML string via
    `dangerouslySetInnerHTML` inside a bordered "this is what it looks like"
    box) so a vendor can see the badge before copying it — cheap to add since
    the string itself is already fully self-styled.
  - **What this would NOT include** (kept out to bound the diff): no
    image/SVG badge variant or badge-generator endpoint (needs a backend, as
    above); no vendor claiming/verification flow — any visitor can grab any
    tool's badge, same open-by-default trust model this codebase already uses
    for favorites/stack/reviews; no tracking of how many sites embed a given
    badge or click-through analytics beyond the existing `useAnalytics`
    pattern (a single `CTA_CLICK` event on reveal/copy is enough, no new
    dashboard); no outreach/email to vendors telling them the badge exists —
    that's a marketing/ops task, not a code gap, same distinction already
    drawn for the Discord-community finding above; no per-plan gating (no
    billing system to gate against, same reasoning as every other ungated
    finding in this file).
- **Build size:** S — one new pure util (`embedBadge.js`), one small
  disclosure + textarea + copy button + live preview added to `ToolDetail.jsx`
  reusing an existing copy-to-clipboard pattern. No backend, no new
  dependency, no new route (reuses the already-public `/s/:slug`).
- **Found:** 2026-08-28 03:15 UTC

### Per-tool "Alternatives" SEO pages — the single highest-intent directory query has zero pages targeting it
- **Status:** OPEN
- **Seen in:** studied fresh this run (ToolChase.com's AI-tools guide, then
  cross-checked against the pattern's general form): dedicated "alternatives
  to X" pages are the load-bearing SEO surface for every tool directory that
  ranks — SaaSHub and AlternativeTo exist almost entirely as this one page
  type; G2 and Capterra both auto-generate an "X Alternatives & Competitors"
  page for every listed product; ToolChase's own write-up specifically calls
  out its "'alternatives' feature showing substitutes for specific solutions"
  as distinct from its general comparison tool, because it targets a
  different, much higher-commercial-intent search query — "chatgpt
  alternatives," "notion ai alternatives," "jasper ai alternatives" are
  some of the single highest-volume, highest-intent searches in the entire AI-
  tools category (someone already uses or has decided against Product X and
  is actively looking to switch), distinct from a generic "best AI writing
  tools" query the existing category pages target.
- **Gap:** confirmed with `grep -rn "alternative" src/` — the only hits are
  ToolDetail.jsx's "RELATED TOOLS" section (`ToolDetail.jsx:189-205`), and
  even that is gated: it only renders inside `/app/tools/:slug`, behind
  `AppShell`'s session guard (`App.jsx:96-106`), invisible to a search
  crawler or a signed-out visitor who searched "chatgpt alternatives" and
  landed cold. Toolnaut's only public, crawlable listing pages are the 6
  broad `/tools/:domain` category pages (`App.jsx:85`, `CategoryLanding.jsx`
  — "Best AI Tools for Writing," etc.) — none of them target a specific
  competitor tool by name, and `public/sitemap.xml` lists exactly those 6
  plus 6 static routes, nothing per-tool. Toolnaut has 704 catalog entries
  and the exact same-`sourceCategory` matching logic already proven at
  `ToolDetail.jsx:29-34` (e.g. "LLMs & Chatbots" alone has 35 tools, confirmed
  by counting `sourceCategory` values directly in `toolsCatalog.js`) — the
  data and the matching logic both already exist, they're just never
  exposed as a public page, and the one place they are rendered is behind a
  login-equivalent wall.
- **Why it matters:** this is the single biggest gap between what Toolnaut's
  catalog could rank for and what it actually can. The already-shipped
  category-landing pages target broad, high-competition queries ("best AI
  writing tools" — every directory has one of these); "X alternatives" pages
  target hundreds of specific, lower-competition, higher-conversion long-tail
  queries simultaneously (one per catalog tool), and Toolnaut is uniquely
  positioned to answer them honestly because — unlike a hand-curated
  competitor list — every "alternative" shown is backed by the same
  structured `sourceCategory`/`price`/`level` fields already used everywhere
  else in the app, so there's no editorial content to invent. It's also a
  direct extension of already-shipped work: `CategoryLanding.jsx` is the
  exact page shape to clone (public, crawlable, reuses `TOOLS` directly), and
  the matching logic is the exact query `ToolDetail.jsx` already runs — this
  gap is "expose what's already built one level further," the same shape as
  the Fresh-Finds and Skills-Graph gaps that shipped fastest in this backlog.
- **Smallest useful version (what to actually build):**
  - New public route `/alternatives/:slug` in `src/App.jsx`, alongside
    `/tools/:domain` (`App.jsx:85`) — same tier as `CategoryLanding`/
    `SharedStack`, outside `AppShell`, no session needed.
  - New `src/pages/Alternatives.jsx`, closely modeled on
    `CategoryLanding.jsx`'s structure (heading, one-line intro, card grid,
    "Build my own stack" CTA) rather than inventing new page chrome. Reads
    `slug` via `useParams()`, resolves the target tool with `getTool()`
    (`toolsCatalog.js:757`), 404s to `<Navigate to="/" replace />` for an
    unknown slug (same pattern `CategoryLanding` already uses for an unknown
    domain). Computes alternatives with the *same* two-tier logic already
    proven at `ToolDetail.jsx:29-34` (same `sourceCategory` first, same
    `category` as fallback, excluding the target itself), capped at 12 rather
    than 3 since this is a full page, not a detail-page sidebar. Heading
    reads "BEST {TOOL NAME} ALTERNATIVES" — the literal search-query phrase —
    with a one-line honest intro ("{n} other {sourceCategory} tools, ranked
    the same way as everywhere else in Toolnaut — nothing here is sponsored
    or invented.") Each card reuses the same price/level pill markup
    `CategoryLanding.jsx:53-56` already renders, no new label maps.
  - `ToolDetail.jsx`: the existing gated "RELATED TOOLS" section
    (`ToolDetail.jsx:189-205`) gets one small addition — a "See all
    alternatives to {tool.name} →" link under the grid, pointing to the new
    public `/alternatives/{tool.slug}` page. This is the one place a signed-
    in user's existing view feeds the new public page, but the new page does
    not depend on it being wired — it stands alone as a crawlable/shareable
    URL, same reasoning the graveyard-page gap above uses for its own inbound
    link.
  - `scripts/smoke.mjs`'s hardcoded route array needs one addition, e.g.
    `/alternatives/chatgpt` — same footgun flagged on every route-adding gap
    in this file.
  - **What this would NOT include** (kept out to bound the diff): no
    sitemap entries for all 704 possible `/alternatives/:slug` URLs in v1 —
    `sitemap.xml` is a small hand-maintained static file today (no generator
    script exists anywhere in `scripts/`), and writing one is a distinct,
    separate build; ship the pages and add a small handful of the highest-
    traffic slugs (chatgpt, claude, notion-ai, midjourney — whichever the
    catalog's best-known entries are) by hand, the same manual way the 6
    category URLs were added, and leave "generate the other ~700" as a
    follow-up note rather than building a sitemap pipeline today. No
    per-alternative editorial ("why switch from X to Y") — same restraint
    the graveyard and category pages already apply, nothing invented beyond
    the structured fields. No ranking/scoring of which alternative is
    "best" beyond the existing same-source-category-first ordering — no new
    scoring dimension (a competitor site's "8-parameter scoring framework"
    was considered and rejected here: it would require subjective per-tool
    ratings this catalog doesn't have and this backlog has consistently
    avoided inventing numbers that aren't real, same principle as
    `StatsSection.jsx`'s counted-vs-seeded split). No dedicated OG/social
    preview image per tool (same restraint as the share-stack gap).
- **Build size:** S/M — one new page (`Alternatives.jsx`, closely modeled on
  the already-shipped `CategoryLanding.jsx`), one new public route in
  `App.jsx`, one link added to `ToolDetail.jsx`'s existing related-tools
  section, one smoke-route line, a handful of hand-picked sitemap entries.
  No backend, no new dependency, no new store, no new scoring logic — reuses
  the exact matching query `ToolDetail.jsx` already runs.
- **Found:** 2026-08-28 06:10 UTC

### Public "new tools" feed — the freshness data is real, but the only place it renders is behind the login wall
- **Status:** SHIPPED f075d88
- **Seen in:** Product Hunt's entire homepage *is* a chronological feed of
  newly launched products — freshness is the whole product, not a side
  panel; There's An AI For That runs a dedicated, publicly crawlable
  "Newest AI Tools" page for the same reason (already cited for the shipped
  Fresh-Finds gap below, but that citation was about an in-app strip — the
  public-page half of the same competitor pattern was never actually built).
  Futurepedia's "Newest" sort is likewise a public, unauthenticated view.
  Every comparable directory treats "what got added recently" as content a
  search engine and a cold visitor can both see without signing in first.
- **Gap:** Toolnaut already has this data and already shipped an in-app
  version of it — but the in-app version is gated, and no public version
  exists. `radar/enrich.js` stamps a real `discoveredAt` on every
  radar-discovered tool, `radar/scripts/sync-to-app.js` and
  `src/utils/liveCatalog.js` both carry `'discoveredAt'` in their `FIELDS`
  arrays (`liveCatalog.js:7`), and `src/utils/newTools.js` already exports
  `getNewTools(days)` — a pure, tested, ready-to-reuse function that filters
  and sorts `TOOLS` by that timestamp. The only place any of this renders is
  `Discover.jsx:106,140-150`'s "🆕 New this week" strip, and `Discover.jsx`
  is mounted at `/app/discover`, nested under `<Route path="/app"
  element={<AppShell />}>` (`App.jsx:96-99`) — the exact same session wall
  the per-route-meta gap's deepening already proved blocks crawlers and
  cold social-link clicks alike (a Google crawler or a pasted link recipient
  with no session hits the login screen, never the strip). Confirmed with
  `grep -rn "getNewTools\|discoveredAt" src/pages src/components`: the only
  call site anywhere is that one gated strip. `public/sitemap.xml` (checked
  in full, 12 URLs) has no `/new`-shaped entry, and there is no public route
  for this in `App.jsx` alongside the already-public `/tools/:domain`
  (`App.jsx:85`), `/s/:slugs` (`App.jsx:84`), or the still-OPEN
  `/graveyard`/`/alternatives/:slug` gaps above.
- **Why it matters:** this is the cheapest possible gap in the file's own
  terms — zero new data, zero new util (`newTools.js` already does the exact
  query needed), and a page shape (`CategoryLanding.jsx`) already proven
  twice as the template for "take `TOOLS`, filter it, render a public read-
  only grid." It's also a distinct, real search surface from every other
  SEO gap already open here: `/tools/:domain` targets topical intent ("best
  AI writing tools"), `/alternatives/:slug` targets competitor-switch intent
  ("chatgpt alternatives"), `/graveyard` targets a stale-listing/trust
  query — none of them target *recency* intent ("new AI tools this week" /
  "latest AI tools 2026"), which is one of the highest-churn query types in
  this exact category precisely because the answer changes constantly and a
  static competitor page can't keep up the way a page reading live
  `discoveredAt` data every build can. It also closes the same "the feature
  that's supposed to prove Toolnaut is alive undercuts itself by being
  invisible to anyone who isn't already a user" problem the per-route-meta
  gap already flagged for shared `ToolDetail` links — except here the fix
  doesn't require moving an existing gated route, it just needs a new public
  one next to it.
- **Smallest useful version (what to actually build):**
  - New public route `/new` in `src/App.jsx`, alongside `/tools/:domain`
    (`App.jsx:85`) — outside `AppShell`, no session needed, same tier as
    every other page in this public-SEO-page family.
  - New `src/pages/NewTools.jsx`, structured identically to
    `CategoryLanding.jsx` (heading, one-line intro, card grid, "Build my own
    stack" CTA at top and bottom) rather than inventing new page chrome.
    Calls `getNewTools(30)` directly from the existing `newTools.js` util —
    30 days rather than the in-app strip's 7, since a public SEO page
    benefits from not being empty most weeks the way a frequently-revisited
    in-app strip can afford to be; sorted newest-first, which `getNewTools`
    already does (`newTools.js:18`). Heading reads "NEWEST AI TOOLS ADDED TO
    TOOLNAUT" with a one-line honest intro naming the count and window
    ("{n} tools added in the last 30 days, discovered automatically — see
    `radar/README.md`'s own framing for the honest one-liner to reuse").
    Each card reuses the exact glass-card markup `CategoryLanding.jsx:46-57`
    already renders (name, blurb, price/level pills, category dot) plus one
    addition: a small relative-time caption ("Added 3 days ago") computed
    from `tool.discoveredAt` — `communityData.js`'s existing `timeAgo()`
    helper (already cited and reused by the still-open ratings gap above)
    is the exact right tool for this, not a new date-formatting function.
  - Empty state (a real possibility — radar can have a quiet week): "No new
    tools in the last 30 days — check back soon," same honest-empty-state
    pattern `CategoryLanding.jsx:41-42` already uses for a domain with zero
    tools, not a hidden/blank page.
  - Add `/new` to `public/sitemap.xml` (one line, `changefreq daily` rather
    than `weekly` — this is the one public page whose content can change
    every single day the radar pipeline runs, unlike every other static
    catalog-subset page in the file) and to `scripts/smoke.mjs`'s route
    array (`scripts/smoke.mjs:32`) — same footgun flagged on every
    route-adding gap in this backlog.
  - One small link from the existing gated `Discover.jsx` strip
    (`Discover.jsx:140-150`) to `/new` ("See the full feed →") so a signed-in
    user's 7-day strip has a path to the fuller 30-day public page — optional
    polish, not required for the public page to stand alone.
  - **What this would NOT include** (kept out to bound the diff): no RSS/Atom
    feed (a real, cheap follow-up once this page proves out, but a second
    output format is a separate, larger decision than this file's own S
    sizing bias allows for a first cut); no per-source badges on this page
    (GitHub vs. HN vs. Product Hunt vs. RSS) — that's what the still-OPEN
    popularity-signal gap's source-specific labels are for, this page's job
    is just "what's new," not "where it came from"; no pagination beyond a
    30-day window (a hard cap, not an infinite-scroll/load-more control — if
    the window is ever wide enough to need one, that's a follow-up, not a
    v1 requirement); no daily/weekly email digest of this feed (the already-
    REJECTED digest-email gap above covers exactly why that needs a backend
    this SPA doesn't have — this page is the honest, backend-free substitute
    for that promise, not an attempt to sneak the rejected feature back in).
- **Build size:** S — one new page (`NewTools.jsx`, closely modeled on the
  already-shipped `CategoryLanding.jsx`), one new public route in `App.jsx`,
  one sitemap line, one smoke-route line, one optional link from the
  existing gated strip. No backend, no new dependency, no new store, no new
  util (`getNewTools()` already exists and is already tested).
- **Found:** 2026-08-28 12:20 UTC

### Structured data (JSON-LD) — zero schema.org markup on any crawlable page
- **Status:** SHIPPED (this run) — all three originally-scoped call sites
  now emit real `ItemList` JSON-LD, and the prerender bug that dropped it
  from every static page is fixed (see the "per-route page title" gap's
  2026-08-31 deepening for the full story, not repeated here).
- **Seen in:** G2 and Capterra emit `SoftwareApplication`/`Product` JSON-LD
  with `aggregateRating` and `offers` on every listing page, which is exactly
  why their category pages show star ratings and price directly in Google
  search results instead of a plain blue link; Product Hunt emits the same
  pattern per launch page. This is the single most common SEO technique in
  the tool-directory space precisely because a directory's whole value
  proposition — "many structured things, each with a name/price/category" —
  maps onto schema.org's vocabulary almost exactly.
- **Gap:** grepped `application/ld+json|schema.org|JSON-LD|jsonld` across all
  of `src/` — zero hits, on any page. This is a distinct gap from the
  already-OPEN "Per-route page title & meta description" entry above, which
  explicitly scoped structured data out as "a separate and larger SEO
  project" (`docs/research-backlog.md:788`) — this entry is that separate
  project, scoped down to what's actually buildable today. Three pages are
  public/crawlable and tool-listing-shaped and would benefit immediately:
  `CategoryLanding.jsx` (`/tools/:domain`, confirmed public at `App.jsx:88`,
  its own comment says so — "Public, crawlable, no session required"),
  `NewTools.jsx` (`/new`, same tier, `App.jsx:89`), and `SharedStack.jsx`
  (`/s/:slugs`, `App.jsx:87`). All three already render a list of tools with
  `name`, `blurb`, `price` (`free`/`freemium`/`paid`, confirmed enum at
  `toolsCatalog.js:5`), and `category` — exactly the fields an `ItemList` of
  `SoftwareApplication` entries needs. None of the three currently escapes
  their own JSX to say so to a crawler.
- **Why it matters:** free, and additive to the meta-description gap already
  queued rather than competing with it — once `usePageMeta` ships a correct
  `<title>`/description, JSON-LD is the next SEO layer, giving Google rich
  results (name, price, category) directly in the search snippet instead of
  a generic description. For a pre-revenue product whose growth channel is
  organic discovery of a 700+ tool catalog, that's real, compounding upside
  with no infra cost — it's markup, not a feature.
- **Smallest useful version (what to actually build):**
  - New pure util `src/utils/structuredData.js`: `buildItemListSchema(tools,
    { name, description, url })` → a `{ '@context': 'https://schema.org',
    '@type': 'ItemList', ... }` object whose `itemListElement` is one
    `SoftwareApplication` per tool (`name`, `description: tool.blurb`,
    `applicationCategory: 'AIApplication'`, and `offers: { '@type': 'Offer',
    price: tool.price === 'free' ? '0' : undefined, priceCurrency: 'USD' }`
    only when the price is unambiguous — `freemium`/`paid` tools have no
    actual numeric price in the catalog, so their `offers` block is omitted
    rather than inventing a number; an absent field is honest, a fabricated
    one is the same trust risk this file's own SEEDED-stats section already
    goes out of its way to avoid). Pure and unit-testable like `shareStack.js`/
    `newTools.js`.
  - A tiny shared component `src/components/seo/JsonLd.jsx`: renders
    `<script type="application/ld+json">{JSON.stringify(schema)}</script>`
    given a schema object — one line of JSX, reused by all three call sites.
  - Wire into `CategoryLanding.jsx` (list of that domain's tools),
    `NewTools.jsx` (list of tools from `getNewTools(30)`), and
    `SharedStack.jsx` (list of the shared stack's resolved tools) — each
    passes its own already-computed `tools` array straight to
    `buildItemListSchema()`, no new data fetching.
  - **What this would NOT include** (kept out to bound the diff): no
    `aggregateRating` (the per-tool ratings/reviews gap above is still OPEN
    — don't emit a rating schema with no rating data behind it, that's the
    exact fabrication this file warns against elsewhere); no `Organization`/
    `WebSite` sitewide schema on the homepage in v1 (a real separate addition,
    smaller than this one, left for a follow-up rather than padding this
    diff); no JSON-LD on `ToolDetail`/`Compare` (still behind `AppShell`'s
    session guard per the meta-description gap's own deepening above — no
    point marking up a page a crawler can't reach); no schema validation
    tooling/CI check beyond manually checking output against Google's Rich
    Results Test once shipped.
- **Build size:** S — one pure util (`structuredData.js`), one tiny component
  (`JsonLd.jsx`), three call sites (`CategoryLanding.jsx`, `NewTools.jsx`,
  `SharedStack.jsx`). No backend, no new dependency, no new route.
- **Found:** 2026-08-29 00:06 UTC
- **Deepened 2026-08-31 00:20 UTC:** this shipped for one of its three named
  call sites, not zero — `CategoryLanding.jsx` passes a real `jsonLd` object
  (`CollectionPage`/`ItemList`, one entry per tool in that domain) into the
  `useHead()` hook this backlog's per-route-meta gap's own deepening just
  documented in full. `NewTools.jsx` calls the same `useHead()` hook but
  without a `jsonLd` argument — the plumbing exists on that page, it's a
  one-line addition to wire it up, not a new capability. `SharedStack.jsx`
  doesn't call `useHead()` at all yet (same gap the per-route-meta deepening
  names as its own one remaining item). The `JsonLd.jsx` component this
  entry proposed was never needed and shouldn't be built now — `useHead()`
  already does the `<script type="application/ld+json">` injection/cleanup
  itself (`head.js:75-83`), a second mechanism would just be two ways to do
  the same thing.
  The bigger news is the one this run actually spent its time on: whatever
  JSON-LD *does* get passed to `useHead()` was silently never reaching the
  shipped HTML at all, on any route, until this run's fix —
  `scripts/prerender.mjs` rebuilt every prerendered page from a pristine,
  pre-hydration shell that never carried the `#route-jsonld` script React
  injects at runtime, so `CategoryLanding`'s schema, despite being real,
  correct code, shipped to exactly zero crawlers before today. Fixed in
  `prerender.mjs` this run (full detail in the per-route-meta gap's
  deepening above); re-verified by rebuilding and grepping
  `dist/tools/design/index.html` for `application/ld+json`, present and
  correct post-fix.
  **What's still genuinely open:** add `jsonLd` to `NewTools.jsx`'s existing
  `useHead()` call (an `ItemList` of the 30-day tool set, same shape
  `CategoryLanding.jsx` already builds) and wire `useHead()` (title +
  `jsonLd`) into `SharedStack.jsx` once that page gets the hook at all. Both
  are now one-line-shaped additions to plumbing that already exists and is
  now verified to actually reach a crawler, not new infrastructure.
- **Deepened 2026-08-31 12:22 UTC — both remaining call sites shipped;
  closing this gap.** `NewTools.jsx`'s existing `useHead()` call now passes a
  `CollectionPage`/`ItemList` `jsonLd` (one `ListItem` per tool in the 30-day
  window, same shape `CategoryLanding.jsx` already builds) — confirmed in the
  prerendered output, `dist/new/index.html` now carries a real
  `application/ld+json` block with `numberOfItems` matching the page's own
  tool count. `SharedStack.jsx` now calls `useHead()` with an `ItemList` too
  (full detail in the per-route-meta gap's own closing deepening above, not
  repeated here) — that route is client-only, not in `prerender.mjs`, so its
  markup reaches a crawler only if one somehow lands on a specific share
  link directly, which is the honest limit of what a URL-param-keyed page can
  offer without server rendering; still strictly better than emitting
  nothing. All three originally-scoped call sites (`CategoryLanding`,
  `NewTools`, `SharedStack`) are done. Verified with `npm test` (76/76),
  `npm run build` + prerender, and `npm run smoke` (20/20 routes, 0 console
  errors).

### No public search — every "type a keyword" path is behind the login wall
- **Status:** SHIPPED (this run — sha in DEVLOG)
- **Seen in:** a problem area rather than one competitor — checked directly
  against the four public listing pages already shipped this week
  (`/tools/:domain`, `/new`, `/s/:slugs`, plus the still-OPEN
  `/alternatives/:slug` and `/graveyard`). Every one of them is a
  *pre-filtered* list — pick a category, a recency window, a specific tool's
  neighbours. None let a visitor type an arbitrary query. Futurepedia,
  There's An AI For That and Toolify.ai all put a real search box on their
  homepage, reachable with zero login — searching is the default entry point
  to a tool directory, not a filtered subset of it.
- **Gap:** confirmed by reading `src/App.jsx`'s full route table (`App.jsx:78-118`):
  every public route (`/`, `/tools/:domain`, `/new`, `/s/:slugs`, `/pricing`,
  `/about`) is either static or pre-filtered. The only page with a real
  keyword search box is `Discover.jsx` (`Discover.jsx:160-175`, `q` query
  param, full-text match over `name`/`blurb`/`sourceCategory`/`dev`/`tags` at
  `Discover.jsx:93-112`) — and it's mounted at `/app/discover`, nested under
  `<Route path="/app" element={<AppShell />}>` (`App.jsx:100-111`), the exact
  session wall the per-route-meta gap's own deepening already proved
  redirects any crawler or signed-out visitor to `/auth/login` before
  anything renders. `CTASection.jsx`'s promise — "no signup wall to get your
  first chart" — is true for the quiz (`/goal`, session-free) but not for
  simply searching: a visitor who doesn't want to answer quiz questions and
  just wants to type "notion" or "voice cloning" has no path that doesn't
  first demand a fake Google/GitHub/email sign-in. Grepped `useSearchParams|
  type="search"` across `src/pages/*.jsx` (excluding `src/pages/app/`) —
  zero hits; every top-level public page is either static content or a fixed
  filter, never free text.
- **Why it matters:** search is the single most obvious thing a first-time
  visitor expects to be able to do on a tool directory, and today Toolnaut's
  only route to it is "answer the quiz first" or "already know the tool's
  exact URL slug" (`/s/:slug`, `/alternatives/:slug` once shipped). That's a
  real conversion cost: someone who lands on Toolnaut from a search engine or
  a friend's link with one specific tool in mind (not a role/persona to
  discover) bounces at the login wall instead of getting an answer in one
  keystroke. It also complements every other public-page gap in this file
  rather than duplicating one — `/tools/:domain` answers "what's good for
  category X," `/alternatives/:slug` answers "what else is like tool Y,"
  `/new` answers "what's fresh" — none of them answer "does Toolnaut have
  something called Z," which is the search behavior every visitor already
  expects from a search box.
- **Smallest useful version (what to actually build):**
  - New public route `/search` in `src/App.jsx`, alongside `/tools/:domain`
    and `/new` (`App.jsx:88-89`) — outside `AppShell`, no session required,
    same tier as every other public listing page in this file.
  - New `src/pages/SearchTools.jsx`, modeled on `CategoryLanding.jsx`'s shape
    (heading, card grid, "Build my own stack" CTA) but driven by `useSearchParams()`
    reading `q` the same way `Discover.jsx` already does, so a URL like
    `/search?q=voice+cloning` is itself shareable and bookmarkable — same
    "state lives in the URL" principle this codebase already commits to
    (`Discover.jsx:38` comment: "so results are shareable and the back
    button restores them"). Reuses the *exact* filter predicate
    `Discover.jsx:93-106` already has (name/blurb/sourceCategory/dev/tags
    substring match) rather than writing a second one — factor it into a
    small exported helper (e.g. `matchesQuery(tool, q)` in
    `src/utils/toolsCatalog.js` or a new `src/utils/search.js`) that both
    `Discover.jsx` and `SearchTools.jsx` call, so the two search
    implementations can't silently drift apart. This is the same "two
    call sites, one predicate" fix the still-open facet-counts gap already
    plans for `Discover.jsx`'s filtering — if that gap ships first, this one
    should reuse whatever helper it extracts rather than doing the
    extraction twice.
  - Text input at the top (same visual markup as `Discover.jsx:162-174`'s
    search box, no new input styling needed), a real-text-input `<input
    type="search">` bound to the `q` param exactly like `Discover.jsx` does.
    No category/price/level filter chips in v1 — those are Discover's job
    once a visitor is actually signed in; this page's only job is "does
    Toolnaut have this," not a second full faceted-search UI outside the
    login wall.
  - Empty query (`q` unset or blank): show a short prompt ("Search 750+ AI
    tools by name, category, or use case") plus the same six `suggestedCats`-
    style category links `Discover.jsx:134-137,236-244` already computes, so
    the page is never a bare blank input with nothing to do.
  - Each result card is the same read-only glass-card markup
    `CategoryLanding.jsx:46-57` already renders (name, blurb, price/level
    pills, category dot) — no add-to-stack/favorite/compare actions, since
    those require a session; clicking a card links to `/s/{tool.slug}`
    (already-public, already-shipped single-tool view via
    `encodeStackSlugs([slug])`) rather than the gated `/app/tools/:slug`,
    the same reuse the embeddable-badge gap above already establishes as the
    correct honest destination for a signed-out click.
  - Wire a "🔎 Search all tools" link into `HeroSection.jsx`/`NexusLanding.jsx`
    or the site footer so it's discoverable without already knowing the URL
    — exact placement is a judgment call for whoever builds this, but it
    should not ship as a URL nobody can find from the homepage.
  - `scripts/smoke.mjs`'s hardcoded route array needs one addition, e.g.
    `/search?q=chatgpt` — same footgun flagged on every route-adding gap in
    this file.
  - **What this would NOT include** (kept out to bound the diff): no
    category/price/level filter chips on this page (Discover's job, once
    signed in — this is a single-box lookup, not a second faceted-search UI);
    no sitemap entries (a dynamic `?q=` page has no fixed set of URLs to
    list, unlike the static category/graveyard/new pages — this page's value
    is visitor usability, not incremental crawlable-URL count, and should be
    scoped and described that way rather than oversold as an SEO play); no
    autocomplete/instant-results-as-you-type beyond the existing debounce-free
    `onChange` pattern `Discover.jsx` already uses; no merging this page with
    `Discover.jsx` into one shared component — the session-gated version
    keeps its filter chips, match scores and stack actions, this is a
    deliberately smaller, public-only sibling, the same relationship
    `CategoryLanding.jsx` already has to `Discover.jsx`'s category filter.
- **Build size:** S — one new page (`SearchTools.jsx`, closely modeled on
  `CategoryLanding.jsx`), one new public route in `App.jsx`, one small shared
  predicate extracted from `Discover.jsx` (or reused from the facet-counts
  gap's extraction if that ships first), one homepage/footer link, one line
  in `scripts/smoke.mjs`. No backend, no new dependency, no new store.
- **Found:** 2026-08-29 03:15 UTC
- **Deepened 2026-08-31 15:20 UTC:** re-read the current 332-line `Discover.jsx`
  and confirmed the other two still-OPEN gaps this entry cross-references
  (`/alternatives/:slug`, `/graveyard`) remain unbuilt — `git grep -n
  "alternatives\|graveyard" src/App.jsx` and a directory listing of
  `src/pages/` both still show no such route or file, so the "four public
  listing pages already shipped" framing this entry opened with is unchanged
  in shape, just one page further along (`CategoryLanding.jsx`, `NewTools.jsx`,
  `SharedStack.jsx` plus now `Checkout.jsx`, which is public but noindexed and
  irrelevant to this gap).
  Two corrections, both line-reference drift from the same pagination/
  `ToolCard`-extraction commit the facet-counts gap's own 2026-08-31 03:20
  deepening already found and fixed for its part of this file:
  1. The search `<input type="search">` this entry's plan says to copy the
     markup of is no longer at `Discover.jsx:162-175` — it's now
     `Discover.jsx:162-170` (still correct enough to not have been flagged
     before, off by five lines, not worth a full re-cite, noted here so
     whoever builds this checks the live file rather than trusting either
     number blindly).
  2. The filter predicate this entry says to extract into a shared
     `matchesQuery()` is now the `.filter(...)` at `Discover.jsx:98-108`
     inside the `results` `useMemo` (was cited as `:93-112` — the memo body
     grew a `.map()` for `matchScore` and a `.sort()` for prominence
     tiebreak after the filter, exactly as the facet-counts gap's deepening
     already documented for its own extraction of the same block). Confirmed
     again this run: no `matchesQuery`/`search.js`/`facetCounts.js` exists
     anywhere in `src/utils/` yet, so this extraction is still un-done and
     still needed by both gaps — whichever ships first should factor the
     predicate out once, not twice, per this entry's own original note.
  One real addition, not just a correction: this entry's original plan never
  mentions `useHead()` because the per-route-meta gap it depends on was still
  mid-build when this was written (2026-08-29) — it only finished shipping
  its last two call sites today (`docs/research-backlog.md:945`, 2026-08-31
  12:22 UTC). That hook is now the established, load-bearing pattern for
  every public page's `<title>`/description/canonical — eight call sites
  confirmed via `grep -rl "useHead(" src/pages/`: `NewTools.jsx`,
  `CategoryLanding.jsx`, `Pricing.jsx`, `SharedStack.jsx`, `Checkout.jsx`,
  `About.jsx`, `NotFound.jsx`, `Methodology.jsx`. `SearchTools.jsx` should
  call it too, same as every sibling public page — a static title/description
  when `q` is empty ("Search 750+ AI tools — Toolnaut" / "Search Toolnaut's
  AI tool catalog by name, category or use case"), and a dynamic one when a
  query is present (e.g. `` `"${q}" — AI tool search results — Toolnaut` ``),
  `path: '/search'` either way. This doesn't reopen the "no sitemap entries"
  exclusion already in this plan — a `<title>` costs nothing and matches
  every other public page's baseline, a sitemap entry for an infinite `?q=`
  space is the thing correctly staying out of scope. Also confirmed
  `src/utils/head.js`'s own header comment: the prerenderer snapshots
  `document.documentElement.outerHTML` after render, so `useHead()`'s effect
  output is exactly what a crawler sees for this route too, same mechanism
  as every already-shipped call site.
  `scripts/smoke.mjs:32`'s current route array (confirmed by reading the
  live file) is `['/', '/goal', '/example', '/methodology', '/pricing',
  '/about', '/privacy', '/terms', '/app/stack', '/app/discover',
  '/app/favorites', '/app/compare?tools=chatgpt,claude', '/app/tools/chatgpt',
  '/app/learning', '/app/community', '/app/settings', '/office', '/s/chatgpt',
  '/tools/code', '/new']` — no `/search` entry, confirming the plan's own
  footgun note still applies; the addition should be `/search?q=chatgpt`
  (matching the existing `?tools=chatgpt,claude` precedent of exercising the
  query-driven branch, not just the empty-state one).
  No other part of the plan needs correction — `CategoryLanding.jsx`'s shape
  (heading, `useHead`, card grid keyed off `CATEGORY_META`, no
  add-to-stack/favorite actions on a public page) is confirmed unchanged and
  remains the right model to copy.
- **Shipped this run:** built exactly to the deepened spec. Extracted
  `matchesQuery(tool, q)` into new `src/utils/search.js` (7 unit tests) and
  switched `Discover.jsx`'s inline predicate to call it — same behaviour,
  one definition. New public `src/pages/SearchTools.jsx` at `/search`
  (`App.jsx`), modeled on `CategoryLanding.jsx`'s read-only card grid,
  `useHead()`-driven title/description (static when `q` is empty, dynamic
  per-query otherwise), empty state and no-results state both offering the
  same guaranteed-non-empty category links Discover's own empty state uses.
  Each result links to the already-public `/s/:slug` (via `encodeStackSlugs`)
  rather than the gated `/app/tools/:slug`. Added a `RESULT_CAP` of 60 with a
  "narrow your search" hint for broad queries — not in the original spec, but
  the same DOM-explosion problem `Discover.jsx`'s own `PAGE_SIZE` comment
  already documents applies here too, so an unbounded render was not a
  reasonable default. Added a "Search" link to the landing page nav
  (`Landing.jsx`) so the page is reachable without knowing the URL, `/search`
  to `scripts/smoke.mjs` and `scripts/prerender.mjs`'s `ROUTES` (bare route —
  the SEO value of the static page itself, not the infinite `?q=` space,
  matching this entry's own sitemap exclusion reasoning), and a matching
  `/search` entry in `public/sitemap.xml` (monthly, 0.7 — same tier as
  `/about`, since unlike `/new` its content doesn't change on its own).

### A shared stack can only be viewed, never adopted — the receiving half of Share/Export was never built
- **Status:** FIXED (this commit) — small, well-scoped defect in already-shipped
  code, fixed in this run rather than left OPEN; entry kept for the record per
  this backlog's own audit trail.
- **Seen in:** not a competitor pattern — found re-reading the already-shipped
  Share/Export gap (`/s/:slugs`, shipped `42bdc994`) against its own stated
  goal: "Every visitor who finishes the quiz or curates a stack is a free
  acquisition channel the moment they can show it to someone else." That
  sentence only describes the *sending* half. The receiving half — what
  happens to the friend who actually clicks the link — was never checked
  against the same bar the rest of this file holds every other gap to (does
  the feature deliver on its own premise, end to end).
- **Gap:** `src/pages/SharedStack.jsx:9` already resolves the shared slugs into
  real `tool` objects via `decodeStackSlugs(slugs).map(getTool).filter(Boolean)`
  — the exact data a recipient would need to adopt the stack — but the only
  action on the page is a single CTA at `SharedStack.jsx:47-52`:
  `<Link to="/goal">Build my own stack</Link>`, unconditional, regardless of
  who's looking at it. Confirmed by reading the full 55-line file: no session
  check, no `addToStack` import, no branch at all. Two concrete failure modes
  result. (1) A **signed-in existing user** who already has a persona and a
  stack (say, three tools) clicks a friend's `/s/notion-ai,perplexity,cursor`
  link, sees three tools they don't have, and the only button sends them back
  through the entire 60-second quiz from scratch — there is no way to just add
  those three tools to the stack they already have. `stackStore.js`'s
  `addToStack(slug)` (`stackStore.js:19-22`) is a trivial, already-deduping,
  session-independent localStorage write — CTASection.jsx already proves the
  session-branch pattern this page needs (`CTASection.jsx:8,17`:
  `loadSession() ? '/app/stack' : '/goal'`), but `SharedStack.jsx` never
  imports `loadSession` or `stackStore` at all. (2) A **first-time,
  signed-out visitor** (the more common case, and the one the original gap's
  own citation of StackShare's "whole growth loop is public stacks getting
  shared" was written for) clicking the same link sees the tools their friend
  picked, then the CTA discards that context entirely and drops them into
  the generic 9-question quiz — the exact tools they just looked at and
  presumably came here *because of* never carry forward into their own
  stack, the persona-matching flow, or the roadmap. The share feature proves
  its own premise only up to the click; nothing downstream of the click
  honors what was shared.
- **Why it matters:** this directly undercuts the ROI of the already-shipped
  feature it completes — a share link is only a growth loop if the person who
  receives it converts into someone who *keeps* what was shared, not someone
  who has to start over. For the signed-in case, it's plain lost retention
  value: an existing user with genuine intent (they clicked a friend's link)
  is handed more friction than a first-time visitor gets, which is backwards.
  For the signed-out case, it's a missed activation opportunity precisely
  parallel to the still-open "First-session onboarding checklist" gap's own
  framing — momentum (here, "I already know I want these three tools") that
  the product fails to capitalize on the moment it exists.
- **Smallest useful version (what to actually build):**
  - `SharedStack.jsx`: import `loadSession` from `../state/authStore` (same
    import CTASection.jsx already uses) and `addToStack`, `loadStack` from
    `../state/stackStore` (same import Discover.jsx/Stack.jsx already use).
  - **Signed-in branch** (`loadSession()` truthy): replace the unconditional
    CTA with a primary button, "⚡ Add all N to my stack," that calls
    `tools.forEach(t => addToStack(t.slug))` then navigates to `/app/stack`
    via `useNavigate()` — `addToStack` already no-ops on a slug already
    present (`stackStore.js:20`), so this is safe to click even on tools the
    user already has, no pre-check needed. Keep a small secondary text link,
    "View my stack instead," to `/app/stack` for a user who doesn't want to
    merge. If every shared tool is already in the user's stack (check via
    `loadStack()` once on mount), skip the primary button and show "You
    already have all N of these" instead — never render an "add" action with
    nothing left to add.
  - **Signed-out branch** (no session): keep today's behavior as the
    fallback, but make it carry the shared tools forward instead of
    discarding them — the same `addToStack()` calls run first (the store
    itself doesn't require a session, it's plain localStorage), *then*
    navigate to `/goal` same as today. `personaGenerator.js`'s starter-stack
    logic already unions with whatever's already in `stackStore` (confirmed
    by re-reading how `Stack.jsx:116-119` already builds its resolved tool
    list as starter ∪ added — this is the exact union the original share-stack
    gap's spec called out at line 56 above), so a visitor who takes the quiz
    after this lands on `Stack.jsx` with their friend's shared tools already
    present alongside their new persona's starter picks, instead of losing
    them. Button label changes from "Build my own stack" to "Add these & take
    the quiz" so the action being taken is honestly described.
  - Reuse the existing "Copied!"-style transient-label pattern already used
    twice in this codebase (`Stack.jsx`'s share button, `Learning.jsx`'s share
    badge) for a brief "Added!" confirmation before the navigate, so the
    click doesn't feel instant/silent.
  - **What this would NOT include** (kept out to bound the diff): no
    per-tool selection checkboxes (all-or-nothing "add all," matching the
    original share-stack gap's own "union of slugs, no partial state" design
    — a selective-add UI is a real v2, not needed for this fix to close the
    gap); no merging progress/status state (only slugs get added, same
    restriction the original gap already committed to — a shared stack never
    carried per-tool progress in the URL to begin with, so there is nothing
    to merge there); no analytics/attribution on which shares convert (no
    backend to aggregate it, same reasoning every other rejected-for-backend
    gap in this file already gives); no change to the read-only card grid
    itself — this only changes the one CTA block at the bottom of the page.
- **Build size:** S — one import addition, one `useNavigate` hook, a
  session-branched CTA block replacing the current unconditional `<Link>` in
  `SharedStack.jsx`, reusing `addToStack`/`loadSession`/`loadStack` verbatim
  from existing stores. No backend, no new dependency, no new route, no new
  store, no new util.
- **Found:** 2026-08-29 06:20 UTC
- **Fix shipped this run:** `SharedStack.jsx` now branches on `loadSession()`.
  Signed-in visitors get a primary "⚡ Add all N to my stack" button (calls
  `addToStack` for every shared slug, then navigates to `/app/stack`) plus a
  "View my stack instead" link, or — if `loadStack()` already contains every
  shared slug — an honest "You already have all N of these" message instead
  of an add action with nothing left to add. Signed-out visitors keep the
  original "take the quiz" destination, but the shared tools are now added to
  `stackStore` first, so they carry forward into the starter-stack union
  `Stack.jsx` already builds. Both branches show a brief "✓ Added!" state on
  the button before navigating. Exactly as specced above — one file, no new
  dependency, no new route. Verified via `npm test` (102/102), `npm run
  build`, and `npm run smoke` (20/20 routes clean, including `/s/chatgpt`).

### Tags are collected and searched on, but never clickable — no tag-based browsing exists
- **Status:** OPEN
- **Seen in:** Futurepedia (fetched fresh this run) renders a row of
  topic tags under every tool card (`#ai-chatbots`, `#code-assistant`, etc.)
  that are themselves links back into the directory, filtered to that tag —
  its own description of the pattern is "tags... enable cross-reference
  browsing and topic-based discovery." G2/Capterra's "related products by
  feature tag" links and AlternativeTo's per-tag browse pages are the same
  idea: a tag is treated as a first-class navigation surface, not just
  decoration on a listing.
- **Gap:** Toolnaut already has exactly this data, structured and complete —
  every one of the 704 catalog entries carries a `tags` array (confirmed by
  direct extraction from `toolsCatalog.js`: 43 distinct tags across all
  entries, from broad ones like `design` (187 tools) and `code` (145) down to
  narrow ones like `voice` (28) and `open-source` (33)) — and it's already
  load-bearing for search: `Discover.jsx:107`'s free-text filter explicitly
  ORs `tool.tags.some((tag) => tag.includes(needle))` into its match
  predicate, so typing a tag name into the search box already works. But
  nothing in the UI ever turns a tag into something a user can click.
  `ToolDetail.jsx:133-135` renders up to 4 tags per tool as plain
  `<span className="arcade-chip">` elements with no `onClick`, no `<Link>`,
  no `href` — confirmed by reading the surrounding 10 lines in full, it's a
  bare `.map()` producing static text. `Discover.jsx`'s own card grid never
  renders `tags` at all (grepped `tag` case-sensitively across the file —
  the only hit is the search-predicate line above). There is no `?tag=`
  query param, no tag filter row alongside the existing category/price/level
  chips, and no dedicated tag-browse page anywhere — grepped
  `tag.{0,3}(filter|browse|chip|param)` across `src/pages` and
  `src/components`, zero hits outside `ToolDetail.jsx`'s static rendering.
  A user reading a tool's page and noticing it's tagged `voice` has no way
  to see the other 27 `voice`-tagged tools short of guessing the word and
  typing it into Discover's search box themselves.
- **Why it matters:** this is the same "data already collected, never
  surfaced" shape as the shipped Fresh-Finds and Skills-Graph gaps, except
  cheaper than either — the matching logic Discover already runs for typed
  search is the exact logic a clicked tag needs, so this doesn't even need a
  new filter predicate, just a link. Tags are also a genuinely different cut
  through the catalog than the 6 broad `CATEGORY_META` domains or the 26
  `sourceCategory` values already exposed via category-landing pages: a tag
  like `agent` (90 tools) or `open-source` (33) cuts across categories in a
  way neither existing taxonomy does, so this closes a real, distinct
  discovery path rather than duplicating the category-landing-page gap
  already shipped.
- **Smallest useful version (what to actually build):**
  - `ToolDetail.jsx:133-135`: wrap each tag `<span>` in a `<Link
    to={`/app/discover?q=${encodeURIComponent(tag)}`}>`, keeping the exact
    same `arcade-chip` class/markup so no visual change beyond becoming
    clickable (add a subtle hover state consistent with how other chip-links
    behave elsewhere in the app, if any precedent exists — otherwise the
    existing chip style alone is enough signal once it's a real link).
    Reuses the already-existing `q` param and its already-existing
    tags-inclusive search predicate — no new query param, no new filter
    logic, no new util. This is the entire fix for the primary "tag is a
    dead end" problem.
  - `Discover.jsx`: optionally render up to 2-3 tags per card in the
    existing card markup (below the blurb, same muted small-text style
    `Discover.jsx:195`'s blurb line already uses), each also a `<Link
    to="?q=<tag>">` — this extends the same clickable-tag pattern to the
    page a user is most likely to be browsing multiple tools on already,
    but is a smaller, separable addition to the primary `ToolDetail` fix and
    can ship after it if it doesn't fit the same diff.
  - **What this would NOT include** (kept out to bound the diff): no
    dedicated tag filter chip row alongside the existing category/price/level
    filters on `Discover.jsx` (that's a heavier, separate UI decision —
    43 tags is too many for a chip row the way 6 categories or 4 price
    tiers already work; reusing the free-text `q` param via a link is the
    honest smallest version, not a new faceted-filter UI); no tag-browse
    landing page (`/tags/:tag`) — the existing gated `/app/discover?q=` path
    already serves this need for a signed-in user, and a public crawlable
    version would need its own scoping decision closer to the still-open
    `/alternatives/:slug` gap's shape, not assumed here; no change to how
    tags are stored, generated, or normalized in the catalog or radar
    pipeline; no exact-tag-only matching (clicking a tag reuses the existing
    substring-across-multiple-fields search predicate as-is, which can
    occasionally over-match on a short common word like `data` — a known,
    accepted limitation of reusing `q` rather than adding a dedicated
    exact-tag filter, flagged here rather than silently ignored).
- **Build size:** S — a `<Link>` wrap around ~3 lines in `ToolDetail.jsx`
  (no new component, no new store, no new util, no new route), plus an
  optional small addition to `Discover.jsx`'s card markup. No backend, no
  new dependency.
- **Found:** 2026-08-29 09:20 UTC
- **Deepened 2026-08-30 21:06 UTC:** the `Discover.jsx` half of this plan is
  now wrong, not just stale — `Discover.jsx` was refactored after this entry
  was written (visible in its own file history: pagination + a `ToolCard`
  extraction) and no longer contains any inline card markup at all. Re-read
  the current file in full: results render via `<ToolCard tool={tool} .../>`
  (`Discover.jsx:270-286`), a shared component now imported by **both**
  `Discover.jsx` and `Favorites.jsx` (confirmed: `Favorites.jsx:12` imports
  it and renders it at three call sites, `Favorites.jsx:110,151,223`) —
  `ToolCard.jsx`'s own header comment says so explicitly: "The one tool
  card, shared by Discover and Favorites." So "optionally render tags on
  Discover's card grid" is actually one change in `ToolCard.jsx`, and it's a
  strictly better target than originally scoped: fixing it there closes the
  gap on Favorites too, for free, which didn't exist as a page when this
  entry was first written.
  There is a real technical trap here a builder needs to know before
  touching this file, not just a line-number correction. `ToolCard.jsx`'s
  own comment (`ToolCard.jsx:8-19`) explains why the card is NOT a `<Link>`
  wrapping everything: the tool-name `<h3>` holds a `<Link>` with
  `after:absolute after:inset-0` (`ToolCard.jsx:64`) that stretches
  invisibly over the *entire* card so the whole card is clickable, and every
  interactive control below it (the ADD button, the favorite heart, the
  compare checkbox) is deliberately wrapped in `relative z-10`
  (`ToolCard.jsx:86`) so it sits above that stretched overlay and stays
  clickable — the comment calls out that the old design's
  interactive-inside-interactive markup was actually broken for keyboard/
  screen-reader users, which is exactly the failure mode a naively-added
  tag `<Link>` would reintroduce if dropped in without the same treatment.
  Concretely: tags would need to render inside that same
  `relative z-10` control row (`ToolCard.jsx:86-119`, alongside the ADD/
  favorite/compare controls) or in their own `relative z-10` wrapper — not
  as a bare `<Link>` floating elsewhere in the card body — or they render
  visually but are unreachable/unclickable underneath the stretched
  whole-card link, the identical bug this component was rewritten to avoid
  for its other controls. `ToolCard.jsx` doesn't render `tags` at all today
  (confirmed reading the full 123-line file — `PRICE_LABELS`/`LEVEL_LABELS`
  pills exist at `ToolCard.jsx:80-83`, no `tags` reference anywhere), so
  this is new markup, not a tweak to something already half-there.
  The `ToolDetail.jsx` half of the original plan is unaffected and still
  exactly accurate — re-confirmed `ToolDetail.jsx:131-135` still renders
  bare `arcade-chip` spans with no `onClick`/`href`, line numbers unchanged.
  **Corrected smallest useful version for the `ToolCard.jsx` half:** add a
  small tag row inside the existing `relative z-10` block at
  `ToolCard.jsx:86-119`, after the existing button/heart/compare row (a new
  wrapping `<div>` so it doesn't fight the `flex items-center gap-2` layout
  those three controls already use) — up to 2 tags, each a small
  `arcade-chip`-styled `<Link to={`/app/discover?q=${encodeURIComponent(tag)}`}>`,
  matching `ToolDetail.jsx`'s own destination pattern exactly. No change to
  `Favorites.jsx` itself required — it inherits the new row automatically
  by rendering the same `ToolCard`.
  Two other entries in this file plan to touch the *same* file
  (`Discover.jsx`) and should be aware of this same staleness rather than
  re-discovering it independently when picked up: the still-OPEN
  "facet counts" gap's predicate-extraction target (`Discover.jsx:85-101`
  in its own text) is now around `Discover.jsx:95-114` in the current file
  (the `results` `useMemo`, shifted by the pagination code added above it —
  same shape, just moved, not broken); and the still-OPEN
  "Community-submitted tools" gap's empty-state insertion point
  (`Discover.jsx:170-180` in its own text) is now the `results.length === 0`
  block at `Discover.jsx:227-254`, which itself changed shape (it now
  computes `suggestedCats` category buttons and a "clear all filters"
  button that didn't exist when that gap was written) — whoever builds
  either of those two should re-read the current file rather than trusting
  the stale line numbers, same caution this deepening is logging here for
  the tags gap.

### Pricing already got its honest fix written — it just never got wired in, so the false claims and their own correction now sit on the same pages
- **Status:** SHIPPED c04149e
- **Seen in:** not a competitor pattern — found reading every file under
  `src/components/sections/` for the marketing-audit sweep this backlog has
  run for a week (the same sweep that already produced the shipped
  Compare/Fresh-Finds/Skills-Graph gaps and the REJECTED chat-assistant/
  Team-tier/digest-email/Discord findings, all sourced from `planData.js`).
  `CapabilityMatrix.jsx` + `src/utils/capabilityMatrix.js` had never been
  checked by any prior entry in this file — it is not in the section list
  any earlier finding names, and it turns out to be exactly the fix those
  four earlier findings kept saying didn't exist yet.
- **Gap:** `src/utils/capabilityMatrix.js` was built specifically to correct
  the dishonest-pricing problem — its own header comment names the failure
  mode outright: *"Most Pro and Team rows do not exist yet, and Toolnaut
  takes no payment at all. `status` marks what is actually live so the page
  can say so plainly. Shipping a pricing table that implies working paid
  features would be a straightforward lie."* Every capability this backlog
  already flagged as a false claim — AI chat assistant, PDF export, team
  analytics/admin/collaboration — is correctly marked `status: 'planned'`
  here (`capabilityMatrix.js:38-91`), and `CapabilityMatrix.jsx` renders
  each one with a plain "planned" pill plus a closing line: *"Nothing is
  charged today... rows marked planned are the intended shape of a paid
  tier, not features you are being sold"* (`CapabilityMatrix.jsx:97-101`).
  This component is real, already built, already wired into a route.
  But the component it was meant to replace was never removed or corrected.
  `PricingSection.jsx` (backed by `planData.js`'s `PLANS`/`COMPARISON`,
  the exact source of the four earlier false-claim findings) still renders
  three plan pillars with unqualified `✦`-bulleted feature lists —
  `'AI-powered chat assistant (Claude-powered Q&A)'` (`planData.js:44`),
  `'Export learning roadmaps as PDF'` (`planData.js:49`), `'Team analytics
  dashboard'`, `'Admin controls + member management'`, `'API access for
  integrations'` (`planData.js:68-74`) — and a "Compare all plans" table
  with bare `✓`/`✕` checkmarks (`PricingSection.jsx:60-67`,
  `COMPARISON` at `planData.js:80-94`), none of it carrying a single
  "planned" or "coming soon" qualifier anywhere in `PricingPillar.jsx` or
  `PricingSection.jsx`. Two concrete, different failures result:
  1. **On `/pricing`** (`Pricing.jsx:41,43`): `PricingSection` and
     `CapabilityMatrix` render back to back on the same page, in that
     order, and directly contradict each other. A visitor reads unqualified
     "$8/month, AI-powered chat assistant ✦" in the first section, scrolls
     down, and reads "Toolnaut takes no payment at all right now" about the
     very same feature in the second. That is a worse outcome than either
     section alone — a single false claim is a trust problem; two adjacent
     sections that can't agree on whether the product charges money today
     reads as the page not knowing its own state.
  2. **On `/` (the homepage)** — checked `Landing.jsx:130-139` directly:
     `PricingSection` is mounted there too (`Landing.jsx:137`, comment in
     `Pricing.jsx:11-12` claiming it "was removed from the landing flow" is
     stale — confirmed by reading the current file, it was not), and
     `CapabilityMatrix` is never rendered on the homepage at all. So the
     first-time visitor most likely to see this — everyone who hasn't
     clicked through to `/pricing` yet — gets the unqualified false claims
     with zero correction anywhere on the page they're actually looking at.
- **Why it matters:** this supersedes and ties together four separate
  earlier findings in this file (the REJECTED chat-assistant/Team-tier
  entry, the REJECTED digest-email entry, the REJECTED Discord entry, and
  the still-OPEN PDF-export entry) — every one of them independently
  concluded "the honest fix is a copy correction... no edit made, flagged
  for whoever owns pricing copy." That copy correction already exists,
  written and correct, sitting unused for exactly this purpose one file
  over. This is not a new feature to design — it's wiring together two
  pieces of already-built code that disagree, and it is strictly worse
  left as-is than either piece would be alone, because the contradiction
  itself is now visible to anyone who reads the whole `/pricing` page top
  to bottom.
- **Smallest useful version (what to actually build):**
  - Decide `PricingSection`'s feature lists cannot keep rendering
    unqualified — the exact `status: 'live' | 'planned'` split
    `capabilityMatrix.js` already computed per-capability is the source of
    truth to reuse, not a second one to invent. Cheapest correct fix:
    replace `planData.js`'s bare `features` string arrays with objects
    carrying the same `{ text, status }` shape `CAPABILITIES` already uses
    (`capabilityMatrix.js:38-91`), or — smaller diff — cross-reference each
    `PLANS[].features` string against `CAPABILITIES` by capability name at
    render time in `PricingPillar.jsx` and append the same "planned" pill
    `CapabilityMatrix.jsx:32-36` already renders wherever a feature isn't
    live. Either way, `PricingPillar.jsx:61-69`'s `<ul>` map gets one
    conditional badge per `<li>`, reusing the exact pill markup that
    already exists rather than inventing new chrome.
  - Same fix for `PricingSection.jsx`'s `COMPARISON` table
    (`planData.js:80-94`): a bare `true` today renders a lime `✓`
    (`PricingSection.jsx:10`) with no live/planned distinction at all —
    `false` and `planned-but-shown-as-included` currently look identical
    to a fabricated `true`. Smallest fix: extend `COMPARISON` rows to carry
    a third state (`'planned'`) alongside `true`/`false`, and give `Cell`
    (`PricingSection.jsx:9-13`) a third render branch — a muted "planned"
    label matching `CapabilityMatrix`'s own styling — instead of only ever
    showing included/excluded.
  - Fix the stale comment at `Pricing.jsx:11-12` while touching this file —
    it currently claims `PricingSection` "was removed from the landing
    flow," which is false as of the current `Landing.jsx`; either correct
    the comment or, if the intent really was to remove it from the
    homepage, do that removal for real (a product decision for whoever
    ships this, not assumed here — flagging the contradiction between the
    comment and the code is this entry's job, not deciding which one is
    wrong).
  - Once `PricingSection` itself carries honest live/planned labels
    end-to-end, `CapabilityMatrix` on `/pricing` becomes a second,
    corroborating view rather than a contradicting one — no need to remove
    either component, they just need to agree.
  - **What this would NOT include** (kept out to bound the diff): no
    change to `capabilityMatrix.js`'s own data (already correct, already
    the source of truth this fix reuses); no removal of `PricingSection`
    or `CapabilityMatrix` from either page — both stay, this is a
    reconciliation, not a redesign; no pricing-amount changes ($3/$8/$50
    stay as reservation prices, matching the already-honest "Reserve
    {plan} at launch" CTA copy `PricingPillar.jsx:76` already uses); no
    change to the plan-tier structure, ids, or `authStore.js` plan storage;
    no backend/billing work — this is a display-only correction, same as
    every other "false claim, honest fix is copy-shaped" finding already
    logged in this file.
- **Build size:** S — extend `planData.js`'s `features`/`COMPARISON` data
  shape (or cross-reference `capabilityMatrix.js` at render time), a small
  conditional badge added to `PricingPillar.jsx`'s existing `<li>` map, a
  third render branch in `PricingSection.jsx`'s `Cell` component, one stale
  comment fixed. No backend, no new dependency, no new route, no new store.
- **Found:** 2026-08-29 15:20 UTC

### Vendor deal / coupon codes — REJECTED, no vendor relationships exist to back it
- **Status:** REJECTED — needs real, ongoing vendor partnerships this project
  has none of; logged so a future research hour doesn't re-spend time on the
  same dead end.
- **Seen in:** studied fresh this run. 2026-vintage AI-tool directories
  (BitDegree's AI deals page, GraBon's AI-tools coupon aggregator,
  Layer3Labs' AI-discounts roundup, PoweredByAI's "Exclusive Deals" section)
  all run a dedicated deals/coupon surface — lifetime-deal codes, percentage-
  off promo codes, education/nonprofit discount programs — as a named,
  separate section from the plain listing pages, because it converts
  browsing intent into an immediate click a directory can track and monetise.
- **Gap:** confirmed with `grep -rniE "coupon|discount|promo.?code|deal\b"
  src/` — zero hits anywhere in the app (`price`/`pricing` fields on catalog
  entries are Toolnaut's own tier labels — `free`/`freemium`/`paid` plus a
  free-text string — never a vendor-issued code or percentage). Toolnaut has
  no deals surface of any kind.
- **Why this is REJECTED rather than logged OPEN:** every directory example
  above sources its codes from a real, standing commercial relationship with
  each vendor — negotiated discount percentages, tracked affiliate/referral
  links, and codes that need to be checked periodically for expiry (GraBon's
  own copy: "expired promotions removed as soon as they stop working"). None
  of that exists for Toolnaut and none of it is a code change: it needs a
  human to reach out to vendors, negotiate terms, and then keep the resulting
  codes current by hand or via a partner API this project has no access to.
  Inventing placeholder codes or claiming a discount Toolnaut has no
  agreement to honour would be exactly the fabrication this file's own
  ethos rules out elsewhere (`TrustPanel.jsx`'s own "Commercial ties: None.
  No affiliate link, no referral code, no paid placement" line, rendered on
  every tool page today, would become a live lie the moment a fake code
  shipped next to it). This is the same shape of rejection as the Team-tier
  and chat-assistant findings above — a real backend/ops dependency outside
  a client-side SPA's reach — except here the missing piece is a business
  relationship, not a database.
- **What would actually be honest to ship, if this ever becomes real (not
  proposed as a build — flagged for whoever owns vendor relationships):** if
  Toolnaut ever negotiates even one real vendor discount, the honest minimum
  is a single `dealUrl`/`dealCode` field added to that one catalog entry,
  rendered as a labelled row on `ToolDetail.jsx` next to `TrustPanel`'s
  existing "Commercial ties" disclosure (which would then need to say what
  the relationship *is*, not "none") — no dedicated deals page or directory-
  wide section is worth building for a single entry, and no code should be
  written speculatively ahead of an actual agreement existing.
- **Build size:** N/A — rejected, no code proposed. The blocker is a business
  relationship, not an engineering task.
- **Found:** 2026-08-30 12:20 UTC

### No tool has a visual identity — 704 catalog entries, zero logos or favicons anywhere
- **Status:** OPEN
- **Seen in:** a problem area rather than one competitor, checked directly
  against every directory this file already studies. Futurepedia, There's An
  AI For That, Product Hunt and G2/Capterra all render a tool's actual logo
  or app icon next to its name on every single surface — the result grid, the
  detail page, comparison tables — because in a text-dense list of 700+ nearly
  identical two-sentence blurbs, a recognizable logo is the fastest scan cue a
  visitor has for "oh, I know that one" or "that looks unfamiliar, worth a
  closer look." None of them ship a text-only card at this catalog size.
- **Gap:** confirmed with `grep -rn "<img" src/` (excluding `InstallPrompt.jsx`,
  whose one hit is the PWA install icon, unrelated) and by reading
  `ToolCard.jsx` (the shared card for Discover + Favorites, its own header
  comment says so) and `ToolDetail.jsx` in full: zero `<img>` tags anywhere a
  tool is rendered, on any of the now seven-plus card-shaped surfaces
  (`ToolCard.jsx`, `ToolDetail.jsx`, `CategoryLanding.jsx`, `NewTools.jsx`,
  `SharedStack.jsx`, `Compare.jsx`, `Graveyard.jsx`/`Alternatives.jsx` if
  either still-open gap ships). Every card's only visual identity is a 2x2px
  colored dot keyed off `CATEGORY_META[tool.category].color`
  (`ToolCard.jsx:42`, repeated near-verbatim in `CategoryLanding.jsx:87`) —
  the *category* is color-coded, but nothing distinguishes ChatGPT from
  Claude from Grok beyond the name text itself, even though `toolsCatalog.js`
  already carries a real `website` URL on 662 of 704 entries (confirmed by
  direct extraction: `grep -o '"website": "[^"]*"'` over the whole file,
  704 matches, 42 empty), which is exactly the one piece of data a favicon
  needs and Toolnaut already stores. `ToolDetail.jsx:138-149` already uses
  that same `website` field for a "VISIT WEBSITE" link — the field is
  trusted and rendered today, just never turned into an image.
- **Why it matters:** this is the starkest "every competitor has it, we don't"
  gap this file has found, because it isn't a missing feature so much as a
  missing table-stakes visual convention — a directory whose entire value
  proposition is "browse 700+ tools quickly" is currently asking a visitor to
  read every single name character-by-character with no logo to shortcut
  recognition, on the exact page (`Discover.jsx`, via `ToolCard`) that gets
  the most traffic in the app. It also compounds every other Discover-page
  gap already in this file (facet counts, clickable tags, popularity badges)
  — all of them make the *filtering* faster, none of them make the *scanning*
  of a results grid faster, which is the more fundamental UX cost at 700+
  entries.
- **Smallest useful version (what to actually build):**
  - New pure util `src/utils/faviconUrl.js`: `getFaviconUrl(tool, size = 32)`
    — returns `null` immediately if `tool.website` is empty or fails `new
    URL(tool.website)` (42 of 704 entries, plus any malformed radar-sourced
    URL — never guess a domain from the tool name), otherwise returns
    `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`.
    Google's favicon service is the pragmatic zero-infrastructure choice
    here — it needs no API key, resolves a real icon (or a generic globe
    placeholder, never a broken image) for effectively any domain regardless
    of that site's own favicon path/format, and is exactly the same service
    Chrome's own new-tab page and countless directories already rely on for
    this — building a `/favicon.ico`-guessing fallback chain ourselves would
    be more code for a strictly worse hit rate. Pure function, easy to `node
    --test` like `shareStack.js`/`newTools.js`.
  - **Explicit, honest tradeoff to name rather than bury** (this file holds
    itself to naming tradeoffs, not hiding them — same spirit as
    `TrustPanel.jsx`'s "no affiliate link, no referral code" line): rendering
    this image means every tool card sends that tool's bare domain name to
    Google's favicon endpoint on every page load. That's a real, minor
    third-party data flow this app doesn't have today — not a privacy
    disaster (a domain name, not a user identifier, and the same request any
    browser already makes by visiting the tool's own site), but worth stating
    plainly rather than shipping silently, especially given how much of this
    backlog's own credibility argument rests on disclosure. If whoever builds
    this wants zero third-party calls instead, the fallback is trying
    `${origin}/favicon.ico` directly against the tool's own domain (one
    fewer party involved, but a materially worse hit rate and no size
    control) — a judgment call to make at build time, not decided here.
  - `ToolCard.jsx`: a small (28-32px) rounded `<img>` next to the tool-name
    `<h3>` (`ToolCard.jsx:70-77`) — outside the stretched `::after` link
    overlay this component's own header comment already explains
    (`ToolCard.jsx:9-20`), so it needs no `relative z-10` treatment unlike
    the interactive controls below it, since an image needs no click target
    of its own. `loading="lazy"`, `alt=""` (decorative — the adjacent heading
    already names the tool, an `alt` here would be a redundant screen-reader
    announcement), and an `onError` handler that hides the `<img>` (sets a
    local `useState` broken flag) rather than leaving a broken-image icon,
    same "never show something fabricated or broken" instinct as the
    zero-rating/zero-count-badge decisions already made elsewhere in this
    file. When `getFaviconUrl` returns `null` (42 tools, or any future
    catalog entry with a bad URL), render nothing — no placeholder square,
    no generic icon, since a blank space reads as "no logo available" while
    a fabricated placeholder implies data that isn't there.
  - `ToolDetail.jsx`: a larger (48-56px) version of the same `<img>` next to
    the `<h1>` (`ToolDetail.jsx:122`), same `getFaviconUrl`/`onError` pattern,
    reusing `faviconUrl.js` rather than a second implementation.
  - **What this would NOT include** (kept out to bound the diff): no rollout
    to `CategoryLanding.jsx`/`NewTools.jsx`/`SharedStack.jsx`/`Compare.jsx`
    in v1 — those all clone a near-identical card shape (per this backlog's
    own repeated notes on `CategoryLanding.jsx` being copied for `NewTools`
    and `SharedStack`), so once the pattern is proven on the two
    highest-traffic surfaces above, adding the same three-line `<img>` to
    each clone is a cheap, obvious, and separately-shippable follow-up, not
    a reason to hold this diff open across five files at once; no self-hosted
    favicon caching/proxy (would need a backend or a build-time fetch step
    for 662 URLs, real infrastructure this file's own ranking rule rejects);
    no per-tool manual logo upload/curation (a maintenance burden with no
    tooling behind it — a computed favicon URL needs zero upkeep as the
    catalog grows via radar, a hand-curated logo set does not); no change to
    `radar/` — this reads the `website` field radar already writes, it
    doesn't need radar to fetch or store anything new.
- **Build size:** S — one new pure util (`faviconUrl.js`), a small `<img>`
  addition to two existing components (`ToolCard.jsx`, `ToolDetail.jsx`) with
  an error-hiding handler in each. No backend, no new dependency, no new
  route, no new store, no radar change.
- **Found:** 2026-08-31 21:15 UTC

### Discover has filters but no sort control — the 700+ result grid has exactly one fixed order

- **Status:** SHIPPED (this run, sha in DEVLOG)
- **Seen in:** FutureTools.io (fetched fresh this run, 4,000+ tools across 29
  categories) lets a visitor sort its grid by most-upvoted, date-added, or
  name; the same three-way sort (relevance/newest/name, sometimes plus
  price) is standard across directory and e-commerce UX generally — Amazon,
  G2 and Capterra all pair their filter sidebar with an explicit sort
  dropdown separate from the filters themselves, because filtering narrows
  the set but a visitor still wants control over what order they see it in
  once narrowed.
- **Gap:** confirmed by reading `Discover.jsx` in full (330 lines) — the
  page has three real filters (category pills, price pills, level pills,
  `Discover.jsx:201-222`) plus free-text search, all correctly URL-backed via
  `searchParams` so they're shareable and back-button-safe. But the result
  order itself is not a user choice anywhere: `results` (`Discover.jsx:96-111`)
  is unconditionally `.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) ||
  tieBreak(a, b))` — `matchScore` first, `byProminence` as the only tiebreak
  — with no branch, no UI control, and no second code path. Grepped
  `sort|Sort` across `src/pages` and `src/components`: the only other sort
  call sites are `getNewTools()` (`newTools.js:16`, used solely for the
  separate "New this week" strip and the `/new` feed, not Discover's main
  grid) and the identical match-score sort duplicated for category-landing
  pages (`Discover.jsx`'s own comment at the `tieBreak` line points at this
  file's earlier "prominence" entry, which documents the same sort existing
  in exactly one place with exactly one order). A visitor with no completed
  quiz (`answers` null, so `matchScore` returns a flat baseline for every
  tool) filters down to, say, 40 "design" tools and gets them back in
  whatever order the prominence tiebreak happens to produce — not
  alphabetical, not newest-first, not any order the visitor chose or can
  change. There is no `sort` URL param, no dropdown, no button, anywhere on
  the page.
- **Why it matters:** this is a different axis than every other still-open
  Discover gap in this file (facet counts, clickable tags, visual identity)
  — those all make *narrowing* the grid faster or more informative; this is
  the one gap about *ordering* it, and at 700+ entries even a well-filtered
  category can still return dozens of results a visitor has to scan
  top-to-bottom in an order they never asked for. It's also cheaper than it
  looks precisely because of two pieces of infrastructure this file has
  already tracked: `discoveredAt` is already populated on every
  radar-discovered tool and already has a working comparator in
  `getNewTools()` (just unused outside the "New this week" strip), and plain
  alphabetical needs nothing new at all. The one sort a visitor might
  reasonably expect most — "most popular" — is the one this file's own
  still-open "Popularity signal" gap above has not yet made possible
  (GitHub stars/HN points are collected but not yet written onto published
  records), so that option is a natural, cheap follow-up the moment that gap
  ships, not a blocker to shipping the other two now.
- **Smallest useful version (what to actually build):**
  - Add a `sort` URL param (`Discover.jsx`'s existing `setParam`/
    `searchParams` pattern handles this identically to `cat`/`price`/`level`
    — no new state-management approach needed) with three values: `match`
    (today's behavior, and the default so an existing shared/bookmarked URL
    with no `sort` param is unaffected), `newest`, `name`.
  - A small dropdown or pill row next to the existing filter rows
    (`Discover.jsx:199-222`), reusing the same `Pill` component already
    defined in this file (`Discover.jsx:27-37`) for visual consistency
    rather than introducing a `<select>` with different chrome.
  - Extend the `results` `useMemo` (`Discover.jsx:96-111`) with a branch on
    `sort`: `newest` sorts by `discoveredAt` descending, tools with no
    `discoveredAt` (the bundled 704-entry baseline) sorted after every
    radar-discovered tool and alphabetically among themselves as a stable
    fallback — exactly mirroring `isNewTool`'s own "only live-hydrated tools
    qualify" rule so this never contradicts the already-shipped Fresh-Finds
    gap's definition of "new"; `name` is a plain
    `a.name.localeCompare(b.name)`; `match` keeps the current
    score-then-prominence chain unchanged.
  - **What this would NOT include** (kept out to bound the diff): no
    "popularity" sort option yet — its data doesn't exist on published
    records until the still-open Popularity-signal gap ships; adding it now
    would mean either faking an order or silently no-op'ing a visible
    control, both worse than waiting. No sort control on the public,
    unauthenticated pages (`CategoryLanding.jsx`, `/new`, `/search`) — those
    are intentionally simpler, single-purpose views per this file's own
    earlier notes on that boundary, and adding a stateful sort control to a
    crawlable page raises its own SEO/canonicalization questions not
    scoped here. No multi-key sort (e.g. "newest, then by name") — a single
    active sort key is the honest smallest version matching every
    competitor example above, which likewise offer one sort at a time.
- **Build size:** S — one new URL param following the existing filter-param
  pattern, a small pill/dropdown control reusing the existing `Pill`
  component, and one added branch in the existing `results` sort chain. No
  backend, no new dependency, no new route, no new store, no radar change.
- **Found:** 2026-09-01 00:20 UTC
- **Shipped this run:** built exactly to spec. New `src/utils/sortResults.js`
  exports `compareByNewest`/`compareByName` (6 unit tests in
  `test/sort-results.test.mjs`) — pulled out of `Discover.jsx` because they
  don't need the per-render `tieBreak` closure the `match` order does, so
  they're independently testable. `Discover.jsx` gained a `sort` URL param
  (`match` default, absent from the URL so old links are unaffected;
  `newest`/`name` otherwise) and a "Sort" pill row next to the existing
  Price/Level filters, reusing the same `Pill` component. The `results`
  `useMemo` branches on `sort` before falling through to the existing
  score-then-prominence order; the pagination reset key now includes `sort`
  so switching orders snaps back to page one instead of showing a stale
  page length. No new route, no new dependency, no store change — exactly
  the bounded diff this entry specced. Verified via `npm test` (237/237: 102
  radar + 135 app, up from 231), `npm run build` (15/15 routes prerendered),
  and `npm run smoke` (21/21 routes, 0 console errors).

### Public "What's New" changelog — the product ships almost daily, nothing user-facing ever says so
- **Status:** OPEN
- **Seen in:** a problem area rather than one directory competitor — a public
  changelog is a standard SaaS trust/retention pattern (Linear's
  `linear.app/changelog`, Vercel's `vercel.com/changelog`, Stripe's own
  changelog are the best-known examples), distinct from anything the
  directory competitors already studied in this file do, because it isn't
  about the tool *catalog* changing, it's about the *product itself*
  visibly improving. Toolnaut is an unusually strong candidate for this
  pattern specifically: this repo's own `DEVLOG.md` shows a real feature
  shipping to production on almost every single day this backlog has been
  running, which is a genuine, differentiated fact about the product that
  currently has zero public-facing proof.
- **Gap:** confirmed absent — grepped `changelog|what.?s.?new|release.?notes`
  (case-insensitive) across all of `src/`, zero hits, and there is no
  `/changelog` route among `App.jsx`'s 27 routes (`App.jsx:87-141`). The
  closest thing that exists, `DEVLOG.md`, is explicitly not this: it's
  written in first-person by the autonomous dev routine for a human
  maintainer to audit ("Radar health," "Researched today," raw commit shas),
  lives outside `src/` entirely, and is never fetched or rendered by the app
  (grepped `DEVLOG` across `src/` and `public/` — zero hits). A visitor has
  no way to learn that Discover got a sort control last week, that public
  search shipped the week before, or that the catalog crossed 700+ tools —
  all real, true, dated facts about active investment in the product that
  today only exist in git history and this backlog file, neither of which a
  visitor will ever open.
- **Why it matters:** Toolnaut is a free, pre-revenue, single-builder beta
  product — exactly the profile a skeptical visitor is most likely to wonder
  "is this actually maintained, or a one-off side project that will go
  stale?" about, per `About.jsx`'s own admission ("Built solo... on a
  near-zero budget"). A changelog is the cheapest possible answer to that
  doubt: dated, specific, verifiable proof of continuous shipping, using
  content that already exists as a byproduct of how this backlog/DEVLOG
  routine already works — no new research or design effort, only a
  customer-facing rewrite of what's already being recorded daily. It also
  doesn't compete with or duplicate the (shipped) "Weekly Fresh Finds" strip
  — that surfaces new *catalog tools*, this surfaces new *Toolnaut features*
  — and it's free, evergreen, frequently-updated content for the same SEO
  reasoning already used to justify the category-landing and `/new` pages
  above (a page that visibly changes every few days is exactly what a
  crawler favors re-indexing).
- **Smallest useful version (what to actually build):**
  - New `src/utils/changelogData.js`: a small, hand-authored, newest-first
    array of `{ date: 'YYYY-MM-DD', title, body }`, written in plain
    customer-facing language translated from real shipped commits (not raw
    commit messages or shas) — e.g. from this repo's actual recent history,
    entries like `{ date: '2026-09-01', title: 'Sort your search results',
    body: 'Discover now lets you sort by best match, newest, or A-Z instead
    of one fixed order.' }` or `{ date: '2026-08-31', title: 'Search without
    signing in', body: 'A new public search page lets anyone look up a tool
    by name before creating a stack.' }`. Pure data, no logic — a builder
    seeding the first version should pull 6-10 real entries straight out of
    `git log --grep='^feat'` / this backlog's own SHIPPED entries and
    DEVLOG.md, translated into the voice `About.jsx`'s copy already uses
    (plain, second-person-adjacent, no jargon), not invented.
  - New `src/pages/Changelog.jsx` at route `/changelog`, public (outside
    `AppShell`'s session guard, registered next to `/about` in `App.jsx`) —
    reuse `About.jsx`'s exact page shell verbatim: same starfield background,
    same header (`BrandLogo` + a "⚡ Find your stack" CTA), one `sticker`
    card per changelog entry (`About.jsx:64-77`'s card markup, minus the
    accordion-less Q&A framing — a date line, a bold title, a one-line body)
    in reverse-chronological order. `useHead()` call with a fixed
    title/description (`'What's new — Toolnaut'` / a line naming that the
    product ships continuously), same pattern as every other page in this
    file's "per-route meta" precedent.
  - One footer link: `ContactSection.jsx`'s `COLUMNS` array already has a
    "Resources" group with "How it works" / "How we choose" / "Open the app"
    (`ContactSection.jsx:43-50`) — add `{ label: "What's new", to:
    '/changelog' }` there, matching the file's own "EVERY DESTINATION HERE IS
    A ROUTE THAT EXISTS" discipline once the route is real.
  - Route-list housekeeping this file has flagged as easy to forget on every
    prior page-adding gap: add `/changelog` to `scripts/smoke.mjs`'s route
    array (`scripts/smoke.mjs:32`), `scripts/prerender.mjs`'s `ROUTES` array
    (`scripts/prerender.mjs:28`), and one `<url>` entry in `public/sitemap.xml`
    (`changefreq: weekly`, since real entries land roughly that often per
    `DEVLOG.md`'s own recent history — not `daily` like `/new`, which is
    driven by an actual daily cron; a changelog with no new entry on a quiet
    day would make a `daily` claim false).
  - **What this would NOT include** (kept out to bound the diff): no RSS/Atom
    feed or email digest of changelog entries (the weekly-alerts gap above
    already covers "notify me about new things," scoped to catalog tools, not
    product features — extending it to product changes is a separate,
    later decision, not required to ship a browsable page); no admin UI or
    CMS for authoring entries — the data file is hand-edited the same way
    `DEVLOG.md` and this backlog file already are, by whoever runs the daily
    feature-run routine appending one customer-facing line when they mark a
    gap `SHIPPED`; no linking each entry to its commit sha or PR (this is
    customer-facing copy, not an engineering log — `DEVLOG.md` already serves
    that audience); no categorization/filtering/search over entries — a
    single reverse-chronological list is the honest smallest version at this
    product's current shipping cadence; no backfilling every historical
    commit — 6-10 real, representative recent entries is enough to prove the
    pattern and make the page non-empty, more can be added on each future
    ship the same way DEVLOG.md already grows one section at a time.
- **Build size:** S — one small hand-authored data file (`changelogData.js`),
  one new page closely modeled on the existing `About.jsx` shell, one new
  public route, one footer link, and the three routine route-list additions
  (`smoke.mjs`, `prerender.mjs`, `sitemap.xml`) this file has already flagged
  as the standard checklist for any new public page. No backend, no new
  dependency, no new store.
- **Found:** 2026-09-02 03:20 UTC

### RSS feed of newly discovered tools — the radar publishes daily, nothing subscribes to it
- **Status:** OPEN
- **Seen in:** a problem area distinct from any directory studied so far in
  this file — Hacker News (`news.ycombinator.com/rss`), Product Hunt (per-topic
  RSS), and virtually every changelog/blog tool (Linear, GitHub Releases) ship
  a machine-readable feed alongside their human-facing "what's new" page,
  specifically because a feed reader, a newsletter curator, or another
  aggregator site wants to pull new items without polling a webpage or
  scraping HTML. It is the one standard content-syndication format this
  research file hasn't checked Toolnaut against yet, despite Toolnaut being
  exactly the kind of frequently-updated source such tools want to subscribe
  to.
- **Gap:** confirmed absent — grepped `rss|atom|feed\.xml|application/rss`
  (case-insensitive) across `index.html`, `public/`, and `radar/`, zero hits
  beyond the unrelated word "feedback." `public/sitemap.xml` is the only
  syndication-shaped file in the repo, and it's a hand-written static file
  (no script under `scripts/` or `radar/scripts/` generates or touches it —
  confirmed by grepping `sitemap` across both directories, zero hits), so
  there's no existing "generate an XML file from the tool list" precedent to
  extend, only sync-to-app.js's tools.json export to model the mechanism on.
  Toolnaut already ships the public, crawlable `/new` page (`src/pages/
  NewTools.jsx`, shipped 2026-08-22) for a *human* to check back on — but a
  human has to remember to visit; a feed reader checks on its own schedule.
  This is a genuinely separate consumption channel from `/new`, not a
  duplicate of it, in the same way the (rejected, unbuildable-client-side)
  email-alerts gap is separate from the (shipped) in-app "New this week"
  strip: same underlying data, different delivery mechanism, different
  audience (power users / other site owners who want to embed or watch
  Toolnaut's feed, vs. a signed-up user browsing the app).
- **Why it matters:** unlike the email-digest gap (REOPENED, still blocked on
  "no backend to send mail from"), an RSS/Atom feed needs no server at
  request-time — it's a static XML file, exactly like `sitemap.xml` and
  `tools.json` already are, generated once per radar run and served as-is by
  Vercel's static hosting. That makes it the one personalisation/distribution
  idea in this file that is *fully* buildable within the "static SPA, no
  backend" constraint with zero exceptions, not "buildable except for the
  delivery mechanism" the way the email gap keeps rediscovering. It also
  costs the radar pipeline almost nothing to produce, since `sync-to-app.js`
  already computes the exact list this feed needs (`published` tools with
  every field the feed requires: `name`, `blurb`, `slug`, `discoveredAt`,
  `website`) as a side effect of writing `tools.json` — the feed is a second,
  cheap output of data radar already assembles nightly, not a new discovery
  or enrichment cost.
- **Smallest useful version (what to actually build):**
  - New `radar/scripts/gen-feed.js`, run in the same GitHub Actions step as
    `sync-to-app.js` (`.github/workflows/radar.yml`'s "Export published tools
    into the app" step) — reads the same `published` array `sync-to-app.js`
    already filters from `radar/data/tools.json` (`lifecycle === 'published'`),
    sorts by `discoveredAt` descending, takes the newest 50 (a conventional
    RSS cap — feed readers don't want an ever-growing file, and 50 covers
    several radar runs' worth of finds even on a busy week), and writes
    `public/feed.xml` as RSS 2.0: one `<channel>` with `title`/`link`/
    `description` describing Toolnaut's radar, one `<item>` per tool —
    `<title>` = tool name, `<link>` = the same `${SITE}/app/tools/${slug}`
    pattern `NewTools.jsx`'s own JSON-LD already uses (inheriting that same
    page's already-flagged wrinkle: it points at a session-gated route, not a
    public one — worth fixing in the same pass as this feed if it's cheap, but
    not a blocker; a subscriber can still read the title/description/pubDate
    in their reader without clicking through), `<description>` = `blurb`,
    `<guid isPermaLink="false">` = `slug` (stable even if the URL scheme
    changes later), `<pubDate>` = `new Date(discoveredAt).toUTCString()`
    (RFC 822, exactly what RSS 2.0 requires — `discoveredAt` is already a
    valid ISO timestamp per `tools.json`, confirmed by reading a live record).
  - Noise filtering: `sync-to-app.js`'s own `published` list has no noise
    filter today (it exports everything `lifecycle === 'published'`), but the
    app-side "New this week" strip and the `/new` page both additionally
    filter through `isCatalogNoise()` (`src/utils/prominence.js`) before
    display, to hide GitHub-repo/forum-post/awesome-list scrapes that
    technically cleared the publish threshold but read as noise in a
    human-facing list. A subscriber's feed reader is exactly as human-facing
    as `/new`, so `gen-feed.js` should apply the same filter — but
    `prominence.js` lives in `src/utils/` (browser-side) and `gen-feed.js`
    runs under `radar/`, the pipeline's own independent half per this repo's
    own architecture split (CLAUDE.md: "two independent halves"). Rather than
    having `radar/` import across that boundary, `gen-feed.js` should
    duplicate the three small regexes `isCatalogNoise()` checks (repo-slug
    names, forum-post titles, bare link-list names — `prominence.js:70-73`)
    inline, the same way `radar/` already keeps its own independent copies of
    anything `src/` also needs rather than sharing code across the split.
  - `index.html`: one `<link rel="alternate" type="application/rss+xml"
    title="Toolnaut — newly discovered AI tools" href="/feed.xml" />` in
    `<head>`, next to the existing `manifest`/`icon` link tags
    (`index.html:31-33`) — this is the standard autodiscovery tag feed readers
    and browsers look for, and costs one line.
  - `public/robots.txt`: no change needed (a feed file needs no crawl
    directive, unlike a new page route), but `public/sitemap.xml` gets no new
    `<url>` entry either — a `.xml` feed isn't itself a page to index, it's a
    resource pointed to by the `<link rel="alternate">` tag, matching how
    `tools.json` is fetched by the app without a sitemap entry of its own.
  - **What this would NOT include** (kept out to bound the diff): no Atom
    format alongside RSS (RSS 2.0 alone covers every mainstream reader; Atom
    is a nice-to-have, not required for a first cut); no per-category feeds
    (`/feed/code.xml`, etc.) — one feed of everything newly published is the
    honest smallest version, category-specific feeds are a natural follow-up
    once the base mechanism is proven; no full-content `<content:encoded>`
    (the plain `<description>` = blurb is enough for a title-and-summary
    reader experience); no changing `sync-to-app.js` itself — `gen-feed.js` is
    a new, separate script reading the same source data, not a modification
    to the existing export; no retroactive backfill of tools discovered
    before this ships (the feed starts from whatever's in `radar/data/
    tools.json` the first time `gen-feed.js` runs, same "starts now, doesn't
    rewrite history" posture the changelog gap above already takes).
- **Build size:** S — one new Node script (`radar/scripts/gen-feed.js`,
  closely modeled on `sync-to-app.js`'s own read-filter-write shape), one new
  line in `radar.yml`'s existing export step, one `<link>` tag in
  `index.html`. No backend, no new dependency, no change to the app's `src/`
  half at all (this is purely a `radar/` + static-file addition).
- **Found:** 2026-09-02 06:20 UTC

### Settings page hardcodes "no server copy" — the sync backend it's describing already exists elsewhere in the app
- **Status:** OPEN
- **Seen in:** not a competitor pattern — found while re-checking `src/state/`
  against `CLAUDE.md`'s own "No backend: all user state lives in localStorage"
  line, which is now stale. `src/state/sync.js` (feature-detected Supabase
  push/pull, `syncAvailable()`/`pushAll()`/`pullAll()`/`syncOnSignIn()`) and
  `src/components/app/SyncStatus.jsx` (a live `subscribeSync()`-driven "Syncing…
  / Synced / Couldn't sync" banner, mounted app-wide at
  `src/shells/AppShell.jsx:161`) both already exist and are already wired into
  every sign-in via `src/state/authStore.js:81,86` (`watchSession()` calls
  `syncOnSignIn()` on both the initial session check and every
  `onAuthStateChange` event). This is real, shipped infrastructure, not a
  future promise — the opposite shape from every other entry in this file.
- **Gap:** `src/pages/app/Settings.jsx` — the one page in the app whose entire
  point is "what does Toolnaut know about me, and what can I change" (its own
  file-header comment, `Settings.jsx:33-35`) — never imports anything from
  `state/sync.js` (confirmed: grepped its full import block, zero hits) and
  instead makes two separate hardcoded, unconditional claims:
  - Guest branch, `Settings.jsx:427-430`: "Signing in does not sync anything
    yet — there is no server copy of your stack. It reserves your account for
    when there is."
  - Signed-in branch, `Settings.jsx:458-461`: "Your stack, shortlist and
    progress live in this browser only — there is no server copy yet, so
    clearing site data clears them."
  Both lines were written in the exact same commit that introduced `sync.js`
  and wired `syncOnSignIn()` into `authStore.js` (`git log -S"does not sync
  anything yet"` and `git log -S"syncOnSignIn"` both land on `81e5078`,
  v0.50.1) — so even at the moment this copy was written, the sync engine it
  describes as nonexistent was shipping in the same release. `SyncStatus.jsx`'s
  own comment (`SyncStatus.jsx:14-16`) says the reason it renders nothing for
  `'unavailable'`/`'idle'` is that "no server sync configured is the app's
  normal state today" — meaning as of that component's writing, the Supabase
  migration `sync.js` depends on (`supabase/migrations/0002_user_state.sql`,
  confirmed present on disk) had not yet been run in production. Whether it has
  been run by now is not something this run can check from the repo alone
  (`syncAvailable()` does a live RPC call, `sync_available`, against the actual
  database) — but that uncertainty is itself the finding: Settings.jsx's claim
  is hardcoded to one answer forever, while the true answer is a runtime fact
  the app already knows how to ask (`syncAvailable()`) and already displays
  correctly elsewhere (`SyncStatus.jsx`). The day someone finally runs that
  migration, `SyncStatus.jsx` will start correctly saying "Synced" for 2.6
  seconds after every sign-in and then get out of the way — while the one page
  a worried user actually goes to check ("is my data really backed up before I
  clear my browser / switch devices?") will keep telling them, permanently and
  confidently, that it isn't. Nobody edits Settings.jsx when a migration runs;
  this file exists precisely to catch the promises/claims nothing will
  remember to revisit.
- **Why it matters:** this is the inverse of every other "promised, not built"
  entry in this file — here the capability is real and the copy undersells it,
  which is a quieter but still real trust cost: a hesitant visitor deciding
  whether to sign in reads "does not sync anything yet" as a reason to stay a
  guest, right on the page designed to earn that trust, even on a day sync is
  fully live. And because the claim is hardcoded rather than derived from the
  same signal `SyncStatus.jsx` already reads, it will silently go stale the
  moment sync flips on in production, with nothing in the codebase positioned
  to notice.
- **Smallest useful version (what to actually build):**
  - `Settings.jsx`: import `syncAvailable` from `../../state/sync` (the same
    module `SyncStatus.jsx` and `GuestImportPrompt.jsx` already import from —
    no new module needed). Call it once in a `useEffect` on mount (it works
    for guests too — `syncAvailable()` only checks `isSupabaseConfigured` and
    fires the `sync_available` RPC, it never touches `uid()`) and hold the
    result (`null` while checking, then `true`/`false`) in local state.
  - Guest branch (`Settings.jsx:427-430`): render the current sentence only
    when `available === false` (or still checking — `null` should show nothing
    rather than guess, same "don't announce what you don't know yet" rule
    `SyncStatus.jsx` already follows for its own `null`/`idle` case). When
    `available === true`, replace it with copy that tells the truth in the
    other direction, e.g. "Signing in saves your stack, shortlist and progress
    to your account, so it's there the next time you sign in on any device."
  - Signed-in branch (`Settings.jsx:458-461`): same conditional swap. When
    `available` is `false`, keep today's sentence (still honest on a device
    where sync genuinely isn't live). When `true`, replace "there is no server
    copy yet" with something that also names the actual live signal, e.g.
    pointing at `syncState()` directly — "Backed up to your account" /
    "Couldn't back up last change — still safe on this device," reusing
    `SyncStatus.jsx`'s own three-state `LABEL` copy (`SyncStatus.jsx:10-13`)
    instead of inventing new wording, so the two places in the app that talk
    about sync never drift apart again.
  - **What this would NOT include** (kept out to bound the diff): no change to
    `sync.js`, `authStore.js`, or any migration file — this is purely a
    Settings.jsx copy/data-binding fix, not a sync-engine change; no new
    always-visible sync indicator elsewhere in the app beyond what
    `SyncStatus.jsx` already provides; no attempt from this repo to determine
    or change whether migration `0002_user_state.sql` has actually been run in
    the live Supabase project — that's an operational fact outside version
    control, not something a code change decides.
- **Build size:** S — one `useEffect` + one `syncAvailable()` call added to an
  already-imported-elsewhere module, two conditional copy branches in one
  existing file. No backend, no new dependency, no new store, no new route.
- **Found:** 2026-09-02 09:20 UTC

### "Free public beta, no payment" survived on three pages after a live paywall shipped
- **Status:** SHIPPED (this run, sha in DEVLOG)
- **Seen in:** not a competitor pattern — the same class of finding as the
  Settings.jsx sync gap directly above, found doing the same kind of check
  this run: re-reading `src/` against a claim `CLAUDE.md`/the codebase itself
  no longer supports, this time about money rather than sync. Found while
  reading `git log --oneline -8 origin/master` for CI health at the start of
  this run and noticing the newest commit on `master`,
  `fc5e240` ("feat(subscriptions): free trial, entitlement enforcement,
  support page"), is a real, live paywall — not a future promise.
- **Gap:** `AppShell.jsx:54-72` routes any signed-in, un-entitled user to a
  real `/pay` page (`src/pages/Pay.jsx`, `App.jsx:120`) the moment the server
  says `PAYMENTS_ENABLED` is on, and `FounderOffer.jsx:142` already links
  `/pay?plan=founder` from the landing page itself. `Checkout.jsx`'s own
  header comment names exactly which claims this breaks once the flag flips:
  "The pricing page, the footer and /methodology all currently state that
  Toolnaut is in free public beta and takes no payment of any kind... until
  the beta actually ends." `Methodology.jsx:139-141`'s own comment agrees,
  in even more explicit terms: "TIED TO PAYMENTS_ENABLED. If that flag is
  ever switched on, this paragraph becomes false and must change in the SAME
  commit — along with the footer line in ContactSection.jsx and the pricing
  copy." One of those three already happened:
  `git log --oneline -3 -- src/components/sections/ContactSection.jsx` shows
  its footer line was made conditional on
  `import.meta.env.VITE_PAYMENTS_ENABLED === 'true'` in commit `cf3a79e`
  (2026-09-01). The other two named in its own comment were not: `Methodology.jsx:143-144`
  still unconditionally asserted "Toolnaut is in free public beta and does
  not currently take payment of any kind," `CapabilityMatrix.jsx:98-100`
  still unconditionally asserted "Nothing is charged today... has no payment
  path," and a fourth site the comment didn't even name,
  `Pricing.jsx:39` and its `useHead` description, still unconditionally said
  "beta is free — plans open at launch" / "Toolnaut is free while it is in
  public beta." Whether `PAYMENTS_ENABLED` is actually `true` in the live
  Vercel deployment right now is not something this run can verify from the
  repo alone (same operational-fact caveat the Settings.jsx entry above
  already names for `syncAvailable()`) — but that uncertainty is exactly the
  bug: three pages asserted "no payment path" as a permanent fact instead of
  reading the one flag the fourth page (and the server) already treats as
  the source of truth, so the day the flag flips in production, three
  customer-facing pages keep telling every visitor Toolnaut cannot charge
  them while it already had.
- **Why it matters:** this is a materially bigger trust risk than the sync
  gap above — a visitor or a paying customer reading "free public beta, no
  payment path" on the pricing page itself, seconds after (or during) an
  actual checkout, is not a soft UX miss, it's the site contradicting a real
  transaction as it happens. It also undercuts `Methodology.jsx`'s entire
  stated purpose ("EVERY CLAIM ON THIS PAGE IS CHECKED AGAINST THE CODE"),
  landing on a page whose commercial-relationships section exists
  specifically to be trusted.
- **What shipped this run:** applied the exact conditional pattern
  `ContactSection.jsx` already established (`import.meta.env.VITE_PAYMENTS_ENABLED
  === 'true'`) to the three lagging sites, changing nothing when the flag is
  off (today's behaviour is byte-identical) and swapping in an accurate
  sentence when it's on:
  - `Methodology.jsx`: the commercial-relationships paragraph now reads
    "Paid plans are now live, on the terms shown at /pricing... vendors
    still pay nothing for inclusion or position" when the flag is on,
    unchanged otherwise.
  - `CapabilityMatrix.jsx`: the closing caption under the tier table swaps
    to "Paid plans are live — see /pricing to subscribe..." when the flag is
    on; also softened the file's header comment, which asserted "Toolnaut
    takes no payment at all right now" as a standing fact.
  - `Pricing.jsx`: both the `<title>`/meta description and the "beta is
    free" tape-label above the pricing table now branch on the same flag.
  - Deliberately did **not** touch `capabilityMatrix.js`'s per-row
    live/planned data (which specific Pro/Team capabilities are actually
    live is a separate, deeper audit than a copy-consistency fix — flagging
    it here rather than guessing at row-level accuracy in the same diff) or
    `App.jsx`/`Checkout.jsx`'s own internal comments (developer-facing, not
    copy a visitor reads — leaving them slightly stale is a smaller cost
    than widening this diff to touch non-user-facing text).
  - Verified via `npm test` (211/211), `npm run build` (15/15 routes
    prerendered), and `npm run smoke`.
- **Found:** 2026-09-02 15:20 UTC

### The leaderboard's own precondition for going real has already shipped, and nobody came back to flip it
- **Status:** OPEN
- **Seen in:** not a competitor pattern this time — a self-audit of a TODO
  Toolnaut's own code left for itself. G2/Capterra-style "real ranking"
  products (and Toolnaut's own `explorerCount()`, shipped for the landing
  page's Explorers tile) are the reference for how to expose an aggregate
  safely once accounts exist; this gap is about noticing that reference case
  now applies somewhere it hasn't been applied yet.
- **Gap:** `src/utils/leaderboardData.js:12-17` says, in its own header
  comment: *"When accounts land, the same [scoring] function runs
  server-side over stored progress and these rows get replaced by a query.
  Nothing else in this file survives that change."* Accounts landed — read
  in full, `src/state/authStore.js` has real Supabase Google OAuth +
  email-magic-link sign-in (not just the old simulated session), and
  `supabase/migrations/0002_user_state.sql` already gives every signed-in
  account a durable, RLS-protected server copy of exactly the three inputs
  `computeScore()` needs: `tool_refs` (stack size), `roadmap_progress`
  (steps done), and `profiles`. `src/state/sync.js` already pushes and pulls
  all three on every sign-in (`syncOnSignIn` → `pullAll()` + `pushAll()`,
  `sync.js:75-195`). None of that is wired to the leaderboard: `RankCard.jsx`
  still calls `myStanding()` (`communityStats.js:70-100`), which reads only
  `localStorage` and ranks the visitor against `SAMPLE_LEADERBOARD` — seven
  hardcoded fictional handles (`leaderboardData.js:41-49`, `IS_SAMPLE =
  true`) — on every device, signed in or not. A user who syncs their stack
  across two laptops (the feature `sync.js` exists to provide) still sees
  two independent fake leaderboards, one per device's local streak, because
  nothing server-side aggregates across accounts. The precedent for doing
  this safely already exists in the same codebase: `0001_explorers.sql`'s
  `explorer_count()` is a `security definer` function that lets `anon` read
  one aggregate (a count) over a table with **no** select policy of its own
  — proving the "expose the aggregate, never the rows" pattern this gap
  needs is already accepted practice here, not a new privacy posture.
- **Why it matters:** a fake leaderboard is the exact credibility risk the
  file's own comments warn about ("the single most credible-looking thing a
  product can put on a landing page"), and it currently sits inside the
  authenticated app (`Stack.jsx` via `RankCard`), not just the marketing
  site — a signed-in user comparing their real, synced progress against
  seven names that never move is a worse experience than showing nothing,
  because the "Preview — leaderboard not live yet" badge is easy to miss
  and the numbers otherwise look completely real (tabular scores, streak
  days, category dots). Once accounts existed to rank, every day this stays
  sample data is a day the game mechanic that's supposed to drive roadmap
  completion (`POINTS_PER_PLACE`, `SCORING.perRoadmapStep`) is motivating
  people to climb past nobody.
- **Smallest useful version (what to actually build):**
  - New migration `supabase/migrations/0008_leaderboard.sql`, modeled
    directly on `0001_explorers.sql`: add a `handle` text column to
    `public.profiles`, backfilled and set-on-insert to a generated
    pseudonym (adjective + noun + short numeric suffix, derived from `id`
    so it's stable and needs no extra uniqueness dance) — never the
    person's real name or email, matching the "no personal data leaves this
    table" rule `0001` already sets. Add one `security definer` function,
    `public.leaderboard_top(n int)`, returning `(handle, score, rank)` for
    the top `n` accounts computed from `tool_refs` + `roadmap_progress`
    counts (the same weights as `SCORING` in `leaderboardData.js`, kept in
    SQL so client and server can't drift — comment the two in sync the way
    the drift-guard test already does for `INTERACTIONS` elsewhere in this
    repo), plus `public.my_rank()` returning the caller's own real rank via
    `auth.uid()`. Both grant `execute` to `anon, authenticated` and select
    nothing else — no table gets a new SELECT policy, exactly like
    `explorer_count()`.
  - New `src/utils/leaderboard.js`: `fetchLeaderboard()` calls
    `syncAvailable()` (already exported from `sync.js`) first — unconfigured
    or not-yet-migrated both mean "stay on sample data," feature-detected
    the same way `sync.js` already treats a missing RPC as "not set up"
    rather than an error. When available, calls the two RPCs and returns
    `{ top, myRank, real: true }`; otherwise returns `{ top: null, real:
    false }` so the caller falls back to `SAMPLE_LEADERBOARD` unchanged.
  - `RankCard.jsx`: on mount, try `fetchLeaderboard()`; render the real rows
    and drop the "Preview — leaderboard not live yet" badge only when
    `real` comes back true — same honesty rule `StatsSection.jsx` already
    applies to `explorers` vs `SUBSCRIBERS` (a real tile and a seeded tile
    never share one "this is real" signal). Streak stays local-only per
    `communityStats.js`'s existing note that it's owned by `Stack.jsx`, so
    the server-computed score in v1 uses stack size + roadmap steps only
    (drop `perStreakDay` from the server formula, keep it in the local
    "your standing" tile above the board, which already renders separately
    from the ranked table) — understating everyone's real score identically
    is honest; inventing a synced streak column is not what this gap asked
    for.
  - **What this would NOT include** (kept out to bound the diff): no
    friend-only or category-filtered leaderboards; no live/realtime updates
    (a page-load fetch is enough, same freshness bar as `explorerCount()`);
    no letting a user set their own handle in v1 (auto-generated only —
    letting people type free text into a public-facing name field is a
    moderation problem this gap doesn't need to open); no syncing streak
    server-side (a separate, smaller gap if ever wanted); no changing
    `myStanding()`'s local-only fallback path for signed-out visitors, who
    keep exactly today's experience.
  - **Verify before shipping:** the migration is additive and RLS-scoped
    like every prior one, but run it in a Supabase staging/SQL-editor pass
    first and confirm `leaderboard_top`/`my_rank` return nothing broken
    against **zero** signed-up accounts (the RPC must return an empty set,
    not error, the same "degrade honestly" case `0001`'s own comment
    calls out) before wiring the client to it.
- **Build size:** M — one additive SQL migration (mirrors `0001_explorers.sql`
  closely), one new client module, and swapping `RankCard.jsx`'s data source
  behind the same feature-detection `sync.js` already uses elsewhere. No new
  route, no new dependency.
- **Found:** 2026-09-03 00:35 UTC
