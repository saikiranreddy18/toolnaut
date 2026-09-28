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
- **Verification 2026-09-14 12:09 UTC:** the 2026-08-24 note above asserted
  "the other five either ship... or have an OPEN spec" for the five
  `FeaturesSection.jsx` tiles besides this one, but only cited evidence for
  Progress Tracking — the other four were waved through on inspection, not
  checked. That gap in rigor was real: the "Weekly Fresh Finds" entry
  (bottom of this file, found 2026-09-14 06:10 UTC) shows the same tile
  actually failing its own promise once someone looked closely (domain-blind
  ranking despite claiming "matched to your evolving role"). Went back and
  checked the two tiles nobody had individually verified:
  - **Smart Learning Paths** ("sequenced for your level and your available
    time") — real. `roadmapGenerator.js:66-79,84-119` slices both `steps`
    and `lessons` by `PACE_STEPS[pace]` (`micro:2, light:3, steady:3,
    deep:4`, line 54) reading `quiz.answers.pace`, and branches copy on
    `level === 'beginner' || 'dabbler'` throughout `stepsFor`/`lessonsFor`.
    Both halves of the claim (level, pace/time) genuinely drive the
    generated roadmap content, not just a label.
  - **Signal over Noise** ("we watch the release firehose so you only hear
    about tools that matter to you") — real, if read as "filtered, not
    literally per-user personalized." `isCatalogNoise()` (`src/utils/
    prominence.js:70`) strips junk/repo-shaped radar candidates from every
    tool-facing surface (`Discover.jsx:156,162`, `NewTools.jsx:15`,
    `ToolStars.jsx:166`) before anything reaches the user, and Discover's
    main grid separately re-ranks by `matchScore(tool, answers)`
    (`Discover.jsx:126`) — so the firehose is both filtered and, on the
    highest-traffic surface, personalized.
  No new gap here — both tiles hold up. Recording this so a future run
  doesn't re-spend an hour re-verifying the same two claims, and so nobody
  treats the original "the other five ship" line as checked when only one
  of the five actually was.

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
- **Deepened 2026-09-17 15:20 UTC — this entry's own core claim has gone
  partly stale and needed re-checking against current `src/`, not just its
  placement plan:** `ae1c530` ("feat: product tour, real subscriber stats,
  truthful legal pages", shipped 2026-09-13, after both this entry's original
  write-up and its first deepening) added `src/components/app/AppTour.jsx` —
  a real, already-wired first-run spotlight tour of `/app`, mounted in
  `AppShell.jsx:275` and gated on a per-account `tourSeen()` flag
  (`exus_tour_v1`), with a "replay tour" control in `Settings.jsx:119`. It was
  invisible to this entry's original grep (`checklist|getting.started|onboard`
  matches neither "tour" nor its event names), which is why it went unnoticed
  for four days. This means the original framing — "no checklist/onboarding-
  progress component exists... nothing tells them the roadmap, the community,
  or adding a second tool from Discover are things worth doing today" — is no
  longer fully accurate: a new user today gets a 7-step guided walkthrough
  naming Stack, Discover, Favorites, Learning, the chat assistant and Settings
  before they are left alone on `Stack.jsx`.
  **What is still missing, i.e. why this stays OPEN rather than SHIPPED or
  REJECTED:** `AppTour` is a one-time, skippable *explainer* — it fires once,
  has no memory of which of its 7 steps a user actually acted on afterward,
  and cannot answer "am I activated yet" on a return visit. It is the "here
  is where things are" job; this gap's checklist was always the "have you
  actually done them" job — a persistent, self-hiding, checkmark-based nudge
  that updates across sessions from real stack/quiz/roadmap/community state,
  which `AppTour` structurally cannot do (it has no per-step "done" concept,
  only "seen the whole tour or not"). The two are complementary, not
  duplicates, the same way this entry's 2026-08-28 deepening already found
  `Stack.jsx`'s "NEXT UP" section to be complementary rather than redundant.
  **Re-verified placement is still current:** `Stack.jsx:262` is still the end
  of the persona tagline `<p>`, and the streak sticker still opens right after
  at `Stack.jsx:272` — the 2026-08-28 "mount between persona header and streak
  sticker" placement call is unchanged. **One addition to the spec:** since
  `AppTour` now exists and already introduces Discover/Favorites/Learning/
  Community by name in its own copy, the checklist's row labels should reuse
  matching language rather than independently invented copy, so a new user
  doesn't read two different names for the same destination four screens
  apart (e.g. `AppTour`'s "Find more" vs. a checklist row that might otherwise
  say "Try Discover"). No other part of the spec (steps, dismiss-flag key,
  `communityStore.js` export) changes.

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
- **Deepened 2026-09-20 09:20 UTC — re-verified against current `src/`, four
  weeks untouched while the rest of the backlog moved on; core claim holds,
  but the placement plan and the store's persistence pattern have both gone
  stale:**
  **Core claim still true.** `ade1c530`-era and later work added
  `TrustPanel.jsx`, now rendered on `ToolDetail.jsx` right after "Why it
  fits" (`ToolDetail.jsx:208`). It could look like a duplicate of this gap at
  a glance, so it's worth naming explicitly why it isn't: `TrustPanel` is
  100% algorithmic/editorial (best-for, why-it-matched-you, a catalogue-
  derived limitation, pricing, alternatives scored the same way Discover
  scores them, "last checked", and an explicit "no commercial ties"
  disclosure) — Toolnaut's own honest case for the tool, not another human's.
  Its own file comment even frames this as the point: "a tool page that only
  lists upside is indistinguishable from an ad." None of its seven rows are,
  or could become, a real person's star rating or written opinion. The gap
  this entry describes — zero peer social proof anywhere in the app — is
  unchanged.
  **Placement plan is stale and needs correcting before build.** `ToolDetail.jsx`
  has been restructured since 2026-08-24: the MATCH/status badge row this
  entry said to extend is now at `ToolDetail.jsx:110-131` (was `:81-102`),
  and "Why it fits" is now a `sticker` block at `ToolDetail.jsx:185-204`
  (was `:141-160`) — followed immediately by two components that didn't
  exist when this entry was written, `<TrustPanel>` (`:208`) and
  `<ToolResources>` (`:211`), with "Related tools" starting at `:213`. The
  original "REVIEWS section after WHY IT FITS" instruction would now land
  *between* `TrustPanel` and `ToolResources` — both of which the file's own
  comments frame as a deliberate, adjacent pair ("Reasoning sits with the
  decision, before the page moves on to other products" / "Verified
  integrations and official training, each linked to its source"). Splitting
  that pair to insert Reviews in the middle would read as an afterthought
  wedged into a sequence that was written to flow. **Corrected placement:**
  mount the new REVIEWS section after `<ToolResources>` (`:211`), immediately
  before "Related tools" (`:213`) — Toolnaut's own case (why it fits, the
  honest trust panel, verified resources) runs first, then real users' case,
  then where to look next. The rating badge next to MATCH/status
  (`ToolDetail.jsx:110-131`) is unaffected by this correction.
  **Persistence pattern has changed underneath this entry — this is the
  important part.** `scopedStorage.js` did not exist (or wasn't on this
  entry's radar) on 2026-08-24. It now backs every store, including
  `communityStore.js`, which this entry explicitly said to mirror:
  `communityStore.js` no longer calls `localStorage` directly — its
  `read`/`write` helpers (`communityStore.js:10-20`) wrap `scopedRead`/
  `scopedWrite` from `scopedStorage.js`, which namespaces every key by
  signed-in account (`key::<uid>`, guest keys unscoped). `scopedStorage.js`'s
  own header comment explains why this exists: without it, "sign out, sign
  in with a different Google account, and that person inherits the previous
  one's stack" on a shared browser — the exact class of bug this entry's
  planned store would reintroduce if built exactly as originally scoped.
  The plan must change in two places: (1) `toolReviewsStore.js`'s `read`/
  `write` must wrap `scopedRead`/`scopedWrite` from `scopedStorage.js`, not
  call `localStorage` directly — copy `communityStore.js`'s current
  `read`/`write` (lines 10-20), not the 2026-08-24 version this entry
  originally read; (2) `exus_tool_reviews_v1` must be added to both
  `PORTABLE_KEYS` (`scopedStorage.js:79-93`) and `AUTHORED_KEYS`
  (`scopedStorage.js:101-112`), the same two arrays `exus_threads_v1` /
  `exus_replies_v1` / `exus_upvotes_v1` already appear in — otherwise a
  signed-in user's reviews neither migrate on guest→account import nor stay
  correctly scoped to their account, silently leaking across accounts on a
  shared browser exactly as `scopedStorage.js` was built to prevent.
  **Confirmed still current:** all five example seed slugs (`chatgpt`,
  `claude`, `notion-ai`, `perplexity`, `cursor`) still resolve in
  `toolsCatalog.js`. No change to the rest of the spec (seed data shape,
  `getReviews`/`getAverageRating`/`addReview` API, one-review-per-slug-per-
  browser cap, star-picker form reusing `Composer`'s visual language, or the
  "what this would NOT include" scope cuts).

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
- **Deepened 2026-09-22 15:20 UTC — the oldest untouched OPEN entry (22 days);
  re-verified against current `src/`, still fully unbuilt and still fully
  buildable, only line numbers drifted:**
  - Confirmed `src/config.js` still has no `GITHUB_REPO_URL` constant and
    `src/utils/suggestTool.js` still does not exist — nothing about this gap
    has shipped by another name since the last check.
  - `Discover.jsx`'s empty state moved again: it's now `Discover.jsx:296-323`
    (was `227-254`). Shape is unchanged — `suggestedCats` buttons
    (`Discover.jsx:307-315`) then a "Clear all filters" button
    (`Discover.jsx:317-322`) — so the plan's insertion point ("after both, as
    the last-resort block for someone who tried both and still found
    nothing") still applies exactly, only the line numbers needed updating.
  - `ToolDetail.jsx`'s "Visit website" `nb-btn dark` link also drifted, to
    `ToolDetail.jsx:151-158` (was `143-145`).
  - **The `Settings.jsx` placement was previously left vague ("the natural
    home") — pinned it to an exact slot this run:** `Settings.jsx:506-511` is
    a `border-t` row holding a "Replay the tour" `nb-btn dark` button,
    explicitly placed outside the signed-in check with the comment "guests
    use /app too" — the same audience (any visitor, session or not) this
    gap's suggestion link needs, and the same `nb-btn dark` style already
    planned for reuse. A "Suggest a tool" link belongs in that same row, next
    to "Replay the tour", not as a new standalone section.

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
- **Deepened 2026-09-03 03:20 UTC — both the "false claim" framing and the
  "ships ungated" plan are now stale; the build itself is still exactly
  right.** Two things changed underneath this entry since 2026-08-25, and
  this run re-verified both against the current tree rather than trusting
  the original text:
  1. **The pricing page no longer sells this as live.** `planData.js:108`
     now reads `planned('Export learning roadmaps as PDF')` (line moved from
     the original `:49` — the file was restructured when payments shipped),
     and `COMPARISON` at `planData.js:154` is `['PDF roadmap export', false,
     'planned', 'planned']`, not the bare `true` this entry originally
     found. Read `PricingSection.jsx`'s `Cell` component and
     `PricingPillar.jsx`'s feature-list rendering: both now branch on
     `status`/`value === 'planned'` and render a dimmed "planned, not yet
     built" pill (`PricingSection.jsx:13-19`) instead of a checkmark. This is
     the fix the now-SHIPPED "Pricing already got its honest fix written"
     entry above (`c04149e`) put in place — it explicitly named this PDF
     row as one of the four claims it was reconciling. Net effect: a visitor
     reading `/pricing` today already sees this as "planned," not as
     something they're being sold. The trust-cost framing in "Why it
     matters" above was accurate on 2026-08-25 and is not accurate now — the
     remaining reason to build this is closing a real promise/reality gap
     and giving Pro subscribers something they were told to expect, not
     stopping an active false claim.
  2. **"No billing system exists to enforce Student vs. Pro" is false.**
     Confirmed by reading `src/hooks/useEntitlement.js` and
     `src/utils/entitlement.js`: `fetchEntitlement()` hits a real
     `/api/entitlement` endpoint backed by `user_entitlements` and returns
     `{ active, plan, paymentsEnabled, configured, unknown }`, and
     `TrialBanner.jsx:39` already shows the established call-site pattern for
     a Pro-only UI piece: `if (!ent.paymentsEnabled || !ent.configured)
     return null`. This means gating is now cheap and real, not a "no
     billing system" dead end.
  - **Corrected smallest useful version:** build exactly as originally
    specced (the `@media print` block, the button, `window.print()` — none
    of that changes), but wire the button through `useEntitlement()` using
    the exact `TrialBanner.jsx:39` escape hatch: when `!ent.paymentsEnabled
    || !ent.configured` (today's actual state, free public beta), render the
    button unconditionally — identical to what this entry originally
    proposed, so behavior right now is unchanged from the original plan.
    Once payments are live, gate on `ent.active && (ent.plan === 'guru' ||
    ent.plan === 'founder' || ent.plan === 'pandava')` (Pro and up, matching
    `planData.js:98,128`'s "Everything in Student/Pro, plus" inheritance) —
    Student sees a "Pro roadmap export →/pricing" nudge instead of the
    button. This turns the current `planned` pill into a `live` one
    specifically for the tier that was promised it, rather than the
    original plan's "ship free for everyone regardless of plan," which
    would have quietly under-delivered the Team/Pro distinction the second
    payments actually go live and nobody revisits this file.
  - **What this still would NOT include:** any change to the `@media print`
    scope, the button's page (`Learning.jsx` only), or the dependency-free
    `window.print()` approach — none of that was wrong, only the gating
    assumption was stale. Also not proposing to gate `Favorites.jsx`'s
    10-tool cap the same way in this pass — that's a separate, already-
    shipped feature this run did not re-audit; flagging it only so a future
    hour doesn't assume this deepening covered it.
  - **Build size, corrected:** still S — same stylesheet + button, plus one
    `useEntitlement()` call and a two-branch conditional already proven at
    `TrialBanner.jsx:39`. No new dependency, no new route.
  - **Re-verified 2026-09-23 00:20 UTC — build still fully correct and still
    unbuilt, but the button's anchor point moved and needs re-pinning.**
    Oldest untouched OPEN entry (20 days) — deepened per the cumulative-
    research rule rather than adding a new one.
    - Core claim unchanged: `planData.js:118` still reads
      `planned('Export learning roadmaps as PDF')` and `planData.js:172` is
      still `['PDF roadmap export', false, 'planned', 'planned']` (both lines
      drifted again since the last check, substance identical). Grepped `src/`
      for `print|PDF|jspdf|html2canvas` again — same two `planData.js` copy
      hits plus the same `toolsCatalog.js:469` "Blueprint AI" false positive,
      nothing new. `src/index.css` grew 509 → 965 lines since 2026-09-03 and
      still has zero `@media print` rule. Zero PDF dependency in
      `package.json`. `useEntitlement.js` and `TrialBanner.jsx:39`'s
      `if (!ent.paymentsEnabled || !ent.configured) return null` gate are both
      unchanged — the corrected gating plan above is still exactly right.
    - **What changed and matters for the build:** `Learning.jsx` grew 385 →
      464 lines, and the "near the SHARE MY BADGE button's visual slot"
      anchor this entry previously gave is now actively misleading. That
      button (still `🎓 SHARE MY BADGE`, now `Learning.jsx:451`) is nested
      inside `{allCleared && (...)}` (opens `Learning.jsx:439`) — it only
      renders once every milestone is cleared. The PDF export button must
      stay **always visible** per this entry's own spec ("exporting an
      in-progress roadmap is at least as useful as a completed one"), so it
      cannot actually sit in that slot without either escaping the
      conditional (churn this entry doesn't call for) or rendering only for
      users who already finished the roadmap (contradicts the spec). The
      always-rendered header block — `<h1>Your 4-week<br/>Orbit</h1>` at
      `Learning.jsx:273`, immediately followed by the `{current && (...)}`
      "your next move" sticker at `Learning.jsx:275` — is the right anchor
      instead: it renders on every visit regardless of progress, right below
      the page title, and is the first always-visible content on the page.
      Corrected placement: the export button goes directly under the `<h1>`
      at `Learning.jsx:273`, before the "next move" sticker, not reused from
      the share button's slot.
    - Nothing else in the build (the `@media print` scope, `window.print()`
      approach, entitlement gating) needed correction this pass.
- **Status:** SHIPPED, but PARTIALLY REOPENED 2026-09-13 21:20 UTC — the
  `ToolDetail`/`Compare` follow-up this entry closed itself against on
  2026-08-31 ("still gated behind AppShell") is now stale: the gate is gone.
  See the 2026-09-13 21:20 UTC deepening below, appended after the original
  closing note rather than rewritten into it, so the discovery trail stays
  intact. The hook, its prerender bug fix, and the five originally-scoped
  top-level call sites are still correctly SHIPPED and unaffected.
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
- **Deepened 2026-09-13 21:20 UTC — the blocking premise is gone; re-scoped
  as a two-line fix, no routing decision needed.** Re-read `AppShell.jsx`
  end to end rather than trusting this entry's own 2026-08-25 note. The hard
  redirect that note described (`AppShell.jsx:57-59`, unauthenticated visitor
  → `/auth/login`) no longer exists anywhere in the file. In its place,
  `AppShell.jsx:118-130` carries a block comment titled "NO SIGN-IN GATE"
  that states the removal as a deliberate, already-shipped decision: "the
  redirect that used to sit here guarded no data... every visitor, reviewer
  and crawler unwilling to sign in first[paid a steep price]... Sign-in stays
  available and becomes load-bearing the day state moves server-side. Until
  then it must not stand in the doorway." `git log -p -S"NO SIGN-IN GATE" --
  src/shells/AppShell.jsx` shows this comment already present in the v0.69.1
  release commit (2026-09-10), so the gate has been gone for several days —
  this file simply never got told. Live-checked to be sure the comment
  matches behavior, not just intent: `ToolDetail`/`Compare` are still nested
  under `<Route path="/app" element={<AppShell />}>` (`App.jsx:127`, with
  `Compare`/`ToolDetail` at `App.jsx:132-133`), and nothing above that route
  or inside `AppShell` calls `navigate()` on a missing session — the only
  `navigate('/pay', ...)` in the file fires solely for a real, non-simulated
  signed-in session with an inactive paid entitlement (`AppShell.jsx:89-96`),
  which does not apply to a signed-out crawler or guest.
  This means the two-line fix this entry's own "smallest useful version"
  scoped back on 2026-08-25 is now buildable exactly as originally written,
  with no route change: `ToolDetail.jsx` and `Compare.jsx` each get one
  `import { useHead } from '../../utils/head'` and one `useHead({ title,
  description, path, jsonLd })` call, matching the pattern already live in
  `CategoryLanding.jsx`/`Pricing.jsx`/`About.jsx`/`NewTools.jsx`/
  `SharedStack.jsx` — `ToolDetail.jsx` already has every field this needs in
  scope at render time (`tool.name`, `tool.blurb`, `tool.price`,
  `tool.category`), so this is copy-the-pattern work, not new design.
  A second, independent reason this is now worth doing rather than a nice-
  to-have: `PublicCompare.jsx:44`, `SharedStack.jsx:41`, `CategoryLanding.jsx:59`,
  and `NewTools.jsx:38` — four pages that are already public, prerendered,
  and SHIPPED with real JSON-LD — all cite `${SITE}/app/tools/${t.slug}` as
  the canonical `url` for every tool they list, in structured data a crawler
  is meant to trust. Right now that URL, when actually visited, carries the
  homepage's generic title/description, no canonical of its own, and no
  JSON-LD — Toolnaut's own shipped structured data is pointing crawlers at
  704 pages that fail the exact per-page SEO hygiene this backlog already
  built and shipped everywhere else. Fixing `ToolDetail.jsx` closes that
  inconsistency, not just a standalone nice-to-have.
  **What this does NOT fix, named honestly:** `ToolDetail`/`Compare` are
  still absent from `scripts/prerender.mjs`'s `ROUTES` list and from
  `public/sitemap.xml`. `useHead()` alone helps a JS-executing crawler
  (Google, and per this repo's own `robots.txt` reasoning, likely Bing) but
  does nothing for a crawler that does not render JS before reading a page's
  `<title>`/meta, the same limitation this gap's base entry already named for
  social unfurlers. Prerendering all ~700 `ToolDetail` slugs is a materially
  bigger, slower build step than this file's S-sizing bias fits in one run
  (`prerender.mjs` drives a real headless browser per route; 6 category
  pages today vs. 700+ tool pages is a different order of build-time cost,
  worth measuring before committing to it) and a full sitemap for all 704
  slugs needs the generator this backlog has now flagged as missing five
  separate times (this entry's own cross-references: the Alternatives-pages
  entry above, the RSS-feed entry, the source-categories entry, the
  page-title-forward "changelog" entry) without ever building it — that
  generator is the next real gap once this two-line fix ships, not part of
  it.
  **Also stale from the same cause, for whoever picks up the entries below:**
  the "Per-tool 'Alternatives' SEO pages" entry (this file, "Gap" section)
  and the JSON-LD entry's "What this would NOT include" both justify
  skipping `ToolDetail` with "still behind AppShell's session guard" —
  same stale premise, not yet corrected in either entry's own text to keep
  this deepening in one place rather than three near-duplicate edits.
  **Build size of the reopened follow-up:** S — two `useHead()` call sites
  using data already in scope, zero routing change, zero new file. Ships
  independently of the sitemap/prerender follow-up named above.

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
- **Deepened 2026-09-03 12:20 UTC — Gap 2's own rejection reasoning has one
  stale line; the verdict itself is unchanged.** Checking whether the same
  payments work that reopened Gap 1 also touches Gap 2, since both were
  rejected in the same original entry for adjacent reasons. Re-read
  `src/state/authStore.js` in full against its state as of the original
  2026-08-25 rejection: when Supabase is configured, `signIn('google')` now
  goes through a real `supabase.auth.signInWithOAuth()` flow, and
  `watchSession()` mirrors a genuine `auth.users` row (`user.id`, a real
  Google-verified `email`) into the app's session — confirmed this is the
  same identity `api/entitlement`, `user_entitlements`, and the alerts
  backend already key off. So the specific clause "no server-side user
  record at all" this entry's Gap 2 originally rejected on is no longer
  literally true — there is one, per individual, and it has existed since
  the same 2026-08-31/09-01 payments work Gap 1's own deepening already
  cites.
  This does **not** reopen Gap 2. Checked `supabase/migrations/` in full
  (7 files, `0001`–`0007`) and grepped `team|seat|org` across all of them:
  the only hit is a plan **label** — `('pandava', 'Team', ...)` in
  `0005_reconcile_payment_schema.sql:59`, a price-tier name, not a schema.
  There is still no org/team entity, no seat count, no membership or invite
  table, and no permissions model of any kind — every one of Gap 2's seven
  named capabilities ("Team stack standardization," admin/seat management,
  shared leaderboards, etc.) needs a *group* of users related to each
  other, and individual accounts, however real, don't provide that. The
  accurate framing going forward: Gap 2 no longer needs a backend from
  zero (one already exists, and already has real per-user identity to
  build on), but it still needs a real multi-user *data model* — at
  minimum an `orgs`/`teams` table, a membership join table, and RLS
  policies scoped to it — which is new schema design and a permissions
  surface, not a slice of what already shipped. That keeps this at
  L / REJECTED for a single feature run's S/M sizing bias, just for a
  narrower and now-accurate reason than "no accounts exist."
  **Build size, Gap 2 (still rejected, reasoning corrected):** L — needs a
  new `orgs`/`memberships` schema and permissions model. Individual
  Supabase accounts (real, already shipped) are a precondition this gap can
  now build on, not a substitute for it.
- **Deepened 2026-09-23 12:20 UTC — re-verified Gap 1 against current src;
  its own headline premise is now stale, and a live cross-cutting risk
  surfaced.** This is the oldest untouched OPEN entry (last touched
  2026-09-03), so re-checked every cited fact rather than adding a new gap.
  **Everything substantive still holds:** `ChatPanel.jsx` is still the same
  honest stub — header still reads "Preview — replies are canned"
  (now line 53, unchanged position), `send()` still appends the identical
  hardcoded string (lines 41-45) with zero `fetch` calls. `api/chat.js`
  (248 lines, unchanged in substance) still has the full security
  scaffolding this entry's build plan reuses: `originAllowed()` (line 54),
  `rateLimit()` from `_security.js` (line 22/184), the `LIMITS` payload
  caps, and the graceful `source: 'unconfigured' | 'upstream_error' |
  'timeout'` fallback contract. `api/copilot.js` still does not exist
  (checked `ls api/` — 17 files, no copilot). `Stack.jsx`'s
  `getTool`/`slugs` pattern this entry's plan cites is still exactly
  shaped as described (now `Stack.jsx:101-123`, shifted from 116-119).
  **One citation drifted and one was missing:** `planData.js:44` is now
  `planData.js:116` (file grew); the entry never mentioned that the same
  string is *also* a `COMPARISON` row — `['AI chat assistant', false,
  'planned', 'planned']` at `planData.js:168` — which matters for the next
  finding.
  **The entry's own headline premise no longer holds.** Gap 1 was logged
  because "the pricing page sells it as a live Claude-powered feature with
  no such caveat" (original 2026-08-25 finding). Traced every render path
  for that copy today and none of them do that anymore:
  `PricingPillar.jsx:96` (`plan.features.filter((f) => f.status !==
  'planned')`) filters every planned feature — including this one — out of
  the visible per-plan checklist entirely; it never renders the string "AI
  chat assistant" by name at all, folding it into an unlabelled "N more
  features on the roadmap" line (`PricingPillar.jsx:110-118`). The
  toggleable full comparison table on the same page (`PricingSection.jsx`,
  reading the `COMPARISON` row found above) renders it through `Cell()`
  (`PricingSection.jsx:10-24`), whose `'planned'` branch outputs an
  explicit gray pill reading "planned" with `aria-label="planned, not yet
  built"` — the opposite of an unqualified live claim.
  `CapabilityMatrix.jsx`/`capabilityMatrix.js` (the other honesty
  breakdown also mounted on `/pricing`) doesn't mention chat at all. So as
  of today, nowhere on the site claims this feature is live — the
  marketing-honesty violation this entry was originally opened to fix has
  already been closed by the unrelated planned-badge work that shipped
  around the same 2026-08-31/09-01 payments push this entry's own Gap 1
  deepening already cites. What's left to build is a genuinely useful,
  already-honestly-labelled feature, not a lie to correct — reframes this
  from "compliance fix" to "ship a nice-to-have," which changes how urgent
  it is relative to gaps that are still active false claims.
  **Minor code-quality note, not fixed here (no visible defect, would be a
  drive-by change):** `PricingPillar.jsx:97,99` still check
  `f.status === 'planned'` inside the `.map()` that line 96 already
  filtered to exclude that exact status — dead branches that can never
  execute. Flagged for whoever next touches that file; not this run's job
  per this backlog's own no-drive-by-cleanup rule.
  **New cross-cutting risk, worth knowing before anyone builds this:**
  `api/chat.js` reads `process.env.FEATHERLESS_API_KEY` (line 186) with no
  fallback provider — confirmed by grepping the file for
  `ANTHROPIC_API_KEY|NVIDIA_API_KEY|OPENAI_API_KEY|OPENROUTER_API_KEY`,
  zero hits. That is the *same* Featherless account issue #63 has open
  right now for the radar pipeline (overdue invoice, every call 403s).
  `e72ad27`, the fix issue #63 references, only wired the fallback
  secrets into `radar.yml` (a GitHub Actions job) — it never touched
  `api/` (Vercel functions), so `api/chat.js` has no failover today. Two
  consequences: (1) the live `/goal` quiz's server-side classification
  (`goalChat.js`'s `askServer`) is *also* silently degraded in production
  right now, not just the radar catalog — it fails closed to the offline
  `matchFreeText` matcher by design (`goalChat.js:285-289`), so nothing is
  visibly broken, but the "smart" free-text path has been unavailable for
  as long as issue #63 has been open; (2) if `api/copilot.js` were built
  exactly as this entry's own plan specs (copying `api/chat.js`'s
  scaffolding verbatim), it would ship into the same outage and return
  `source: 'upstream_error'` on every real message, surfacing the
  hardcoded "I'm not able to answer that right now" fallback to every
  first-time Pro user until issue #63 clears. Not a reason to hold the
  build — the code would be correct — but worth demoing/verifying against
  a live Featherless call (or waiting for issue #63 to clear) before
  calling it done, since a correct implementation would still look broken
  today.
  **Build size, Gap 1: unchanged at M.** Status stays OPEN — still the
  right size for a feature run, just reframed from "closes a false claim"
  to "ships a specced, already-honest feature," with the Featherless
  outage as a pre-ship verification step, not a blocker to the build
  itself.

### Recently viewed tools
- **Status:** SHIPPED 113f375 — built as scoped below: `recentlyViewedStore.js`
  (localStorage, capped at 12, most-recent-first, no duplicates), a
  `useEffect` in `ToolDetail.jsx` recording on mount/slug-change, and a
  "Continue browsing" strip on `Discover.jsx` below "New this week", hidden
  when empty. Also added `exus_recently_viewed_v1` to scopedStorage's
  `PORTABLE_KEYS` (migrates on sign-in) but not `AUTHORED_KEYS` (passive,
  doesn't gate the guest-import prompt) — a nuance this entry predates,
  since per-account storage scoping shipped after this gap was found.
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
- **Status:** SHIPPED ef59a93 — scoped down at build time: `ToolDetail.jsx`'s
  half of this gap had already closed independently (`TrustPanel`'s "Watch
  out for" row renders `tool.note` there, added after this entry was
  written), so only `ToolCard.jsx` (the badge, reused verbatim from
  `ToolDetail.jsx`'s pill, scaled to the card's badge-row size) and
  `Compare.jsx`'s Status row (note appended in parentheses) needed the fix.
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
- **Deepened 2026-09-20 12:20 UTC — the oldest untouched OPEN entry (25 days);
  re-read every file this plan cites against current `src/` rather than
  trusting the original line numbers. The build is still exactly right in
  shape, but three things drifted underneath it:**
  1. **The match algorithm this entry proposed to copy no longer lives where
     it said.** The original plan was "filtered by the same lowercase
     substring match `Discover.jsx:86-97` already uses" — that logic has
     since moved: `Discover.jsx` now imports `matchesQuery` from a new
     `src/utils/search.js` (`Discover.jsx:8`), extracted when the (now-
     shipped) "multi-word query" gap fixed literal-phrase matching for both
     Discover and the public `/search` page. `matchesQuery(tool, q)` does
     order-independent, every-word substring matching against `[name, blurb,
     sourceCategory, dev, ...tags]`, not the single-phrase check this entry
     described. **Corrected plan:** import and call `matchesQuery()` directly
     for the tool half of the palette's results instead of hand-rolling a
     new substring check — strictly less code than originally specced, and
     gives palette search the same multi-word matching Discover already has
     (typing "video editor" finds tools whose blurb has both words, not just
     that literal phrase). The `NAV` half still needs its own trivial
     label-substring check since `matchesQuery()` is tool-shaped, not generic.
  2. **Every cited line number and two of the three insertion points moved.**
     `NAV` is now `AppShell.jsx:26-34` (was `:14-21`) and has grown from 6
     entries to 7 (`Spend`/`/app/audit` was added since). `hydrateCatalog()`
     is now at `toolsCatalog.js:771` (was `:760-762`) — same behavior
     (mutates `TOOLS` in place, so radar-published tools stay searchable with
     zero extra wiring), just a different line. More substantively, the
     desktop sidebar restructured: the persona sticker is now
     `AppShell.jsx:161-182`, and a `<SyncStatus />` component that didn't
     exist when this entry was written now sits directly under it at line
     184, before the `NAV.map` render at `186-193`. The original "trigger
     button under the persona sticker" placement (cited as `:86-100`, which
     no longer matches anything) would now land between the sticker and
     `SyncStatus`, wedging a new control into what reads as one continuous
     "who you are" block. **Corrected placement:** put the "🔎 Quick jump ⌘K"
     button after `<SyncStatus />` (line 184) and before the `<nav>` at 186 —
     it then reads as the last piece of shell chrome before the actual
     nav links, not an interruption between persona and sync state.
  3. **The mobile top bar has no bare "icon-only" slot to drop a button
     into anymore.** It restructured into `AppShell.jsx:222-238`: brand
     logo on the left, and a `flex items-center gap-2` div on the right now
     holding `<PlanChip compact />` and a profile `<Link>` (avatar +
     persona-name chip) — a different shape than the entry's original
     `:118-128` citation, which no longer resolves to this content.
     **Corrected placement:** add the quick-jump icon button as the first
     child inside that same `gap-2` flex div (`AppShell.jsx:227`), before
     `PlanChip` — keeps it grouped with the bar's other icon-sized controls
     rather than crowding the persona-name chip, and preserves the existing
     left-to-right reading order (brand → utility icons → identity).
  - **Still accurate, re-confirmed:** no `Modal`/`Dialog` abstraction exists
    anywhere under `src/components/ui/` (globbed `Modal*`/`Dialog*` again,
    zero hits) — the hand-rolled overlay plan stays the right call, matching
    `ChatPanel.jsx`'s own per-component `keydown`/Escape listener pattern
    (`ChatPanel.jsx:27-30`, unchanged). The "Recently viewed tools" gap this
    entry named as a natural (but non-required) pairing has since shipped
    (`113f375` → `src/state/recentlyViewedStore.js`, `loadRecentlyViewed()`
    returns up to 12 slugs, most-recent-first) — still correctly out of scope
    for v1 per the original "no recent/frequency ranking" exclusion, but
    worth flagging as the obvious first follow-on once the palette itself
    ships, since the data now already exists with zero extra plumbing.
  - **No change** to the component itself, the keyboard contract
    (Cmd/Ctrl+K, arrow keys, Enter, Escape), the `~8` result cap, or the
    build-size estimate — this deepening only corrects placement and swaps
    in a better, already-shipped search primitive.

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
- **Status:** SHIPPED (this run, copy-accuracy fix — see bottom of entry for
  the production verification and the exact `planData.js` edit). The
  subscribe UI and delivery pipeline this entry's 2026-09-01 deepening
  spec'd as "smallest useful version" already exist, built directly on
  `master` between this routine's runs (not by this routine) — see the
  second deepening below for the full trace. What was left was not a build,
  it was three stale `planned(...)` copy lines that undersold a real
  feature, plus a literal-accuracy mismatch ("weekly" / "trending") between
  the promised copy and what actually ships. Read the second
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

### Popularity signal discarded before it reaches a record
- **Status:** OPEN
- **Seen in:** GitHub's own Trending page ranks by stars; Hacker News ranks
  by points; Product Hunt's entire ranking mechanism is upvotes. There's An
  AI For That and Futurepedia both expose a "trending"/"most popular" sort
  as a primary tab next to "newest" — real-world popularity is the cheapest
  legible trust signal a directory can show without running its own review
  corpus (the still-open "Per-tool ratings & reviews" gap above is the
  harder, human-generated version of the same idea; this one is free,
  because the data already arrives at the door and gets thrown away).
- **Gap:** this thread was referenced twice already in this file — once in
  the per-route-meta entry's 2026-09-13 deepening ("the still-open
  'popularity signal discarded before it reaches a record' gap elsewhere in
  this file") and once in the weekly-alerts entry's 2026-09-12 verification
  ("no stars/points join yet — that's the separate, still-OPEN 'popularity
  signal' gap") — but it was never actually written up as its own entry.
  Most likely lost in one of the two "restore research-backlog.md" incidents
  visible in recent git log (`021f943`, `7069ef4`) rather than deliberately
  cut. Re-derived and re-verified from scratch against current `radar/` and
  `src/`, not reconstructed from either phantom reference.
  Confirmed still true by reading the full pipeline: `radar/sources/
  github.js:9` queries `sort=stars&order=desc` and line 25 stores
  `stargazers_count` into `candidate.raw.stars`; `radar/sources/
  hackernews.js:27` stores `hit.points` into `candidate.raw.points`. Grepped
  `stars|points` across every file in `radar/` outside the two source files
  and `radar/test/` — zero hits. `radar/enrich.js`'s two builders
  (`enrichFallback:127` and `normalizeEnriched:155`) only ever read
  `candidate.raw?.owner` (into `dev`); neither `stars` nor `points` is read
  anywhere in `enrich.js`, `filter.js`, `dedup.js`, or `schema.js`.
  `makeToolRecord()` (`schema.js:47-54`) has no popularity-shaped field at
  all — a repo with 40,000 stars and one with 40 enter the catalog as
  identical records the moment enrichment runs. Confirmed downstream too:
  `Discover.jsx`'s three sort pills (`match`/`newest`/`name`,
  `Discover.jsx:131-138,302-304`) have nothing to sort by "popular" even if
  they wanted to, because no record anywhere carries the number.
- **Why it matters:** this is the concrete missing half of two things this
  backlog already shipped honest-but-incomplete copy around. (1) The
  weekly-alerts entry's own 2026-09-12 verification had to correct
  `planData.js` to drop the word "trending" specifically because
  `alerts-send.js` only had `discoveredAt` recency to rank by — that
  correction is honest, not fixed, and stays that way until this data
  exists. (2) At 700+ tools deep, `Discover.jsx` has no way to distinguish
  "what's actually good" from "what merely showed up today" — sorting by
  "newest" surfaces every day's low-signal candidates exactly as
  prominently as the rare breakout tool, because nothing differentiates
  them once they're both `published`.
- **Smallest useful version (what to actually build):**
  - Add one optional field to `makeToolRecord()` (`schema.js:47`):
    `popularity: null` — deliberately **not** added to
    `REQUIRED_TOOL_FIELDS` (`schema.js:44`, so every already-published
    record without it still passes the validate gate) and **not** added to
    `HASHED_FIELDS` (`schema.js:41` — a star count drifting upward on its
    own shouldn't flip `contentHash` and trigger a spurious re-review of a
    record whose actual content hasn't changed).
  - In `enrich.js`'s `record = makeToolRecord({...})` call (`enrich.js:23`),
    one line: `popularity: candidate.raw?.stars ?? candidate.raw?.points ??
    null` — same optional-chaining fallback shape the file already uses one
    line below for `dev`. Deliberately source-local, not cross-normalized:
    GitHub stars and HN points are different units on different scales, so
    this stores "whichever popularity signal this source actually has," not
    an attempt to rank a GitHub tool against an HN tool on one shared axis.
  - **The step every naive version of this would miss:**
    `radar/scripts/sync-to-app.js:12-16`'s `FIELDS` allowlist is the actual
    gate on what reaches `public/tools.json` — it explicitly enumerates 16
    field names and drops everything else (`sync-to-app.js:31-36`), so
    `popularity` must be added to that array too, or the schema/enrich work
    above would be invisible in production while looking finished in
    `radar/data/`.
  - `src/utils/sortResults.js`: one new `compareByPopularity(a, b)`
    alongside the existing `compareByNewest`/`compareByName`, mirroring
    `compareByNewest`'s exact null-handling shape (has-a-value beats
    `null`/`undefined` beats neither, tie-break on `a.name.localeCompare
    (b.name)`) — every bundled/seed tool and every non-GitHub/HN source
    sorts last, never coerced to a fake zero. Wire it into `Discover.jsx`'s
    sort branch (`Discover.jsx:131-138`) and add one more pill next to
    `match`/`newest`/`name` (`Discover.jsx:302-304`), e.g. "popular".
  - **What this would NOT include** (kept out to bound the diff): no
    cross-source normalization into one blended "trending score" (stars vs.
    points on a shared scale is a real design problem, worth its own pass
    if ever tackled, not a one-line addition); no backfill of `popularity`
    onto the ~382 already-bundled catalog tools (a data-entry/scraping
    project, not a code change — the new sort only differentiates
    radar-discovered tools until/unless that happens separately, and should
    say so plainly if shipped); no visible star/point badge on `Discover`/
    `ToolDetail` cards in v1 (ranking-only first cut; a "⭐ 12.4k" chip is a
    natural, separate follow-up once the field exists); no change to
    `alerts-send.js`'s matching/ranking logic (closing the "trending" half
    of the alerts copy for real is genuine future value but is its own
    follow-up once this field exists at all, not part of this build).
- **Build size:** S — one schema field, one `enrich.js` line, one
  `sync-to-app.js` allowlist entry, one new sort comparator, one Discover
  pill. Touches the radar pipeline directly, which this repo's own
  CLAUDE.md flags as mattering more for reliability than cleverness — ship
  behind all three gates (`npm test`, `npm run build`, `npm run smoke`) same
  as any other change, and specifically extend `radar/test/schema.test.js`
  and `radar/test/enrich.test.js` (both already exist and directly cover
  the two files this touches) rather than relying on the app-level smoke
  test alone to catch a regression here.
- **Found:** 2026-09-28 09:09 UTC
