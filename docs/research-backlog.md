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
- **Status:** SHIPPED 0448e6f — built exactly as scoped below, at the
  2026-10-06 15:04 UTC re-verification's corrected line numbers: `toolReviewsData.js`
  (20 seed reviews across 15 slugs), `toolReviewsStore.js` (wraps
  `scopedRead`/`scopedWrite`, `exus_tool_reviews_v1` added to both
  `PORTABLE_KEYS` and `AUTHORED_KEYS`), a rating badge next to MATCH/status,
  and a REVIEWS sticker section after `<ToolResources>` with a star-picker +
  textarea composer. Manually verified in a built preview with a seeded
  session: badge/section render with real seed content, submitting a review
  appends it and recomputes the average, and the one-per-browser cap shows
  "You've already reviewed X" on a second attempt. No card-grid badge, no
  moderation, no per-category rollups — all deliberately deferred per the
  original scope cut below.
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
- **Status:** SHIPPED 3a7a173 — built together with the "No way to flag a
  wrong listing" gap below, exactly as both entries' plans called for
  (shared `src/utils/suggestTool.js`, shared `GITHUB_REPO_URL` constant in
  `src/config.js`). `Discover.jsx`'s empty state now has an inline "🔭 Don't
  see it? Suggest a tool" form (name + optional URL, opens
  `buildSuggestToolUrl()` in a new tab, no local persistence); `Settings.jsx`
  got the equivalent persistent link next to "Replay the tour" and
  "Download my data", outside the signed-in check as planned. Verified live
  against a built `preview` server with Playwright: filled the Discover
  form, intercepted `window.open`, confirmed the GitHub issue URL is built
  correctly with the right title/body/`labels=tool-submission`. All three
  checks green, pushed directly to `master`.
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
- **Status:** SHIPPED 408a2b3 — built exactly as scoped below, at the
  corrected anchor from the 2026-10-08 15:09 re-verification. See bottom of
  entry for what the build run actually did.
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
  - **Re-verified 2026-10-08 15:09 UTC — still fully correct and still
    unbuilt; one more small anchor drift, everything else holds.** Second
    sweep continuing in found-date order after the 43rd pass closed the
    oldest entry (onboarding checklist); this is the next-oldest OPEN entry.
    - Core claim unchanged: `planData.js:118` is still
      `planned('Export learning roadmaps as PDF')` and `planData.js:172` is
      still `['PDF roadmap export', false, 'planned', 'planned']` — same
      line numbers as the 2026-09-23 check, no drift this time. `src/index.css`
      grew 965 → 1011 lines since the last check and still has zero
      `@media print` rule. `package.json` still has no `jspdf`/`html2canvas`
      dependency. `useEntitlement.js`'s `{ active, plan, paymentsEnabled,
      configured, unknown }` shape and `TrialBanner.jsx:39`'s
      `if (!ent.paymentsEnabled || !ent.configured) return null` gate are
      both unchanged — confirmed the plan ids this entry's corrected gating
      names (`guru`, `founder`, `pandava`) are exactly the three paid tiers
      in `planData.js` (`:44`, `:97`, `:122`), with `shishya` (`:70`) the
      only free tier — the gating logic is still exactly right.
    - **Anchor drift found:** `Learning.jsx` grew 464 → still 464 lines
      (unchanged), but a new eyebrow line was added above the page's `<h1>`
      since the 2026-09-23 check — `<p className="... cosmic-text">Learn</p>`
      now sits at `Learning.jsx:275`, pushing the `<h1>Your 4-week<br/>Orbit</h1>`
      this entry's corrected placement targets from `:273` to `:276`, and the
      `{current && (...)}` "next move" sticker right after it from `:275` to
      `:279`. The plan itself is unaffected — "directly under the `<h1>`,
      before the next-move sticker" still describes the same two real lines,
      just renumbered; only the pinned line numbers needed correcting; `allCleared`
      still opens at `:439` and `🎓 SHARE MY BADGE` is still at `:451`
      (unchanged from the last check), confirming that slot is still the
      wrong anchor for the always-visible export button, exactly as
      previously corrected.
    - Ran `npm test` (315/315), `npm run build` (19 static routes, 1163 tool
      pages), and `npm run smoke` (25/25 routes, 0 console errors) directly
      against current `master` to confirm nothing else drifted — all three
      clean, no code changed this run. Checked the open `bot/claude/*` PR
      queue (`list_pull_requests`): still the same long-stale backlog every
      prior pass has tracked (oldest open PR is `#10`, from the pre-research-
      backlog era) — unchanged, nothing new to sync. `radar:health` → `OK`
      (1 run in the 26h window, last run/publish 8.9h ago, 9 tools published,
      feed at 492 total) and `CI`/`Release` both green at the latest `master`
      push (`b6389ed`, the 44th pass's JSON-LD research commit).
  - **Built 2026-10-08 18:04 UTC feature run — sha `408a2b3`.** Exactly the
    corrected plan above: a `@media print` block scoped to a new
    `.print-roadmap` wrapper class on `Learning.jsx`'s root div (forces
    black-on-white, strips box-shadow/backdrop-filter, keeps `.sticker`
    cards readable with a thin grey border), an "🖨️ Export as PDF" button
    under the `<h1>` calling `window.print()` directly, and `print:hidden`
    (Tailwind's built-in print variant, not a new class) on every piece of
    `AppShell` chrome — `.starfield`, the desktop sidebar, mobile top bar,
    bottom nav, chat launcher and both chat panels, `TrialBanner`'s wrapper
    — plus the "How ▾" lesson-disclosure toggle and the unanswered
    checkpoint-quiz form inside `Learning.jsx` itself, so none of that
    interactive-only chrome shows up in the printout. Gated through
    `useEntitlement()` exactly as corrected: `!ent.paymentsEnabled ||
    !ent.configured` (today's actual free-beta state) renders the button for
    everyone; a Student on a live-payments deployment would see a "Pro
    roadmap export →" nudge to `/pricing` instead. `planData.js`'s
    `'planned'` pills were deliberately left alone — the tier promise they
    describe is about the paid state, which isn't live yet, same precedent
    already set for the favorites cap in this file. Verified beyond the
    smoke test: seeded a `vite preview` session with Playwright (session +
    completed-quiz localStorage, bypassing the UI flow), confirmed the
    button renders at the right anchor, then used `page.emulateMedia({
    media: 'print' })` to confirm the sidebar/bottom-nav/export-button all
    report `isVisible() === false`, the roadmap heading's computed color is
    `rgb(0, 0, 0)`, and `.print-roadmap`'s computed background is
    `rgb(255, 255, 255)` — screenshotted both the normal and print-emulated
    render to eyeball the result directly, not just trust computed styles.
    All three checks green (315 tests, build — 1166 tool pages, smoke —
    25 routes, 0 console errors) before push. Diff: 62 insertions, 11
    deletions across 3 files.
### Per-route page titles, meta descriptions & social preview cards
- **Status:** SHIPPED, but PARTIALLY REOPENED 2026-09-13 21:20 UTC — the
  `ToolDetail`/`Compare` follow-up this entry closed itself against on
  2026-08-31 ("still gated behind AppShell") is now stale: the gate is gone.
  See the 2026-09-13 21:20 UTC deepening below, appended after the original
  closing note rather than rewritten into it, so the discovery trail stays
  intact. The hook, its prerender bug fix, and the five originally-scoped
  top-level call sites are still correctly SHIPPED and unaffected.
- **Restored 2026-09-28 12:04 UTC:** this entry's own `### ` heading was
  missing from the file — found by chance while reading straight through for
  this hour's research pass, not by searching for it. Confirmed with `awk`
  that it's the only such orphan in the whole file (every other `- **Status:**`
  line has a `### ` heading directly above it). The body below was intact the
  whole time and needed no reconstruction, unlike the "Popularity signal"
  gap above, which lost its entire body the same way — only this section's
  header line had dropped, most likely in one of the earlier "restore
  research-backlog.md" incidents (`021f943`, `7069ef4`). That's exactly why
  it never showed up in a `### ` table-of-contents grep and why later entries
  (the source-categories gap, this same popularity-signal gap) could only
  ever cross-reference it as "the per-route-meta gap" rather than link a real
  heading. No content below this line changed.
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
- **Deepened 2026-10-08 21:04 UTC — the 09-23 deepening's own pre-ship risk
  is now resolved, and the build plan's provider details are stale.** This
  is the next-oldest OPEN entry in the second sweep (after "First-session
  onboarding checklist" and "PDF roadmap export," both already re-touched
  this week). Re-read `api/chat.js` in full against the 09-23 citations:
  **everything about Gap 1's own blockers still holds** —
  `ChatPanel.jsx`'s header still reads "Preview — replies are canned" and
  `send()` still appends the same hardcoded string with zero `fetch` calls
  (both unchanged); `api/copilot.js` still does not exist (`ls api/` — 17
  files, no copilot); `planData.js:116`/`:168` citations are unchanged;
  `Stack.jsx`'s `getTool`/`slugs` pattern is unchanged in substance (now
  `Stack.jsx:103-124`, drifted one line from a comment edit, not worth a
  separate note). **What's stale: `api/chat.js` quietly switched LLM
  providers entirely since 09-23.** It no longer reads
  `FEATHERLESS_API_KEY` or calls Featherless at all — the file's own header
  comment now says so explicitly ("NVIDIA (integrate.api.nvidia.com), but
  NOT Kimi-K3... Qwen2.5-7B-Instruct ~2.6s for this exact classification"),
  the key lookup is `process.env.NVIDIA_API_KEY` (line 187), the endpoint is
  `https://integrate.api.nvidia.com/v1/chat/completions`, and the model is
  `meta/llama-3.1-8b-instruct` by default (`NVIDIA_CHAT_MODEL` overrides
  it). File grew from 248 to 250 lines; `TIMEOUT_MS` is
  `NVIDIA_CHAT_TIMEOUT_MS` defaulting to 9000, `CHAT_PER_MINUTE` is 20. The
  `source` vocabulary is also one value wider than previously cited —
  `'unconfigured' | 'upstream_error' | 'unparseable' | 'timeout' | 'llm'`
  (the 09-23 note only listed three, missing `'unparseable'`, the branch for
  a non-JSON model reply). **This removes the 09-23 pre-ship caution
  entirely, it doesn't just change which provider it's about:** issue #63
  (the Featherless overdue-invoice outage this entry flagged as a live risk
  for anything copying `api/chat.js`'s scaffolding) is now **closed**
  (2026-09-27, `state_reason: completed`, confirmed via `issue_read`), and
  separately moot for this entry regardless of Featherless's account status
  today, since the endpoint this plan would copy from no longer calls
  Featherless at all. A build of `api/copilot.js` today would inherit the
  NVIDIA provider, the 9s timeout, and the 5-value `source` contract — same
  shape, corrected specifics, no outstanding caveat to verify against
  before calling it done. **Build size, Gap 1: still M**, now with one less
  reason to hesitate before picking it up.
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
- **Status:** SHIPPED 2cce654
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

---

<!-- The following entries (from "Community access (Discord & forum)" onward)
     were mechanically restored 2026-09-28 15:09 UTC from commit 3dca42e, the
     last good copy before commit 986c146 truncated this file from 8029 lines
     to 1 line (message claimed "log vendor claim-listing gap"; the diff was
     actually -8029/+1 — the appended entry never landed, and everything below
     "Popularity signal" was destroyed). The chain of "fix: restore
     research-backlog.md" commits after 986c146 rebuilt this file's first
     ~2400 lines but stopped there; this run found the remaining ~50 entries
     (Discord REJECTED note, filter-chip facets, alternatives SEO pages,
     Collections, public dev API, and more, SHIPPED/OPEN/REJECTED all mixed
     together) were still missing and restored them verbatim from 3dca42e.
     Content below is unedited from that commit — statuses, line citations
     and "this run"/"this commit" phrasing describe the state as of
     2026-09-27, not today. Anything still OPEN needs re-verification against
     current src/ before a feature run builds it, same as any other entry
     that has sat untouched for a few days. -->

---

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
- **Deepened 2026-09-22 21:05 UTC:** research run (UTC hour 21). CI green on
  master, no agent-fixable issues, radar health NO-PUBLISH (issue #63,
  Featherless still 403ing on an overdue invoice — already fully diagnosed,
  not re-reported here). This was the oldest untouched OPEN entry (20 days
  since the last deepening) so re-verified it rather than starting a new
  gap. Read the current 401-line `Discover.jsx` in full — it grew again
  (recently viewed rail, favorites, compare-select wiring all landed since
  the last check) and every line reference above is stale a fourth time,
  substance unaffected. Corrected locations: `Pill` is now
  `Discover.jsx:37-47` (was `:35-45`), still exactly `{ active, onClick,
  children }` — no `count` slot. The filter predicate is inline in the
  `results` `useMemo` at `:122-127` (`matchesQuery(tool, q)` plus the three
  `cat`/`price`/`level` equality checks) — confirms the 2026-09-01 finding
  still holds: `matchesQuery()` covers only the text half, the three
  equality checks are still un-extracted one-liners simple enough not to
  need extraction. The category pill row is `:267-272`; price, level and
  Sort still share one wrapper div at `:275-294` (price `:277-281`, level
  `:283-287`, Sort `:289-293`) — the 2026-09-02 finding about gating `count`
  on `count != null` inside `Pill` itself (never passed at Sort's call site)
  is still the right guard and still necessary, nothing has split that div
  since. Zero-results block is `:296-323`. Confirmed no `src/utils/
  facetCounts.js` exists (`find src -iname '*facet*'` — zero hits) and grepped
  `Discover.jsx` for `count` — the only hits are `PAGE_SIZE`/`visibleCount`/
  `remaining` (pagination) and `answers.domain` unrelated matches, nothing
  facet-shaped. Still fully unbuilt, still Build size S, still the right
  next pick whenever the feature run wants a small, well-scoped, three-times-
  verified slice.
- **Deepened 2026-10-09 00:04 UTC — second-sweep re-verification, this
  entry is next-oldest OPEN by found-date after "Pro chat assistant"
  (skipping entries that shipped in between):** read the current 455-line
  `Discover.jsx` in full, not just the lines this entry already cites — it
  grew again (the fresh-tools rail's recency window and the recently-viewed
  rail both landed since the last check) and every anchor has drifted a
  fifth time. Corrected locations: `Pill` is now `Discover.jsx:39-49`,
  still exactly `{ active, onClick, children }` — confirmed no `count` slot
  by reading the full function body, not just its signature. The filter
  predicate is inline in the `results` `useMemo` at `:124-142`, with the
  `.filter()` call specifically at `:126-131` (`matchesQuery(tool, q)` plus
  the three `cat`/`price`/`level` equality checks — unchanged shape, still
  not extracted into a shared helper, confirming the 2026-09-01 finding
  still holds). The category pill row is now its own div at `:294-301`;
  price, level and Sort still share one wrapper div, now at `:303-322`
  (price `:304-309`, level `:310-315`, Sort `:316-321`) — the 2026-09-02
  gating finding (never pass `count` at Sort's `SORTS.map()` call site)
  is still the right guard and still necessary, that div still hasn't been
  split. Zero-results block is now `:324-377`. Confirmed again: no
  `src/utils/facetCounts.js` (`find src -iname '*facet*'` — zero hits) and
  grepped `Discover.jsx` for `count`/`facet` — same three unrelated
  pagination hits (`PAGE_SIZE`/`visibleCount`/`remaining`) as every prior
  check, nothing facet-shaped. Still fully unbuilt, still Build size S,
  still the right next pick for a feature run — four consecutive
  verification passes (09-01, 09-02, 09-22, now 10-09) have found this
  entry's plan correct and unchanged in substance across five rounds of
  line-number drift.

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
- **Deepened 2026-09-20 15:20 UTC — the oldest untouched OPEN entry (23 days,
  never previously deepened); re-read every file this plan cites against
  current `src/` rather than trusting the original references. The core idea
  and build size are still exactly right, but three things need correcting
  before this gets built:**
  1. **The data claim still checks out exactly.** Grepped
     `src/utils/toolsCatalog.js` directly: 652 `"status": "Active"`, 52
     `"status": "Uncertain"`, 47 of those 52 carry a non-empty `note`, 5 don't
     — the original counts were precise and remain so.
  2. **The status-note gap this entry deferred from has since shipped
     (`ef59a93`), but not the way this entry assumed.** It described linking
     from "wherever the status-note gap's inline UNCERTAIN badge ends up on
     `ToolDetail.jsx`" — that file has since moved to
     `src/pages/app/ToolDetail.jsx` and its badge (still a hot-pink pill,
     `ToolDetail.jsx:123-130`, `tool.status !== 'Active'`) never grew the note
     text under it as originally planned; the shipped version renders
     `tool.note` in a separate `TrustPanel.jsx` "Watch out for" row instead
     (`TrustPanel.jsx:31`), and the same badge pattern was reused verbatim on
     `ToolCard.jsx:69-75` (badge `title` attribute carries the note as a
     tooltip) and `Compare.jsx`'s Status row. None of that changes this
     entry's own build — still a new standalone page — but the "link to
     `/graveyard` from the badge" instruction needs a real target, corrected
     below.
  3. **A better, more appropriate link target now exists and didn't when this
     entry was written: `ToolPublic.jsx` at the public `/ai-tools/:slug`
     route (`App.jsx:128`), added since.** It's explicitly the public,
     crawlable, session-free per-tool page — "the in-app page
     (`/app/tools/:slug`) is personalised... this one is the same facts for
     everyone, so it can be crawled, shared and ranked" (`ToolPublic.jsx:9-11`)
     — exactly the audience a public `/graveyard` listing page serves, unlike
     the session-gated in-app `ToolDetail.jsx` the original plan pointed the
     inline link at. **Corrected plan:** link each graveyard card to
     `/ai-tools/:slug` (same as `CategoryLanding.jsx:100` already does, not
     `/app/tools/:slug`), and if a reciprocal in-page link is added at build
     time, put it on `ToolPublic.jsx` rather than `ToolDetail.jsx`. One
     related gap worth flagging but explicitly NOT folding into this entry's
     scope: `ToolPublic.jsx` already renders `tool.note` as a neutral "Worth
     knowing" fact (line 41) but never renders `tool.status` at all — a
     visitor lands on `/ai-tools/pi` and reads "Core team moved to Microsoft;
     app in maintenance" with no Uncertain flag anywhere on the page. That's
     a small, separate fix (add one `status`-conditional fact row, same shape
     as the existing `facts` array), not a graveyard-page dependency, and not
     worth widening this diff to include.
  4. **Route insertion point moved.** `/tools/:domain` (`CategoryLanding`) is
     now `App.jsx:125`, not `:79` — `/graveyard` should still sit in that
     same public-routes block, right after `/tools/:domain` and before
     `/ai-tools/:slug` at `:128`.
  - **No change** to the page's own scope, the `CategoryLanding.jsx`-modeled
    structure, the exclusions (no backfilled notes, no date-of-death field,
    no per-tool graveyard subpage, no removal from Discover/Compare), or the
    build-size estimate.
- **Re-verified 2026-10-07 12:04 UTC:** oldest-untouched-by-a-dedicated-pass
  OPEN entry by last-check date (17 days since the 09-20 deepening — staler
  than every other OPEN entry's own last-check timestamp, checked against
  all of them this run). Every fact still holds, one more small route-line
  drift: `grep -o '"status": "[A-Za-z]*"' src/utils/toolsCatalog.js` is
  still exactly 652 `Active` / 52 `Uncertain`, unchanged down to the digit.
  `App.jsx`'s route block grew by three lines (a directory-vs-directory
  `/vs/:slug` comment landed above it) — `/tools/:domain` is now `:128`
  (was `:125`) and `/ai-tools/:slug` is now `:131` (was `:128`); `/graveyard`
  still belongs between the two, substance of the "corrected plan" above
  unchanged. `ToolPublic.jsx:42` still renders only `['Worth knowing',
  tool.note]`, no `status` row — the small separate fix flagged in point 3
  above (not part of this gap's own scope) is still there and still unbuilt.
  `public/sitemap.xml` still lists exactly the 6 `/tools/*` URLs with no
  `/graveyard` line, and `scripts/smoke.mjs`'s `routes` array (now 25
  entries, `:32`) still has no `/graveyard` either. Nothing drifted in
  substance — still Build size S, still unbuilt, still the most build-ready
  entry nobody has touched in over two weeks.

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
- **Deepened 2026-09-22 03:20 UTC — re-verified against current `src/`; the
  plan is unchanged and still buildable exactly as scoped, three cited line
  references had drifted and one new supporting data point turned up:**
  - The "VISIT WEBSITE" anchor moved and its copy changed case: it now renders
    "Visit website" at `ToolDetail.jsx:151-163`, immediately followed by the
    "Add to my stack" / favorite button row at `ToolDetail.jsx:165-183`. The
    embed disclosure should still mount directly after the Visit website link
    and before that action row — same placement call as originally written,
    just at the corrected line numbers.
  - The `/s/:slug` route this gap depends on is unchanged (`App.jsx:120`,
    `<Route path="/s/:slugs" element={<SharedStack />} />`) and has since
    gained a second independent caller: `SearchTools.jsx:108` (the public
    search page, shipped after this entry was written) already links every
    result card to `/s/${encodeStackSlugs([tool.slug])}` — the identical
    single-slug degrade this plan relies on. A second production call site
    landing cleanly is a stronger signal the reuse is safe than the original
    single-caller (Stack.jsx) citation alone.
  - Both cited copy-to-clipboard precedents still exist, at different lines:
    `Stack.jsx`'s share-link copy is now at `Stack.jsx:117-128` (state/handler)
    and `:268` (button label), not `132-136`; `Learning.jsx`'s share-badge
    string is now at `Learning.jsx:264-271`, not `243-250`.
  - `embedBadge.js` still does not exist, and `grep -rniE
    "embed|badge|featured on toolnaut" src/` still returns nothing relevant
    beyond the unrelated UI already noted (level-up badges, pricing ribbon
    copy, the galaxy zoom readout) — the gap itself is untouched, only its
    citations needed correcting. No change to build size, steps, or the
    explicitly-excluded scope.
- **Re-verified 2026-10-09 03:04 UTC:** stalest-by-last-check OPEN entry (17
  days since the 09-22 deepening, the longest gap of any entry's own
  last-check timestamp as of this run). `embedBadge.js` still does not exist
  and the same grep still returns nothing relevant — gap itself fully intact.
  Lines drifted again, and one real wrinkle turned up worth correcting before
  anyone builds this:
  - "Visit website" moved again, now `ToolDetail.jsx:234-246` (was `151-163`
    at the 09-22 check). But a **new element landed directly after it that
    the plan's "mount directly after Visit website" instruction didn't
    anticipate**: a plain-text "Something wrong here?" report-issue link
    (`ToolDetail.jsx:247-256`, deliberately styled as understated text "not
    another nb-btn... a correction link shouldn't compete with the primary
    CTAs above it," per its own comment) now sits between "Visit website" and
    the stack/favorite action row. The embed disclosure is the same kind of
    secondary, non-competing disclosure — **corrected placement: after the
    stack/favorite action row (`ToolDetail.jsx:258-276`) and before the "Why
    it fits" sticker (`:278`)**, rather than wedging it between two links that
    were deliberately ordered as primary-CTA-then-quiet-text. This keeps the
    page's existing visual hierarchy (primary action → quiet correction link)
    intact and adds the badge disclosure as its own clearly-separate block
    below both, rather than interrupting them.
  - The `/s/:slugs` route is unchanged in substance, now `App.jsx:123` (was
    `:120`). `SearchTools.jsx`'s independent call site is unchanged in
    substance too, still `encodeStackSlugs([tool.slug])` at
    `SearchTools.jsx:108` — the reuse case is exactly as strong as last check.
  - Both copy-to-clipboard precedents drifted again: `Stack.jsx`'s handler is
    now `copyShareLink()` at `Stack.jsx:121-129`, its button label at
    `Stack.jsx:269` (was `117-128`/`268`); `Learning.jsx`'s is now two
    separate copy affordances rather than one — a `copied` state at
    `Learning.jsx:22-28` with a "Copy" button at `:38`, plus a second,
    unrelated `shared`/`setShared` share-string copy at `:192,277` added
    since the last check. Either of the two is still a valid precedent to
    cite; no change to the plan's reasoning.
  No change to build size, steps, or explicitly-excluded scope — this is a
  citation-and-placement correction, not a substance change.

### Per-tool "Alternatives" SEO pages — the single highest-intent directory query has zero pages targeting it
- **Status:** SHIPPED (discovered already live 2026-10-06 21:04 UTC — commit
  predates this session's visible history, see note at the end of this
  entry)
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
- **Deepened 2026-09-12 06:07 UTC — one exclusion-note claim is now stale,
  and the shipped fix it names creates one small new follow-on:** the geo
  work that landed since this entry was written (`d182656`, "entity links,
  real freshness dates, Bing, fuller sitemap") added `scripts/stamp-sitemap.mjs`
  plus `stampSitemap()` in `src/utils/freshness.js`, so the "no generator
  script exists anywhere in `scripts/`" line above is no longer accurate —
  read both files in full to confirm what actually changed before assuming
  more than this. It is **not** a sitemap generator in the sense this gap
  needs: `stampSitemap()` (`freshness.js:47-61`) only adds `<lastmod>` to
  URLs the static `sitemap.xml` already lists, and it does so by matching
  two hardcoded path shapes — `${site}/new` and `${site}/tools/${category}`
  (`freshness.js:51,61`) — nothing else. `public/sitemap.xml` itself is
  still exactly 18 hand-written `<url>` entries (confirmed by counting
  `<url>` tags directly), no per-tool or per-alternatives rows, no loop over
  the catalog. So the core plan above is unaffected: whoever builds this
  still hand-adds a small number of `/alternatives/:slug` lines to
  `sitemap.xml`, the same manual way the existing 18 were added. The one
  real, small addition this shipped feature creates: those hand-added
  `/alternatives/:slug` rows will render with **no** `<lastmod>` unless
  `stampSitemap()` is also extended with a third match arm keyed the same
  way as the `/tools/${category}` one — the alternatives page's freshness
  signal would naturally be the newest `discoveredAt` among the *same*
  `sourceCategory`/`category` tools the page itself lists, i.e. the same
  date `/tools/${category}` already computes for that tool's category,
  looked up by the target tool's own category rather than the URL's literal
  category segment. Not required to ship the page — the page works and is
  crawlable without a `lastmod` — but worth doing in the same PR since the
  match arm is a small, mechanical addition to an already-open function,
  not a new subsystem, and skipping it would mean these pages ship "stale by
  construction" from day one, one inconsistency this backlog would otherwise
  flag on sight (see the freshness/lastmod gap this same commit was built
  to close for other pages).
- **Discovered already shipped 2026-10-06 21:04 UTC (research run, UTC hour
  21) — this backlog had drifted out of sync with `master` the same way the
  changelog-staleness bug (flagged three times above) did, just for a
  bigger feature.** Re-verifying this entry for the usual line-reference
  drift found the whole thing already built, publicly live, and exceeding
  the original spec — not a new build, a bookkeeping fix. Confirmed by
  reading the actual files rather than trusting the stale "Gap" text above:
  `src/pages/ToolPublic.jsx` is a public, unauthenticated page at
  `/ai-tools/:slug` (`src/App.jsx:131`, outside `AppShell`'s session guard)
  with a dedicated "Alternatives to {tool.name}" section
  (`ToolPublic.jsx:120-144`) rendering up to 6 related tools from
  `relatedTools()` in `src/utils/toolSeo.js`, which ranks same-`sourceCategory`
  tools first (same two-tier logic this entry originally proposed) with one
  real improvement this entry didn't think of — a `looksLikeAName()` filter
  (`toolSeo.js:58-62`) that excludes radar-mis-shelved entries whose "name"
  is actually a headline (the exact "ChatPanel Now Available on Firefox next
  to ChatGPT" failure mode this entry's own "ranked by recognisable before
  alphabet" line worried about, now actually solved). `toolJsonLd()`
  (`toolSeo.js`) emits a real `"name": "Alternatives to {tool.name}"`
  structured-data block per page, not just HTML.
  `scripts/gen-tool-pages.mjs` generates a **static HTML file for every
  catalog tool** (confirmed this run: `npm run build` logged
  "gen-tool-pages: 1150 tool pages written, sitemap updated") and adds every
  one to the build-time `dist/sitemap.xml` — both wider than this entry's
  own scope cut, which proposed hand-adding "a small handful of the
  highest-traffic slugs" and leaving the rest as a follow-up. `ToolDetail.jsx`
  does not link out to the public page as this entry proposed, but that was
  always the optional, non-blocking half of the plan ("the new page does not
  depend on it being wired") — not a reason to call this unshipped.
  Could not find the shipping commit: `git log --follow` on all three files
  resolves to `abad463`, this checkout's root commit (a shallow/squashed
  clone boundary, confirmed via `git rev-list --max-parents=0 HEAD` — the
  real history predates what this sandbox can see), and `DEVLOG.md` mentions
  "the statically-generated `/ai-tools/chatgpt` page" as already existing in
  its 2026-09-?? "Suggest a tool" entry without naming when it shipped.
  **One real gap this discovery exposed, fixed this run:** the page was
  never in `scripts/smoke.mjs`'s route list — exactly the follow-up this
  entry's own build plan called for ("smoke.mjs's hardcoded route array
  needs one addition") and apparently the one piece that got missed. Added
  `/ai-tools/chatgpt`; `npm run smoke` now covers it (25/25 routes clean).
  No other code change — this is a backlog correction plus one test-route
  addition, not a feature build.
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
- **Status:** SHIPPED a1c0c9b — both halves built as scoped in the 2026-08-30
  deepening: `ToolDetail.jsx`'s tag chips and `ToolCard.jsx`'s new tag row
  (shared by Discover and Favorites) both link to `/app/discover?q=<tag>`,
  reusing the existing search predicate. No dedicated filter chip row, no
  `/tags/:tag` page — kept out per the original scope. Visible on the live
  site immediately (client-side only, no pipeline dependency).
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
- **Status:** OPEN — ATTEMPTED AND REVERTED 2026-09-13, see note below before
  retrying as-specified
- **Attempt note (2026-09-13):** built exactly as scoped (`faviconUrl.js`,
  `<img>` in `ToolCard.jsx`/`ToolDetail.jsx`, `onError` hiding) and it passed
  `npm test`/`npm run build`, but `npm run smoke` failed on every `/app/*`
  route rendering a tool grid (`/app/stack`, `/app/discover`,
  `/app/favorites`, `/app/tools/chatgpt`) — `page.goto(..., { waitUntil:
  'networkidle' })` timed out because dozens of `google.com/s2/favicons`
  requests never resolved. Root-caused with a standalone Playwright script:
  in *that day's* execution sandbox, headless Chromium could not complete
  ANY external request at all (a direct `page.goto('https://www.google.com/
  ...')` also hung to timeout) while the *shell's own* `curl` to the same URL
  succeeded in <100ms — a sandbox-specific Chromium egress restriction, not
  an app bug, and not something reproducible outside that sandbox. Reverted
  rather than shipped, per the hard "if any check fails, abandon" rule — GitHub
  Actions' `ubuntu-latest` runners likely have normal internet and might
  render this fine, but that's unverified from here. Before rebuilding this:
  either confirm the run's sandbox permits real external Chromium requests
  first (a 5-second throwaway check, same script pattern), or land it behind
  a CI-only pass and let the actual `ci.yml` smoke job be the verifier instead
  of a local one.
- **Re-check (2026-09-14 09:06 UTC):** ran the exact throwaway check against
  today's sandbox — `page.goto('https://www.google.com/s2/favicons?domain=
  openai.com&sz=64', { waitUntil: 'networkidle' })` in headless Chromium timed
  out at 8s, while a plain shell `curl` to the identical URL from the same
  container returned in 0.37s. Same split as the original attempt, different
  day — this is not a one-off flake, it's a standing property of this local
  execution sandbox (headless Chromium here cannot complete external network
  requests at all, regardless of target). Confidence this is sandbox-specific
  and not an app or CI issue is now higher, not lower: two independent runs,
  identical symptom. **Do not attempt a local build-and-verify of this gap
  again** — `npm run smoke` will fail here every time regardless of the code.
  The only forward path is building it exactly as scoped below, letting
  `npm test`/`npm run build` pass locally (neither touches network-in-
  Chromium), and trusting `ci.yml`'s own smoke job on GitHub Actions'
  `ubuntu-latest` runner as the real verifier — that runner has normal
  internet egress and is a different environment than this one. If a future
  feature run ships this, say explicitly in the PR/digest that local smoke
  was not run for this reason, so a red CI smoke result is treated as a real
  signal to fix, not dismissed as "probably the sandbox again."
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
- **Deepened 2026-09-22 12:20 UTC — the oldest untouched OPEN entry (22 days
  since its last note); re-ran this entry's own throwaway sandbox-network
  check rather than trusting the two prior "don't attempt local verify"
  conclusions, and today's result changes the risk call:** both 2026-09-13
  and 2026-09-14 reported the identical symptom — `page.goto` to the Google
  favicon URL hanging to an 8s `networkidle` timeout while `curl` to the same
  URL succeeded in under 400ms — and concluded headless Chromium in this
  sandbox cannot complete external requests at all. Re-running that exact
  check today gets a *different* failure shape: `page.goto(...,
  { waitUntil: 'networkidle', timeout: 8000 })` on the same URL rejects in
  257ms with `net::ERR_CERT_AUTHORITY_INVALID`, not a hang. The cause is
  visible in this environment's own `/root/.ccr/README.md`: outbound HTTPS
  here is routed through a local policy proxy that re-terminates TLS, and
  while the README says the browser NSS store is pre-configured to trust its
  CA, a bare `chromium.launch()` (no profile, no CA flag — exactly what
  `getFaviconUrl`'s consumers and `scripts/smoke.mjs` both do) never reads
  that store, so every external request this sandbox's Chromium makes now
  fails cert verification fast instead of hanging. Confirmed this is fast,
  not a hang, with a second, closer-to-real check: embedding the same URL as
  an `<img>` in a real page (rather than navigating to it directly) reaches
  `networkidle` in 854ms and logs exactly one console error — `Failed to
  load resource: net::ERR_CERT_AUTHORITY_INVALID`. That string already
  matches `scripts/smoke.mjs`'s existing `real` error filter (`/favicon|
  fonts.googleapis|fonts.gstatic|ERR_INTERNET|net::ERR|WebGL|Failed to load
  resource.*tools\.json/i` — `net::ERR` matches), so today's local `npm run
  smoke` would very likely pass this gap outright instead of needing a
  CI-only leap of faith. **This does not overturn the prior two runs' data**
  — they saw a real 8s hang on their days, this run sees a fast reject on
  this one, and nothing here explains why the same proxy produces both
  shapes on different days (worth someone eventually asking whether the
  agent-proxy's own state is what varies) — but it does mean the "never
  attempt a local build-and-verify again, trust CI blindly" instruction from
  2026-09-14 was too strong: re-run this exact throwaway check (`page.goto`
  the Google favicon URL with an 8s `networkidle` timeout) at the start of
  whichever run attempts this build, and if it resolves in well under 8s
  (hang or fast-reject both count as "resolves"; only a genuine hang to the
  full timeout means skip local verify), `npm run smoke` is trustworthy
  evidence again that day, not just `npm test`/`npm run build`. If it hangs,
  fall back to the 2026-09-14 guidance unchanged: build it, skip local
  smoke, trust `ci.yml`'s `ubuntu-latest` runner, and say so explicitly in
  the PR/digest.
  **Line references re-verified against current `src/` (both had drifted):**
  `ToolCard.jsx`'s category-color dot is still at line 42 as cited, but the
  tool-name `<h3>` this gap targets moved from `ToolCard.jsx:70-77` to
  `ToolCard.jsx:81-89` (an `isNewTool`/status-pill block was added above it
  since this entry was written). `ToolDetail.jsx`'s `<h1>` moved from line
  122 to line 133, and the "Visit website" link this gap's `website`-field
  claim leans on moved from `ToolDetail.jsx:138-149` to `ToolDetail.jsx:
  151-158` — same field, same behavior, new line numbers only.
  **Scope check on the "would not include" rollout list:** re-grepped `<img`
  across every card-shaped surface — `ToolCard.jsx`, `ToolDetail.jsx`,
  `CategoryLanding.jsx`, `NewTools.jsx`, `SharedStack.jsx`, `Compare.jsx` —
  still zero hits on all of them, so the core claim ("no tool has a visual
  identity anywhere in the app") is unchanged and, if anything, slightly
  wider than when this was written: two more comparison-shaped pages
  (`CompareCompetitor.jsx`, `PublicCompare.jsx`) shipped since 2026-08-31 and
  also render tool names with no logo, joining the explicitly-deferred v2
  rollout list rather than the v1 scope (`ToolCard.jsx`/`ToolDetail.jsx`
  only, unchanged). `Graveyard.jsx`/`Alternatives.jsx` still do not exist,
  so that conditional clause is still accurate as written.
  No change to the core spec (`faviconUrl.js`, the two `<img>` additions, the
  third-party-data-flow disclosure, the v1/v2 scope split) — this deepening
  only corrects line numbers, widens the confirmed-affected-surface count by
  two, and — the one substantive change — downgrades "never verify locally
  again" to "re-check the sandbox each time, it isn't consistently one way."

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
- **Status:** SHIPPED c8ef631
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
- **Re-verified 2026-10-09 06:09 UTC:** stalest-by-last-check OPEN entry (17
  days since its only prior touch, 09-22 — staler than every other OPEN
  entry's own last-check timestamp as of this pass). `public/feed.xml` still
  does not exist; `index.html` has no `rel="alternate" type="application/
  rss+xml"` tag. Three real pieces of drift found, all corrections rather
  than reversals:
  - The entry's own "zero hits beyond 'feedback'" grep result no longer
    holds literally — `radar/sources/rss.js` plus its test file now exist
    (an *input* discovery source that polls third-party `RSS_FEEDS`, a
    separate radar-config feature unrelated to this gap's proposed *output*
    feed). Re-ran the grep scoped to `index.html`, `public/`, and the parts
    of `radar/` that aren't the pipeline's own source/test code: still zero
    hits. The actual claim this entry depends on — no outbound syndication
    feed exists — still holds; only the grep's literal phrasing needed this
    caveat.
  - The claim "no script under `scripts/` or `radar/scripts/` generates or
    touches `sitemap.xml`, so no existing precedent to extend" is now false.
    `scripts/gen-tool-pages.mjs` (writes `dist/sitemap.xml` entries for all
    ~1,100 tool pages) and `scripts/stamp-sitemap.mjs` (adds `<lastmod>` via
    `src/utils/freshness.js`'s `stampSitemap()`) both landed since this entry
    was found and both generate/rewrite a static XML file from the live tool
    list as a build step — a closer, better precedent for `gen-feed.js` than
    `sync-to-app.js` alone, not a reason to doubt the plan. Still points at
    `radar.yml` as the right place to run it, since `gen-feed.js` needs
    `radar/data/tools.json` (pre-sync, with `discoveredAt`), not the built
    `dist/` output those two scripts run against.
  - The flagged wrinkle — "`<link>` = the same `${SITE}/app/tools/${slug}`
    pattern `NewTools.jsx`'s own JSON-LD already uses (inheriting that same
    page's already-flagged wrinkle: it points at a session-gated route, not
    a public one)" — is stale and should be dropped. Read `NewTools.jsx:38`
    in full: its JSON-LD now emits `${SITE}/ai-tools/${t.slug}`, the public
    route, not `/app/tools/${slug}`. No caveat needed — `gen-feed.js`'s
    `<link>` can point straight at `${SITE}/ai-tools/${slug}` with no
    gated-route wrinkle to carry forward.
  - Unchanged: `sync-to-app.js:29-30`'s `lifecycle === 'published'` filter,
    `prominence.js:70-73`'s `isCatalogNoise()` regexes, `radar.yml`'s "Export
    published tools into the app" step (now at line 101, running
    `sync-to-app.js` at line 103), and `public/tools.json`'s per-tool shape
    (`slug`, `name`, `blurb`, `website`, `discoveredAt` all still present,
    confirmed by reading a live record) — every field this plan needs is
    still exactly where the plan expects it. Still Build size S, still the
    most build-ready entry in its own cohort (alongside the now-reverified
    "Embeddable badge," 09-22, and "Discover's filter chips," 09-22/10-09).
- **Deepened:** 2026-09-22 06:20 UTC — re-read every cited file against
  current `src/`/`radar/`/`.github/workflows/`; the gap itself is unchanged
  and still fully unbuilt (confirmed again: no `feed.xml`, no `gen-feed.js`,
  no `rss|atom|feed\.xml` hit anywhere outside `radar/sources/rss.js`, which
  is radar's unrelated *inbound* discovery source, not an outbound feed).
  Three things had drifted or needed correcting:
  - **The plan's own named wrinkle is already fixed, which simplifies the
    build.** This entry flagged that `NewTools.jsx`'s JSON-LD pointed
    `<link>`s at the session-gated `/app/tools/:slug` route and said fixing
    that "in the same pass" would be nice but not a blocker. That's now moot
    — `NewTools.jsx:38` links to `${SITE}/ai-tools/${t.slug}`, the public,
    crawlable `ToolPublic.jsx` route (`App.jsx:128`) that shipped since this
    entry was written. `gen-feed.js`'s `<link>`/`<guid>` should use
    `${SITE}/ai-tools/${slug}` from the start — no follow-up fix needed, and
    one fewer judgment call for whoever builds this.
  - **A real gap in the original plan, not just drift:** `radar.yml`'s
    "Commit the store and the app feed" step runs `git add radar/data
    public/tools.json` explicitly (`radar.yml`, ~line 118) — it does not
    glob `public/*`. A `public/feed.xml` written by `gen-feed.js` would
    generate correctly every run and then never be staged or committed,
    silently vanishing on the next checkout. This entry's original build
    notes named the workflow step to add the *script call* to but never
    named this second edit; add `public/feed.xml` to that `git add` line in
    the same commit that adds the export step, or the feature ships and does
    nothing.
  - `index.html`'s icon/manifest `<link>` cluster is now lines 31-34 (a
    `manifest.webmanifest` link was added after this entry was written),
    not 31-33 — one line lower than cited, cosmetic only.
  - Confirmed unchanged and exact: `prominence.js:70-73` still is
    `isCatalogNoise()` verbatim; `sync-to-app.js`'s `FIELDS` array still
    carries `slug`/`name`/`blurb`/`website`/`discoveredAt` and its
    `published` filter is still `lifecycle === 'published'`, both load-
    bearing assumptions this plan depends on and both still hold exactly as
    described.
- **Verification 2026-09-24 03:20 UTC:** this was the oldest untouched OPEN
  entry (last checked 2 days ago, longer than any other OPEN entry's gap
  since its own last touch). Re-checked every load-bearing fact against
  current `master` rather than deepening further — the plan is already this
  thorough and build-ready, so the useful work today is confirming it hasn't
  gone stale, not adding more prose. Zero drift found:
  `radar/scripts/gen-feed.js` and `public/feed.xml` still don't exist
  (confirmed via direct file check, not just grep); `radar.yml`'s export step
  is still `node radar/scripts/sync-to-app.js` immediately followed by
  `git add radar/data public/tools.json` at line 122, still missing a
  `public/feed.xml` glob exactly as the last deepening flagged;
  `isCatalogNoise()` is at `prominence.js:66-72` (regexes 66-68, function
  70-72 — one line lower than last cited, cosmetic only);
  `sync-to-app.js`'s `FIELDS` array (line 12) is unchanged; `NewTools.jsx:38`
  still links to the public `${SITE}/ai-tools/${t.slug}` route. Still OPEN,
  still build size S, no corrections needed — ready to build exactly as
  scoped whenever a feature run picks it.

### Settings page hardcodes "no server copy" — the sync backend it's describing already exists elsewhere in the app
- **Status:** FIXED (this commit) — small, well-scoped defect in already-shipped
  infrastructure, same class as the two other FIXED entries in this file.
  `Settings.jsx` now calls the same `syncAvailable()` probe `SyncStatus.jsx`
  and `GuestImportPrompt.jsx` already use, holds the result in local state
  (`null` while checking, matching the "say nothing until you know" rule this
  codebase already follows), and both the guest and signed-in ACCOUNT-card
  copy branches swap on it: `false` keeps today's honest "no server copy yet"
  wording unchanged, `true` replaces it with copy that names the real,
  now-live behaviour ("saves your stack... to your account" / "Backed up to
  your account"). No change to `sync.js`, `authStore.js`, or any migration —
  purely the copy/data-binding fix the deepened entry below scoped it to.
  214 app tests + 102 radar tests green, build clean (16/16 routes
  prerendered), smoke clean (21/21 routes, 0 console errors, `/app/settings`
  included).
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

### 26 real source categories exist, only the 6 broad domain pages shipped — and those already render unpaginated 100+ tool grids
- **Status:** OPEN
- **Seen in:** deepening the already-shipped "Category/role landing pages" gap
  above (`927ee5b`), not a fresh competitor — that entry's own "smallest
  useful version" explicitly scoped v1 to the 6 `CATEGORY_META` domains and
  named the 26 real `SOURCE_CATEGORIES` as "a natural, larger follow-up," but
  never turned that follow-up into its own backlog entry, so it sat
  unbuilt and untracked. Re-checked it against the same long-tail-SEO logic
  that justified the domain pages: FutureTools.io and Futurepedia (both
  already studied in this file) don't stop at 6 top-level buckets either —
  Futurepedia's own nav exposes 20+ specific categories ("AI Video
  Generators," "AI Voice Generators," "AI Presentation Makers") because
  "best AI video generation tools" and "best AI coding tools" are different
  search queries with different intent, and a single broad "design" or
  "code" page can only rank for one of them.
- **Gap:** confirmed by reading the live `CategoryLanding.jsx` (111 lines,
  read in full; 123 lines as of the 2026-10-09 09:04 UTC re-check, see note
  below) and `toolsCatalog.js:18-45`. Two distinct problems, found
  together:
  1. **Missing pages.** `CategoryLanding.jsx:26` filters `TOOLS` by
     `t.category === domain` (now `:27`, one-line drift), i.e. only the 6
     `CATEGORY_META` keys (`code`/`design`/`writing`/`data`/`automation`/
     `learning`) — there is no route, page, or sitemap entry for any of the
     26 `SOURCE_CATEGORIES` (`toolsCatalog.js:19-45`, e.g.
     `"AI Coding & Development"` at 62 tools, `"Image Generation & Editing"`
     at 60, `"Marketing, SEO & Sales"` at 41). `public/sitemap.xml` lists
     exactly the 6 domain URLs (`/tools/code` … `/tools/learning`),
     confirming zero of the 26 are indexable anywhere. `Discover.jsx`'s own
     filter UI already treats `sourceCategory` as the real, user-facing
     category (its filter chips are keyed off it, not the 6-domain
     grouping), so the site's own primary browsing surface already
     disagrees with what its SEO pages expose.
  2. **No pagination on the pages that do exist.** `CategoryLanding.jsx`'s
     render (`:64-99`, now `:93-110` — a new "No tools in this category yet"
     empty-state branch was added at `:90-92` since this was first found,
     unrelated to this gap) does `tools.map((tool) => …)` over the full
     filtered array with no cap — unlike `Discover.jsx`, which caps at
     `PAGE_SIZE = 24` (`Discover.jsx:33`, now `:37`) with a "LOAD 24 MORE"
     button (`Discover.jsx:131-133,312-315`, now `:420-423` — `Discover.jsx`
     grew from under 350 lines to 455 since this entry was found, from
     unrelated filter/facet work) specifically to avoid the DOM-explosion
     problem `Discover.jsx`'s own code comments name, and unlike
     `SearchTools.jsx`, which caps at 60 (`RESULT_CAP`, confirmed still at
     `SearchTools.jsx:8`) with a "narrow your search" hint for the same
     reason. Summing `SOURCE_CATEGORIES` counts per domain: `design`
     renders 184 unpaginated cards today (60+47+37+21+19), `code` renders 137
     (62+58+12+5), `writing` 135, `automation` 133, `data` 95 — every single
     one of the 6 live domain pages already exceeds both of the app's own
     established pagination thresholds, on a route Google is specifically
     asked to crawl. All five domain totals re-summed against current
     `toolsCatalog.js` on 2026-10-09 — unchanged since this entry was found;
     the static catalog (not the radar's daily `tools.json` additions) is
     the source for these pages and has not been regenerated.
- **Why it matters:** this compounds two costs from one root cause (the v1
  cut stopped at the wrong granularity). On the acquisition side, 26
  high-intent long-tail queries ("AI video generation tools," "best HR and
  recruiting AI tools") stay unclaimed while Toolnaut competes for 6 much
  broader, much more contested terms instead. On the UX/perf side, the pages
  that do exist are the worst-performing pages in the app by DOM size —
  worse than the exact problem `Discover.jsx` and `SearchTools.jsx` already
  shipped fixes for — and they're the pages a first-time, not-yet-signed-in
  visitor from a search result lands on cold, making a slow first
  impression on exactly the traffic this feature exists to capture.
- **Smallest useful version (what to actually build):**
  - New pure util `src/utils/categorySlug.js`: `slugifyCategory(id)` →
    lowercase, `&` and non-alphanumerics to `-`, collapse/trim repeats (e.g.
    `"AI Coding & Development"` → `"ai-coding-development"`,
    `"3D, Gaming & Simulation"` → `"3d-gaming-simulation"`). Computed at
    render/route-match time, never written back into `toolsCatalog.js` —
    that file's own header comment says "AUTO-GENERATED … do not hand-edit,"
    so a `slug` field can't be added to `SOURCE_CATEGORIES` by hand; deriving
    it in a small util is the only change that survives the next radar
    catalog sync. `resolveCategory(slug)` does the reverse lookup (finds the
    `SOURCE_CATEGORIES` entry whose `slugifyCategory(id) === slug`) so the
    page component does one lookup, not a `.find()` inline. Pure functions,
    unit-testable like `shareStack.js`.
  - New route `/tools/:domain/:category` in `App.jsx`, nested directly under
    the existing `/tools/:domain` line (`App.jsx:107`, now `:128` — four
    unrelated routes, `/example`, `/checkout`, `/methodology`, `/vs/:slug`,
    were added above it since this entry was found) — same public,
    session-free tier. `:category` is the slug from `categorySlug.js`.
  - `CategoryLanding.jsx` (extend, don't fork): when `:category` is present,
    resolve it via `resolveCategory`, filter `TOOLS` by
    `t.sourceCategory === resolved.id` instead of `t.category === domain`,
    and redirect to `/tools/:domain` (not `/`) if the slug doesn't resolve or
    doesn't belong to that domain — a bad subcategory slug degrades to the
    working parent page, matching this codebase's established
    unknown-param-degrades-gracefully pattern (`SharedStack.jsx`,
    `CategoryLanding.jsx`'s own unknown-domain handling). Title/description/
    JSON-LD follow the same shape as the domain version, swapping
    `meta.name` for the real category name (e.g. "Best AI tools for image
    generation & editing (60 compared) — Toolnaut").
  - Fix the pagination gap on **both** page shapes in the same change (the
    subcategory pages alone don't fully fix it — `design` at 60 tools is
    still above `SearchTools.jsx`'s own 60-cap precedent): reuse
    `Discover.jsx`'s exact `PAGE_SIZE`/"LOAD MORE" pattern
    (`Discover.jsx:33,131-133,312-315`) rather than `SearchTools.jsx`'s
    harder cap, since a landing page whose whole job is showing the full
    category list benefits more from progressive loading than a truncation
    hint.
  - The domain page becomes a hub: below its existing tool grid (now
    paginated), add a "Browse by category" row of chips linking to each of
    that domain's subcategory URLs — the natural way a visitor on the broad
    `/tools/design` page narrows to `/tools/design/image-generation-editing`,
    and the internal-link path that gives the 26 new pages some non-sitemap
    discoverability too.
  - `public/sitemap.xml`: 26 new `<url>` entries, one per `SOURCE_CATEGORIES`
    id, same `changefreq`/`priority` as the existing 6. `scripts/smoke.mjs`
    and `scripts/prerender.mjs`'s route lists need at least one representative
    subcategory URL added (not all 26 — the existing route-list additions in
    this file's own prior entries only ever add one example path per new
    route shape, e.g. `/s/notion-ai` for the whole `/s/:slugs` family).
  - **New wrinkle found 2026-10-09** (`scripts/stamp-sitemap.mjs` +
    `src/utils/freshness.js:47-74`'s `stampSitemap`, both read in full — a
    precedent that didn't exist when this entry was first found): the
    post-build step that adds `<lastmod>` to the 6 existing domain URLs keys
    its date map by `${site}/tools/${t.category}` — the 6-domain field, not
    `sourceCategory` (`freshness.js:54-61`). The 26 new nested URLs this plan
    adds would therefore get no `<lastmod>`, same as every other
    undated URL — degrades cleanly per the file's own "a missing lastmod is
    neutral" comment, not a build blocker. A fuller version could add a
    second `sourceCategory`-keyed loop so the subcategory pages carry the
    same freshness signal the domain pages do, but that is explicitly
    optional, not required for this entry's scoped build.
  - **What this would NOT include** (kept out to bound the diff): no change
    to the 6-domain grouping itself or `CATEGORY_META`; no new visual design
    — same card/grid/glass styling `CategoryLanding.jsx` already uses; no
    breadcrumb component (a plain "← Back to {domain} tools" link is enough
    for v1); no attempt to also add facet counts or clickable-tag filtering
    on these pages (both separate OPEN gaps in this file — this entry is
    scoped to category coverage and pagination only, not every open Discover-
    adjacent idea at once).
- **Build size:** M — one new pure util (`categorySlug.js`), one new nested
  route, an extension (not a rewrite) of the existing `CategoryLanding.jsx`
  to handle both param shapes and add pagination, 26 sitemap entries, one
  smoke/prerender route-list addition. No backend, no new dependency, no new
  store, no radar change.
- **Found:** 2026-09-05 15:20 UTC
- **Deepened 2026-09-06 03:03 UTC:** checked this entry against `RolesSection.jsx`
  and `rolesData.js` while confirming no other backlog entry already covers
  this angle (grepped `RolesSection|rolesData` across this file — the only
  hits are in the already-shipped `927ee5b` category-landing-page entry
  above). That entry explicitly flagged its own role→domain wiring as a
  deliberate simplification, not an oversight: "the smallest honest fix is
  giving each Tilt card a Link to the domain it's closest to in spirit …
  rather than inventing a second role taxonomy" (line ~1494-1502 in this
  file). This subcategory gap is what makes that simplification fixable for
  real, so the connection is worth recording here rather than re-discovering
  later. Today `RolesSection.jsx:124` links every role card to
  `/tools/${r.domain}` — one of the 6 broad `CATEGORY_META` pages — and
  `rolesData.js`'s own header comment admits the mapping exists only to
  satisfy "each of the 6 domains is used exactly once," not because that
  domain is each role's best fit. Two of the six are visibly loose once you
  look at the real `SOURCE_CATEGORIES` list this gap is about to make
  routable: PM → `automation` today, when "Productivity & Meetings" (47
  tools, same `automation` domain) is a far more specific, on-the-nose
  destination for a PM card than the generic automation-domain page it
  currently gets; Marketer → `writing` today, when "Marketing, SEO & Sales"
  (41 tools, same `writing` domain) is the obviously-named match sitting
  right there in the taxonomy the marketer role is supposedly drawn from.
  Founder → `data` is the weakest of the six and probably shouldn't be
  "fixed" by picking a single subcategory at all — a founder's real tool
  surface spans automation, writing and data roughly evenly, so forcing one
  subcategory would trade one arbitrary link for another; that card is
  better left on its current broad domain page, or reconsidered separately,
  not folded into this fix. Note also that `personaGenerator.js`'s own role
  vocabulary (`student/developer/designer/creator/founder/manager/analyst`)
  doesn't share names with `rolesData.js`'s `ROLES` (`PM`/`Marketer`/
  `Engineer` have no literal match there either) and carries no
  subcategory-level weighting of its own — so a role→subcategory map for
  `RolesSection.jsx` would be new, hand-picked data, not something to look
  up from existing scoring logic.
  **Not part of this gap's own build** — recorded as a fast-follow once the
  26 subcategory routes above ship, not a reason to widen this entry's
  diff: re-point `RolesSection.jsx`'s `PM` and `Marketer` cards (the two
  clear wins) at their matching subcategory slugs via `categorySlug.js`
  once it exists, leave `Founder` on its current domain link, and leave
  `Student`/`Designer`/`Engineer` alone unless a similarly obvious
  subcategory match turns up on review (design and code are each dominated
  by one or two subcategories close enough to the whole domain that
  re-pointing them may not be worth a special case).
- **Verification 2026-09-25 12:07 UTC:** re-checked the whole plan against
  current master (untouched for 19 days, longest of any OPEN entry). Every
  cited fact still holds exactly, zero drift: `CategoryLanding.jsx:26` still
  filters only by `t.category === domain`, still no pagination on its
  `tools.map()` render; `SOURCE_CATEGORIES` still has the same 26 entries
  with the same counts (design still sums to 184, code to 137); `App.jsx:128`
  still has only `/tools/:domain`, no nested `:category` route;
  `sitemap.xml` still lists exactly the same 6 `/tools/*` URLs; `Discover.jsx`
  still has `PAGE_SIZE = 24` at line 35 with the same LOAD-MORE pattern;
  `RolesSection.jsx:124` and `rolesData.js` are byte-identical to what this
  entry already quoted (PM→automation, Marketer→writing, Founder→data,
  each domain still used exactly once).
  One correction found in the plan itself, not the code: the claim that
  "`scripts/smoke.mjs` and `scripts/prerender.mjs`'s route lists need at
  least one representative subcategory URL added (not all 26)" is right for
  `smoke.mjs` but wrong for `prerender.mjs`. Read `prerender.mjs` in full —
  it isn't a sampled route list like `smoke.mjs`'s. Its own header comment
  explains why it exists at all: the app is client-rendered, so "two
  separate external reviewers could not read the site at all" until this
  script started walking every public, crawler-facing route in a real
  browser and writing static HTML into `dist/` for it. Its `ROUTES` array
  (`prerender.mjs:41-59`) already lists all 6 domain pages individually —
  not a sample — alongside every other public/SEO route (both `/vs/*`
  pages, but deliberately *not* the 6 sitemap-listed `/compare/*` pairs,
  which stay SPA-only). Since this gap's entire "why it matters" section is
  the SEO/crawlability case for the 26 subcategory pages specifically, and
  `prerender.mjs` is the exact mechanism that makes a Toolnaut page
  independently readable rather than a blank shell, prerendering only 1 of
  26 new pages would reproduce, for 25 of them, the identical problem this
  script was built to fix on the 6 pages it already covers. **Corrected
  scope:** all 26 subcategory routes belong in `prerender.mjs`'s `ROUTES`
  array (one line each, same shape as the existing 6 domain lines), not
  just a representative sample; `smoke.mjs` still only needs one example
  (its job is catching a route-shape regression in headless Chromium, not
  crawlability, and it already treats the analogous `/s/:slugs` family that
  way with a single `/s/chatgpt` entry). This roughly triples
  `prerender.mjs`'s route count (19 → 45); nothing in the script caps or
  parallelizes differently by count — it walks `ROUTES` one at a time with
  a 45s per-page timeout, so this is a longer build step, not a different
  mechanism, and stays a build-time-only cost. No other part of the plan
  changed; still OPEN, still M, ready for a feature run to build from the
  spec above with this one correction folded in.
- **Re-verified 2026-10-09 09:04 UTC** — the stalest OPEN entry by last-check
  (14 days since the 09-25 verification above). Corrected three more lines
  of citation drift inline above (`CategoryLanding.jsx` grew to 123 lines
  with an unrelated empty-state branch; `Discover.jsx` grew to 455 lines,
  moving `PAGE_SIZE` from `:35` to `:37` and the LOAD-MORE button to
  `:420-423`; `App.jsx`'s `/tools/:domain` route confirmed still at `:128`,
  matching the 09-25 note exactly). All `SOURCE_CATEGORIES` counts re-summed
  against current `toolsCatalog.js` — unchanged. Found one genuine new
  wrinkle, logged inline above in the "Smallest useful version" section:
  `scripts/stamp-sitemap.mjs` + `freshness.js`'s `stampSitemap` (a precedent
  that didn't exist when this entry was found) keys its `<lastmod>` map by
  the 6-domain `category` field, not `sourceCategory`, so the 26 new
  subcategory URLs this plan adds would get no `<lastmod>` unless a second,
  `sourceCategory`-keyed loop is added — optional, not a blocker, noted for
  whoever builds this. Two fresh WebSearches (Futurepedia/TAAFT 2026
  changelogs; AI-directory subcategory-SEO practice) found no new
  competitor feature — the second actually reaffirms this entry's own
  thesis (niche long-tail category pages over broad ones is the pattern
  indie AI-directory builders report working in 2026) rather than
  surfacing anything new to log. Still OPEN, still Build size M, plan
  otherwise unchanged.

### Access-method facet ("Web app" / "API" / "Self-hosted") — Discover has no way to filter out API-only or open-weights tools from a beginner's results

- **Status:** BUILT, UNMERGED — PR #89 (sha `2e256db` on branch
  `bot/claude/access-method-facet-2026-10-03`) — built as scoped below:
  `src/utils/accessMethod.js`, the Discover filter pill and `matchScore.js`'s
  soft bias all landed in the same commit, with 8 new unit tests. All three
  checks (`npm test`/`build`/`smoke`) green on the branch, but
  `git push origin master` was blocked by that session's own permission
  layer ("Production Deploy" denial, the same block issue #88 hit on
  2026-10-02), so it shipped as a PR instead — same convention as PR #86's
  entry below. This status line was correct on the PR #89 branch since
  2026-10-03 but had not yet reached `master`; copied over 2026-10-03 21:11
  UTC after confirming PR #89's diff still matches. **Do not rebuild
  this** — it needs a human to merge #89, not more agent code.
- **Seen in:** studied fresh this run — Tool Finder (toolfinder.com, a
  1,300+-tool software directory; fetched its `/categories/ai-tools` and
  `/tools?platform=web` pages, both 403'd to a direct fetch, so worked from
  its own indexed copy and cached search snippets instead) filters its
  catalog by **platform** (web/desktop/mobile) and **team size** as facets
  distinct from category — i.e. "what kind of thing is this, and how do I
  actually use it" is treated as its own filter axis, not folded into the
  category taxonomy. Toolnaut has no equivalent: `Discover.jsx`'s only
  facets are category, price and level (`Discover.jsx:60-62`).
- **Gap:** confirmed by reading `toolsCatalog.js`'s 704-record schema in
  full — there is no `platform` field anywhere (`slug`, `category`,
  `sourceCategory`, `price`, `pricing`, `level`, `blurb`, `audience`, `dev`,
  `year`, `website`, `status`, `note`, `tags`, nothing else), and
  `radar/schema.js`'s canonical `makeToolRecord()` (the pipeline's own
  source of truth, deliberately kept in sync with the app shape per its own
  header comment) doesn't have one either — this isn't a wiring gap, the
  data genuinely doesn't exist yet. A beginner running the quiz today can
  land on "Falcon" or "Command" (open-weights/enterprise-API-only entries,
  confirmed in `toolsCatalog.js`) with the exact same "beginner" `level`
  tag as ChatGPT, even though one is a sign-up-and-click product and the
  other requires standing up your own inference. `level` describes skill
  required to use the *output*, not how much engineering setup is needed to
  *reach* the product — they're different axes Toolnaut currently
  conflates into one.
- **Why it matters:** this is a real beginner-trust problem, not a nice-to-
  have facet — Toolnaut's whole pitch is a role-aware quiz that won't hand a
  non-technical user something they can't actually use, and "beginner-level,
  open-weights, API-only" is exactly the kind of recommendation that breaks
  that promise silently (the tool is genuinely good and genuinely
  beginner-friendly *once you have a GPU cluster or an API key*, which is
  not what "beginner" reads as to the visitor taking the quiz).
- **Why the honest version is smaller than "add a platform field":** a real
  `platform` enum would need LLM re-enrichment across all 704 already-
  published records (`radar/enrich.js`) plus a schema/validate-gate change
  — a backfill risk against the exact load-bearing `public/tools.json` file
  this project's own CLAUDE.md flags as sensitive, and radar's LLM step is
  the same one already once broken silently by a timeout (the NO-PUBLISH
  failure mode). Inventing per-tool platform data by hand for 704 entries
  would also be the invented-data problem this backlog has consistently
  avoided (`StatsSection.jsx`'s counted-vs-seeded split, the Alternatives-
  page entry's rejected "8-parameter scoring" idea). So a full backend/data
  build here should stay REJECTED for now, same reasoning as the other
  radar-schema-touching ideas in this file — but a **derived**, purely
  client-side proxy is honestly buildable today from data that already
  exists: `tags` already carries `"api"` (14 tools) and `"open-source"` (33
  tools) values (counted directly against `toolsCatalog.js`), and `pricing`
  strings already say things like `"Usage-based API"` / `"Enterprise API"` /
  `"Open weights"` verbatim on the exact records this gap is about.
- **Smallest useful version (what to actually build):**
  - New pure util `src/utils/accessMethod.js`: `accessMethodOf(tool)` →
    checks `tool.tags.includes('api')` or `/\bAPI\b/.test(tool.pricing)` →
    `"api"`; `tool.tags.includes('open-source')` or `/open.weights/i.test(
    tool.pricing)` → `"self-hosted"`; else `"web"` (the default, and
    correctly the common case — most of the catalog is a sign-up-and-use
    product). Three buckets only, labelled honestly as **derived**, not
    vendor-declared. Pure function, unit-testable like `categorySlug.js`/
    `shareStack.js`.
  - `Discover.jsx`: one more `Pill` row next to the existing price/level
    rows (`Discover.jsx:220-233`), same `searchParams`-backed pattern
    (`access` param), filtering with `accessMethodOf(tool) === access`.
  - `personaGenerator.js`/quiz scoring (not audited line-by-line this run,
    flagged for whoever builds this to confirm): a "beginner" persona's
    results should bias against `"api"`/`"self-hosted"` unless the visitor's
    own answers indicate developer comfort — this is the part of the gap
    that actually protects the quiz's promise, not just the Discover filter,
    so the smallest version that only touches `Discover.jsx` is a partial
    fix; the filter alone still ships value (a developer can already
    self-select "API" today) even if the quiz-side bias lands later.
  - **What this would NOT include** (kept out to bound the diff): no new
    `platform` field in `toolsCatalog.js`/`radar/schema.js` — this stays a
    derived, client-only label, not a catalog change; no radar/enrichment
    change of any kind; no team-size facet (Tool Finder's other axis) — no
    field in this catalog supports it even heuristically, inventing one
    would be exactly the "made-up number" problem this file avoids; no
    change to `level`'s existing meaning, this is a new, separate axis
    alongside it, not a redefinition.
- **Build size:** S — one new pure util, one new filter row reusing
  `Discover.jsx`'s existing `Pill`/`searchParams` pattern. No backend, no
  radar change, no new dependency. (The quiz-scoring bias half, now scoped
  below, is a separate ~10-line addition to `matchScore.js` — not required
  to ship the filter, but no longer unscoped.)
- **Found:** 2026-09-06 09:09 UTC
- **Deepened 2026-09-10 (audit run):** resolved the "not audited this run"
  hedge on the quiz-scoring half rather than leaving it as a flagged unknown.
  1. **A hard filter is the wrong mechanism, and the codebase already says
     so.** `eligibility.js`'s header comment (around line 26-35) names "API
     availability" by name as a legitimate hard constraint that "none of
     [these] can be enforced today" for lack of a catalog field, and
     `passesHardConstraints` only ever checks the free-budget/paid-tool
     case. Since this gap deliberately stays derived-only (no new catalog
     field, per its own NOT-include list below), a hard eligibility gate
     here would contradict `eligibility.js`'s own documented reasoning — it
     has to be a soft bias instead.
  2. **The soft-bias mechanism this needs already exists.** `matchScore.js`'s
     `EXPERIENCE_LEVEL_BONUS` (keyed on `answers.experience` × `tool.level`,
     applied at `score += EXPERIENCE_LEVEL_BONUS[answers.experience]?.[
     tool.level] ?? 0` inside `scoreTool`) is the established pattern for
     exactly this kind of per-experience nudge. `personaGenerator.js` — the
     file this entry originally guessed at — only holds label/noun tables
     and imports scoring helpers; it does not score anything itself.
  - **Corrected smallest useful version for this half:** add a parallel
    `ACCESS_METHOD_BONUS` const to `matchScore.js`, same shape as
    `EXPERIENCE_LEVEL_BONUS` (beginners/dabblers take a small penalty for
    `accessMethodOf(tool) === 'api' | 'self-hosted'`, builders/regulars
    don't), plus one `score += ACCESS_METHOD_BONUS[answers.experience]?.[
    accessMethodOf(tool)] ?? 0` line next to the existing
    `EXPERIENCE_LEVEL_BONUS` line in `scoreTool`. ~10 lines in the one file
    already responsible for every other soft bonus — not a new subsystem,
    and still fully separable from the `Discover.jsx` filter (the filter
    ships value alone; this closes the quiz-honesty half).
  - **Still would NOT include:** no hard exclusion at any experience level —
    same soft-preference-not-eligibility-gate reasoning `eligibility.js`
    already applies to every other unenforceable constraint; no change to
    `EXPERIENCE_LEVEL_BONUS` itself, this is additive and parallel to it.

### The "no credit card" claim survived on three more pages the payment audit never checked — including the hero every visitor sees first

- **Status:** SHIPPED 6c6859c — verified 2026-09-10: `HeroSection.jsx:133`,
  `CTASection.jsx:53` and `ExampleStack.jsx:241-243` all read `paymentsOn`
  from `VITE_PAYMENTS_ENABLED` and swap the claim exactly as scoped below.
- **Seen in:** not a competitor pattern — a direct continuation of the
  already-SHIPPED "Free public beta, no payment" audit above (found
  2026-09-02, sha in DEVLOG). That entry fixed `ContactSection.jsx`,
  `Methodology.jsx`, `CapabilityMatrix.jsx` and `Pricing.jsx` — the four
  sites its own investigation named — but never widened the search past
  those four. Re-running the search this run (`grep -rn "credit card" src/`)
  turns up three more literal, unconditional matches the original audit
  missed entirely.
- **Gap:** three more customer-facing strings assert "no credit card" as a
  permanent fact instead of branching on `VITE_PAYMENTS_ENABLED`, the exact
  same flag `ContactSection.jsx`/`CapabilityMatrix.jsx`/`Methodology.jsx`/
  `Pricing.jsx` already read for this:
  - `HeroSection.jsx:129` — `<li>✓ No credit card</li>`, in the trust row
    directly under the primary CTA. This is the single worst site of the
    three: the hero is the first thing every visitor sees, before they've
    clicked anything, on the landing page that gets 100% of top-of-funnel
    traffic. The row sits right next to `count`/`updated`, which the file's
    own header comment says are deliberately live-read from the catalogue
    "because a hardcoded number would be false the next time the radar
    publishes" — the exact reasoning that was applied to two of the four
    neighbouring list items and skipped for this one.
  - `CTASection.jsx:52` — `No credit card. No commitment.`, under the
    final-page CTA button, unconditional.
  - `ExampleStack.jsx:239` — `Nine questions, about ten minutes. No credit
    card, and no account until you want to save it.`, in the page's own
    closing CTA block, unconditional.
  Confirmed these are real gaps, not already-covered ground: `Checkout.jsx`
  (`PAYMENTS_ON = import.meta.env.VITE_PAYMENTS_ENABLED === 'true'`) runs a
  live Razorpay flow once the flag is on — a real card, even in Razorpay's
  test mode — so "no credit card" is only true while the flag is off, same
  as the four already-fixed claims. `FounderOffer.jsx` was also checked
  (grepped for "credit card"/"no cost"/"free forever"/"no payment"/"no
  charge") and has no matching claim — clean, not part of this gap.
- **Why it matters:** the original entry called this "a materially bigger
  trust risk than the sync gap" because it puts the site's own commercial
  page in contradiction with a live transaction — but the hero row is a
  bigger exposure than any of the four pages that entry did fix. Every one
  of those four is a page a visitor has to navigate to (`/pricing`,
  `/methodology`); the hero is unavoidable — it is the page. The day
  `PAYMENTS_ENABLED` flips, the very first thing a returning or new visitor
  reads is a trust badge telling them payment is impossible, directly above
  a button that (for a signed-in, un-entitled user) `AppShell.jsx:54-72`
  will route straight into `/pay`.
- **Smallest useful version (what to actually build):** reuse the exact
  conditional pattern the four already-fixed sites established — no new
  logic, no new module, just applying the same one-line check three more
  places:
  - `HeroSection.jsx`: read `const paymentsOn = import.meta.env.VITE_PAYMENTS_ENABLED
    === 'true'` (same const name `Pricing.jsx`/`Checkout.jsx` already use).
    Keep `<li>✓ No credit card</li>` when `!paymentsOn` (today's behaviour,
    byte-identical). When `paymentsOn`, swap it for a claim that's still
    true and still reassuring, e.g. `<li>✓ Free to see a stack</li>` — the
    quiz and the first stack view stay free either way per
    `AppShell.jsx`'s own entitlement gate, only deeper app access needs
    payment, so this doesn't have to become a "we charge now" scare line.
  - `CTASection.jsx`: same flag, same swap on the `No credit card. No
    commitment.` line — when payments are on, something like `Free to try —
    plans shown at checkout` (points at reality without repeating a false
    "no commitment" once a real subscription exists).
  - `ExampleStack.jsx`: same flag, drop just the `No credit card, ` clause
    from that sentence when `paymentsOn` (the rest of it — "and no account
    until you want to save it" — stays true regardless of payments, so it's
    the only clause that needs to change).
  - **What this would NOT include** (kept out to bound the diff): no change
    to `AppShell.jsx`'s entitlement logic, `Checkout.jsx`, or any pricing
    number — this is copy-accuracy only, identical in shape to the already-
    shipped fix on the other four pages; no new shared `PaymentsGate`
    component — three call sites reading one env flag directly, matching
    how the four existing sites already do it, doesn't earn an abstraction;
    no attempt to grep for every possible phrasing of "free" beyond "credit
    card" (that's the broader claim the original entry already scoped to
    "no payment of any kind" and fixed on its four sites — this entry is
    specifically the literal string the original grep missed).
- **Build size:** S — three call sites, each a one-line conditional using a
  flag three other files already read the same way. No backend, no new
  dependency, no new component.
- **Found:** 2026-09-09 12:09 UTC

---

### Stack cost estimate — competitors model total spend, our catalog can't yet
- **Status:** PARTIALLY SHIPPED aeaedd0 (honest-counts version) — the
  dollar-amount version below is still OPEN and still needs the radar schema
  change. `aeaedd0` (2026-09-13, undocumented at the time — recovered and
  logged here retroactively) added `src/utils/stackCost.js` +
  `src/components/app/StackCost.jsx`, wired into `Stack.jsx`, showing "2 free
  · 1 freemium · 1 paid" or "nothing to pay for" — counts only, never a
  dollar figure, so it sidesteps the missing `priceAmount` data entirely
  rather than waiting on it. Everything below (`$60-100/mo`-style estimates)
  is still blocked exactly as described.
- **Seen in:** Whizi (whizi.io) is built specifically around "calculate real AI
  subscription costs, compare tool overlap, find wasted spend, and decide
  when consolidating tools saves money"; several 2026 AI-pricing aggregators
  (itoolverse, aipricingcalculators.com) exist purely to let someone total up
  a multi-tool stack in dollars. It's the natural next question after
  Toolnaut already gets someone to *build* a stack: "what will this cost me
  a month?" StackShare and G2 don't attempt this (they're B2B research, not
  spend management) — this is specifically an AI-tool-directory pattern,
  because AI tools are the rare software category where a beginner
  routinely stacks 4-6 paid subscriptions at once without meaning to.
- **Gap:** confirmed our catalog cannot support a real version of this today.
  Checked `radar/schema.js:7,11,58` and every `"pricing"` string currently in
  `src/utils/toolsCatalog.js` (`grep -o '"pricing": "[^"]*"' | sort -u`): the
  full set of values across all 704 bundled tools is `Free`, `Freemium`,
  `Paid`, `API`, `Usage-based`, `Usage-based API`, `Enterprise`, `Enterprise
  API`, `Open source` and similar category labels — **zero** contain a `$`
  or a number. `price` (`radar/schema.js:7`) is a 3-value enum
  (free/freemium/paid), not an amount. There is no numeric monthly-cost field
  anywhere in the pipeline to sum, so "estimate your stack's monthly cost"
  cannot be built as a client-side computation over data we already have —
  unlike every other OPEN gap in this file, which reads data the catalog
  already carries.
- **Why it matters:** it's the highest-intent question after the quiz and
  Stack builder already work as designed — a user who has assembled 5 tools
  from their persona's starter stack has no way to see "3 of these are paid,
  roughly $60-100/mo combined" before committing. That's exactly the
  overspend Whizi's whole product exists to prevent, and Toolnaut is
  upstream of the decision (recommending the stack) without downstream
  visibility into what it costs. A wrong or fabricated number here would be
  worse than no feature — this is exactly the kind of trust claim the
  "no credit card" and payments-copy entries in this file keep having to
  correct after the fact, so it must not ship with guessed numbers.
- **What it would take to become buildable** (not a smallest-useful-version,
  because there isn't one without new data):
  - `radar/schema.js`: add a `priceAmount` field (nullable number, USD/mo,
    `null` when the tool has no fixed subscription price — usage-based API
    billing, enterprise-quote, or genuinely free tools all stay `null` rather
    than a fabricated 0 or guess) and add it to `HASHED_FIELDS` so a price
    change is detected like any other content edit.
  - `radar/enrich.js`: extend the LLM enrichment prompt to extract a numeric
    monthly price ONLY when the tool's own pricing page states one plainly
    (e.g. "$20/month") and return `null` otherwise — this is an extraction
    task, not an estimation task; the prompt must not be allowed to infer or
    round a price the source didn't state, for the same reason the catalogue
    count and llms.txt entries in this backlog insist on derived-not-guessed
    numbers.
  - Backfill: the 704 bundled tools in `src/utils/toolsCatalog.js` were never
    enriched by the current `radar/enrich.js` pipeline, so they'd all read
    `priceAmount: null` until a one-time backfill re-runs enrichment against
    them — a genuinely large, LLM-cost-bearing batch job, not a code change,
    and the reason this can't be scoped as a normal S/M feature-run diff.
  - Only once real numbers exist for a meaningful share of the catalog would
    `Stack.jsx` showing "Estimated: $X-Y/mo across N paid tools" (a range,
    never a false-precision single number, and openly listing which tools
    are excluded as `null`) be honest rather than decorative.
  - **What this would NOT include even once buildable:** no per-seat/team
    pricing math, no currency conversion, no annual-vs-monthly toggle, no
    tracking actual billing (still a static catalog, not an account-linked
    spend tracker) — just a same-order-of-magnitude estimate from the
    tool's own stated list price.
- **Build size:** L, and cross-cutting (`radar/schema.js`, `radar/enrich.js`,
  a backfill run, then `src/pages/app/Stack.jsx`) — correctly out of scope
  for a single feature-run diff. Logged so the backfill can be scheduled
  deliberately rather than attempted as a rushed one-day feature.
- **Found:** 2026-09-10 06:16 UTC

---

### Curated tool bundles ("Collections") — the multi-tool middle step between Discover and the quiz, missing entirely
- **Status:** OPEN — DEEPENED 2026-09-12 03:20 UTC, see cross-reference below
- **Seen in:** Product Hunt Collections (producthunt.com/collections) — themed,
  curated lists of multiple products ("GIF Apps," "Marketing Tools," "X for Y")
  that Product Hunt itself describes as having two intents, personal
  (bookmarking) and social (sharing a themed list with others); it's one of
  the site's two core discovery mechanisms alongside single-product browsing.
  Futurepedia's category-by-business-function grouping and G2's "Best
  Software" round-ups do a coarser version of the same job — group multiple
  products around a use-case, not just a single filter axis.
- **Gap:** confirmed absent — `grep -rniE "collection|bundle|curated.{0,15}(stack|list)"
  src/pages src/components` turns up nothing but unrelated schema.org
  `CollectionPage`/`ItemList` JSON-LD types `NewTools.jsx:23` and
  `CategoryLanding.jsx:43` already emit for SEO markup on single-domain
  listings — not an actual bundle feature. Toolnaut has exactly three ways to
  land on more than one tool today, and none of them is "here are 5 tools
  that work well together for X": (1) `CategoryLanding.jsx` (`/tools/:domain`)
  lists every tool in one of only 6 broad domains — writing, code, design,
  data, automation, learning (`rolesData.js:8-13`) — which is breadth, not
  curation (the "writing" domain alone spans ChatGPT through Doubao through
  enterprise-only Command); widening that facet is the separate,
  already-logged "26 categories, only 6 shipped" gap above, not this one.
  (2) `Discover.jsx`'s filtered grid is session-gated behind `AppShell` and
  requires the visitor to already know what to filter for. (3)
  `SharedStack.jsx` (`/s/:slugs`) renders a read-only list of tools, but it's
  one specific *user's* personal stack, reachable only via a pasted link, has
  no editorial rationale text, and is explicitly excluded from
  `scripts/prerender.mjs`'s `ROUTES` per that file's own comment — it is
  never crawlable and nothing in the app's own nav links to one. There is no
  "browse pre-made bundles" surface anywhere.
- **Why it matters:** Toolnaut's pitch is a personalized quiz, but that
  leaves nothing for a visitor who isn't ready for a 9-question commitment
  yet also finds the 6 broad domain pages too wide to be useful ("best AI
  tools for writing" doesn't say which 4 a solo founder should actually run
  together). A curated collection is the missing middle step — lower
  commitment than the quiz, more opinionated than Discover's raw filter grid
  — the exact gap Product Hunt Collections fills between "here's every
  product" and "here's my personal list." It's also new, real SEO surface:
  long-tail "best AI tools for [use case]" queries at a granularity below the
  6 domain pages, buildable entirely client-side with hand-picked slugs from
  the existing catalog — no radar/schema change, unlike the access-method
  and stack-cost-estimate gaps above that both hit that same wall.
- **Smallest useful version (what to actually build):**
  - New static data file `src/utils/collectionsData.js`: ~6-8 hand-curated
    bundles, `{ slug, title, blurb, rationale, toolSlugs: [...] }`, each with
    4-6 real tool slugs cross-checked against `toolsCatalog.js` before
    writing (same seed-data discipline already established for
    `communityData.js`/`toolReviewsData.js`'s slug lists) — e.g. "The Solo
    Founder's Stack," "Content Creator Starter Kit." Editorial rationale text
    only, no invented per-tool scores.
  - New page `src/pages/Collections.jsx` at a new public route `/collections`
    (added in `App.jsx` alongside the other public marketing routes near
    `/tools/:domain`, `App.jsx:109`): an index grid of collection cards
    (title, blurb, tool-count), reusing `CategoryLanding.jsx:85`'s existing
    `glass rounded-2xl` card markup rather than inventing new chrome.
  - New page `src/pages/CollectionDetail.jsx` at `/collections/:slug`:
    resolves `toolSlugs` through `getTool()` (same pattern `SharedStack.jsx:14`
    already uses), renders each tool with `CategoryLanding.jsx`'s existing
    card markup plus the editorial rationale paragraph, and one "Add all to
    my stack" button looping `addToStack()` over every slug — the same adopt
    pattern `SharedStack.jsx`'s `adoptAndGo` already implements, so no new
    interaction is invented, just reused on hand-picked instead of
    user-shared slugs.
  - Add `/collections` plus one `/collections/:slug` entry per bundle to
    `scripts/prerender.mjs`'s `ROUTES` (`scripts/prerender.mjs:28-45`) — a
    small, fixed-size list since these are hand-authored, unlike
    `SharedStack`'s unbounded user-generated slugs, so making them crawlable
    doesn't blow up the prerender matrix.
  - `useHead()` on both new pages with `CollectionPage`/`ItemList` JSON-LD,
    same shape `CategoryLanding.jsx:41-57` already builds.
  - **What this would NOT include** (kept out to bound the diff): no
    user-submitted or crowdsourced collections (that's the already-logged
    "Suggest a tool" gap's shape applied to lists, a separate, unscoped
    idea); no collection editing UI — content lives in the static data file,
    edited the same way `rolesData.js`/`communityData.js` already are; no
    overlap with the "26 categories" gap — collections are cross-category
    use-case bundles, not a finer single-axis facet; no AI-generated
    rationale text — hand-written like every other seed-content file in this
    codebase; nav/footer placement not scoped here — flagged for whoever
    builds this to pick the least intrusive spot in `Landing.jsx` rather than
    guessed in advance.
- **Cross-reference found this run — this is also the Free tier's own
  unmet promise:** `src/utils/capabilityMatrix.js:62-66` carries a
  `'Workflow templates'` row rendered by `CapabilityMatrix.jsx` on
  `/pricing`, and unlike every other Free-column cell in that table
  (Personalised stack, Discovery, Comparison, Alerts, Learning, Exports,
  Collaboration — all `status: 'live'`), Workflow templates is the one
  capability marked `status: 'planned'` **even in the Free column**, with
  copy that already reads `'A few samples'`
  (`capabilityMatrix.js:63`) — i.e. the pricing page already advertises
  a specific, small, free-tier feature shape (a handful of sample
  workflows) that has never been built. This isn't a false claim — the
  "planned" pill correctly stops it from reading as live, so it doesn't
  join the already-SHIPPED "Pricing" reconciliation entry above — but it
  is a live product page naming, in writing, almost exactly the feature
  this entry independently arrived at from a competitor pattern. A
  hand-curated Collection ("here's a themed set of tools that work
  together") is the same shape as a "workflow template" ("here's a
  sample workflow's toolset") close enough that building this gap's
  smallest useful version *is* shipping "a few samples." Confirmed no
  other backlog entry references `capabilityMatrix.js`'s Workflow-templates
  row (`grep -n "Workflow templates" docs/research-backlog.md` — only this
  edit and the source file itself match). Whoever builds Collections
  should flip `capabilityMatrix.js:63`'s Free-column `status` from
  `'planned'` to `'live'` as the last step — small, in-scope, and it turns
  an already-published promise true instead of leaving it planned right
  next to the feature that fulfils it.
- **Build size:** S/M — one new data file, two new pages closely mirroring
  `CategoryLanding.jsx`/`SharedStack.jsx`'s existing markup and adopt
  pattern, two new routes, a small `prerender.mjs` `ROUTES` addition, and
  (per the cross-reference above) a one-line `status` flip in
  `capabilityMatrix.js`. No backend, no new dependency, no radar/schema
  change.
- **Found:** 2026-09-10 09:07 UTC
- **Deepened 2026-09-27 12:20 UTC — the oldest untouched OPEN entry (17 days,
  never previously deepened); re-verified every cited fact against current
  `src/`. Still fully unbuilt (`grep -rniE "collection|bundle|curated.{0,15}
  (stack|list)" src/pages src/components` still turns up only the same
  unrelated `CollectionPage` JSON-LD hits), the plan is still exactly the
  right shape, but three citations drifted:**
  1. **`App.jsx:109` no longer resolves to the insertion point.** The public
     route block has grown; `/tools/:domain` — the route this entry said to
     add `/collections` "alongside" — is now `App.jsx:128`. The routes
     immediately around it are unchanged in kind (`/s/:slugs`, `/compare/:slugs`,
     `/vs/:slug` above it, `/ai-tools/:slug`, `/new`, `/search` below it), so
     the placement advice itself still holds — just the line number.
  2. **`CategoryLanding.jsx:85`'s card markup moved to line 95.** Still the
     same `<div key={tool.slug} className="glass rounded-2xl p-5">` this entry
     said to reuse — content and shape unchanged, only pushed down 10 lines
     by unrelated additions above it (the "Take the 60-second quiz" CTA link
     and an `updated`/`formatUpdated` timestamp block now sit between the
     `<h1>` and the grid). Same for the two `CollectionPage` JSON-LD
     citations: `NewTools.jsx:23` is now `:26`, `CategoryLanding.jsx:43` is
     now `:47` — both still the same schema shape to copy.
  3. **`toolReviewsData.js` does not exist.** The entry cited it alongside
     `communityData.js` as an example of "seed-data discipline already
     established" — `communityData.js` exists and matches (confirmed via
     `ls src/utils/`), but `toolReviewsData.js` is a name from the still-OPEN
     "Per-tool ratings & reviews" gap's own plan, not a file on disk yet.
     Whoever builds Collections should model `collectionsData.js` on
     `communityData.js` alone.
  - **Still accurate, re-confirmed:** `capabilityMatrix.js:62-66`'s
    `'Workflow templates'` row — capability at line 62, all three tier cells
    at 63-65, closing brace at 66, exact match, free-column `status: 'planned'`
    with `'A few samples'` copy unchanged. `SharedStack.jsx`'s `adoptAndGo`
    (line 48) and `getTool` import (line 3) are both unchanged and still the
    right adopt pattern to mirror. `hydrateCatalog()` behavior (mutates
    `TOOLS` in place) is unchanged. No other backlog entry references
    `capabilityMatrix.js`'s Workflow-templates row (re-checked).
  - **No change** to the build size, the data shape, or any of the "what
    this would NOT include" exclusions — this deepening only corrects three
    stale line citations and one file-existence claim.

---

### The leaderboard's own precondition for going real has already shipped, and nobody came back to flip it
- **Status:** OPEN
- **Seen in:** not a competitor pattern this time — a self-audit of a TODO
  Toolnaut's own code left for itself, recovered from an open, unmerged PR
  branch (`bot/claude/research-leaderboard-real-2026-09-03`, PR #36 in this
  repo's history — never landed on master, so this finding never made it
  into this file until now) and re-verified against current master before
  re-adding it here. G2/Capterra-style "real ranking" products (and
  Toolnaut's own `explorer_count()`, shipped for the landing page's
  Explorers tile) are the reference for how to expose an aggregate safely
  once accounts exist; this gap is about noticing that reference case now
  applies somewhere it hasn't been applied yet.
- **Gap:** `src/utils/leaderboardData.js:12-17` says, in its own header
  comment: *"When accounts land, the same [scoring] function runs
  server-side over stored progress and these rows get replaced by a query.
  Nothing else in this file survives that change."* Accounts landed —
  re-checked today: `src/state/authStore.js` has real Supabase Google OAuth
  (`signInWithOAuth`, `authStore.js:108`) + email-magic-link sign-in
  (`signInWithOtp`, `authStore.js:142`), not just a simulated session, and
  `supabase/migrations/` already has 7 applied migrations
  (`0001_explorers.sql` through `0007_alert_subscribers.sql`) including
  `0002_user_state.sql`, which gives every signed-in account a durable,
  RLS-protected server copy of exactly the inputs `computeScore()` needs.
  `src/state/sync.js` exports `syncAvailable()` (`sync.js:49`) for exactly
  this kind of feature-detection. None of that is wired to the leaderboard:
  `RankCard.jsx:4-5,19,98` still imports `SAMPLE_LEADERBOARD`/`IS_SAMPLE`
  from `leaderboardData.js` and calls `myStanding()`
  (`communityStats.js:70`), which reads only `localStorage` and ranks the
  visitor against seven hardcoded fictional handles — `IS_SAMPLE = true` is
  still set today (`leaderboardData.js:51`), confirmed via
  `grep -n IS_SAMPLE src/utils/leaderboardData.js` this run. A user who syncs
  their stack across two devices (the feature `sync.js` exists to provide)
  still sees two independent fake leaderboards, one per device's local
  streak, because nothing server-side aggregates across accounts. The
  precedent for doing this safely already exists in the same codebase:
  `0001_explorers.sql:34-44`'s `explorer_count()` is a `security definer`
  function granted to `anon, authenticated` that lets any visitor read one
  aggregate over a table with no public SELECT policy of its own — proving
  the "expose the aggregate, never the rows" pattern this gap needs is
  already accepted practice here, not a new privacy posture.
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
  - New migration `supabase/migrations/0008_leaderboard.sql` (0008 is next
    free — 0001 through 0007 are already applied, re-checked this run),
    modeled directly on `0001_explorers.sql`: add a `handle` text column to
    `public.profiles`, backfilled and set-on-insert to a generated
    pseudonym (adjective + noun + short numeric suffix, derived from `id`
    so it's stable and needs no extra uniqueness dance) — never the
    person's real name or email, matching the "no personal data leaves this
    table" rule `0001` already sets. Add one `security definer` function,
    `public.leaderboard_top(n int)`, returning `(handle, score, rank)` for
    the top `n` accounts computed from `tool_refs` + `roadmap_progress`
    counts (the same weights as `SCORING` in `leaderboardData.js`, kept in
    SQL so client and server can't drift), plus `public.my_rank()`
    returning the caller's own real rank via `auth.uid()`. Both grant
    `execute` to `anon, authenticated` and select nothing else — no table
    gets a new SELECT policy, exactly like `explorer_count()`.
  - New `src/utils/leaderboard.js`: `fetchLeaderboard()` calls
    `syncAvailable()` first — unconfigured or not-yet-migrated both mean
    "stay on sample data," feature-detected the same way `sync.js` already
    treats a missing RPC as "not set up" rather than an error. When
    available, calls the two RPCs and returns `{ top, myRank, real: true }`;
    otherwise returns `{ top: null, real: false }` so the caller falls back
    to `SAMPLE_LEADERBOARD` unchanged.
  - `RankCard.jsx`: on mount, try `fetchLeaderboard()`; render the real rows
    and drop the "Preview — leaderboard not live yet" badge only when
    `real` comes back true — same honesty rule `StatsSection.jsx` already
    applies to `explorers` vs `SUBSCRIBERS` (a real tile and a seeded tile
    never share one "this is real" signal). Streak stays local-only, so the
    server-computed score in v1 uses stack size + roadmap steps only (drop
    `perStreakDay` from the server formula, keep it in the local "your
    standing" tile above the board) — understating everyone's real score
    identically is honest; inventing a synced streak column is not what
    this gap asked for.
  - **What this would NOT include** (kept out to bound the diff): no
    friend-only or category-filtered leaderboards; no live/realtime updates
    (a page-load fetch is enough, same freshness bar as `explorerCount()`);
    no letting a user set their own handle in v1 (auto-generated only); no
    syncing streak server-side (a separate, smaller gap if ever wanted); no
    changing `myStanding()`'s local-only fallback path for signed-out
    visitors, who keep exactly today's experience.
  - **Verify before shipping:** the migration is additive and RLS-scoped
    like every prior one, but run it in a Supabase staging/SQL-editor pass
    first and confirm `leaderboard_top`/`my_rank` return nothing broken
    against **zero** signed-up accounts (must return an empty set, not
    error) before wiring the client to it.
- **Build size:** M — one additive SQL migration (mirrors `0001_explorers.sql`
  closely), one new client module, and swapping `RankCard.jsx`'s data source
  behind the same feature-detection `sync.js` already uses elsewhere. No new
  route, no new dependency.
- **Found:** 2026-09-03 00:35 UTC (recovered from unmerged PR #40 and
  re-verified against master 2026-09-10 12:xx UTC — all file:line references
  above checked fresh, not copied blind)
- **Deepened 2026-09-24 00:06 UTC — oldest untouched OPEN entry (14 days since
  the last check), re-verified against current master. The core gap is
  unchanged and still real: `IS_SAMPLE = true` at `leaderboardData.js:51`,
  `RankCard.jsx` still imports `SAMPLE_LEADERBOARD`/`IS_SAMPLE` verbatim, no
  `handle` column or leaderboard RPC exists anywhere in `supabase/migrations/`
  (grepped `handle` across every migration — the only hit is an unrelated
  comment about a payment provider's UPI handle in `0008_account_deletion.sql`).
  Two things in the plan itself had drifted or were incomplete:**
  - **Migration number is stale.** Three more migrations landed since this was
    last checked — `0008_account_deletion.sql`, `0009_subscriber_count.sql`,
    `0010_saved_limit.sql` all now exist (the last two are exactly the
    `explorer_count()`-style "expose one aggregate via `security definer`"
    pattern this gap already cited as precedent, which is further evidence the
    approach is accepted practice here). The next free number is **0011**, not
    0008.
  - **The `roadmapComplete` question the original plan left open is actually
    already answered by the client, and the SQL needs one exclusion to match
    it.** Checked `communityStats.js:66-93`'s `myStanding()` — the function
    that computes what a user sees in their *own* "your standing" tile today —
    and it never passes `roadmapComplete` to `computeScore()` at all
    (`communityStats.js:89`: `computeScore({ stackSize, stepsDone,
    streakDays })`, no fourth field). So the local score this gap must match
    already omits `roadmapCompleteBonus`; `leaderboard_top()`/`my_rank()` don't
    need to solve "how does SQL know a roadmap is complete," they just need to
    leave that term out too, same as the client. But `stepsDone` itself has a
    filter the original plan's SQL sketch didn't carry over:
    `communityStats.js:81` counts roadmap steps as
    `Object.entries(p).filter(([k, v]) => v && !k.endsWith(':quiz')).length` —
    it explicitly excludes any `step_key` ending in `:quiz`. The new SQL
    function's `roadmap_progress` count must add `and step_key not like
    '%:quiz'` (`0002_user_state.sql:96`'s `step_key` format is
    `"<milestoneId>:<stepIndex>"` or `"<milestoneId>:quiz"`, confirmed in that
    file's own comment) or a user's server rank would silently outscore their
    own local "your standing" tile by counting quiz-completion rows as
    roadmap steps — the exact kind of client/server drift this gap's own
    "kept in SQL so client and server can't drift" line was trying to avoid,
    just in the one spot the original sketch didn't check against
    `communityStats.js` closely enough.
  No other part of the plan needed correcting — `tool_refs`/`roadmap_progress`
  schemas (`0002_user_state.sql:60-99`), RLS posture, and the
  `syncAvailable()`-gated fallback all still match exactly as described.
  Still OPEN; still build size M; ready to build as scoped, with the migration
  renumbered to 0011 and the `:quiz` exclusion added to `leaderboard_top()`'s
  roadmap-step count.

---

### No public developer API — the structured catalog data already exists and is already public, nobody was ever told
- **Status:** OPEN
- **Seen in:** There's An AI For That (TAAFT), the largest AI-tool directory
  by listing count (47,400+ tools as of April 2026 per its own reporting) —
  one of its named strengths alongside raw listing volume is "structured data
  and developer access: filter by task type, pricing, and platform, and
  there's an API for building on top of the directory programmatically."
  Product Hunt's public GraphQL API is the same pattern at a different scale:
  a directory's own catalog, exposed deliberately as a second growth channel
  (people building on top of it) rather than kept as an internal
  implementation detail.
- **Gap:** confirmed this is a near-zero-cost gap, not a new-data one — the
  underlying asset already exists and is already public. `public/tools.json`
  is committed (not gitignored, per this repo's own CLAUDE.md), served
  statically by Vercel, and any visitor's browser or server can already fetch
  `https://toolnaut.xyz/tools.json` today and get all 700+ structured records
  (`slug`, `name`, `category`, `sourceCategory`, `price`, `pricing`, `level`,
  `blurb`, `audience`, `dev`, `year`, `website`, `status`, `note`, `tags`,
  `discoveredAt` — read directly off the live file). `vercel.json:18-21`
  already gives it a dedicated, correct `Cache-Control: public, max-age=0,
  must-revalidate` header, proving someone already thought about this file as
  a served asset, not just a build artifact. But nobody was ever told: grepped
  every page and the footer (`src/components/sections/ContactSection.jsx`'s
  three-column `COLUMNS` link list, `ContactSection.jsx:33-60`) for
  `developer|api\b` — the only `/api/*` references anywhere in `src/` are
  Vercel serverless functions unrelated to the catalog (`create-order`,
  `entitlement`, `alerts-status`, `alerts-toggle`, `alerts-send`, per
  `AlertSettings.jsx:36,52`, `PayButton.jsx:6`, `BillingCard.jsx:10`). There
  is no `/developers` route in `App.jsx`'s route list (checked all ~25
  routes), no mention of `tools.json` as a fetchable resource anywhere a
  human would read it, and — the one part that's a genuine defect, not just
  missing marketing — no CORS header on the `/tools.json` block
  (`vercel.json:18-21`), so a browser script on someone else's site can't
  actually `fetch()` it cross-origin today even if they discovered the URL;
  only same-origin code, curl, or a server-side fetch can read it. `llms.txt`
  (`public/llms.txt`, shipped recently) is the closest existing analog, but
  it's prose written for AI crawlers summarizing the product, not structured
  data documentation for a developer who wants to query the catalog itself.
- **Why it matters:** this is the cheapest possible "developer access" story
  in the directory-site playbook, because — unlike the access-method-facet
  and stack-cost-estimate gaps in this file, which both hit a real "the data
  doesn't exist yet" wall — the data already exists, is already generated
  daily by radar, and is already sitting in a public, correctly-cached file.
  The entire gap is: (1) one missing HTTP header blocking actual cross-origin
  consumption, and (2) nobody wrote the one page that says "this exists, here
  is its shape, here is how to use it." Every hour this stays unbuilt is free
  distribution (someone building a "best AI tool for X" widget, a Raycast
  extension, or a personal dashboard on top of Toolnaut's catalog, each
  linking back) left entirely on the table for the cost of a docs page.
- **Smallest useful version (what to actually build):**
  - `vercel.json`: add `{ "key": "Access-Control-Allow-Origin", "value": "*" }`
    to the existing `/tools.json` header block (`vercel.json:18-21`) — a
    read-only GET on a public, non-sensitive, no-auth static file, so an
    open CORS policy carries no privacy or security exposure (contrast with
    `/api/entitlement` or `/api/alerts-status`, both auth-gated and correctly
    left alone). No other header block in the file should change.
  - New page `src/pages/Developers.jsx` at route `/developers`, mirroring
    `Changelog.jsx`'s exact shell (its own header comment already names it as
    reusing `About.jsx`'s shell, so this page reuses the same one a third
    time — one page shell, three simple content pages): what the file is
    (`GET https://toolnaut.xyz/tools.json`), the field list with one real
    example record pulled from the live catalog, a plain `fetch()` snippet,
    an honest "no API key, no rate limit enforced today, please be
    reasonable" line (stating the real, unglamorous truth rather than
    promising an SLA nothing backs), a link to `/changelog` for how often the
    data changes (radar publishes daily per this file's own health checks),
    and a link to `/llms.txt` as the AI-agent-facing counterpart to this
    human-facing one. `useHead()` with title/description, same pattern as
    `Changelog.jsx:12-16`.
  - Add `/developers` to `ContactSection.jsx`'s `Resources` column
    (`ContactSection.jsx:44-51`, next to `/changelog` and `/methodology` —
    same "here's how the product works under the hood" grouping) and to
    `scripts/prerender.mjs`'s `ROUTES` array (`scripts/prerender.mjs:28-46`,
    one more flat string alongside `/changelog`, `/methodology`) so it's
    crawlable like every other marketing/resource page.
  - **What this would NOT include** (kept out to bound the diff): no API key
    or auth system — the data has no per-tool or per-user sensitivity, an
    auth layer would be pure friction for zero benefit; no new endpoint or
    data shape separate from `tools.json` — this exposes the existing
    canonical file honestly, it does not fork a second copy of the catalog;
    no server-side filtering/query params (`?category=code` etc.) — still a
    static file, consumers filter client-side same as Toolnaut's own
    `Discover.jsx` already does; no formal rate-limiting infrastructure —
    Vercel's CDN caching (`max-age=0, must-revalidate` already means
    conditional-GET/304s do the real work) is the only protection, and the
    docs page says so plainly rather than implying more than exists; no
    change to `radar/` or the publish pipeline — this only changes how the
    already-published output is surfaced and described.
- **Build size:** S — a two-line `vercel.json` header addition, one new
  static content page closely mirroring an existing page's shell, one footer
  link, one `prerender.mjs` `ROUTES` entry. No backend, no new dependency, no
  radar/schema change.
- **Found:** 2026-09-10 15:xx UTC
- **Deepened 2026-09-23 03:20 UTC:** research run (UTC hour 03). CI green on
  master, no agent-fixable issues, radar health NO-PUBLISH (issue #63,
  Featherless still 403ing on an overdue invoice — already fully diagnosed,
  not re-reported here). This was the oldest untouched OPEN entry (13 days,
  never previously deepened) so re-verified it rather than starting a new
  gap.
  Every claim still holds; only one line reference drifted. `vercel.json`'s
  `/tools.json` block moved from `:18-21` to `:89-97` — the file grew a
  `redirects` block (host-based `www`/preview-URL redirects) and a security
  `headers` block (HSTS, CSP-Report-Only, Permissions-Policy, etc.) ahead of
  it since this entry was written, but the block itself is unchanged: still
  exactly one `Cache-Control: public, max-age=0, must-revalidate` key, still
  no `Access-Control-Allow-Origin`, so the cross-origin-fetch defect is
  confirmed still live. `App.jsx`'s route list (now ~29 routes, grepped in
  full) still has no `/developers`. `ContactSection.jsx`'s `Resources`
  column is still exactly `:44-51` with the same four links (`How it works`,
  `How we choose` → `/methodology`, `What's new` → `/changelog`, `Open the
  app`) in the same order — the planned fifth link slots in without
  reordering anything. `scripts/prerender.mjs`'s `ROUTES` array still opens
  `/`, `/about`, `/changelog`, `/pricing`, `/methodology`, ... at `:43-54`,
  same flat-string pattern. `Changelog.jsx`'s own header comment still
  literally says "Reuses About.jsx's exact page shell" — confirmed both
  files share the same `useHead()` + `starfield` + `BrandLogo` opening,
  so a third page reusing it is still the right, already-proven pattern.
  Re-pulled a live record from `public/tools.json` and diffed it against
  this entry's field list field-by-field: `slug, name, category,
  sourceCategory, price, pricing, level, blurb, audience, dev, year,
  website, status, note, tags, discoveredAt` — exact match, zero drift,
  confirming `radar/scripts/sync-to-app.js`'s `FIELDS` array (`:12`) is
  still the single source of truth for the shape a `/developers` page would
  document. `public/llms.txt` still exists (3.5KB, last touched 2026-09-18)
  and is still prose for AI crawlers, not a fetchable-schema doc — still the
  right thing to cross-link from the new page rather than duplicate.
  Still fully unbuilt, still Build size S, still a strong pick for the next
  feature run: zero risk to load-bearing files (`vite.config.js`, `sw.js`
  stamping, the service-worker fetch handler), touches only `vercel.json`
  headers, one new static page, one footer link, one prerender route.

---

### Search treats a whole multi-word query as one literal phrase — "video editor" misses tools that "video" and "editor" alone both find

- **Status:** SHIPPED (this commit) — small, well-scoped, verifiably-buildable
  client-side fix; built same run as found rather than left for the feature
  run, per this file's own allowance for one small demonstrable-bug fix
  alongside research
- **Seen in:** not a competitor pattern — a self-audit of `src/utils/search.js`,
  the shared predicate behind both `/search` (public) and Discover's search
  box, prompted by checking `SearchTools.jsx`'s own copy against its actual
  behavior. `SearchTools.jsx:70-75` tells visitors to "Search by name,
  category, or **the problem you're trying to solve**" — that's an explicit
  invitation to type a multi-word description, not just one keyword, which is
  exactly the query shape `ToolDirectory.AI`'s "AI-powered search" ("AI for
  sales follow-up") and every other 2026-era AI-tool directory studied in this
  file leads with on their homepage search box.
- **Gap:** `search.js:6-14`'s `matchesQuery(tool, q)` lowercases the *entire*
  query and tests it as one `.includes()` substring against
  name/blurb/sourceCategory/dev/tags — confirmed by reading the file in full
  (14 lines). A query only matches if its exact word sequence appears
  verbatim somewhere in that concatenated text. Verified against the real,
  bundled catalog (`node -e` against `TOOLS` from `toolsCatalog.js`, this
  run): `"video editor"` returns 2 results today even though 5 catalog tools
  (Freepik AI, CapCut AI, Filmora AI, Kapwing, VEED) have both words present,
  just not adjacent in that order in any single field; `"customer support
  chatbot"` returns 0 today though 1 real match exists; `"resume builder"`
  returns 2 today though 3 real matches exist. The placeholder text
  (`SearchTools.jsx:58`, `'Try "video", "Anthropic" or "healthcare"...'`)
  only ever demonstrates single-word queries — the one part of the page that
  does show a real example never actually exercises the multi-word promise
  the paragraph above it makes, so the gap has been invisible in normal use
  of the page's own suggested queries.
- **Why it matters:** this is the exact "no results" moment described by this
  backlog's own `NO TOOLS MATCH` copy (`SearchTools.jsx:86-97`) firing on
  queries that should have worked — a first-time, signed-out visitor who
  searches the problem they actually have ("customer support chatbot",
  "resume builder") lands on an honest-looking but wrong empty state and
  bounces, on the one public page whose entire purpose (per its own code
  comment at `SearchTools.jsx:10-13`) is answering "does Toolnaut have X" for
  cold search traffic with no quiz and no sign-in required. It's the same
  predicate behind Discover's session-gated search box too
  (`Discover.jsx:7,111`), so the same false negative also degrades the
  primary in-app browsing tool for every signed-in user, every day.
- **Smallest useful version (what to actually build):**
  - `search.js`: split the trimmed, lowercased query on whitespace into
    words, build the same concatenated haystack per tool
    (name/blurb/sourceCategory/dev/tags joined, matching today's per-field
    checks) once, and require every word to appear somewhere in it
    (`words.every(w => haystack.includes(w))`) instead of testing the whole
    phrase as one substring. This is a pure widening — any query that
    matches today (a literal phrase is trivially a set of words that all
    individually appear) keeps matching, so no existing behavior regresses,
    confirmed by re-running `test/search.test.mjs`'s existing 7 cases against
    the new logic by hand before writing the diff (all 7 still pass,
    including the two-word `'long documents'` case at line 28).
  - Add 3-4 new `test/search.test.mjs` cases pinned to the exact false
    negatives measured above (`'video editor'`, `'customer support
    chatbot'`), asserting `true` against a tool fixture whose fields contain
    the words separately but not as one phrase — the regression this change
    exists to prevent.
  - Update `SearchTools.jsx:58`'s placeholder to include one multi-word
    example (e.g. `'Try "video editor", "Anthropic" or "healthcare"...'`) so
    the page's only concrete example actually demonstrates the capability its
    own paragraph above promises.
  - **What this would NOT include** (kept out to bound the diff): no fuzzy
    or typo-tolerant matching (a misspelled word still won't match — that's a
    separate, harder gap); no real semantic/NL search (`"summarize
    meetings"` still returns 0 under word-AND matching too, verified this
    run — closing that gap needs embeddings or an LLM call, which is a
    backend this SPA doesn't have, the same reasoning `Pro chat assistant`
    above was rejected for); no relevance ranking or scoring by match count
    — results keep today's existing catalog order, just a bigger, more
    honest result set; no change to `Discover.jsx`'s or `SearchTools.jsx`'s
    own filtering/rendering code beyond the one placeholder string, since
    both already just call `matchesQuery()` and inherit the fix for free.
- **Build size:** S — a ~5-line change to one pure function
  (`search.js`), a handful of new unit tests, one placeholder string edit.
  No new dependency, no backend, no new route, no radar/schema change.
- **Found:** 2026-09-11 00:20 UTC

---

### Changelog only looks backward — nothing visitor-facing says what's coming next, though this exact file tracks it in detail
- **Status:** OPEN
- **Seen in:** a problem area rather than one directory competitor, though
  Linear (`linear.app/roadmap`, a public "planned / in progress / shipped"
  board next to its changelog) and Notion's own public roadmap page are the
  clean examples — both pair a look-back (changelog) with a look-forward
  (roadmap) as separate, linked surfaces, on the reasoning that "what shipped"
  and "what's coming" answer two different visitor questions and neither
  substitutes for the other. Toolnaut only ever shipped the first half.
- **Gap:** confirmed by reading `Changelog.jsx` in full (already audited
  above for its own `CHANGELOG` sourcing) and `changelogData.js:1-6` — the
  file's own header comment says "DEVLOG.md and `docs/research-backlog.md`
  carry the engineering version of the same record for a human maintainer,"
  which is an explicit admission that a forward-looking version of this
  record exists (this file, plus every OPEN entry in it, is exactly that) but
  has never been translated into anything a visitor can see. Grepped
  `roadmap|coming soon|up next|planned|in progress` (case-insensitive, tool-
  related) across `src/` for anything visitor-facing that names planned work:
  the only hits are the 4-week *learning* roadmap generated by
  `roadmapGenerator.js` (a personalized study plan for tools already
  recommended — a different feature, not product development) and
  `Support.jsx`'s FAQ answer about account cancellation. Nothing describes
  what Toolnaut itself is building next. A first-time visitor on `/changelog`
  today reads "shipping, almost every day" (`Changelog.jsx:45`) and a list of
  past entries, then hits a dead end — the page makes the *claim* of an
  actively-developed product but gives no forward evidence of it, the same
  one-sided-promise shape as every other audited gap in this file, just
  inverted (retrospective claim without a prospective one, instead of a
  feature claim without the feature).
- **Why it matters:** this project is unusual in that its future work is
  already fully itemized, scoped and rank-ordered in a single file, produced
  as a side effect of how the product gets built — most solo/indie products
  would have to create a roadmap from nothing; Toolnaut only has to translate
  one it already maintains. For a pre-revenue, solo-built beta whose own
  About page leads with "built solo by an indie builder... shipping fast"
  (`About.jsx:38`), a visible "here's what's next" is a trust signal in the
  same family as the changelog itself (proof of an active, honest builder)
  and costs nothing to source — no new research, no new decision-making, just
  a translation step already being done privately (the feature run already
  writes a "queued next" line into `DEVLOG.md` every day; that sentence
  currently only reaches a human reading a GitHub issue, never a visitor).
- **Smallest useful version (what to actually build):**
  - New `src/utils/roadmapData.js`, same shape and same hand-authored
    convention as `changelogData.js` (plain language, no shas, no file
    paths, newest/highest-priority first): a small `ROADMAP` array of
    `{ title, note }` pairs — e.g. `{ title: 'Recently viewed tools', note:
    'Jump back to a tool you looked at without re-searching for it.' }` —
    translated by whoever runs the feature run from that day's top 3-4 OPEN
    entries in `docs/research-backlog.md`, written in visitor language, never
    the internal file:line reasoning. No status/ETA field — dates on unshipped
    work invite exactly the kind of broken promise this backlog spends most
    of its length correcting elsewhere.
  - `Changelog.jsx`: add one more section below the existing `CHANGELOG.map`
    block, same `sticker` card styling, headed "▸ What's next" with a plain
    disclaimer line ("no dates — just the order we're working through") so it
    reads as an honest priority list, not a commitment; renders `ROADMAP`
    the same way the entries above it render `CHANGELOG`.
  - Update this section whenever a listed item ships: remove it from
    `ROADMAP`, add its `changelogData.js` entry as already happens today —
    one array shrinks, the other grows, in the same commit.
  - **What this would NOT include** (kept out to bound the diff): no voting
    or upvoting on roadmap items (that's the `communityStore.js` upvote
    primitive doing a different job, on user posts, not on this list); no
    public sync of the full internal backlog file itself (this file's
    competitor research and internal reasoning is not visitor-facing content,
    only the translated title+note pairs are); no dates/ETAs, per above; no
    new route — same page, one more section.
- **Build size:** S — one new hand-authored data file (`roadmapData.js`,
  mirrors `changelogData.js`), one new section in `Changelog.jsx` reusing its
  existing card markup. No backend, no new dependency, no new route. The
  ongoing cost is a one-line addition to the feature run's own existing
  end-of-day writing step (it already composes a "queued next" line for
  `DEVLOG.md`; the same sentence, in the same words, goes here too).
- **Found:** (never recorded when this entry was written — inferred
  ~2026-09-11 from its position between the 2026-09-10 and 2026-09-11
  09:20 UTC neighbors; noted here so the omission itself doesn't repeat).
- **Deepened 2026-09-23 06:11 UTC — the backward-looking half has quietly
  broken too, which makes the page's honesty problem worse than "half the
  promise is missing":** re-read `Changelog.jsx` and `changelogData.js` in
  full. The page still renders nothing but `CHANGELOG.map(...)` (no forward
  section exists, core claim unchanged), but `changelogData.js`'s own newest
  entry is dated **2026-09-05** — 18 days stale as of this run — while the
  page's own heading still reads "Shipping, almost every day." That claim is
  now demonstrably false to anyone who opens `/changelog` and reads the date
  on the top card. Checked against real shipped work in this shallow clone's
  reachable history (older shas this backlog cites, e.g. `927ee5b`/`c04149e`/
  `f075d88`, predate the clone's 80-commit depth and can't be re-verified
  directly, but six more recent ones are directly confirmed): `6552af5`
  (2026-09-14, Fresh Finds domain-matching), `86c7066` (2026-09-15, galaxy
  stars clickable), `680b760` and `b7f87af` (both 2026-09-16, founder-offer
  fix and spend-audit surfacing), `c60fd8d` (2026-09-17, stack status
  warning), and `83805fc` (2026-09-19, vs-competitor pages) — six real,
  user-visible ships in this file's own SHIPPED trail, none reflected in
  `changelogData.js`. `changelogData.js`'s own header comment already says
  the fix: "Add one entry here whenever the daily feature run marks a
  backlog gap SHIPPED" — that step has evidently been skipped on most
  feature runs since 2026-09-05, not a code gap so much as a process one.
  **Fixed in this run** (small, demonstrable, verifiably-true fix, same
  category as the other FIXED entries in this file): backfilled the six
  confirmed shas above into `changelogData.js` in the same plain-language
  voice and newest-first order the file already uses, no shas or file paths
  added. This does not touch this gap's own remaining scope — the page still
  has no forward-looking section, that build is unaffected and still OPEN.

---

### Stack overlap warning — the catalog already carries the field the cost-estimate gap ruled out needing, nobody reads it for redundancy
- **Status:** BUILT, UNMERGED — PR #75 (2026-09-23) already implements this
  in full (`stackOverlap.js`, the dismissible `Stack.jsx` sticker linking to
  Compare, 5 new tests, all three checks green), not merged — see issue #67.
  **Do not rebuild this** — it needs a human to merge #75, not more agent
  code. Re-verified 2026-09-26: gap still real on current `master`, fix
  still sitting in PR form only.
- **Seen in:** Whizi (whizi.io) markets itself around three things: "calculate
  real AI subscription costs, **compare tool overlap**, find wasted spend."
  The Stack cost estimate entry above (found 2026-09-10, still OPEN, `L`,
  blocked on a `radar/schema.js` price field that doesn't exist yet) scoped
  the first third of that claim and correctly ruled it out for now. It did
  not check the second third — tool overlap — which turns out not to share
  the same blocker at all.
- **Gap:** a Toolnaut stack can and regularly will contain two tools that do
  the same job. Checked `src/pages/app/Stack.jsx:230-233` — `allStackTools`
  is built by concatenating `persona.stack` (three starter picks from
  `personaGenerator.js`) with `addedTools` (anything added from Discover via
  `stackStore.js`), with the only existing dedupe being an exact-name filter
  at `Stack.jsx:98-101` (`starterNames`/`addedTools.filter`). Nothing compares
  what the tools in that list actually *do*. Every catalog record already
  carries a `sourceCategory` field one level more specific than the six
  `category` buckets used for routing (`src/utils/toolsCatalog.js` — grepped
  `"sourceCategory": "` across all 330 bundled + radar-published tools:
  26 distinct values, e.g. `LLMs & Chatbots` (35 tools), `Image Generation &
  Editing` (60), `Video Generation & Avatars` (47) — the exact granularity
  the still-open "26 real source categories" entry above already established
  as meaningful, not noise). A user whose stack has both ChatGPT and Claude
  (both `LLMs & Chatbots`) or both Midjourney and an unlisted image tool
  (both `Image Generation & Editing`) gets no signal that two of their
  slots are doing the same job — the exact "wasted spend" moment Whizi's
  whole product targets, and one Toolnaut can detect for free because,
  unlike price, category was never missing data.
- **Why it matters:** this is upstream of the (currently blocked) cost
  estimate in the funnel a user actually walks: before "what does my stack
  cost," the more answerable question is "is my stack even efficient" — and
  answering it needs no price data, no radar schema change, no backfill,
  just a `groupBy(sourceCategory)` over a list of ≤10 tools already sitting
  in state. For a persona-driven starter stack specifically, a Pro/Team
  upsell moment already exists for "deeper comparison" (`capabilityMatrix.js`
  row `Comparison`) — flagging real overlap on the free tier and offering
  "compare these two side by side" (linking straight into the already-shipped
  `Compare.jsx` from the Side-by-side entry above) is exactly the
  `deep_comparison_opened` good-upgrade-moment `capabilityMatrix.js:88`
  already names, just never triggered by anything today.
- **Smallest useful version (what to actually build):**
  - A small pure function, e.g. `src/utils/stackOverlap.js`:
    `findOverlaps(tools)` groups `allStackTools` by `sourceCategory` and
    returns groups with more than one tool. No new store, no persisted
    state — recomputed from `allStackTools` on every render the same way
    `untouchedCount` already is (`Stack.jsx:234`).
  - `Stack.jsx`: render a dismissible-per-session (not persisted — a stack
    changes shape often enough that a stale dismissal would hide a *new*
    overlap) sticker near `allStackTools` (around `Stack.jsx:315-319`, same
    card language as the streak/next-learning-step stickers already there)
    when `findOverlaps` returns anything: e.g. "2 tools doing the same job —
    ChatGPT and Claude are both LLM chat assistants," with a link into
    `Compare.jsx` pre-filled with those two slugs. Confirmed the shape:
    `Compare.jsx:26` reads `searchParams.get('tools')` as a comma-separated
    slug list off `/app/compare`, so the link is exactly
    `/app/compare?tools=${slug1},${slug2}` — no new prop or route needed,
    just the existing `<Link>`.
  - Only flag when a group has 2+ *non-starter-overlapping* tools — i.e.
    don't warn about the persona's own three starter picks against each
    other; personaGenerator deliberately spans different jobs already, so a
    same-category starter pair would indicate a personaGenerator bug, not a
    user redundancy, and is out of scope here.
  - **What this would NOT include:** no price/cost math (that is the
    separately-blocked cost-estimate entry — this is redundancy, not spend);
    no automatic removal of either tool, ever — surfacing the overlap and
    linking to Compare is the entire feature, the user decides; no new
    route; no change to `radar/schema.js` or any enrichment prompt, since
    `sourceCategory` is already populated for every record.
  - **Open question for whoever builds it:** with only 26 buckets and up to
    10 stack slots, false positives are possible (two `Productivity &
    Meetings` tools that don't actually compete). Worth wording the sticker
    as a question ("might be doing the same job — worth comparing?") rather
    than an assertion, so a wrong flag reads as a nudge, not a factual claim
    the "no fabricated numbers" discipline this file enforces elsewhere
    would otherwise require evidence for.
- **Build size:** S — one new pure utility (~20-30 lines), one conditional
  sticker in an already-existing file, reusing `Compare.jsx` rather than
  building new comparison logic. No backend, no schema change, no backfill —
  unlike its Whizi-adjacent sibling above, this half of the pattern needs
  nothing Toolnaut doesn't already have.
- **Found:** 2026-09-11 09:20 UTC
- **Deepened 2026-09-23 09:20 UTC — the oldest untouched OPEN entry (12 days,
  never previously deepened); re-verified against current `src/`, still fully
  unbuilt and every cited fact still exact:** `Stack.jsx` grew to 465 lines
  since this was written, but every anchor still resolves — `starterNames`/
  `addedTools` now sit at `Stack.jsx:100-103` (was 98-101), `allStackTools` at
  `Stack.jsx:232-235` (was 230-233), and the "your kit" header this entry
  targets for the sticker is now `Stack.jsx:314-321`. `Compare.jsx:28` still
  reads `searchParams.get('tools')` as a comma-joined slug list exactly as
  cited, and `capabilityMatrix.js` still names `Comparison` (line 44) and
  `deep_comparison_opened` (line 97). Re-ran the category grep against the
  live bundled catalog instead of trusting the old numbers: `TOOLS.length` is
  704 (the entry's own "330 bundled" description of that count was already
  wrong when written — worth noting since nobody had checked it until now),
  but the counts it actually cites are exact and unaffected: 26 distinct
  `sourceCategory` values, LLMs & Chatbots at 35, Image Generation & Editing
  at 60, Video Generation & Avatars at 47. `findOverlaps`/`stackOverlap.js`
  does not exist anywhere in `src/` (grepped) — still fully unbuilt.
  One thing this entry's original write-up missed: `Stack.jsx:320` now
  mounts `<StackCost tools={allStackTools} />` right in the same "your kit"
  header row this entry wants to add a sticker near — that's the since-shipped
  `aeaedd0` cost-estimate gap (counts by price bucket only: free/freemium/paid/
  unpriced, see `src/utils/stackCost.js`), not overlap detection, so it
  doesn't make this gap redundant. But it does mean the header row this entry
  points at (`Stack.jsx:314-321`) is more crowded than when it was scoped:
  it now holds the "N tools locked in" label AND the cost-bucket pills on one
  line. The overlap sticker should still go where the entry specs it (below
  the header, near `allStackTools`, not inside that row) — flagging this only
  so whoever builds it doesn't try to cram a third element into an
  already-two-element flex row. Also fixed a duplicate `Found:` line left in
  this entry (two conflicting timestamps, likely a copy-paste artifact from
  whenever this was first written) — kept the earlier one, matching the
  09:20 UTC research-run slot this file's other September entries use.

---

### Fresh Finds ignores the one signal that would actually personalize it — visit history the streak dots already log
- **Status:** SHIPPED (this run, sha in DEVLOG) — built exactly as scoped:
  `daysSinceLastVisit(days, now)` added to `streakStore.js` (sorts the log,
  finds the most recent entry strictly before today, returns the calendar-day
  gap or `null`), 6 new tests in `test/streak-store.test.mjs`. `Discover.jsx`
  reads `loadStreak().days` (no new `recordVisit()` call — read-only, per the
  "what this would NOT include" scope), clamps the result to 1–30 days, and
  uses it as the `getNewTools()` window instead of the fixed `7`. Heading
  now resolves the three-way precedence the 2026-09-23 deepening flagged
  once the domain-match personalization shipped in between: domain match
  first, then visit-recency ("🆕 New since you were last here"), then the
  original "🆕 New this week" for a visitor with no log. Verified live in a
  local preview build: seeding a 10-day-old visit renders the recency
  heading; clearing the log falls back to the default. Did not touch
  `recordVisit()`, `Stack.jsx`, the public `/new` feed, or the log's 28-day
  retention window, matching scope.
- **Seen in:** not a competitor pattern — a self-audit of the already-shipped
  "Surface tool freshness" gap above (found 2026-08-22, SHIPPED `2d7d192`)
  against what the codebase has grown since. That entry's own "what this
  would NOT include" list says: *"no per-user 'since your last visit'
  personalization (would need visit tracking Toolnaut doesn't have)."*
  Re-checked this run — the precondition it names no longer holds, the same
  "a blocker shipped and nobody came back to flip it" shape as the leaderboard
  gap above, just on a smaller feature.
- **Gap:** `src/state/streakStore.js` (the file behind `Stack.jsx`'s seven
  day-of-week streak dots) keeps a real, dated visit log: `days:
  ['YYYY-MM-DD', ...]` of actual local calendar dates the person opened the
  app, trimmed to the last 28 (`streakStore.js:18,24,88`), written by
  `recordVisit()` on every `Stack.jsx` mount (`Stack.jsx:93`,
  "idempotent within a calendar day, so calling it on every mount is safe")
  and readable with zero side effects via `loadStreak()`
  (`streakStore.js:69-72`) — already called read-only elsewhere
  (`StreakPoints.jsx:43`, `Settings.jsx:80`) without ever recording a new
  visit itself. None of that reaches `Discover.jsx`. Its Fresh Finds strip
  hardcodes a fixed 7-day window for every visitor alike:
  `const freshTools = useMemo(() => getNewTools(7)..., [])` (`Discover.jsx:141`),
  labelled "🆕 New this week" (`Discover.jsx:191`) regardless of whether this
  is someone's first-ever visit or their fifth visit today. `getNewTools`
  itself (`src/utils/newTools.js:16-20`) already takes `days` as a parameter
  — the fixed `7` is a call-site choice, not a hard limit in the utility.
- **Why it matters:** the two failure directions both undercut the exact
  "scannable digest" framing `FeaturesSection.jsx` sells Fresh Finds on. A
  daily visitor sees the same handful of "new this week" tools re-served on
  every visit, which reads as static, not fresh. A visitor who skipped three
  weeks sees only the last 7 days and never learns about everything the
  radar published while they were away — the exact tools most worth
  surfacing to someone coming back are the ones this window silently drops.
  Genuine per-user personalization here costs nothing new to track: the data
  already exists, recorded for an unrelated feature (the streak dots), and
  reading it changes nothing about how or when it's written.
- **Smallest useful version (what to actually build):**
  - New pure function in `streakStore.js`, e.g. `daysSinceLastVisit(days, now
    = new Date())`: sort `days` (already local `YYYY-MM-DD` keys, string-
    sortable), find the most recent entry strictly before `toDateKey(now)`,
    and return the calendar-day difference; return `null` when no such entry
    exists (empty log, or the only entry is today) so callers can tell "no
    prior visit on record" apart from "visited yesterday." Mirrors the
    existing calendar-day math `isNextCalendarDay`/`fromDateKey` in the same
    file rather than introducing a second date-diffing approach.
  - `Discover.jsx`: read `const { days } = loadStreak()` — a plain read, not
    a new `recordVisit()` call, so this does not start tracking Discover
    visits separately or touch what `Stack.jsx` already owns writing. Compute
    `sinceLast = daysSinceLastVisit(days)` and replace the freshTools memo's
    fixed `7` with `sinceLast == null ? 7 : Math.min(Math.max(sinceLast, 1), 30)`
    — floor of 1 so "already visited earlier today, came back" still shows
    something, cap of 30 (matches the streak log's own 28-day trim, rounded
    up) so a dormant account doesn't get an unbounded dump.
  - Swap the strip's heading to "🆕 New since you were last here" only when
    `sinceLast != null`; keep exactly today's "🆕 New this week" copy and
    behavior for anyone with no prior visit on record (first-ever Discover
    visit, or a log wiped by cleared site data) — a personalized label only
    appears when the personalization is real, same honesty rule this file
    applies to every other badge/tile in the app (the Explorers-tile /
    SUBSCRIBERS-tile distinction, the leaderboard's `IS_SAMPLE` badge, etc.).
  - **What this would NOT include** (kept out to bound the diff): no change
    to `recordVisit()` or `Stack.jsx` — Discover only *reads* the log Stack
    already writes, never writes to it itself; no change to the separate
    public `/new` feed (deliberately generic/unauthenticated, a different
    surface); no second, dedicated "last saw Fresh Finds" timestamp — reusing
    the one existing visit log is the entire point, adding a parallel one
    would reintroduce the exact duplicated-state problem the streak-dots
    rewrite (`streakStore.js`'s own header comment) was written to avoid; no
    extending the underlying log's 28-day retention window.
- **Build size:** S — one small pure function in an existing file
  (`streakStore.js`), a ~6-line change to one `useMemo` and one heading string
  in `Discover.jsx`. No backend, no schema change, no new store, no new
  dependency.
- **Found:** 2026-09-11 12:30 UTC
- **Deepened 2026-09-23 21:14 UTC — the oldest untouched OPEN entry (12 days,
  never previously deepened); re-verified against current `src/` rather than
  starting a new finding.** `streakStore.js` is untouched since this entry was
  written — `loadStreak()` (`:69-72`), the `WINDOW = 28` trim (`:24`, applied
  at `:88`), and the `days` shape are all still exactly as described, so
  `daysSinceLastVisit()` can be added with zero adjustment to the plan.
  `getNewTools(days = 7)` also unchanged (`newTools.js:15-19`, was cited as
  `:16-20` — one-line drift only). `recordVisit()`'s call site moved from
  `Stack.jsx:93` to `:95` — cosmetic.
  **What did change, and matters:** the separate "Weekly Fresh Finds
  domain-blind" gap (below) shipped in the meantime (`6552af5`), and it
  touched the exact code this entry plans to edit. `freshTools` is now at
  `Discover.jsx:159-165` (was `:141`) and already does one kind of
  personalization — sorting same-domain tools first and swapping the heading
  to `` 🆕 New in ${domain} `` when `hasFreshDomainMatch` is true
  (`:167`, `:226`) — so the heading is no longer this entry's clean two-way
  switch ("New since you were last here" vs. "New this week"). It is now a
  three-way choice, and the two personalizations need an explicit precedence
  instead of colliding: check `hasFreshDomainMatch` first (a visitor's actual
  role match is more specific than a timeframe) and only fall back to the
  visit-recency copy when there is no domain match, i.e. `hasFreshDomainMatch
  ? "🆕 New in ${name}" : sinceLast != null ? "🆕 New since you were last
  here" : "🆕 New this week"`. The `freshTools` `useMemo`'s dependency array
  also needs `sinceLast` added alongside `answers?.domain` once its
  `getNewTools(7)` call becomes `getNewTools(sinceLast == null ? 7 :
  Math.min(Math.max(sinceLast, 1), 30))` — today the array is `[answers?.domain]`
  only. Everything else in the original plan (the pure `daysSinceLastVisit()`
  function, reading `loadStreak()` without writing, the 1–30 day clamp, the
  "what this would NOT include" scope cuts) still holds exactly as scoped.

---

### "Weekly trending tools" is sold on the Pro tier — the account data to build a real one already exists, unused
- **Status:** OPEN
- **Seen in:** not a competitor pattern — a self-audit of Toolnaut's own pricing
  copy, the same shape as the leaderboard-real gap above (a feature promised
  before its precondition existed, whose precondition has since quietly
  landed). Trending/most-added rankings are also a standard directory pattern
  worth naming for comparison: G2's "Trending" badge and Product Hunt's daily
  ranking both surface real, aggregate usage signal rather than an editorial
  pick, which is exactly the gap between what Toolnaut promises and what
  `FLAGSHIP`/Fresh-Finds today actually are (curated and recency-based, never
  usage-based).
- **Gap:** `src/utils/planData.js:108` lists `planned('Weekly trending tools +
  personalized alerts')` on the Pro tier's feature list (`planData.js:90-114`)
  — an explicit, dated, unbuilt promise per this file's own `planned()`/`live()`
  convention (`planData.js:17`, rendered as a distinct badge by
  `PricingPillar.jsx:99`). Checked whether "trending" is buildable the same way
  `prominence.js:21-23` rules out for the catalog itself ("the source data has
  no popularity signal") — that comment is about radar/catalog data only.
  Toolnaut's own account data is a different signal and was never checked
  against it. `supabase/migrations/0002_user_state.sql:60-66` already created
  `public.tool_refs` (`user_id`, `tool_slug`, `kind` in `('stack','saved')`,
  `added_at`) specifically to mirror what's in every signed-in user's stack —
  real per-account usage, not invented. `src/state/sync.js:75-105`'s
  `pushAll()` already keeps it populated: called from `syncOnSignIn()`
  (`sync.js:177-195`), itself fired from `authStore.js:81` and `:86` on every
  session resolution and every `onAuthStateChange` event (sign-in, tab reload,
  hourly token refresh) — so for any signed-in user with the app open, the
  table tracks "what's currently in my stack" on an ongoing basis, not a
  one-time snapshot. Nothing anywhere aggregates across users: grepped
  `tool_refs` outside `sync.js`/its migration (`grep -rn tool_refs src/`) and
  found only the one read path (`sync.js:139`, a user's own rows via
  `.eq('user_id', id)`, RLS-restricted to that same user by
  `tool_refs_select_own`, `0002_user_state.sql:75-77`) — there is no
  cross-account count anywhere in the app today.
- **One real caveat found this run, load-bearing for how this must be built:**
  `pushAll()` deletes and reinserts every row on each sync
  (`sync.js:100-104`), so `added_at` resets to "now" every time, not "when
  this user first added it." That means a literal "added this week" query
  would be meaningless — it would just measure "who happened to sync in the
  last 7 days," not real recency. The honest version drops the time window
  and the word "weekly" from the display entirely: a live count of "N members
  currently have this in their stack," computed with no `added_at` filter at
  all, sidesteps the bug rather than trying to fix reset semantics that
  `pushAll()`'s own delete-then-insert design (documented as intentional,
  `sync.js:75-79`'s comment on why a pure upsert would leave stale rows) isn't
  meant to support. This is the same kind of precision-matching-only-what's-
  real discipline the cost-estimate and Fresh-Finds entries in this file
  already apply — ship the honest half of the claim, not the literal wording.
- **Why it matters:** this is the exact pattern that already produced the
  leaderboard-real finding above — a paid-tier promise sitting unbuilt for
  months after the data it needed arrived for an unrelated reason
  (`tool_refs` exists to power cross-device sync, not this). Showing real
  adoption counts is also a trust-building signal in its own right, the same
  family as `explorer_count()` replacing an invented "1,300 EXPLORERS" figure
  (`0001_explorers.sql:1-10`) — a directory whose own numbers keep turning out
  to be real, one gap at a time, is the credibility story `About.jsx`'s "built
  solo... shipping fast" framing is trying to tell.
- **Smallest useful version (what to actually build):**
  - New migration `supabase/migrations/0009_tool_stack_counts.sql` (0001
    through 0008 are already applied — `0008_account_deletion.sql` is the
    most recent — so 0009 is next free, re-checked this run). Adds exactly
    one function, no new table and no policy change to `tool_refs` (its
    existing owner-only `select` policy is untouched — the function bypasses
    it the same way `explorer_count()` bypasses `explorers` having no select
    policy at all):
    ```sql
    create or replace function public.tool_stack_counts()
      returns table (tool_slug text, member_count bigint)
      language sql
      security definer
      set search_path = public
      stable
    as $$
      select tool_slug, count(distinct user_id) as member_count
      from public.tool_refs
      where kind = 'stack'
      group by tool_slug
      having count(distinct user_id) >= 3
    $$;
    grant execute on function public.tool_stack_counts() to anon, authenticated;
    ```
    The `having >= 3` floor is deliberate: with a small early user base, a
    count of 1 could be read as "who added this," which is exactly the kind
    of individual exposure `explorers`' own "no select policy, aggregate
    only" design was written to prevent — a floor keeps the aggregate from
    ever being small enough to imply an identity.
  - New `src/utils/trending.js`: `fetchTrending()` calls `syncAvailable()`
    first (same feature-detection every sync-dependent feature in this file
    already uses — unavailable or unmigrated both mean "show nothing," not an
    error), then `supabase.rpc('tool_stack_counts')`, sorts by
    `member_count` descending, and returns the top N slugs resolved through
    `getTool()` — mirrors `leaderboard.js`'s proposed shape in the entry
    above closely enough that both could share one migration-numbering
    sequence if built together.
  - Smallest visible surface: `ToolDetail.jsx` (reuses the existing `sticker`
    card pattern at `ToolDetail.jsx:174`) — a real per-tool count is a much
    stronger fit here than a homepage list, since it needs no editorial
    ranking logic and reads naturally as "N Toolnaut members have this in
    their stack" next to the tool a visitor is already looking at, only
    rendered for that one tool's own count when it clears the floor. A
    Discover-wide "trending" strip (sorted top-N across the catalog) is a
    reasonable v2 but doubles the surface area for a first cut.
  - Drop `planData.js:108`'s `planned()` entry down to `live()` once shipped,
    or split it: "personalized alerts" stays `planned` (still needs the same
    email backend the rejected weekly-digest entry above correctly rules out
    building client-side) while "trending tools" moves to `live` — the two
    halves of that one bullet have different buildability, and the pricing
    page should not keep claiming the whole bullet is future work once half
    of it ships.
  - **What this would NOT include** (kept out to bound the diff): no time
    window ("this week") per the caveat above — a live snapshot count only;
    no per-tool breakdown by persona/role; no email/notification delivery
    (that half stays the already-rejected weekly-digest gap); no change to
    `tool_refs`'s existing RLS policies; no Discover-wide trending strip in
    v1, per above; no counting `kind = 'saved'` (favorites) alongside stack
    membership — mixing "actively using" with "bookmarked for later" would
    muddy what the number means.
- **Build size:** S/M — one additive SQL function over an existing table (no
  new table, unlike the leaderboard gap above which needs a schema change),
  one new client module mirroring `sync.js`'s existing feature-detection
  pattern, one sticker in an already-existing page, one pricing-copy edit. No
  new route, no new dependency.
- **Found:** 2026-09-11 21:20 UTC
- **Deepened 2026-09-27 15:20 UTC — this entry's own headline claim is now
  false, and that changes what kind of gap this is:** re-checked `planData.js`
  for the cited `planned('Weekly trending tools + personalized alerts')`
  bullet this entry is framed around and it is gone — grepped `trending`
  case-insensitively across all of `src/` and got zero hits anywhere in the
  app, not just that one file. The Pro tier's current feature list
  (`planData.js:116-118`) is now `live('Unlimited favorite tools')`,
  `planned('AI-powered chat assistant (Claude-powered Q&A)')`,
  `planned('Priority email support')`, `planned('Export learning roadmaps as
  PDF')` — a shorter, already-audited list per the comment directly above it
  ("ONLY WHAT PRO ADDS... What Pro really adds today is the saved-tools limit
  lifted"). Whichever pricing cleanup rewrote that block (this checkout ran
  against a shallow clone, so the specific commit isn't recoverable from
  `git log` here) already removed the exact false promise this gap set out to
  fix. **This means the "why it matters" framing — a paid-tier promise sitting
  unbuilt, the same shape as the leaderboard-real finding — no longer applies
  today; there is nothing false on the pricing page for this gap to correct
  anymore.** The technical case underneath is still sound (`tool_refs` really
  does hold real per-account stack membership, unused for any aggregate
  today, and a live "N members have this" count is still a genuine, honest
  feature this catalog could show), so this stays OPEN as a feature-value
  idea rather than a marketing-honesty fix — just a materially lower-urgency
  one than gaps that still involve a live false claim, and `planData.js:130`'s
  proposed "drop to `live()`" step above no longer has anything to drop.
  Two smaller citations also drifted and are corrected here: (1) the
  migration-numbering plan ("0001 through 0008 are already applied... 0009 is
  next free") is stale — `supabase/migrations/` now runs through
  `0010_saved_limit.sql` (0009 was taken by `0009_subscriber_count.sql`,
  shipped for the leaderboard/subscriber-count gap; 0010 added the saved-tools
  cap trigger), so the next free number is **0011**, not 0009. (2) `sync.js`'s
  `pushAll()` still deletes-then-reinserts `tool_refs` on every sync (so the
  entry's core "`added_at` resets to now, don't build a real 'weekly' window"
  caveat is unchanged and still correct) but the function's shape moved: the
  delete is now at `sync.js:96`, and what was one combined insert is now two
  separate ones (`sync.js:103-106` for `stack`, `107-119` for `saved`) because
  0010's per-plan saved cap meant one failed combined insert used to discard
  the stack half too — the explanatory comment cited at "100-104" is now at
  `sync.js:99-102`. `ToolDetail.jsx`'s cited mount point also moved: the
  `sticker` card this entry proposes reusing is now at `ToolDetail.jsx:185`
  ("Why it fits"), not `:174` — the buttons row above it (add-to-stack,
  favorite) grew a few lines first. `tool_refs`'s schema/RLS citations in
  `0002_user_state.sql:60-66,75-77` are unchanged and still accurate, and the
  proposed `tool_stack_counts()` function only reads `kind = 'stack'` rows, so
  0010's saved-only cap trigger doesn't interact with it.

---

### Compare already works entirely off a URL, but it's the one such feature that isn't public
- **Status:** SHIPPED cba2691 — built as scoped below: `PublicCompare.jsx` at
  `/compare/:slugs`, reusing `shareStack.js`'s existing encode/decode (no new
  util) and `SharedStack.jsx`'s public-page shell. `Compare.jsx` gained a
  "Copy public link" action. Added `/compare/chatgpt,claude` to
  `scripts/smoke.mjs` and six hand-picked pairs to `public/sitemap.xml`. No
  scoring/verdict, no stack-adoption action, no dynamic sitemap generation —
  exactly the exclusions this entry scoped in advance.
- **Seen in:** StackShare's public "stackups" (`stackshare.io/stackups/<a>-vs-<b>`,
  cited already in this file's shipped Share/Export gap for a different
  reason) are permanent, crawlable, head-to-head pages — the same mechanism
  G2 runs at scale (`g2.com/compare/<a>-vs-<b>`, e.g. the live
  "Capterra vs. G2" page found this run). Both treat a *specific pair* of
  products as its own indexable URL, distinct from a general "browse and
  filter" page — "notion ai vs jasper," "chatgpt vs claude," "X vs Y" are
  buyer-intent searches (someone already evaluating two named products) with
  no equivalent inside Toolnaut today, and unlike the already-open
  "Alternatives" gap above (one tool → many substitutes, new matching logic
  needed), this pattern is a *specific, named pair* — the exact shape
  Toolnaut's own Compare feature already renders.
- **Gap:** `src/pages/app/Compare.jsx` already does the real work — its
  entire state is `?tools=<slug>,<slug>,...` in the URL
  (`Compare.jsx:26`, comment at `Compare.jsx:12-13`: "Comparison state lives
  entirely in the `?tools=` query string... no persisted/named comparisons")
  resolved purely via `getTool()` (`Compare.jsx:27`), rendered as a real
  side-by-side table (`rows`, `Compare.jsx:45-58`: category, price, level,
  developer, year, audience, status, tags) with no session or account
  required to compute any of it — the one row that needs quiz state
  (`Fit`, `Compare.jsx:55-58`) is already conditional and simply omitted
  when `quiz.completed` is false (`Compare.jsx:23-24`), exactly the
  guest-safe fallback this backlog's other gaps use elsewhere. Despite that,
  the route is `/app/compare` (`App.jsx:130`), nested inside
  `<Route path="/app" element={<AppShell />}>` (`App.jsx:125`) alongside
  genuinely session-shaped pages (`Settings`, `Community`). `scripts/
  prerender.mjs:13-16`'s own header comment excludes it by name in spirit —
  "Authenticated and per-visitor routes (`/app/*`...) are deliberately NOT
  prerendered" — and confirmed by its `ROUTES` array (`prerender.mjs:26-`
  through `/tools/code`) never listing it. `public/sitemap.xml` has zero
  compare-related URL. `scripts/smoke.mjs:32` does render
  `/app/compare?tools=chatgpt,claude` today, but only as an
  authenticated-app smoke check, not as a public page — smoke passing is not
  the same claim as indexable. A search visitor who types "chatgpt vs
  claude" and lands on Toolnaut today gets nothing; the exact page that
  would answer that query is already built and tested one route prefix
  away.
- **Why it matters:** this is the cheapest gap this backlog has found yet —
  zero new comparison logic, zero new data, the entire table-rendering code
  already exists and is already exercised by CI. The only thing missing is
  a public door to it, the same "expose what's already built one level
  further" shape as the Alternatives and public-search gaps that shipped
  fastest here. Named-pair comparison queries are also higher-intent than
  the broad category pages Toolnaut already publishes (`/tools/:domain`) —
  a visitor searching a specific pair has already narrowed to two products
  and is deciding between them, the same buyer-stage StackShare and G2 both
  built dedicated URL patterns to catch.
- **Smallest useful version (what to actually build):**
  - New public route `/compare/:slugs` in `src/App.jsx`, alongside
    `/s/:slugs` (`App.jsx:108`) — same tier, outside `AppShell`, no session
    needed. Reuse the exact same comma-joined, URI-encoded slug format
    `shareStack.js`'s `encodeStackSlugs`/`decodeStackSlugs` already define
    (`/compare/chatgpt,claude,gemini`) rather than inventing a second
    encoding — one shared util, two consumers.
  - New `src/pages/PublicCompare.jsx`, modeled directly on `SharedStack.jsx`:
    resolve slugs the same way, drop unknown ones silently (a stale/mistyped
    link degrades, per `SharedStack.jsx:15`'s pattern), and render the exact
    same `rows` table `Compare.jsx:45-58` builds (category/price/level/dev/
    since/audience/status/tags), reusing `Compare.jsx`'s table + stacked-card
    JSX largely as-is — this is a rendering fork of an existing page, not a
    new design. No `Fit` row (no quiz context makes sense on a page a
    stranger lands on cold — `Alternatives.jsx`'s planned page doesn't
    invent a fit score either, same restraint). No "Add to stack"/toggle
    buttons in v1 — `SharedStack.jsx`'s single "adopt" CTA already covers
    that job; a comparison page's job is answering "which one," and a
    "Build my own stack" CTA linking to `/goal` (same as `SharedStack.jsx`
    and `Alternatives.jsx`'s empty-state pattern) is enough.
  - `useHead()` (`SharedStack.jsx:7,26-46`'s exact pattern) with a title
    literally containing "vs" — `"{Tool A} vs {Tool B} — compared |
    Toolnaut"` for the two-tool case (the common query shape), falling back
    to a joined list for 3-4 — plus the same `ItemList` JSON-LD
    `SharedStack.jsx:32-43` already emits, so this ships with structured
    data on day one rather than needing a follow-up.
  - `Compare.jsx` (the authenticated version) gets one small addition: when
    a signed-in user builds a comparison, surface a "Copy public link"
    action next to "BACK TO FIND" that points at `/compare/{slugs}` — same
    one-line addition `Stack.jsx`'s share button already made for
    `SharedStack`, so the two halves (build it signed-in, land on it
    signed-out) connect the same way share/adopt already do.
  - `scripts/smoke.mjs`'s route array needs one addition (e.g.
    `/compare/chatgpt,claude`), and `public/sitemap.xml` gets a small
    hand-picked set of high-traffic pairs (chatgpt-vs-claude,
    chatgpt-vs-gemini, notion-ai-vs-jasper or whichever catalog entries are
    best-known) — same manual-seed approach the Alternatives gap above
    already scopes for the same reason (no sitemap-generator script exists
    yet; writing one is a separate, bigger change).
  - **What this would NOT include** (kept out to bound the diff): no
    dynamic sitemap generation for the combinatorial space of all possible
    tool pairs (same restraint as Alternatives); no stack-adoption/"add all"
    action in v1 (kept to `SharedStack`'s existing job); no new comparison
    logic, scoring, or "winner" verdict — same nothing-invented rule this
    whole file applies (`Alternatives.jsx`'s no-scoring restraint, above);
    no OG image generation; no changing `/app/compare`'s existing
    behavior or route for signed-in users beyond the one new "copy public
    link" action.
- **Build size:** S — one new page (`PublicCompare.jsx`, a rendering fork of
  the already-shipped `Compare.jsx` table using `SharedStack.jsx`'s public-
  page shell), one new public route, one small addition to `Compare.jsx`,
  one smoke-route line, a handful of hand-picked sitemap entries. No
  backend, no new dependency, no new store, no new matching or scoring
  logic — every data field the table needs is already read by the
  authenticated page today.

### Privacy policy claimed analytics was off while GA4 was live in production
- **Status:** FIXED (this commit) — small demonstrable bug in a legal
  document, fixed in this run rather than logged as OPEN; entry kept for the
  record per this backlog's own audit trail.
- **Seen in:** not a competitor pattern — found continuing this backlog's own
  "does the copy match the code" sweep, this time pointed at `Legal.jsx`
  (`/privacy`, `/terms`), which had never been checked before. Its own header
  comment claims every line was verified against the code, which made it the
  obvious next thing to re-verify against the *deployed* app rather than just
  the source.
- **Gap:** `Legal.jsx`'s Analytics section said, in bold: "it is not
  currently collecting anything — no measurement ID is configured, so no
  events are sent." `src/utils/analyticsEvents.js:67` reads `VITE_GA4_ID`
  from the environment, and `.env.example` documents it as a real, supported
  variable — so whether the claim is true depends on Vercel's production env,
  not on anything visible in the repo. Fetched the live bundle
  (`curl https://toolnaut.xyz/`, then the `index-*.js` chunk it references)
  and grepped for `googletagmanager`: the minified `ec="G-Y9EF7PD5SW"` is
  sitting right next to the `gtag/js?id=` call, unconditionally — meaning
  Google Analytics is not only configured, it is actively loading and firing
  the full event set in `EVENTS` (page views, section views, CTA clicks, quiz
  progress, funnel/activation events, checkout/subscription lifecycle) on
  every real visitor today. The privacy policy was last updated 27 August;
  someone set `VITE_GA4_ID` in Vercel after that without coming back to flip
  this section — exactly the "quietly switching it on" scenario the same
  paragraph promised wouldn't happen.
- **Why it matters:** every other gap this file has found is a marketing
  page overselling a feature. This one is a **privacy policy** telling
  visitors a specific, checkable claim about data collection that is false on
  the live site — the one page whose entire job is to be accurate, and the
  one place a false claim carries actual legal/compliance exposure (GDPR/CCPA
  disclosure obligations), not just a bad look. Also checked whether the same
  thing happened to Sentry (`VITE_SENTRY_DSN`, also read at build time,
  `.env.example`'s other analytics-adjacent knob): grepped the live bundle for
  `ingest.*sentry.io` and found nothing, so error reporting really is inert as
  documented — this is specifically a GA4-only miss, not a systemic one.
- **Fix shipped this run:** `Legal.jsx`'s Analytics section now says
  analytics is active and names what GA4 actually collects (page/section
  views, clicks, quiz and funnel milestones) versus what it doesn't (name,
  email, account id, anything typed in the quiz; GA4 doesn't log full IPs).
  Added a fourth named entry to "Third parties" for Google Analytics,
  matching the existing Supabase/Featherless/Vercel entries' format. Updated
  "Cookies" to acknowledge GA4's first-party measurement cookies instead of
  claiming zero tracking cookies exist. Updated the file's own top-of-file
  comment, which is what caused this in the first place, to say the analytics
  claim must be re-checked against the live bundle (not just the source) since
  the on/off state lives in Vercel env config no repo diff would ever show.
  Bumped "Last updated" to today. Text-only change to one file, no new
  dependency, no behavior change to analytics itself — this documents what is
  already happening, it does not add or remove tracking.
- **What this would NOT include:** no consent banner, no gating GA4 behind
  opt-in, no changing whether analytics runs at all — that is a real product/
  legal decision (whether EU visitors need a cookie-consent gate before GA4's
  measurement cookies are allowed to fire) that deserves its own deliberate
  gap and build, not a same-run bundled decision. Logging it here as a
  follow-up: **OPEN — cookie-consent gate for GA4**, build size M (a small
  consent banner component, a localStorage-backed choice, and wrapping
  `initAnalytics()`'s call site in `main.jsx` behind it), not attempted in
  this run because it changes real behavior (whether events fire) rather than
  just correcting a description of behavior that already exists.
- **Found & fixed:** 2026-09-12 09:00 UTC
- **Found:** 2026-09-12 00:20 UTC

---

### Cookie-consent gate for GA4 — flagged as a follow-up in the entry above, never promoted to its own gap
- **Status:** BUILT, UNMERGED — PR #57 (2026-09-20) and PR #70 (2026-09-22)
  both already implement this in full (banner, `consentStore.js`, gated
  `initAnalytics()`/`loadAnalytics()` split, `Legal.jsx` `#analytics` anchor),
  both green (`npm test`/`build`/`smoke`), neither merged — see issue #67.
  #70 is the better of the two (splits GA4's script injection from the
  always-safe `dataLayer`/`page_view` bookkeeping `track()` depends on, so
  `track()` doesn't throw for a not-yet-consented visitor; #57 gates the
  whole function and would regress every `track()` call site until accept).
  **Do not rebuild this a third time** — it needs a human to merge #70 (and
  close #57 as superseded), not more agent code. Re-verified 2026-09-26:
  gap still real on current `master`, fix still sitting in PR form only.
- **Seen in:** the previous entry's own "what this would NOT include" section named
  this and left it unbuilt; a GitHub Actions run titled "docs(research):
  promote the GA4 consent-gate follow-up to its own gap" exists in this repo's
  history (`issue_comment`-triggered, both attempts came back `skipped`), so a
  prior session tried and the promotion never landed — re-verified against
  current master before writing this up fresh rather than trusting that title.
  The pattern itself is the standard one: Cookiebot and Osano (the two most
  widely embedded consent-management platforms) both block
  non-essential/analytics scripts until an explicit accept, and the
  requirement is not stylistic — GDPR/ePrivacy treats a non-essential
  measurement cookie fired before consent as a compliance violation for EU
  visitors, which is exactly the exposure the previous entry flagged and did
  not close.
- **Gap:** confirmed still open by reading the current files. `src/main.jsx:15`
  calls `initAnalytics()` unconditionally on every boot, for every visitor,
  before any consent choice could exist. `src/utils/analyticsEvents.js:67-92`:
  `initAnalytics()` reads `GA_ID` from `import.meta.env.VITE_GA4_ID` and, when
  set (confirmed live in production by the previous entry's bundle check),
  synchronously injects the `googletagmanager.com/gtag/js` script and calls
  `gtag('config', GA_ID)` — no gate, no consent check, nothing conditional
  before the script tag is appended to `document.head`. `Legal.jsx`'s Analytics
  section (just corrected by the previous entry to describe this behavior
  honestly) still only *describes* GA4 firing unconditionally — it does not
  claim a consent gate exists, so the copy is no longer false, but the
  underlying behavior it now accurately describes is still the gap. Grepped
  `consent|Cookiebot|CookieYes|osano` across `src/`: zero hits outside this
  backlog file itself — no banner component, no stored choice, nothing.
- **Why it matters:** this is the one open compliance-shaped gap in a file
  otherwise full of marketing-copy-vs-reality gaps. A false line of privacy-
  policy copy (the previous entry) is embarrassing when caught; a live
  analytics cookie firing on an EU visitor's first paint with no consent
  mechanism is a live GDPR/ePrivacy exposure for as long as `VITE_GA4_ID`
  stays set in Vercel, which the previous entry confirmed it already is. It
  also blocks the honest half of the Legal.jsx fix from being a complete
  story: the page can describe what GA4 collects, but until this ships it
  cannot honestly say a visitor had any choice in the matter.
- **Smallest useful version (what to actually build):**
  - New `src/state/consentStore.js`, same tiny shape as `moonStore.js`
    (`loadMoon`/`setMoon`): `loadConsent()` reads a single key
    (`exus_consent_v1`) via a try/catch localStorage read (per this repo's own
    rule that every `localStorage` read must tolerate the API throwing, not
    just returning null) and returns `'granted' | 'denied' | null` (`null`
    means "never asked" — distinct from an explicit decline, so the banner
    only shows once and a decline is remembered, not re-asked every visit).
    `setConsent(value)` writes it the same guarded way `setMoon` does.
  - `src/main.jsx`: only call `initAnalytics()` when `GA_ID` would actually be
    used AND consent is `'granted'` — restructure so `analyticsEvents.js`
    exports a `canInitAnalytics()` (checks `GA_ID` is set) and `main.jsx`
    gates the existing `initAnalytics()` call on
    `loadConsent() === 'granted'`. When consent is `null` (never asked) and
    `GA_ID` is set, render a small consent banner instead of firing anything —
    the banner's own "Accept" action is what calls `initAnalytics()` for the
    first time, same-session, not a page reload.
  - New `src/components/ConsentBanner.jsx`: a small fixed bottom bar, mirroring
    `InstallPrompt.jsx`'s existing shape closely (`sticker fixed inset-x-4
    bottom-[...] z-[70]` positioning, `role="dialog"`, Escape-to-dismiss,
    dismissal remembered via a guarded localStorage write) rather than
    inventing a new interaction pattern — the difference is only the two
    buttons (Accept/Decline instead of Install/Dismiss) and one line of copy
    plus a link to `/privacy#analytics`. Unlike `InstallPrompt`, which mounts
    only inside `AppShell.jsx:248` (signed-in app routes only), this must
    mount at the root in `App.jsx` alongside `ThemePicker` (`App.jsx:85`) so
    it covers every route GA4 fires on, marketing pages included — rendered
    only when `GA_ID` is set and `loadConsent()` is `null`. Accept calls
    `setConsent('granted')` then `initAnalytics()`; Decline calls
    `setConsent('denied')` and renders nothing further — no retry prompt on
    the next visit.
  - No geo-detection (no IP lookup, no "only show this to EU visitors"): the
    banner shows to every visitor when GA4 is configured, the same blanket
    approach `InstallPrompt` and the moon/theme pickers already take to every
    visitor alike — simpler, and errs toward more consent asked rather than
    less, which is the safe direction for a compliance-shaped feature.
  - **What this would NOT include** (kept out to bound the diff): no
    granular per-category cookie controls (analytics vs. marketing vs.
    functional) — there is exactly one non-essential script (GA4) to gate, so
    a single accept/decline choice covers the entire real surface; no consent-
    string/IAB TCF integration; no blocking Supabase auth or Vercel's own
    infra cookies, which are functionally essential and out of scope for a
    "non-essential tracking" gate; no changing `track()`'s no-`gtag` fallback
    behavior (still an inert `dataLayer.push`, same as today when `GA_ID` is
    unset in dev).
- **Build size:** M — one new tiny state module (mirrors `moonStore.js`
  almost exactly), one new banner component (mirrors `InstallPrompt.jsx`'s
  fixed-bar pattern), a small restructure of `initAnalytics()`'s call site in
  `main.jsx`, and one new mount point in `App.jsx`. No backend, no new
  dependency, no schema change.
- **Found:** 2026-09-13 00:08 UTC

---

### "Download my data" has no counterpart to the "Delete my account" flow that already exists
- **Status:** SHIPPED c4a24deb210425e316d765ac277318f63b87c3b1 — live on
  `master`/toolnaut.xyz since 2026-10-02. This status line itself was blocked
  from reaching `master` by the same "Production Deploy" push denial (fixed
  on the PR #89 branch 2026-10-03, copied over here 2026-10-03 21:11 UTC
  after confirming the code is genuinely live — see `src/utils/
  exportUserData.js` and `Settings.jsx`'s "Download my data" button).
- **Seen in:** not a competitor in this file's usual AI-directory set —
  Futurepedia/TAAFT/G2 are anonymous browse-only catalogs with no accounts to
  export from, so this doesn't apply to them. The pattern instead is general
  account-hygiene practice on any product that already offers account
  deletion: GitHub's Settings pairs "Export account data" directly above
  "Delete account"; Discord's Privacy settings offers "Request all of my
  data" beside its account-deletion flow; it's also the GDPR Article 20 /
  CCPA right-to-know shape (access/portability), the same regulatory family
  this file's cookie-consent and privacy-policy entries above already treat
  as real exposure, not just a nice-to-have.
- **Gap:** Toolnaut already ships the harder half of this pair —
  `src/components/app/DeleteAccount.jsx` is a careful three-step, code-
  confirmed permanent-deletion flow (warn → emailed code → done), sitting in
  `Settings.jsx:500-508` next to Sign out. There is no "download my data"
  action anywhere beside it. Confirmed with `grep -rn "new Blob\|createObjectURL\|download=" src/` (zero hits) and `grep -rn "export.*data\|Download my data" src/` (zero hits outside this backlog file) — no export utility exists for a user's own account data, only server-side scripts under `radar/` and `scripts/` that export the tool catalog, an unrelated thing. Yet `Settings.jsx` already assembles nearly the whole record on screen every time it renders: quiz answers (`quiz.answers` against `QUESTIONS`, `Settings.jsx:272-289`), the derived persona, stack tools and favorites (`Settings.jsx:76-108`'s `stats` memo, sourced from `loadStack()`/`loadFavorites()`), roadmap progress and streak days (`loadRoadmapProgress()`/`loadStreak()`), and sky prefs (`loadTheme()`/`loadMoon()`/`loadCursor()`/`loadAvatar()`, all imported at the top of the file). The data is already loaded into memory for display; it is never offered as a file.
- **Why it matters:** this is the one sequencing a careful user would actually want and today can't get — get a copy first, then decide whether to delete — and the product currently only builds the irreversible half. It costs nothing new to fetch (every value already flows through `Settings.jsx` for on-screen display) and it's the same kind of unprompted trust signal this file keeps finding value in elsewhere (real explorer counts instead of an invented figure, an honest "note" field on uncertain tools): showing someone their own data without them having to file a support request for it.
- **Smallest useful version (what to actually build):**
  - New pure util `src/utils/exportUserData.js`: `buildUserDataExport()`
    calls the same read functions `Settings.jsx` already imports —
    `loadSession()` (name/email/provider only, never a token), `loadQuiz()`,
    `loadStack()`, `loadFavorites()`, `loadProgress()`,
    `loadRoadmapProgress()`, `loadStreak()`, `loadTheme()`, `loadMoon()`,
    `loadCursor()`, `loadAvatar()` — and returns one plain object plus an
    `exportedAt` ISO timestamp. No new store, no new read path; every one of
    these calls already tolerates a throwing localStorage per this repo's
    own rule, so the aggregator inherits that for free.
  - `Settings.jsx`: one "Download my data" button in the same action row as
    `DeleteAccount` (`Settings.jsx:500-508`), calling
    `buildUserDataExport()`, `JSON.stringify(data, null, 2)`, and the
    standard zero-dependency browser pattern — `new Blob([...], {type:
    'application/json'})`, `URL.createObjectURL`, a synthetic `<a download>`
    click, then `URL.revokeObjectURL` — the same native-API-only approach
    the PDF-roadmap-export entry above already established for this
    codebase (`window.print()`, no library) rather than adding a download
    dependency for one button. Shown for guests too, not just signed-in
    accounts — a guest's stack/quiz/roadmap data is just as real and just as
    exportable, it's simply scoped to this browser instead of an account
    (same framing `Settings.jsx`'s own guest ACCOUNT card already uses).
  - **What this would NOT include** (kept out to bound the diff): no
    server-side data in v1 — alert-subscription state (`alert_subscribers`),
    payment/entitlement history, and `tool_refs` sync rows all live in
    Supabase behind their own authenticated reads (`entitlement.js`,
    `sync.js`) that `Settings.jsx` itself doesn't inline into this export
    today either; a signed-in user's local stores are already the
    synced/hydrated copy per `syncOnSignIn()`, so v1's export is complete for
    everything the app actually shows them, just not for raw billing
    records. Adding those is a separately-shippable v2, not a reason to hold
    this diff for a bigger fetch; no CSV format (JSON matches what's being
    exported — nested objects like `roadmapProgress` don't flatten cleanly);
    no email-delivered export (GitHub's async "we'll email you a link"
    flow exists because their exports are large server-side archives —
    everything here is already client-side and instant, so there is no wait
    to hide behind an email).
- **Build size:** S — one new pure util (`exportUserData.js`, trivially
  `node --test`-able like this file's other pure-function gaps), one
  button plus a ~6-line download helper in `Settings.jsx`. No backend, no
  new dependency, no new route, no schema change.
- **Found:** 2026-09-13 06:35 UTC
- **Deepened 2026-10-02 09:04 UTC — oldest untouched OPEN entry (19 days,
  never previously deepened), re-verified against current `master`. The core
  gap is completely unchanged: `grep -rn "new Blob\|createObjectURL\|download="
  src/` and `grep -rln "exportUserData\|Download my data\|buildUserDataExport"
  src/` both still return zero hits — no export utility, no download button,
  nothing has encroached on this since it was written. Every function the
  spec names (`loadSession`, `loadQuiz`, `loadStack`, `loadFavorites`,
  `loadProgress`, `loadRoadmapProgress`, `loadStreak`, `loadTheme`,
  `loadMoon`, `loadCursor`, `loadAvatar`) is still imported into
  `Settings.jsx` exactly as described, still called with the same signatures.
  **One real contradiction in the original plan, found by re-reading the
  current action row instead of trusting the three-week-old line numbers:**
  the plan says the button goes "in the same action row as `DeleteAccount`"
  *and* that it should be "shown for guests too, not just signed-in
  accounts." Both were true when this was written, but the row's structure
  has since settled into a shape where they can't both hold. Re-read
  `Settings.jsx:506-522` fresh: the bottom action row opens with "Replay the
  tour" (`Settings.jsx:509-511`), which is deliberately *outside* the
  signed-in check — its own inline comment says so ("guests use /app too,
  and the tour is about the app rather than the account") — and only then
  does `{session && (...)}` wrap Sign out and `DeleteAccount`
  (`Settings.jsx:512-521`). Nesting the new button inside that same
  fragment, as "same row as DeleteAccount" implies, would hide it from
  guests — the opposite of what this entry asks for. **Corrected placement:**
  put "Download my data" next to "Replay the tour", before the `{session &&
  ...}` block, not beside `DeleteAccount`. It still visually reads as part of
  the same row (same flex container, `Settings.jsx:506`) without being
  guest-gated. No other part of the spec changes — `buildUserDataExport()`'s
  list of calls, the guest-inclusive scope, the JSON-not-CSV reasoning, and
  the "no server-side billing data in v1" boundary are all still accurate as
  written.

---

### "Skip to content" exists for signed-in users only — every public page a visitor sees first has none

- **Status:** SHIPPED (this run, sha in DEVLOG) — built close to scope, with
  two corrections found while implementing: (1) rather than mounting a
  second `<SkipLink />` inside `AppShell.jsx` in addition to the global one
  in `App.jsx`, `AppShell.jsx` now only keeps its `<main id="main-content">`
  landmark and relies on the single global skip link — two stacked "Skip to
  content" links landing on the same anchor at the top of every `/app/*`
  page would have been a duplicate tab stop, not a fix. (2) The route list
  had drifted since this entry was written 2026-09-13: `/checkout`,
  `/methodology`, `/ai-tools/:slug` (`ToolPublic`), and `/auth/login`
  existed but weren't in the original 13-page list, so they got the same
  `id="main-content" tabIndex={-1}` treatment too — 17 page roots in total,
  not 13. `/office` (a bare WebGL canvas, no header/nav to bypass) and the
  `*` `NotFound` page (no persistent chrome either) were deliberately left
  out — WCAG 2.4.1 exists to skip *repeated* navigation blocks, and neither
  page has one.
- **Seen in:** not a competitor pattern this time — it's a standard the app
  already half-implements and documents the reasoning for. WCAG 2.4.1 ("Bypass
  Blocks") requires a mechanism to skip repeated navigation blocks; it's a
  baseline expectation on any content site with a persistent header, which is
  exactly what every G2/Capterra/Futurepedia category page also provides.
- **Gap:** `src/shells/AppShell.jsx:122-130` already has a real skip link,
  with its own comment citing the WCAG rule: "keyboard/screen-reader users
  otherwise have to tab through the sidebar persona card and 6 nav links...
  on every single page before reaching content." It targets
  `<main id="main-content" tabIndex={-1}>` at `AppShell.jsx:199`. That
  mechanism exists nowhere else. Grepped `main-content|id="main` across
  `src/` — the only two hits are those same two lines. `App.jsx` routes 20+
  pages directly (`Landing`, `Pricing`, `Legal`, `About`, `Changelog`,
  `Support`, `CategoryLanding`, `NewTools`, `SearchTools`, `ExampleStack`,
  `SharedStack`, `PublicCompare`, `Office`) plus everything under
  `OnboardingShell.jsx` (`/goal`, `/quiz/result`, `/auth/login`, `/pay`) —
  none of them, and neither shell wrapper, render a skip link or a landmark
  a skip link could target. There is no shared header/nav component either
  (grepped `SiteHeader|MarketingHeader|PublicHeader|PageHeader`, zero hits) —
  each page rolls its own `<header>` inline, confirmed in `Landing.jsx:178-
  189` (a fixed header with 5 links/anchors — How it works, Pricing, About,
  Search, Contact — before the hero) and `Pricing.jsx:83-90` (logo + a CTA
  link) as two examples of the same shape repeated per page. The one page
  that got this right is, ironically, the one fewest first-time visitors
  ever reach: everything a signed-out visitor sees on the way in — the
  landing page, the pricing page, the quiz itself — has no bypass mechanism
  at all.
- **Why it matters:** this is the inverse of most gaps in this file, which
  affect a feature some users opt into. A skip link is infrastructure every
  keyboard or screen-reader visitor benefits from on every page, and the
  pages missing it are the highest-traffic ones by construction — nobody
  reaches `/app/*` without first passing through `/` and usually `/goal`.
  AppShell's own comment already states the WCAG requirement as settled
  product reasoning; the other 20+ routes just never got the five lines that
  satisfy it.
- **Smallest useful version (what to actually build):**
  - New `src/components/ui/SkipLink.jsx`: extract `AppShell.jsx:125-130`'s
    JSX verbatim into a tiny reusable component taking a `targetId` prop
    (defaults to `"main-content"`) — same `sr-only focus:not-sr-only`
    Tailwind pattern, same "Skip to content" copy, so the visual/focus
    behavior a keyboard user already gets in `/app/*` is identical elsewhere.
    `AppShell.jsx` switches to rendering `<SkipLink />` instead of its inline
    version — a pure extraction, no behavior change there.
  - `App.jsx`: render `<SkipLink />` once, outside `<Routes>` (alongside
    `ThemePicker`/`ArrivalLaunch` at `App.jsx:85-86`, which already mount
    once for every route the same way). Because `AppShell.jsx` renders its
    own `<main id="main-content">` internally, and the top-level `<SkipLink
    />` would otherwise point at nothing on the other 20+ routes, the fix
    needs a landmark for those too.
  - `OnboardingShell.jsx:27-29`: give the existing `<main>` wrapping
    `<Outlet />` `id="main-content" tabIndex={-1}` — one wrapper already
    exists here, so this is a one-line change covering `/goal`, `/quiz/
    result`, `/auth/login`, `/pay` in one place.
  - The remaining pages routed directly in `App.jsx` (`Landing`, `Pricing`,
    `Legal`, `About`, `Changelog`, `Support`, `CategoryLanding`, `NewTools`,
    `SearchTools`, `ExampleStack`, `SharedStack`, `PublicCompare`, `Office`)
    have no shared wrapper to patch once — each would need its own outermost
    element given the id. That's 13 one-line edits (add `id="main-content"
    tabIndex={-1}` to each page's existing root `<div>` or equivalent), not
    a new abstraction — introducing a wrapping layout route for pages this
    varied in structure (one owns a WebGL canvas, others are plain content)
    is exactly the kind of premature abstraction this repo's own style rules
    warn against for a one-line-per-file fix.
  - **What this would NOT include** (kept out to bound the diff): no
    redesign of any page's header/nav markup; no new shared header
    component (that's a separate, much larger refactor this gap doesn't
    require); no focus-management changes beyond the skip link itself (no
    route-change focus reset — that's a different WCAG criterion and a
    separate gap if it's ever found missing); no change to `AppShell.jsx`'s
    existing behavior, only extracting its skip link into a shared
    component.
- **Build size:** S — one new 8-line component (`SkipLink.jsx`, a verbatim
  extraction), one mount point in `App.jsx`, one attribute change in
  `OnboardingShell.jsx`, and one `id`/`tabIndex` attribute added to each of
  13 existing page roots. No backend, no new dependency, no new route, no
  visual change for a mouse user (the link is `sr-only` until focused,
  identical to the one AppShell already ships).
- **Found:** 2026-09-13 15:07 UTC

---

### "Live Tool Comparison" promises integration comparisons — Compare.jsx has none
- **Status:** SHIPPED (this run, sha in DEVLOG) — built exactly as scoped
  below: `Compare.jsx` and `PublicCompare.jsx` each import `resourcesFor` and
  add one `Integrations` row, rendering `r.summary` when present (e.g.
  claude/chatgpt have no `summary`, so they show `20+ verified`/`6+ verified`
  via the names-length fallback; zapier/make show their `summary` string) or
  `—` for the 693 slugs with no verified data — the same honest-absence
  convention already used by every other row. All three checks green,
  `npm run smoke` confirms both `/app/compare?tools=chatgpt,claude` and
  `/compare/chatgpt,claude` render the new row with 0 console errors.
- **Seen in:** not a competitor pattern — a marketing-copy-vs-reality audit of
  `src/components/sections/FeaturesSection.jsx`, the same file/method that
  produced several other gaps in this backlog (the pattern this run followed:
  every promise in `src/components/sections/` checked against the actual page
  it describes). Capterra/G2-style comparison tables are the competitor
  reference the already-shipped "Side-by-side tool comparison" gap above cited
  for the feature itself; this entry is about one specific column of that
  table that was promised but never built.
- **Gap:** `FeaturesSection.jsx:8` lists a tile named "Live Tool Comparison"
  with the copy "Side-by-side capability, pricing, and **integration**
  comparisons kept current." Read `src/pages/app/Compare.jsx` and its public
  fork `src/pages/PublicCompare.jsx` in full: both build their table from a
  hardcoded `rows`/`ROWS` array (`Compare.jsx:60-69`, `PublicCompare.jsx:10-18`)
  of exactly eight fields — Category, Price, Level, Developer, Since,
  Audience, Status, Tags (`Compare.jsx` adds a ninth, Fit, only when a quiz is
  on file) — and neither imports `resourcesFor` or anything from
  `src/data/toolResources.js`. Grepped `integration` across both files: zero
  hits. Yet the data the promise describes already exists and is already
  verified: `toolResources.js` (added this month, `VERIFIED = '2026-09-13'`)
  carries real, sourced integration lists for 10 catalog slugs — including
  `zapier`, `make`, and `n8n`, three tools that are exactly the kind of
  interchangeable automation platforms someone would open Compare specifically
  to weigh against each other on this axis — and is already rendered on
  `ToolDetail.jsx` via `ToolResources.jsx`'s "WORKS WITH" section. The data
  exists, is verified, and is wired into one page; the page the promise
  actually names has never read it.
- **Why it matters:** this is the same one-sided-promise shape this file keeps
  finding (a feature tile claims three things, one is missing), except here
  the missing third isn't even a build gap — the exact dataset the copy
  promises was shipped weeks after the promise was written and nobody
  connected the two. A visitor who opens Compare specifically to decide
  between Zapier, Make and n8n — the highest-intent moment this feature
  exists for — gets Category/Price/Level/Developer/Since/Audience/Status/Tags
  and nothing about what each one actually connects to, despite Toolnaut
  having already done and sourced that research.
- **Smallest useful version (what to actually build):**
  - `Compare.jsx`: import `resourcesFor` from `../../data/toolResources` and
    add one row to the `rows` array (same shape as every other row, no new
    rendering path): `{ label: 'Integrations', get: (t) => { const r =
    resourcesFor(t.slug)?.integrations; return r ? (r.summary || `${r.names.length}+
    verified`) : '—' }}`. Tools with no verified data show `—`, the same
    honest-absence convention `Developer`/`Since`/`Audience` already use in
    this exact table (`Compare.jsx:64-66`) — never a fabricated "not
    available" claim or an empty cell.
  - `PublicCompare.jsx`: the identical row, added to `ROWS`
    (`PublicCompare.jsx:10-18`), importing `resourcesFor` from
    `../data/toolResources` (one directory shallower than `Compare.jsx`'s
    import path). Both tables must move together — they're deliberately
    described in this file's own header comment as "same table-building
    logic" (`PublicCompare.jsx:7`), and a shared row array extracted from
    both would be the correct long-term fix but is a larger refactor than
    this gap needs; a duplicated one-line addition matches the duplication
    that already exists between these two files today.
  - A tool's exact integration list is intentionally not spelled out in the
    comparison cell — a 30-name list (`otter-ai` has 32) would blow out a
    table cell width the other seven rows all keep to one line. The count/
    summary is the compare-table-appropriate signal; anyone who wants the
    full sourced list already has it one click away on `ToolDetail.jsx`,
    which every tool name in the comparison table already links to.
  - **What this would NOT include** (kept out to bound the diff): no
    backfilling integration data for the 694 catalog slugs `toolResources.js`
    doesn't cover yet — that's the ongoing, separately-paced research effort
    the file's own `REVIEW_DUE` comment already describes, not something to
    rush for this row; no linking the count itself to an anchor on
    `ToolDetail.jsx`'s integrations section (the existing tool-name link
    already goes to that page); no changing `ToolResources.jsx` or
    `toolResources.js` at all — this is a read-only consumer of data that
    already exists in the exact shape it's needed.
- **Build size:** S — one new row (~3 lines) in each of two existing files,
  reusing an already-exported function (`resourcesFor`) and an already-
  established honest-absence pattern (`—`) from the same table. No backend,
  no new dependency, no new route, no schema change.
- **Found:** 2026-09-14 03:20 UTC

---

### "Weekly Fresh Finds" promises role-matching — Discover's new-tools rail is domain-blind
- **Status:** SHIPPED 6552af5
- **Seen in:** another marketing-copy-vs-reality audit of
  `src/components/sections/FeaturesSection.jsx` (same method that produced the
  Live Tool Comparison entry directly above — every tile's copy checked
  against the page it describes). The competitor pattern being claimed is
  real: There's An AI For That and Futurepedia both frame their "new tools"
  surfaces as filtered to a visitor's stated interests/category, not a flat
  firehose — that's the entire pitch of a role-aware discovery product versus
  a plain changelog.
- **Gap:** `FeaturesSection.jsx:11` sells "Weekly Fresh Finds" as "New tools
  matched to your evolving role, delivered in one scannable digest." The
  in-app surface this describes is `Discover.jsx`'s "🆕 New this week" strip.
  Its data comes from `freshTools = useMemo(() => getNewTools(7).filter((t)
  => !isCatalogNoise(t)).slice(0, 8), [])` (`Discover.jsx:156`) — an empty
  dependency array. `getNewTools()` (`src/utils/newTools.js:15-19`) filters
  the full 704-tool catalog by `discoveredAt` age and sorts by recency only;
  it takes no domain/category/persona argument and has none to take. The
  result: every visitor, regardless of role, sees the exact same eight tools
  in the exact same order — a designer and a data engineer looking at
  Discover in the same hour get an identical strip. This is not a hypothetical
  miss: `answers` (the completed quiz's `{ domain, role, ... }`, `domain` one
  of the 6 galaxy categories: code/design/writing/data/automation/learning)
  is already loaded in this exact component (`Discover.jsx:59`) and already
  drives the main grid's ranking two lines below (`matchScore(tool, answers)`
  at `Discover.jsx:126`, `tieBreak = byProminence(answers?.domain)` at
  `Discover.jsx:117`) — the signal the promise needs is sitting unused four
  lines from the code that would need it.
- **Why it matters:** this is the same "one feature tile, one broken promise"
  shape the Live Tool Comparison entry above found in the tile right next to
  it, on the same audit pass. Fresh Finds is the one strip a returning user
  is most likely to actually scan (it's above the fold, right under the
  search box), and "matched to your evolving role" is the specific hook that
  differentiates it from a plain "recently added" list — which is exactly
  what it currently is. A marketer opens Discover and the "new" rail is just
  as likely to be five coding-agent CLIs as anything in their own domain.
- **Smallest useful version (what to actually build):**
  - `Discover.jsx`: change `freshTools`'s memo to depend on `answers?.domain`
    and, when it's set, stably sort the (already recency-ordered) candidate
    list so same-domain tools come first, keeping `.slice(0, 8)`:
    `const candidates = getNewTools(7).filter((t) => !isCatalogNoise(t))` then
    `answers?.domain ? [...candidates].sort((a, b) => (a.category ===
    answers.domain ? 0 : 1) - (b.category === answers.domain ? 0 : 1)) :
    candidates`. `Array.prototype.sort` is spec-stable, so within each group
    (matching / not matching) the existing recency order is preserved — this
    is a pure reorder, not a new ranking function, and mirrors the
    `tieBreak`/`byProminence` comparator idiom already used two lines above
    in this same file.
  - Heading honesty: only claim personalization when it's real. Compute
    `hasDomainMatch = answers?.domain && candidates.some((t) => t.category
    === answers.domain)` and swap the strip's fixed "🆕 New this week"
    (`Discover.jsx:191`) for `` 🆕 New in ${CATEGORY_META[answers.domain].name} ``
    only when `hasDomainMatch` is true (a week where nothing new landed in the
    visitor's own domain keeps today's generic heading, never a false
    personalized label) — same rule the Fresh Finds visit-history entry above
    already applies to its own heading swap, and the Explorers/leaderboard
    honest-absence convention this whole file keeps citing.
  - **What this would NOT include** (kept out to bound the diff): no change
    to `getNewTools()` or `newTools.js` — filtering stays a pure
    recency/age function, the reordering happens at the one call site that
    has persona context; no change to the separate public `/new` feed
    (unauthenticated, no persona to match against — same exclusion the
    visit-history entry above already carries); no combining with that
    entry's visit-history window logic in the same pass — that changes *how
    many days* count as fresh, this changes *which of those* sort first, and
    reviewing both diffs together is easier than shipping them tangled into
    one change to the same `useMemo`; no new persona-affinity scoring beyond
    the exact-domain-match boolean this table already carries via `category`.
- **Build size:** S — one `useMemo` dependency/sort change and one
  conditional heading string in `Discover.jsx`, reusing fields (`category`,
  `answers.domain`) and a comparator idiom already live in the same file. No
  backend, no new dependency, no new route, no schema change.
- **Found:** 2026-09-14 06:10 UTC

---

### The Founder offer's "plan preselected" checkout link doesn't preselect anything — the exact bug that was already found and fixed once, in the one place nobody checked it survived

- **Status:** SHIPPED 680b76062d0862214bd056c638555b630acf4e76 — verified
  2026-09-16 12:07 UTC: this run re-read `src/pages/Pay.jsx` end to end
  before doing anything else with this entry and found the fix already
  live, committed the same day (2026-09-16 00:13:42 UTC) as
  `fix(pay): make the founder-offer checkout link actually preselect
  Founder`, one file, exactly as this entry scoped it — `requestedPlan`
  read via `useLocation()` at `Pay.jsx:63`, `chosen` initialized from it
  with the same fallback-to-`guru` logic at `Pay.jsx:64-65`, and a
  `preselected` flag at `Pay.jsx:140` gating a "★ YOUR PICK" badge
  (`Pay.jsx:161`) that only renders when `requestedPlan` was actually
  present, matching the "no badge on a plain `/pay` visit" constraint this
  entry called for. The backlog was never updated when that commit shipped,
  so this entry sat OPEN describing an already-closed gap — corrected here
  so a future feature run doesn't spend a day rebuilding it from scratch.
- **Seen in:** not a competitor pattern — a self-audit that started from
  `planData.js:194-198`'s own comment ("when the ribbon expired,
  `/pay?plan=founder` simply kept selling") and `FounderOffer.jsx:120-122`'s
  ("This used to point at `/goal`, so the founder price could not actually
  be paid — the offer was a poster. It now goes to the paywall with the plan
  preselected."). That second comment is itself the record of a real,
  already-fixed bug — the exact same shape as this file's "no credit card"
  and "free public beta" audits, just inside the checkout flow instead of
  marketing copy. Read the destination the fix promises against what it
  actually does.
- **Gap:** `FounderOffer.jsx:141` and `FounderRibbon.jsx:87` (the sitewide
  countdown strip for the ₹29,999 lifetime offer — the single highest-value,
  most time-pressured CTA on the site, "Ends in `Clock`" ticking down to
  `FOUNDER_DEADLINE`) both link to `/pay?plan=founder`. Read `src/pages/
  Pay.jsx` in full: it never reads the URL at all. Grepped the file for
  `useLocation`, `window.location`, `URLSearchParams`, `useSearchParams`,
  and `get('plan')` — zero hits on every one. The `chosen` state that
  actually drives selection is hardcoded `useState('guru')` (`Pay.jsx:53`) —
  it always starts on Pro, never Founder — and the only thing that sets it
  afterward is `pay(planId)` (`Pay.jsx:73`), called exclusively from
  clicking one of the four plan buttons rendered on the page
  (`Pay.jsx:126-155`). Nothing in the render reads `chosen` for a visual
  highlight either — it only distinguishes cards via `p.featured` (always
  Pro, `planData.js:105`) and, mid-checkout, `busy && chosen === p.id ?
  'Opening…' : ...` (`Pay.jsx:150`). A visitor who clicks "CLAIM FOUNDER
  PRICE →" from a countdown ribbon lands on a page with four unlabelled,
  unhighlighted plan cards (`PLANS.filter(isPlanOpen...)` includes Founder
  since `Pay.jsx`'s filter checks `isPlanOpen`, not `hiddenFromPricing` —
  confirmed by reading `Pay.jsx:52-56` against `planData.js:205-212`) and
  has to find and click Founder themselves, same as if they had arrived from
  any other link on the site. The one concession is ordering: `PLANS` is
  declared founder-first (`planData.js:19`), so Founder happens to render as
  the first card in the grid — but that is true regardless of which link
  brought the visitor here, so it is not what "preselected" describes, and
  gives no visual signal that arriving via the ribbon did anything at all.
- **Why it matters:** this is the offer the product cares most about
  converting — one payment, ₹29,999, framed everywhere else with real
  urgency (a live countdown clock, a sitewide ribbon, its own landing
  section) — and the one link built specifically to carry that urgency
  through to checkout silently drops it. Someone who clicks a ticking clock
  expecting the next screen to already know what they want, and instead
  lands on an unranked four-card picker identical to the generic `/pricing →
  /goal` path, has to re-decide under the same time pressure the ribbon just
  created — exactly the kind of friction a time-limited offer's own checkout
  link exists to remove. It is also a second instance of the precise defect
  this codebase already paid down once (`FounderOffer.jsx`'s own comment
  names the earlier bug — a link that looked wired but did not preselect
  anything, because it pointed at `/goal`); the fix moved the destination to
  `/pay?plan=founder` but never verified the query string itself does
  anything there, so the same failure mode reopened one file over.
- **Smallest useful version (what to actually build):**
  - `Pay.jsx`: add `useLocation` (already the pattern `useNavigate` on the
    next line uses from `react-router-dom`) and read the `plan` param:
    `const requestedPlan = new URLSearchParams(useLocation().search).get('plan')`.
  - Initialize `chosen` from it instead of the hardcoded literal:
    `useState(() => plans.some((p) => p.id === requestedPlan) ? requestedPlan
    : 'guru')` — falls back to today's exact default when the param is
    absent, unknown, or names a plan that's closed/excluded for this visitor
    (`plans` already carries that filtering, so this reuses it rather than
    re-checking `isPlanOpen` a second time).
  - Give the preselected card an actual visual signal, since `chosen`
    currently only surfaces during the `busy` "Opening…" state: add a ring/
    border treatment (e.g. an extra `ring-2` class keyed to `p.accent`, or a
    small "YOUR PICK" tape-label reusing the same `tape-label`/badge pattern
    `p.badge` already renders two lines above it) when `chosen === p.id` and
    `requestedPlan` was actually present — so a plain `/pay` visit (no
    param) never grows a badge nothing asked for.
  - **What this would NOT include** (kept out to bound the diff): no change
    to `startCheckout`, `pay()`, or anything past the click — this is
    read-only URL parsing plus a class name, nothing touches a charge; no
    scroll-into-view or auto-opening Razorpay's modal on load (a payment
    sheet appearing before someone has looked at the page is the "before
    first result" bad-upgrade-moment this codebase's own
    `capabilityMatrix.js:BAD_UPGRADE_MOMENTS` already warns against, just
    applied at the wrong end — auto-charging on arrival is worse, not
    better); no touching `FounderRibbon.jsx`/`FounderOffer.jsx`'s existing
    links, which are already correct — the bug is entirely on the receiving
    end.
- **Build size:** S — one URL read, one `useState` initializer change, one
  conditional class/badge in `Pay.jsx`. No backend, no new dependency, no
  new route, no schema change, no touch to any payment-verification code
  path. Verifiable with `npm run smoke` (renders `/pay?plan=founder` and
  `/pay` with no console error) since this repo has no component-level test
  harness for page UI.
- **Found:** 2026-09-15 03:20 UTC

---

### The galaxy promises to let you "meet the tools" — 704 of them render, zero are reachable
- **Status:** SHIPPED 86c7066 — built exactly as scoped below: `galaxyState`
  gained a `hoveredTool` field written by `ToolStars`' existing per-frame hit
  test, `GalaxyExplorer` added a click-vs-drag distance check (6px) on
  pointer up and navigates to `/search?q=<name>` on a clean tap, plus a
  pointer cursor while a star is hovered. Scoped to explore mode only, as
  planned — the ambient landing-page galaxy stays click-inert. Verified live
  in a real browser (not just the route-render smoke test): hover shows the
  pointer cursor, a tap on a star lands on `/search?q=...` with that tool's
  name pre-filled, a drag still orbits the camera without navigating.
- **Seen in:** not a competitor pattern — the promise is the feature's own UI
  copy, not marketing copy. `GalaxyExplorer.jsx:146-148`'s persistent
  on-screen label reads "Drag to orbit · Scroll to zoom · Zoom in to **meet
  the tools**," and `ToolStars.jsx:8` (the component's own top-of-file
  comment) states "The galaxy hosts ALL 704 catalog tools as star sprites."
  Contrast with the directories this file studies elsewhere: Futurepedia's
  and There's An AI For That's homepage tool grids are the click target
  itself — every visible tile is a link to more information, zero extra taps
  beyond the one that already shows you the tool.
- **Gap:** Read `ToolStars.jsx` in full. Every one of the 704 `TOOLS` becomes
  a sprite (`ToolStars.jsx:148-204`), and a per-frame screen-space hit test
  (`ToolStars.jsx:225-269`) finds whichever star sits nearest the pointer and
  writes its name into `#tool-tooltip` (`ToolStars.jsx:272-278`, the
  `pointer-events-none` div `Landing.jsx:223-228` mounts). That is the entire
  payoff: a floating text label with the tool's bare name, nothing else —
  no category, no price, no blurb, no link. Grepped `ToolStars.jsx` for
  `onClick|navigate|Link|href` — zero hits; the file has no click handling
  of any kind, only the hover-distance test. `GalaxyExplorer.jsx` (the
  full-screen "Explore the galaxy" mode, `Landing.jsx:250-256`) is worse: its
  `surface` div (`GalaxyExplorer.jsx:124`) captures every `pointerdown`/
  `pointermove`/`pointerup` for camera-orbit dragging (`GalaxyExplorer.jsx:59-
  90`) and has no click branch either — so the one mode whose own on-screen
  copy explicitly promises "meet the tools" is the mode where a would-be
  click is consumed entirely by the orbit-drag layer. A visitor can zoom in
  as close as the copy invites, read a name floating in space, and has no
  next action — not even the un-gated `/search?q=` page one file away
  (`SearchTools.jsx`, explicitly public and crawlable per its own top
  comment: "no session required... answers the single most obvious thing a
  first-time visitor expects") is reachable from here. The feature that puts
  the entire catalog on screen at once is the one place in the app that
  cannot answer "what is this."
- **Why it matters:** this is the highest-visibility real estate on the
  site — the literal first thing rendered behind the hero, and the thing
  the "Explore the galaxy" button and its on-screen copy spend a dedicated
  full-screen mode selling — and it dead-ends on a name. A visitor curious
  enough to zoom toward a specific star has already shown more intent than
  one idly scrolling past `FeaturesSection`, and gets nothing back for it:
  no path to `/search?q=<name>` (already public, already built,
  `SearchTools.jsx`), no path into the quiz, nothing. Every other
  "see the value before you commit" gap this file has found and fixed —
  public compare, public search, share links — was about giving a
  signed-out visitor a next step; this is the one surface that visually
  promises exactly that step and doesn't wire it up.
- **Smallest useful version (what to actually build):**
  - Scope this to `GalaxyExplorer`'s explore mode only, not the ambient
    landing-page galaxy — explore mode is the one with the "meet the tools"
    copy and the one where a visitor has deliberately opted in to
    inspecting stars up close; the ambient background behind the hero is
    decorative chrome sitting under scrollable page content and should stay
    click-inert, the same way it is today.
  - `ToolStars.jsx` already computes `hovered.current` (the index of the
    nearest star within `HOVER_PX`) every frame — nothing new to calculate,
    just something to act on. Lift it from a private ref to a tiny exported
    accessor (e.g. a module-level `let hoveredToolIndex = -1` the frame loop
    already writes, mirroring the plain-object pattern `galaxyStore.js`
    already uses for `explore`/`zoom`/`rotX`/`rotY`) so `GalaxyExplorer.jsx`
    can read it without prop-drilling through the R3F tree.
  - `GalaxyExplorer.jsx`'s existing `onDown`/`onMove`/`onUp` handlers
    already track pointer position for orbit-dragging — add a moved-distance
    accumulator (reset on `onDown`, summed in `onMove`) and in `onUp`, only
    when `galaxyState.explore` and total movement stays under a small
    threshold (e.g. 6px, the standard "was this a click or a drag" cutoff)
    and `hoveredToolIndex >= 0`, call `navigate` to
    `/search?q=${encodeURIComponent(items[hoveredToolIndex].tool.name)}` —
    reusing `SearchTools.jsx`'s existing public, unauthenticated `?q=` match
    rather than building any new lookup or destination page.
  - Swap `surface`'s cursor from the current constant `cursor-grab` to a
    conditional `cursor-pointer` while `hoveredToolIndex >= 0`, so there is
    a visible affordance that a star is now a target before the click lands.
  - **What this would NOT include** (kept out to bound the diff): no
    click-through on the ambient (non-explore) landing galaxy — that surface
    stays exactly as inert as it is today; no new destination page or
    "quick peek" card — routing to the existing public `/search?q=` results
    page is the entire scope, it already renders category/price/blurb for
    the matched tool; no touch/tap handling beyond what `GalaxyExplorer`'s
    existing pointer-event handlers already receive (they are pointer
    events, not mouse-only, so this should carry over to touch for free, but
    verifying that is part of the build, not assumed here); no change to
    `ToolStars.jsx`'s hover-tooltip behavior itself, only exposing the index
    it already tracks.
- **Build size:** S/M — one exported accessor in `ToolStars.jsx` (or a new
  tiny shared module next to `galaxyStore.js`), a click-vs-drag distinction
  plus one `navigate()` call and one cursor class added to
  `GalaxyExplorer.jsx`. No backend, no new dependency, no new route (reuses
  `/search`), no schema change.
- **Found:** 2026-09-15 09:09 UTC

---

### "Track progress against your role, not generic benchmarks" — no benchmark of either kind exists
- **Status:** OPEN
- **Seen in:** not a competitor pattern — the promise is the marketing copy's
  own claim, checked against the app. `HowItWorksSection.jsx:9`'s "Master"
  step (the fourth of the four steps every visitor sees on the landing page
  before ever taking the quiz) reads: "Track progress against your role, not
  generic benchmarks. Stay ahead as the field moves." `AudienceSection.jsx`
  was read alongside it (same unaudited-sections note this backlog left at
  line ~1942) but its two cards are aspirational scene-setting ("walk into
  interviews with a working stack") with no discrete feature claim to check —
  this entry only covers the checkable one.
- **Gap:** Grepped the whole of `src/` for `against your role|generic
  benchmark|peer|percentile|role-based|expected mastery` — the phrase exists
  in exactly one place, `HowItWorksSection.jsx:9` itself. There is no
  generic benchmark to contrast against, and no role-specific one either.
  `progressStore.js` (`STATUSES = ['Not started', 'Exploring', 'Using
  weekly', 'Mastered']`) stores one flat 4-state index per tool name,
  identical in shape for every user regardless of role, and is read by
  exactly two consumers: `Stack.jsx`'s per-card status pill
  (`Stack.jsx:324`) and `SkillGraph.jsx`, which averages that index into a
  bar per **domain** (`code`/`design`/`writing`/`data`/`automation`/
  `learning` — `skillCoverage.js`'s six fixed categories), not per role.
  Domain and role are different axes: `personaGenerator.js` already computes
  a role-specific 3-tool starter stack (`persona.stack`, filtered and sorted
  by `prominence.js`'s `starterScore` — `personaGenerator.js:100-102`) and a
  readable role label (`career`, e.g. "Mid-level Developer",
  `personaGenerator.js:117`), but nothing on `Stack.jsx` ever measures the
  user's `progress` against `persona.stack` specifically — the page renders
  `persona.stack` tools inside the same undifferentiated `allStackTools`
  grid as everything added from Discover (`Stack.jsx:232-236`). A user has
  no way to see "how am I doing against what a [role] is expected to have,"
  which is exactly what the copy promises and what the "not generic
  benchmarks" phrasing implies exists somewhere as a contrast.
- **Why it matters:** This is the fourth of four steps sold on the landing
  page as the payoff for finishing the other three — the moment a returning
  user is told progress means something tied to their identity, not a
  one-size bar. Right now `SkillGraph`'s bars are the same six domain labels
  for a student and a founder alike; nothing on `/app/stack` ever surfaces
  the word "role" next to the word "progress." A prospective user who reads
  the landing page and later opens their dashboard finds a page that never
  makes the comparison it was promised would happen.
- **Smallest useful version (what to actually build):** the role-specific
  benchmark already exists as data (`persona.stack`) — this is a display
  gap, not a data-modeling one.
  - Add one derived stat to `Stack.jsx`: of `persona.stack` (the 3 tools
    chosen specifically for this user's role/experience/goal combo), how
    many are at `STATUSES[3]` ("Mastered") in `progress`. Render as "2 of 3
    core [career] tools mastered" near the existing streak/progress-ring
    header (`Stack.jsx` top section, next to the `ProgressRing` component
    already defined at the top of the file) — reuse `persona.career` for the
    label, falling back to `persona.category.name` when `career` is null
    (quiz answers that skipped role/stage).
  - Visually distinguish the 3 `persona.stack` cards from added-from-Discover
    cards in `allStackTools` with a small "core" tag — the `starter: true`
    flag `Stack.jsx:233` already attaches to them exists for exactly this
    but is currently unused for anything but internal filtering (checked:
    grepped `.starter` in `Stack.jsx`, only read at line 233's own map, never
    rendered).
  - No new state, no new localStorage key — `persona.stack` and `progress`
    are both already loaded on this page every render.
  - **What this would NOT include** (deliberately out of scope for a first
    cut): no cross-user peer comparison or percentile (would need a backend
    this static SPA doesn't have — the same reason the leaderboard gap
    elsewhere in this file stayed "precondition not flipped"), no per-role
    "expected mastery timeline," no change to `SkillGraph`'s existing
    domain view (it stays as a separate, complementary breakdown), no
    rewording of the marketing copy as an alternative fix — the copy is a
    reasonable promise, it just has nothing behind it yet.
- **Build size:** S — one derived value and one small stat line in
  `Stack.jsx`, one conditional "core" tag on cards already carrying the
  `starter` flag. No new route, no new file, no schema change, no backend.
- **Found:** 2026-09-15 12:05 UTC
- **Re-verified 2026-10-07 15:04 UTC:** longest-untouched OPEN entry by
  last-check date (23 days since found, never deepened or re-verified —
  staler than any other OPEN entry's own last-check timestamp, checked
  against all of them this run). `HowItWorksSection.jsx:9` still carries the
  exact copy verbatim. `progressStore.js:10`'s `STATUSES` array is still
  `['Not started', 'Exploring', 'Using weekly', 'Mastered']`, index 3 is
  still Mastered. `personaGenerator.js:117` still sets `career` the same
  way. One real piece of drift: the "core" tag half of the plan has already
  shipped under different wording — `Stack.jsx`'s kit-grid card
  (`Stack.jsx:368`) now renders `tool.starter ? <span>From your persona</span>
  : <button>Remove</button>`, so starter-stack tools are already visually
  distinguished from added-from-Discover ones (confirmed this wasn't here
  when the entry was found: `git log -S "From your persona" --
  src/pages/app/Stack.jsx` shows only one squashed release commit, no
  dedicated feature commit, so it's pre-existing drift the 09-15 pass
  missed rather than something built since). The actual deliverable — a
  derived "N of 3 core [role] tools mastered" stat near the header — is
  still entirely unbuilt: grepped `Stack.jsx` for `core.*master|mastered`,
  zero hits. Narrowed scope for whoever builds this: skip the "core" tag
  step above, it's done; only the stat line itself remains. Still Build
  size S, still the most build-ready entry nobody has shipped.

---

### Discover only ever ranks toward the mainstream — no "hidden gem" / serendipity path exists
- **Status:** BUILT, UNMERGED — PR #91 (2026-10-04, sha `e422182` on branch
  `bot/claude/discover-hidden-gems-rail-2026-10-04`) already implements this
  in full: `isFlagship()` added to `prominence.js`, a new `hiddenGems` rail
  in `Discover.jsx` rotating a daily 6-tool slice of active, non-flagship,
  non-noise tools, 3 new tests in `test/prominence.test.mjs`, all three
  checks green. Not merged — see issue #67. **Do not rebuild this** — it
  needs a human to merge #91, not more agent code. Re-verified 2026-10-04
  21:04 UTC: gap still real on current `master` (PR unmerged), fix still
  sitting in PR form only, joining #89/#86/#75 as the fourth tracked
  BUILT-UNMERGED entry.
- **Seen in:** ToolFinder (toolfinder.com/tools — 1,452-tool directory) is the
  one competitor from this file's own suggested-study list
  (There's An AI For That, Futurepedia, ToolFinder, Product Hunt AI, G2/
  Capterra) never actually checked here before now (grepped this file for
  "ToolFinder": zero hits pre-this-entry). Fetched it directly: filters,
  sort, an "Alternatives" page pattern and a "Deals" section all already
  match gaps already OPEN or REJECTED in this backlog, but a separate open-
  source clone under the same name (github.com/ayeshh899-creator/Toolfinder,
  a personalised-recommendation/roadmap/comparison app with the same shape as
  Toolnaut itself) documents a "Hidden Gems" discovery mode with a "Surprise
  Me" action — explicitly framed as surfacing "high-leverage tools built by
  focused indie developers," i.e. the opposite bias from a normal ranked
  list.
- **Gap:** Every ranking path in `src/pages/app/Discover.jsx` pulls toward
  recognisability, never away from it. `byProminence()` and `starterScore()`
  (`src/utils/prominence.js:37-48,88-96`) score a `FLAGSHIP` name (Claude
  Code, Figma, ChatGPT, Zapier, etc. — `prominence.js:24-31`) up to +20 and
  use it as the primary sort key once match score ties; `Discover.jsx:130-137`
  sorts by match score then that same tieBreak for every `sort=` value
  except `newest`/`name`. The two existing discovery rails reinforce the same
  bias from different angles: `freshTools` (`Discover.jsx:159-165`) is
  recency-scoped to 7 days, `recentlyViewed` (`Discover.jsx:172-175`) replays
  the user's own click history — neither one is capable of surfacing an
  active, real, unglamorous tool that's simply never been near the top of a
  ranked list. `Stack.jsx`'s `toolOfTheDay()` (`Stack.jsx:25-34`) comes
  closest to a daily-rotation mechanic but explicitly restricts its
  candidate pool to `.slice(0, 12)` of the user's own top match-score
  results — it rotates among the mainstream picks, it doesn't escape them.
  Grepped `src/` for `random|surprise|shuffle|serendip|hidden gem` — the only
  hits are animation jitter (`ParticleField.jsx`, `cursorEffects.js`,
  `Galaxy.jsx`) and one `Math.random()` in `AppErrorBoundary.jsx`, nothing
  discovery-facing.
- **Why it matters:** with 700+ tools and a ranking system that always
  surfaces the same handful of flagships first (by design — `starterScore`'s
  own comment says a first-time user "reads five names they've never heard
  of and concludes the recommendations are noise," which is the right call
  for the *default* view), there is no second path for the opposite kind of
  user: someone who already knows Figma and Cursor and wants the catalog's
  actual long tail. Right now that requires manually clicking through every
  filter combination — the 700-tool catalog's breadth is Toolnaut's real
  differentiator over a 50-tool curated list, and nothing in the product
  currently sells it.
- **Smallest useful version (what to actually build):**
  - `prominence.js`: export one new pure function, `isFlagship(t)` — `t.name`
    tested against the union of all `FLAGSHIP` domain arrays (a `Set` built
    once at module scope, same pattern the file already uses for `REPO_SLUG`/
    `FORUM_POST`/`LINK_LIST` regexes). No change to `starterScore` or
    `byProminence` — both stay exactly as they are for the ranked views.
  - `Discover.jsx`: one new `useMemo`, `hiddenGems`, filtering
    `TOOLS.filter(t => !isCatalogNoise(t) && t.status === 'Active' &&
    !isFlagship(t))`, then a deterministic daily rotation through that pool
    using the exact `Math.floor(Date.now() / 86400000)` pattern
    `toolOfTheDay()` already establishes — same tool for every visitor all
    day, a new slice tomorrow, no per-user state and nothing to persist.
    Slice to 6, matching `recentlyViewed`'s rail size.
  - One new rail section, placed after `recentlyViewed`
    (`Discover.jsx:247-260`ish), reusing the identical sticker-card markup
    those two rails already share (`Discover.jsx:233-245`) — same
    `w-40 shrink-0` card, same `arcade-heading lime compact` name, same
    blurb line-clamp — headed `💎 Hidden gems` with one line of subcopy
    ("real tools, way off the beaten path"). No new visual language to
    design.
  - **What this would NOT include** (kept out to bound the diff): no
    "Surprise Me" button that jumps elsewhere (ToolFinder's version
    navigates to a single random tool page — a rail the user can ignore or
    scroll is lower-risk for a first cut and reuses this page's existing
    rail pattern instead of adding a new interaction); no popularity-based
    weighting (that's the separate, still-OPEN GitHub-stars/HN-points gap);
    no dedicated `/hidden-gems` route; no exclusion of tools already in the
    user's stack (unlike `toolOfTheDay`, browsing your own catalog is the
    point here, not converting a specific pick).
- **Build size:** S — one small pure function reusing exports already in
  `prominence.js`, one `useMemo` and one rail block in `Discover.jsx` copied
  from a pattern already in the same file twice. No new route, no new state,
  no backend.
- **Found:** 2026-09-15 21:06 UTC

---

### The Uncertain-status badge reaches every tool card except the one on the page you actually use it from
- **Status:** SHIPPED c60fd8d — built exactly as scoped below: `Stack.jsx`'s
  kit-grid card now reuses `ToolCard.jsx`'s badge markup, gated on
  `tool.status && tool.status !== 'Active'`, placed under the tool name in
  the card header. No change to `ToolCard.jsx`, `ToolDetail.jsx`,
  `Compare.jsx`, or `progressStore.js`. Verified live with Pi (a real
  Uncertain-status catalog tool) added to a guest stack: badge renders with
  the catalog note as its hover title. All three checks green before push.
- **Seen in:** not a competitor pattern — a self-audit that started from
  re-reading the already-SHIPPED "Tool status warning has no reason attached"
  entry above (`ef59a93`, deepened 2026-09-01) to check whether its own
  09-01 deepening note — "closes the gap on `Favorites.jsx` for free... which
  the original plan never covered" — still accounts for every place a stack
  tool actually renders today. It doesn't: that deepening reasoned from
  "every page that uses `<ToolCard>`", which was the right question in
  September but stopped being the complete list once `Stack.jsx`'s own kit
  grid diverged from it.
- **Gap:** Three places render `tool.status !== 'Active'` today —
  `ToolCard.jsx:69-77` (a hot-pink `UNCERTAIN`-style pill, badge row shared by
  `Discover.jsx` and `Favorites.jsx`), `ToolDetail.jsx:123-129` (the same pill
  plus the note underneath), and `Compare.jsx`'s Status row (note appended in
  parentheses). `Stack.jsx` imports `ToolCard` too (`Stack.jsx:19`) — but only
  uses it once, at `Stack.jsx:208-217`, for the "start with a name you know"
  suggestion rail of tools *not yet* in the stack. The actual "⚡ your kit"
  grid — the tools the user already added, iterated at
  `Stack.jsx:323` (`allStackTools.map`) and rendered as a hand-built
  `<motion.article className="sticker ...">` card (`Stack.jsx:326-360`ish:
  title, blurb, a `ProgressRing`, the status-cycle button, a remove button) —
  has no inline JSX for `tool.status` or `tool.note` anywhere in that block.
  Confirmed by grepping `Stack.jsx` for `status\b|\.note\b`: the only
  `status` hits are the unrelated `STATUSES`/`statusIdx` progress-cycling
  constants imported from `progressStore.js`, zero references to
  `tool.status` or `tool.note`. A tool can carry `status: "Uncertain"` and a
  `note` explaining why (52 of 704 catalog entries do, e.g. Pi: "Core team
  moved to Microsoft (2024); app in maintenance") and a user who already
  added it to their stack — the one page (`/app/stack`) they open to track
  progress on tools they committed to — sees no signal at all, even though
  the exact same tool shows a pill on `/app/discover`, `/app/favorites`,
  `/app/tools/<slug>` and `/app/compare`.
  `personaGenerator.js`'s starter picks can add non-Active tools to a fresh
  persona's stack too (it deprioritizes but doesn't exclude them per the
  original entry's own finding), so this isn't limited to tools a user
  manually re-added after a status changed underneath them — a first-run
  stack can already contain one, silently.
- **Why it matters:** this is the one screen where the badge matters most
  and the one screen it's missing from. Discover and Favorites are browsing
  surfaces — a user deciding whether to add something benefits from the
  warning, but can also just click through to the detail page first.
  `/app/stack` is a commitment surface: someone already added the tool,
  is actively cycling its progress status ("Started" → "Using" → …), and has
  no reason to revisit `/app/tools/<slug>` for a tool they're not evaluating
  anymore. If that tool's status degrades to Uncertain after it was added —
  or was Uncertain from the start via a starter pick — the one place they'd
  actually see it and reconsider never tells them.
- **Smallest useful version (what to actually build):**
  - `Stack.jsx`'s kit-grid card (inside the `allStackTools.map` block, next to
    the existing title/`ProgressRing` row): reuse `ToolCard.jsx:69-77`'s exact
    badge markup and style object (hot-pink pill, `border: 2px solid #000`,
    `title={tool.note || tool.status}` for the hover reason) gated on
    `tool.status && tool.status !== 'Active'` — same condition, same visual
    language, no new style invented.
  - Placement: small enough to sit beside the tool name in the card's header
    row (`Stack.jsx`'s `<div className="flex items-start justify-between
    gap-3">` wrapper that already holds the title and the `ProgressRing`) —
    matches how `ToolCard.jsx` puts its badge row opposite the source-category
    chip, so the pattern (badge lives in the top row, description below) stays
    consistent across every card type in the app.
  - **What this would NOT include** (kept out to bound the diff): no change
    to `ToolCard.jsx`, `ToolDetail.jsx`, `Compare.jsx`, or `progressStore.js`
    — all four already do the right thing; no backfilled notes for the 5
    Uncertain tools missing one (same rule the original entry set: render
    what exists, don't invent editorial content); no auto-removal or
    re-ranking of Uncertain tools already in a stack — flagging, not judging,
    is this gap's whole job, same restraint the original entry applied to
    Discover/Compare.
- **Build size:** S — one reused badge block added to one existing card in
  `Stack.jsx`. No new store, no new util, no new route, no backend, no new
  dependency. Verifiable with `npm run smoke` (renders `/app/stack` clean)
  since this repo has no component-level test harness for page UI.
- **Found:** 2026-09-16 00:20 UTC

---

### Sharing a stack link produces zero personalized preview — the growth loop is silently dead on every platform it's pasted into
- **Status:** OPEN
- **Seen in:** not a competitor feature so much as standard practice for any
  product whose growth depends on shared links looking good unopened: Wordle's
  per-day result grid, Spotify Wrapped's per-user cards, GitHub's per-repo
  social preview, and Notion's public pages all bake a correct, content-
  specific `og:title`/`og:image` into the actual HTTP response a crawler
  receives — because none of the real preview scrapers (Twitterbot, Slackbot,
  Discordbot, facebookexternalhit, WhatsApp, iMessage's LinkPresentation,
  LinkedInBot, TelegramBot) execute JavaScript. They fetch the raw HTML once
  and read whatever `<meta>` tags are already in it.
- **Gap:** Toolnaut already ships "Share / export your stack"
  (`src/utils/shareStack.js`, `src/pages/SharedStack.jsx` — this backlog's own
  first-ever entry, SHIPPED `42bdc994`) and its landing page,
  `SharedStack.jsx:26-44` (drifted from `:21-41` — the page grew to 124 lines
  with an `adoptAndGo()` helper added below the `useHead` call), does call
  `useHead()` with a real per-stack title and description built from the
  decoded tool names. But `useHead` (`src/utils/head.js:54-89`, drifted from
  `:52-90`) sets those tags with a `useEffect`, which only runs after React
  mounts and hydrates in a browser — it never touches `og:image`/
  `twitter:image` at all (grepped `head.js` for both: zero hits; every
  route, prerendered or not, keeps the one static pair set in
  `index.html:21,29`, unchanged), and more fundamentally it never reaches a
  non-JS crawler in the first place. `scripts/prerender.mjs`'s `ROUTES` array
  (`prerender.mjs:42-60`, drifted from `:43-60`) is the only mechanism in this codebase that bakes
  `useHead()` output into a static file a crawler actually receives, and
  `SharedStack.jsx`'s own top comment (`:20-24`) already says why `/s/:slug`
  isn't on it: the content is keyed off an unbounded `:slugs` param, not one
  of a fixed dozen paths a build script can enumerate. `vercel.json`'s
  catch-all rewrite (`"/((?!api/).*)": "/_shell.html"`) sends every non-`/api`
  request, crawler or human, to the same unrendered SPA shell — so a bot
  hitting `/s/<slug>` gets `index.html`'s title ("Toolnaut — Your AI Stack,
  Personalized") and the generic `/og.png`, never the tools the link is
  actually about. The comment at `SharedStack.jsx:22-24` calling this "the
  pasted-link preview" fix is the one premise in that file that doesn't hold —
  `useHead` fixes the tab title for a human who already clicked, not the
  preview card generated before anyone clicks.
- **Why it matters:** the entire point of a share feature is the moment
  before the click — a friend or teammate deciding whether a pasted link is
  worth opening. Today every one of those moments shows the same generic
  homepage card regardless of which 3 or 8 tools are actually in the stack,
  which is the one thing that would make a recipient curious. For a
  personalization-first product, a share link that looks identical for every
  user is a missed loop, not a working one — and unlike most gaps in this
  file, it isn't a missing feature so much as an already-shipped one quietly
  not doing its job for the audience (crawlers) it was aimed at.
- **Smallest useful version (what to actually build):** a Vercel Edge
  Middleware (`middleware.js` at repo root, `export const config = { matcher:
  '/s/:slug*' }`) that inspects the request's `User-Agent` against a short
  known-bot regex (`bot|facebookexternalhit|Twitterbot|Slackbot|Discordbot|
  WhatsApp|TelegramBot|LinkedInBot`) and, only for a match, returns a small
  static HTML response built from `decodeStackSlugs()` and `getTool()`
  (`src/utils/shareStack.js`, `src/utils/toolsCatalog.js:763` — both pure,
  no DOM/localStorage access, already edge-runtime-safe) instead of letting
  the request fall through to `_shell.html`: real `<title>`, `og:title`,
  `og:description` built the same way `SharedStack.jsx:28-30` already
  composes them, and `og:image` left pointing at the existing static
  `/og.png` for v1 — every non-bot request (i.e. every human) is unaffected
  and still gets the real SPA. This needs no new route, no change to
  `vercel.json`'s rewrite (Edge Middleware runs before it), no new dependency.
- **What this would NOT include** (kept out to bound the diff): no per-stack
  *generated* image (`@vercel/og` compositing tool names/icons onto a canvas)
  — real title + description text is what every listed reference product
  actually leans on for the preview card body, a custom image is a
  separately-shippable v2, not a blocker for v1; no middleware coverage for
  any other route — `/`, `/tools/*`, `/pricing` etc. are already correctly
  prerendered per `scripts/prerender.mjs`'s `ROUTES`, this gap is specific to
  the one route family that can't be (unbounded, per-link content).
- **Build size:** M — one new `middleware.js`, reusing two already-pure
  utils. No backend, no database, no new dependency; the main cost is care
  around Edge Runtime constraints (no Node built-ins) and manual verification
  since headless Chromium in `npm run smoke` doesn't send a bot UA, so this
  needs a manual `curl -A "Slackbot"` check against a preview deploy before
  it can be marked SHIPPED.
- **Found:** 2026-09-16 03:20 UTC
- **Re-verified 2026-10-09 12:04 UTC (fifty-first pass, second sweep):** this
  was the stalest-by-last-check OPEN entry (23 days, by a wide margin over
  the next entry at 2026-09-16 09:10) once every OPEN entry's actual last
  dated note — not just its `Found:` line — was recomputed. Core gap holds
  completely: no `middleware.js` at the repo root, `head.js` still sets only
  `og:title`/`og:description`/`og:url`/`twitter:title`/`twitter:description`
  (never `og:image`/`twitter:image`), `vercel.json`'s catch-all rewrite to
  `/_shell.html` is unchanged, and `prerender.mjs`'s `ROUTES` array still has
  no entry for `/s/:slug`. Three line-citation drifts fixed inline above;
  `toolsCatalog.js:763`'s `getTool` citation and `index.html:21,29`'s
  og/twitter-image citations were both still exact. One technical premise
  double-checked rather than assumed: that Edge Middleware runs before
  `vercel.json`'s rewrites, which a fresh search of Vercel's current docs
  reaffirmed (a Vercel Academy routing-order page lists the sequence as
  headers → redirects → middleware → rewrites → route handler). Also
  confirmed Next.js 16's `middleware.ts` → `proxy.ts` rename (surfaced by
  that same search) doesn't apply here — Toolnaut is a Vite SPA, not
  Next.js, so a plain Vercel Edge Middleware file at `middleware.js` is
  still the right shape, not a deprecated API. Still OPEN, still Build
  size M, nothing in the plan needs to change.

### The Spend Audit shipped fully working this morning — every page that tells a visitor what Pro buys still says it doesn't exist
- **Status:** SHIPPED b7f87af — built exactly as scoped below: `capabilityMatrix.js`
  gained the one new `Spend audit` row (free = health score + total spend,
  pro/team = full cancel list, all three marked `live`), `planData.js` added
  `live('Spend audit — find and cancel overlapping subscriptions')` to
  Student's features and a `['Spend audit', true, true, true]` COMPARISON
  row, and `FeaturesSection.jsx` got a 7th homepage card. No changes to
  `Audit.jsx`, `stackAudit.js`, entitlement logic, or the unrelated
  Team-only "Quarterly stack audits" row, all as planned. 3 files, 12 lines.
- **Seen in:** not a missing competitor feature — the opposite shape. Rocket
  Money (formerly Truebill) built its entire growth loop around this exact
  pitch: find subscriptions that do the same job and show what to cancel,
  quantified in the visitor's own currency before they ever sign up — and it
  is the headline line on their homepage, App Store listing and pricing page,
  never something a user has to already be inside the app to discover.
  Enterprise SaaS-spend tools (Vendr, Zylo, Productiv) sell "duplicate
  spend / shadow IT" the same way. The comparison matters here because
  Toolnaut just built the Rocket-Money-shaped feature and then told nobody.
- **Gap:** `src/pages/app/Audit.jsx` (308 lines), `src/utils/stackAudit.js`
  (276 lines) and `src/state/auditStore.js` shipped today in commit
  `e3b8a3b` ("spend audit: find the subscriptions that do the same job, and
  what to cancel") — a real, wired-up feature: routed at `App.jsx:135`, in
  the app nav as "Spend" (`AppShell.jsx:30`, `AuditIcon` in `icons.jsx:61`).
  It works exactly as a directory competitor would want it to: a user types
  in what they pay per tool, `stackAudit.js` finds overlapping tools by
  category/capability, and `Audit.jsx:122` gates the actual cancel list
  (`locked = paymentsOn && !ent.loading && !ent.unknown && ent.configured &&
  !ent.active`) behind any active paid entitlement — the health score and
  total monthly spend stay free (`Audit.jsx:213-232`), matching exactly the
  "headline free, cancel-list paid" split this backlog's own honesty-fixed
  `capabilityMatrix.js` (commit `c04149e`) is supposed to represent. Except
  it doesn't: grepping `FeaturesSection.jsx`, `PricingSection.jsx`,
  `capabilityMatrix.js`, `planData.js` and `Pricing.jsx` for
  `audit|spend|cancel|duplicate|overlap` turns up nothing that describes this
  feature. `capabilityMatrix.js`'s `CAPABILITIES` array (`:30-79`) lists 8
  rows and every single `pro:` cell across all 8 is `status: 'planned'` — as
  of this morning that stopped being true (the cancel list is real and live
  for anyone with an active plan) and nothing was updated to say so.
  `planData.js` makes it worse, not just silent: the Pro tier's `features`
  list (`:108-118`) has zero mention of it, and the Team tier instead carries
  `planned('Quarterly AI stack audit reports')` (`:152`) plus a matching
  `['Quarterly stack audits', false, false, 'planned']` comparison row
  (`:174`) — a *different*, genuinely-still-unbuilt concept (a scheduled
  recurring report, Team-only) that reads close enough to the real feature's
  name to make a future pass assume "stack audits: already tracked as
  planned" and never look closer. The real audit isn't quarterly, isn't
  scheduled, and isn't Team-gated — `ent.active` unlocks it for Student too,
  since `useEntitlement.js` returns one plan-agnostic `active` boolean, not a
  tier. `FeaturesSection.jsx`'s homepage "Capabilities" grid (`:5-12`, the
  6 cards every visitor sees first) is silent on it too.
- **Why it matters:** this is the inverse of every other gap in this file —
  not a promise with nothing behind it, but a real, already-shipped thing
  with no promise pointing at it. It also happens to be the single best
  candidate this product has for making Pro feel worth ₹799: today a visitor
  reading the Pro card sees three `planned()` (not-real) features and zero
  live ones of its own beyond the saved-tools limit lift, while the one
  capability that would quantify savings in their own currency before they
  buy — exactly the Rocket Money pitch — sits one click away in the app,
  unmentioned anywhere they'd see it before signing up. A visitor who never
  opens the "Spend" nav item by accident will never learn this plan does
  something a discovery directory's competitors don't.
- **Smallest useful version (what to actually build):**
  - `capabilityMatrix.js`: add one new capability row, e.g. `{ capability:
    'Spend audit', free: { text: 'Health score and total monthly spend',
    status: 'live' }, pro: { text: 'Full cancel list — what to drop, what to
    keep', status: 'live' }, team: { text: 'Full cancel list — what to drop,
    what to keep', status: 'live' } }` — the first genuinely `live` Pro/Team
    row in the whole matrix, which is itself worth surfacing honestly.
  - `planData.js`: add `live('Spend audit — find and cancel overlapping
    subscriptions')` to Student's `features` (`:84-93`, cascades to Pro/Team
    via their existing "Everything in X, plus:" copy) and add one
    `COMPARISON` row, `['Spend audit', true, true, true]`, near the existing
    (unrelated) `'Quarterly stack audits'` row at `:174` — leave that row
    exactly as is, since the scheduled-report feature it names genuinely
    isn't built yet.
  - `FeaturesSection.jsx`: add a 7th card to `FEATURES` (`:5-12`) — e.g.
    `{ name: 'Spend audit', text: "See which tools double up, what to cancel,
    and what a free tool already covers.", icon: … }` — reusing the existing
    `sticker`/`Tilt` card shape, no new component.
- **What this would NOT include** (kept out to bound the diff): no changes to
  `Audit.jsx`, `stackAudit.js` or the entitlement logic — the feature itself
  already works and is out of scope; no touching the Team-tier "Quarterly AI
  stack audit reports" lines, which name a real, still-unbuilt, different
  feature; no new marketing section or hero copy — three data-array edits and
  one card addition is the whole diff.
- **Build size:** S — three data-only files (`capabilityMatrix.js`,
  `planData.js`, `FeaturesSection.jsx`), no new component, no new route, no
  dependency.
- **Found:** 2026-09-16 06:07 UTC

---

### The public search page's own placeholder promises task search — the matcher still only knows literal word stems, not the tools that actually answer the task
- **Status:** OPEN
- **Seen in:** competitor research this run into There's An AI For That's
  core differentiator (task-first discovery — a visitor describes what they
  need in their own words, e.g. "I need an AI that transcribes meetings," and
  the platform surfaces matches, rather than requiring a category pick first)
  confirmed this is the thing directories are expected to get right, then
  Toolnaut's own `/search` was checked against it directly, since the page's
  intro copy already claims to do exactly this: `SearchTools.jsx:73` reads
  "Search by name, category, or the problem you're trying to solve." That
  copy is not new marketing — `src/utils/search.js:5-8`'s own comment says
  the word-order-independent matching it ships today ("video editor" must
  match "video" and "editor" in either order) was built specifically because
  `SearchTools.jsx`'s copy invites problem-shaped queries and the earlier
  single-phrase substring check silently failed on them. That fix solved
  word *order*; it did not solve word *form*.
- **Gap:** `matchesQuery()` (`src/utils/search.js:9-16`) still requires every
  query word to appear as an exact literal substring somewhere in
  `[name, blurb, sourceCategory, dev, tags].join(' ')`. Verified live against
  the real catalog (`node` against `src/utils/toolsCatalog.js`, this run):
  the query "transcribe meetings" — as plainly a "problem you're trying to
  solve" as the page's own placeholder example — returns **zero** results on
  `/search`, and a visitor lands on the "No tools match" empty state
  (`SearchTools.jsx:84-98`). The catalog is not actually short on answers:
  grepping tags/blurbs turns up at least 11 directly relevant tools —
  `Otter.ai` (tags `automation,notes,meeting,transcription`, blurb "Live
  meeting transcription and AI notes"), `Notta`, `Gladia`
  ("Real-time transcription API for meetings/calls"), `Fireflies.ai`,
  `Fathom`, `Circleback`, `Grain`, `Granola`, `Avoma`, `tl;dv`,
  `Zoom AI Companion` — every one tagged `meeting`, several also tagged
  `transcription`. Two independent mismatches both fire on this one query:
  the plural "meetings" is never a literal substring of the singular tag
  "meeting" it should match, and "transcribe" is never a literal substring
  of "transcription" (different suffix, not a prefix/suffix relationship
  `.includes()` can bridge). Neither is the multi-word-order bug the prior
  fix already closed — both survive today's matcher untouched.
- **Why it matters:** this isn't a hypothetical edge case, it's the exact
  query shape the page's own placeholder text (`"Try \"video editor\",
  \"Anthropic\" or \"healthcare\""`) and intro copy invite, and the query
  shape that makes a directory's search meaningfully different from
  Ctrl-F. A visitor who types the actual problem in plain English — the
  behavior the copy explicitly promises works — gets told the catalog has
  nothing, immediately, on a public, no-login, first-impression page, when
  the opposite is true. Every other public-page gap already logged in this
  file (`/tools/:domain`, `/new`, `/alternatives/:slug`) answers a
  pre-shaped question; `/search` is the one page that specifically claims to
  answer an open-ended one, so this is where that claim being false costs
  the most trust.
- **Smallest useful version (what to actually build):** extend
  `matchesQuery()`/its haystack construction in `src/utils/search.js` with a
  bounded stem/prefix match, not a full stemmer or an LLM call: tokenize the
  haystack into individual words (it is already lowercased) and, for any
  query word of length ≥ 5, treat it as matching a haystack token when they
  share the same leading 5 characters (`"trans" ⊂ "transcribe"` and
  `"trans" ⊂ "transcription"`; `"meeti"` for "meeting"/"meetings"), in
  addition to (not replacing) the existing exact-substring check so short or
  already-exact queries ("notion", "gpt") are completely unaffected. Ship it
  behind the same single exported `matchesQuery(tool, q)` both `Discover.jsx`
  and `SearchTools.jsx` already call, so the two stay identical the way the
  prior fix already established. Add unit-style coverage in whatever the
  radar/util test pattern nearest to string-matching code uses (or a small
  new `test/search.test.mjs` if none exists) asserting at minimum: "video
  editor" still matches in either order, "transcribe meetings" now matches
  Otter.ai/Notta/etc., and a short unrelated word like "app" does not start
  matching everything (length floor is what prevents that).
- **What this would NOT include** (kept out to bound the diff): no real
  stemming library (Porter/Snowball) or dependency addition — a fixed
  leading-character-count heuristic is cheap, dependency-free, and closes
  the two concrete failures found without new attack surface on a public,
  unauthenticated endpoint; no LLM/semantic search (the `api/chat.js`
  pattern this codebase already uses for the goal chat is grounded to
  classify into ≤6 fixed keys per call and rate-limited accordingly — reusing
  it to rank free text against 700+ catalog entries is a materially larger,
  separately-shippable feature, not this fix); no change to `Discover.jsx`
  or its filter UI beyond the shared `matchesQuery` it already imports; no
  synonym dictionary (transcribe→transcription is caught by the shared-
  prefix heuristic above, not by hand-maintained word pairs that would need
  upkeep as the catalog grows).
- **Build size:** S — one function in `src/utils/search.js`, no new route, no
  new component, no dependency, one new or extended test file.
- **Found:** 2026-09-16 09:10 UTC

### No way to flag a wrong listing — the catalog has a "suggest a new tool" gap already logged, but no "this one is wrong" path at all
- **Status:** SHIPPED 3a7a173 — built together with "Suggest a tool" above,
  near-zero marginal diff as planned. `buildReportIssueUrl({ slug, name,
  note })` added as a second export in the same `src/utils/suggestTool.js`,
  `labels=tool-report`. A small plain-text "Something wrong here?" link
  (not another `nb-btn`, exactly as scoped) added on `ToolDetail.jsx` below
  the "Visit website" button and the equivalent spot on the public
  `ToolPublic.jsx`. Verified live against a built `preview` server: both
  links' `href` resolve to a correctly-encoded GitHub issue URL with the
  tool's slug/name and `tool-report` label. No moderation queue, no report
  reason dropdown, no change to the `tool.status` badge — all out of scope
  as planned. All three checks green (315 tests, build, 24/24 smoke
  routes), pushed directly to `master`.
- **Seen in:** review/listing directories that let outsiders touch their data
  all ship a correction path distinct from new-entry submission — G2 runs a
  standing "How do I update the software I use?" flow plus live support chat
  on every product page (help.g2.com) specifically for outdated vendor
  info, separate from adding a new product. The gap is sharper for an
  AI-tool directory than for G2: this run's competitor check on Futurepedia
  and similar catalogs turned up an active 2026 criticism that AI-tool
  directories specifically go stale fast because vendor pricing and
  features change faster than any editor can track — exactly the failure
  mode a public "report this" link exists to catch before a visitor is the
  one who discovers it.
- **Gap:** Toolnaut has exactly one catalog-correction signal today —
  `radar`'s own automated status/note field, shown read-only via the pink
  badge at `ToolDetail.jsx:123-130` (`tool.status !== 'Active'`) — and zero
  user-facing way to say "this is wrong." Grepped `report|incorrect|flag`
  (tool-related) across `src/pages/app/ToolDetail.jsx` and
  `src/pages/ToolPublic.jsx`: zero hits in both. A visitor who notices a
  dead pricing link, a tool that shut down before radar caught it, or a
  wrong category has no lower-friction option than emailing
  `CONTACT_EMAIL` cold with no context about which tool or field, if they
  even find `/support`. This is the mirror image of the already-logged
  "Suggest a tool" gap above (empty catalog → user has nothing to add) but
  for the opposite direction (existing entry → user has already noticed it's
  wrong) and neither today's code nor that gap's plan covers it — that
  entry's `buildSuggestToolUrl()` util is scoped to catalog-empty submissions
  only, no `slug`/existing-tool argument.
- **Why it matters:** it's the same free, no-backend, top-of-funnel signal
  capture the Suggest-a-tool gap already argues for, but pointed at data
  quality instead of catalog breadth — and a stale/wrong listing is worse
  for trust than a missing one, because the visitor acted on it (clicked
  "Visit website," compared pricing) before finding out it was wrong. Every
  tool detail page — the exact place a visitor is close enough to notice
  something's off — currently offers no way to say so.
- **Smallest useful version (what to actually build):** extend, not
  duplicate, the Suggest-a-tool gap's planned util:
  - Add a second export to the same planned `src/utils/suggestTool.js` —
    `buildReportIssueUrl({ slug, name, note })` → a GitHub `issues/new` URL
    built the same way (`URLSearchParams`, `title` pre-filled with the tool
    name, structured `body` with slug + note field, `labels=tool-report`) so
    both flows share one pure, testable module and one `GITHUB_REPO_URL`
    constant instead of two competing ones.
  - One small, low-emphasis link on `ToolDetail.jsx` (near the existing
    "Visit website" button at `ToolDetail.jsx:151-163`, styled as plain text
    not another `nb-btn`, so it doesn't compete with the primary CTAs) and
    the equivalent spot on the public `ToolPublic.jsx` (`:74-88`, same
    button row): "Something wrong here?" opening
    `window.open(buildReportIssueUrl({ slug: tool.slug, name: tool.name }), '_blank', 'noopener')`.
    No modal, no textarea in-app for v1 — the GitHub issue form is where the
    actual note gets typed, same division of labor the Suggest-a-tool gap
    already establishes.
  - **What this would NOT include** (kept out to bound the diff): no
    moderation queue or in-app report history (GitHub issues are the queue,
    same as Suggest-a-tool); no automatic action on the catalog record from a
    report (a human triages, same as radar's own status field is
    human/LLM-set today, never user-set); no separate report reason
    dropdown (name + optional note is enough for a GitHub issue a human
    reads, and keeps this a v1-sized diff); no change to the existing
    `tool.status` badge or its display logic.
- **Build size:** S — two small link additions (`ToolDetail.jsx`,
  `ToolPublic.jsx`), one added export in a util file the Suggest-a-tool gap
  is already planning to create (build together if both land in the same
  run — same `GITHUB_REPO_URL` constant, same file, near-zero marginal
  diff). No backend, no new dependency, no new route.
- **Found:** 2026-09-16 21:15 UTC

---

### No browsable gallery of shared stacks — sharing is a stateless one-off URL, nobody can see what other users built
- **Status:** OPEN
- **Seen in:** template/showcase galleries for share-a-config products —
  Notion's public template gallery, Framer's site gallery, "awesome-list"
  style curated collections — the standard next step once a product has a
  single-item share link: let visitors browse what other real users made,
  not just receive a link one person handed them directly.
- **Gap:** Toolnaut already built the share primitive (the "Share / export
  your stack" gap above, SHIPPED 42bdc99) but it stops at a stateless URL.
  `src/utils/shareStack.js` is purely `encodeStackSlugs`/`decodeStackSlugs` —
  a comma-joined list of tool slugs baked into the URL itself; nothing is
  ever written to storage when a stack is shared. `src/pages/SharedStack.jsx`
  reads the stack straight back out of the URL param — there is no lookup
  against any stored or published record. `grep -rn "shared_stacks\|public_stacks\|from('stack" src`
  returns zero hits — no Supabase table for a published stack exists, even
  though a live Supabase backend already backs signed-in sync (per
  `src/pages/Legal.jsx:78-82`, "we also store on our servers: ... the tools
  in your stack" — this is not the backend-free case the ranking note below
  usually rejects). `src/App.jsx` only routes the single `/s/:slugs` pattern,
  keyed by whatever slugs are in that one URL — there is no `/gallery` route
  and no index of past shares anywhere. The only public/social surface today
  is `src/state/communityStore.js` (forum threads with upvotes), which stores
  free-text posts, not a structured tool-stack object, so Community can't
  stand in for this.
- **Why it matters:** every stack a visitor can currently see is either their
  own or one link someone handed them directly — there is no way to browse
  what real users with a given role actually assembled ("a designer's
  stack," "a founder's stack"), which is exactly the social-proof/inspiration
  loop that turns a one-time quiz-taker into a repeat visitor, and it is free
  top-of-funnel content a `/gallery/:role` page could rank for, reusing
  `CategoryLanding.jsx`'s SEO/JSON-LD pattern.
- **Smallest useful version (what to actually build):**
  - One new Supabase table (`shared_stacks`: owner id or null for a guest
    share, tool slugs, an optional role/persona tag inferred from
    `quiz.answers.domain`, `created_at`, an opt-in `visible` flag) — the
    smallest schema addition, since the sync backend and its client already
    exist (`src/state/sync.js`, `entitlement.js`) and this follows the same
    shape.
  - A `publishStack()`/`listPublishedStacks(role)` pair, colocated with the
    existing share util rather than a new store module.
  - `src/pages/app/Stack.jsx`: one opt-in "Publish to gallery" toggle next
    to the existing share action — off by default, so nothing already-shared
    silently becomes public.
  - New public route `/gallery` (optionally `/gallery/:role`) rendering a
    card grid in `CategoryLanding.jsx`'s style, each card linking through to
    the existing `SharedStack.jsx` adopt-this-stack view — no new adopt flow
    needed, the receiving half already ships.
  - **What this would NOT include** (kept out to bound the diff): no
    likes/comments on a published stack (Community already owns discussion);
    no editing a published stack after the fact (unpublish and republish is
    enough for v1); no sitemap entries for individual published stacks
    (user-generated and mutable, same reasoning `SharedStack.jsx` already
    uses to stay out of `scripts/prerender.mjs`'s `ROUTES`) — only the
    role-level `/gallery` index pages, if any, would be sitemapped.
- **Build size:** M — one new Supabase table plus RLS policy, one store
  module, one new public page/route, one opt-in toggle in `Stack.jsx`. Larger
  than this file's usual S gaps because it is the first entry here that
  needs a schema change rather than reusing existing local state, so it is a
  reasonable feature-run candidate but not a trivial one.
- **Found:** 2026-09-17 03:20 UTC
- **Deepened 2026-10-07 00:10 UTC:** re-checked against current master — the
  gap and the smallest-useful-version plan both still hold (`src/utils/shareStack.js`
  is still pure encode/decode, `grep -rn "shared_stacks\|gallery" src` still
  zero hits, no `/gallery` route in `App.jsx`). What the plan glossed over is
  the auth model it would actually need, which changes the "owner id or null
  for a guest share" detail:
  - Every RLS write policy in `supabase/migrations/` (0002, 0003, 0004, 0008)
    is scoped `to authenticated using (auth.uid() = user_id)` — there is no
    precedent anywhere in this schema for an anon-key INSERT, and every place
    the app accepts input from a signed-out visitor (newsletter alerts,
    account deletion) goes through a serverless function in `api/` using the
    service-role key instead, never a direct client-side insert. A "guest
    share" (`owner id or null`) would need either a brand-new anon INSERT
    policy (nothing else in the product does this) or a new `api/` function.
  - The second option is tighter than it looks: `api/alerts.js`'s own header
    comment notes the project was *already at Vercel Hobby's 12-function cap*
    once before and had to merge two functions into one to free a slot for
    account deletion. Counting only non-underscore-prefixed files (the actual
    routed functions, confirmed against `vercel.json`), `api/` holds exactly
    11 today — one slot free, no more.
  - Net correction: ship v1 **publish-requires-sign-in only** (no guest
    publish). This matches `tool_refs`'s existing `to authenticated using
    (auth.uid() = user_id)` pattern exactly — no new INSERT policy shape, no
    new serverless function, no spending the one free slot. The anon side
    (browsing `/gallery` itself) is still fine as a direct public SELECT:
    `0003_tool_claims.sql:77` already grants `select ... to anon,
    authenticated` on editorial data, so a `shared_stacks` table with `visible
    = true` rows readable `to anon` for the gallery read path has a real
    precedent to copy, even though the write side does not. This keeps the
    feature at Build size **S/M** (was M) and removes the one thing that
    would have surprised a builder mid-implementation.

### No "Toolnaut vs [competitor]" comparison pages — the single highest-intent SEO page type in this category, entirely missing
- **Status:** SHIPPED 83805fc — built exactly as scoped below:
  `src/content/comparisons.js` (2 hand-verified competitor entries — There's An
  AI For That, Futurepedia), `src/pages/CompareCompetitor.jsx` + `/vs/:slug`
  route in `src/App.jsx`, both paths added to `scripts/prerender.mjs`'s
  `ROUTES` and `public/sitemap.xml`. Verified in the actual `npm run build`
  output: both `/vs/theres-an-ai-for-that` and `/vs/futurepedia` prerendered
  with real text content (924 and 763 chars), and `/vs/futurepedia` added to
  `scripts/smoke.mjs`'s route list so a future regression fails CI.
- **Seen in:** this is the standard SaaS/directory SEO pattern, distinct from
  a per-tool alternatives page (already logged below as its own gap) — it
  compares the *directory itself* against its direct competitors, not one
  catalog tool against another. There's An AI For That (~47,000 tools
  indexed, task-first browsing, ~4M monthly visits, a 2.5M-subscriber
  newsletter) and Futurepedia (~5,000 tools, category-first browsing, free to
  browse) are Toolnaut's two closest direct competitors by category and are
  both far bigger by raw catalog size — which is exactly why a page arguing
  Toolnaut's *different* value (quiz-personalized stack + 4-week roadmap vs.
  a plain browsable list) is worth writing rather than trying to out-list
  them. Zoho and Ahrefs both run a full set of individually-targeted
  competitor pages collected on one hub; Webflow's vs-Squarespace page is the
  well-known example of doing it with an honest side-by-side rather than
  marketing spin.
- **Gap:** confirmed by reading every route in `src/App.jsx:100-165` and
  grepping `futurepedia|there's an ai for that|toolfinder|product hunt|vs-`
  across `src/` — the only competitor mentions anywhere are Product Hunt and
  GitHub cited as radar *data sources* (`NewTools.jsx:73`, `Methodology.jsx:80`),
  never as directories being compared against. There is no `/vs/:slug` route,
  no comparison content file, and nothing in `scripts/prerender.mjs`'s route
  list targets this. Someone searching "Toolnaut vs Futurepedia" or "AI tool
  directory alternative to There's An AI For That" — exactly the
  high-purchase-intent query this category's own competitors are ranking
  for — has literally nothing on toolnaut.xyz to land on.
- **Why it matters:** these are bottom-of-funnel searches from people already
  comparing directories, not top-of-funnel "what is an AI tool" traffic — the
  single highest-converting SEO page type available to a discovery product,
  and Toolnaut currently concedes all of it. It is also the one place
  Toolnaut can make its actual differentiation (personalized stack + guided
  roadmap, not just a bigger list) legible in a search result, which no
  existing page does — `About.jsx` and `Methodology.jsx` explain what
  Toolnaut *is* but never contrast it against what a visitor is coming from.
  Zero backend need: this is static, hand-authored comparison copy, same
  shape as the marketing routes already prerendered.
- **Smallest useful version (what to actually build):**
  - New `src/content/comparisons.js`: a small array of plain objects, one per
    competitor — `{ slug, name, blurb, catalogSize, browseModel, pricing,
    strengths, toolnautDifference }` — hand-filled with real, checkable facts
    about each competitor (catalog size, whether it's task- or
    category-first, whether personalization exists), not superlatives. This
    codebase already refuses to show an invented number anywhere
    (`StatsSection.jsx`'s "a number on a landing page is a claim" comment) —
    the same discipline applies here: no "#1", no fabricated user counts for
    either side, just a factual side-by-side a visitor can verify.
  - New `src/pages/CompareCompetitor.jsx` + route `/vs/:slug` in
    `src/App.jsx` (public, next to `/compare/:slugs` at `App.jsx:120`):
    renders the two-column comparison table plus one short paragraph on what
    Toolnaut does differently (quiz → persona → stack → roadmap), ending
    with the same quiz CTA every other marketing page uses. Reuses
    `SectionShell`/card styling from `src/components/sections/` rather than
    inventing new layout.
  - Add `/vs/:slug` for each entry in `comparisons.js` to
    `scripts/prerender.mjs`'s `ROUTES` list — this is a handful of pages
    (start with 2-3 real, named direct competitors), the exact case that
    file's own comment says the real-browser prerenderer is for, not the
    1,100-page `gen-tool-pages.mjs` string-render path. Also add each path to
    `scripts/stamp-sitemap.mjs`'s lastmod list alongside the existing
    `/tools/*` marketing routes.
  - Give each page its own `useHead()` call (`src/utils/head.js`, already
    used by 14 pages) with a title matching the exact search pattern —
    `"Toolnaut vs Futurepedia — Which AI tool directory fits you?"` — since
    that literal phrase in the `<title>` is most of the SEO value here.
  - **What this would NOT include** (kept out to bound the diff): no
    auto-generated or scraped competitor data (facts go stale silently and
    this repo's own ranking rule prefers hand-verified content); no more than
    2-3 competitor pages in the first cut — There's An AI For That and
    Futurepedia are the two closest by category, a third can follow once
    these prove out; no disparaging or unverifiable claims about the
    competitor (matches the existing "a claim that isn't checkable doesn't
    ship" pattern); no dynamic/live-updated comparison data — these are
    static marketing pages, refreshed by hand same as `About.jsx`.
- **Build size:** S — one content file, one page component, one route, two
  small additions to existing build scripts (`prerender.mjs` ROUTES,
  `stamp-sitemap.mjs`). No schema, no backend, no new dependency.
- **Found:** 2026-09-17 09:xx UTC

### No educational/how-to content — the footer's own "Resources" column links only to existing product pages, none of the guide content competitors publish to rank for non-branded queries
- **Status:** OPEN
- **Seen in:** studied fresh this run. Futurepedia pairs its tools directory
  with a dedicated guides/education layer distinct from the listings
  themselves — practical how-to guides, a newsletter, and (per its own
  positioning) a fast-growing course platform aimed at real-world AI skills,
  not just tool discovery. Its own content strategy treats each tool page and
  each of its 50+ category pages as the landing page for one specific,
  branded-or-near-branded search, then layers genuine guide content on top
  to reach the broader informational queries a plain listing can't rank for.
  That's the same split this file's own (shipped) "Alternatives" and
  "vs-competitor" gaps already exploit for bottom-of-funnel intent — guides
  are the unclaimed top-of-funnel counterpart, for someone who hasn't picked
  a product yet, or doesn't know one exists, and is searching the task
  itself ("how do I automate video editing with AI") rather than a tool
  name.
- **Gap:** confirmed by reading `scripts/prerender.mjs`'s full `ROUTES` list
  (`:42-62`, 19 entries) — every prerendered static route is a product
  surface: `/`, `/about`, `/changelog`, `/pricing`, `/methodology`,
  `/example`, `/new`, `/search`, `/support`, `/privacy`, `/terms`, the 6
  `/tools/:domain` category grids (already logged above as thin and
  underpaginated), and the 2 shipped `/vs/:slug` pages. `grep -in "guide" docs/research-backlog.md`
  and `grep -in "blog" docs/research-backlog.md` turn up only this file's own
  past comparisons to blog-shaped products (a changelog entry, an "awesome
  list" reference) — never an actual Toolnaut page. `grep -n "Learning" src/App.jsx`
  shows the only "Learning" surface is `lazy(() => import('./pages/app/Learning'))`
  mounted at `app/learning` (`App.jsx:155`) — behind `AppShell`'s sign-in
  gate, tied to a signed-in user's own roadmap progress, not public content a
  search engine can index. Most tellingly, `src/components/sections/ContactSection.jsx`
  — the site's footer — already has a column titled **"Resources"** (`:44`),
  but its four links (`:46-49`) are "How it works," "How we choose"
  (Methodology), "What's new" (Changelog), and "Open the app": existing
  product pages relabeled as resources, not content written to answer a
  search query none of those pages already answer.
- **Why it matters:** every other SEO gap already logged in this file
  (Alternatives pages, vs-competitor pages, category landing pages,
  structured data, the developer API) targets a visitor who already knows
  they want an AI tool and is comparing named options — bottom-of-funnel.
  Nothing on toolnaut.xyz targets the visitor one step earlier, who hasn't
  framed their problem as "which tool" yet. It is also compounding content
  in a way the fixed-cost vs-competitor pages aren't: a small guide library
  can cross-link into the `/tools/:domain` pages and specific tool pages
  that already exist, sending internal link equity to surfaces that
  currently have no inbound content pointing at them, and it grows
  independently of adding new competitor comparisons.
- **Smallest useful version (what to actually build):** follow the exact
  shape the (shipped) vs-competitor gap established rather than inventing a
  CMS:
  - New `src/content/guides.js`: a small array of plain objects, one per
    guide — `{ slug, title, dek, sections: [{ heading, paragraphs }],
    relatedCategory, relatedTools }` (`relatedTools` referencing real
    catalog slugs) — hand-written, matching this file's own no-invented-
    facts discipline (`StatsSection.jsx`'s rule already cited above). Start
    with 2-3 guides tied to tasks the catalog already serves well, one per
    existing `/tools/:domain` category so each guide has somewhere real to
    link.
  - New `src/pages/Guide.jsx` + route `/guides/:slug` in `src/App.jsx`
    (public, next to `/vs/:slug`), reusing `SectionShell`/card styling from
    `src/components/sections/`. Each guide ends by linking into its
    `relatedCategory`'s `/tools/:domain` page and 2-3 specific tool pages by
    slug.
  - New `src/pages/Guides.jsx` index at `/guides` listing all entries,
    linked from `ContactSection.jsx`'s existing "Resources" column so the
    footer's own label finally matches what it points to.
  - Add `/guides` and each `/guides/:slug` to `scripts/prerender.mjs`'s
    `ROUTES` and to `stamp-sitemap.mjs`'s lastmod list, exactly as the
    vs-competitor gap did.
  - Give each guide its own `useHead()` call targeting the actual long-tail
    query phrase, the same mechanism 14 other pages already use.
  - **What this would NOT include** (kept out to bound the diff): no CMS,
    no markdown loader, no admin UI — content lives in one hand-edited JS
    array like `comparisons.js`; no LLM-generated guide prose (radar's own
    enrichment is for catalog metadata, not for public-facing claims this
    file's discipline requires to be checkable by a human); no more than 2-3
    guides in the first cut, same ramp the vs-competitor gap used; no
    comments/ratings on guides (Community already owns discussion); no new
    analytics beyond the existing `useAnalytics()` page-view tracking every
    route already gets.
- **Build size:** S — one content file, two page components (index +
  detail), one route pattern, two small additions to existing build
  scripts, one footer link-column edit. Same size class as the already-
  shipped vs-competitor gap. No schema, no backend, no new dependency.
- **Found:** 2026-09-20 03:08 UTC

---

### A same-day commit shipped an undisclosed, non-consented tracking cookie that did nothing — removed; it also widens the still-OPEN GA4 consent-gate gap above
- **Status:** FIXED (this commit) — the dead code is gone; the underlying
  "GA4 fires with no consent gate" gap two entries above (Found: 2026-09-13)
  is still OPEN and now needs to cover this surface too, noted below.
- **Seen in:** not a competitor check — this run's marketing-vs-reality sweep
  (per this file's own instruction to check `src/components/sections/` and
  related code against what ships) landed on the most recent commit on
  `master`, `eb823cf` ("add comprehensive cookie system for preferences,
  analytics, and sessions"), from earlier today.
- **Gap:** that commit added `src/utils/cookies.js` and called its
  `initializeTracking()` unconditionally from `App.jsx`'s top-level
  `useEffect` — on every route, every visitor, before any consent choice,
  exactly the pattern the still-OPEN "Cookie-consent gate for GA4" entry
  (found 2026-09-13) already flags for `initAnalytics()`. `initializeTracking()`
  generated a random id and wrote it to a first-party cookie
  (`tn_session_id`, 90-day expiry via `COOKIE_EXPIRY.analytics`) on first
  visit, then called `trackPageView()`, whose entire body was
  `console.log(...)` — no request left the browser, no analytics service was
  wired to it. The `beforeunload` listener it also registered logged a
  session duration the same way. Grepped `src/` for `from '.*utils/cookies'`
  and `from '.*cookies.js'`: `App.jsx` was the only importer, and it used
  only `initializeTracking` — none of the module's other exports
  (`preferences.*`, `analytics.setUserId/setTrackingId`, `session.*` auth-
  token helpers) were referenced anywhere else in `src/`, so the rest of the
  200-line module was unreachable dead code shipped alongside the one call
  site that did fire. `Legal.jsx`'s Cookies section — the section the
  2026-09-13 entry and the "Privacy policy claimed analytics was off" entry
  both already had to correct once — says "No advertising cookies. Google
  Analytics sets its own first-party cookies... Neither is used to advertise
  to you," with no mention of a Toolnaut-set first-party session cookie at
  all, because until this commit there wasn't one.
- **Why it matters:** this is strictly worse than the gap it landed next to.
  The existing GA4 entry at least fires a script with real analytics value in
  exchange for the compliance exposure; this one added an undisclosed,
  non-consented, persistent tracking cookie to every page load for zero
  product benefit — nothing downstream ever read `tn_session_id`, and the
  page-view/duration "tracking" it powered went straight to a browser
  console no one but a visitor with devtools open would ever see. Shipping
  it live would have meant more undisclosed cookies than the privacy policy
  already had to be corrected for once this month, with no offsetting
  feature to show for it.
- **What was fixed now:** removed the `initializeTracking()` call and its
  import from `App.jsx`, and deleted `src/utils/cookies.js` — the file's sole
  live call site is gone and nothing else in `src/` referenced any of its
  other exports, so nothing else changes. `theme`/`language` preferences and
  auth continue exactly as before (through `themeStore.js`/`authStore.js`,
  which this module never touched). No behavior a visitor could notice is
  lost: the removed code never rendered anything and never sent data
  anywhere real.
- **What's still OPEN and belongs to the 2026-09-13 entry, not this one:**
  the actual fix — a consent gate before any non-essential tracking fires —
  is unchanged in scope by this cleanup: it still needs to gate
  `initAnalytics()`/GA4 exactly as already scoped there (`consentStore.js`,
  `ConsentBanner.jsx`, the `App.jsx`/`main.jsx` wiring). The one addition
  this entry makes to that plan: if first-party tracking cookies are added
  again later, they belong behind the same `loadConsent() === 'granted'`
  gate the GA4 entry already designs, not a separate unconditional call —
  worth a one-line note on that entry's banner-gating step when it's built,
  so the next tracking addition doesn't repeat this one.
- **Build size:** N/A (fix already applied — a straight deletion, no new
  code).
- **Found:** 2026-09-21 15:09 UTC

---

### No testimonial or social-proof quote exists anywhere on the site, and the one survey component built to ask users things is deliberately incapable of collecting one
- **Status:** OPEN
- **Seen in:** every directory competitor already studied in this file
  carries user quotes or reviews as a trust signal — G2/Capterra's whole
  business model is user-written reviews (cited above re: the review-count
  gap); There's An AI For That and Futurepedia both surface pull-quotes or
  ratings on listing pages; standard SaaS landing pages (Webflow, Notion)
  lead with a named customer quote near the fold. Toolnaut's own
  `HeroSection.jsx`/`FeaturesSection.jsx`/`AudienceSection.jsx` make
  confidence claims ("Built for people who can't afford to fall behind")
  with nothing beneath them from an actual user.
- **Gap:** grepped `testimonial|review quote|case stud|social proof|Trustpilot`
  (case-insensitive) across all of `src` — zero hits. `StatsSection.jsx`
  already draws a hard line on this exact category of claim: its own
  comment says "a number on a landing page is a claim, and an unavailable
  one is not a licence to make one up" — real counts (`explorerCount()`,
  `subscriberCount()`) render, and a tile that cannot be read is not shown,
  not backfilled with a placeholder. A testimonial is the same problem in
  qualitative form, and the project is pre-revenue with no confirmed
  outside users yet, so there is nothing genuine to quote today — inventing
  one would break the same discipline `StatsSection.jsx` was written to
  enforce. The one component built to ask real users anything,
  `src/components/app/StackSurvey.jsx`, is fixed-choice with **no free
  text by design**: its own comment states answers go to GA4 as an event
  and the privacy policy promises GA never receives anything a person
  types, so a text box "would break that promise." That rules out the
  obvious shortcut of just adding a text field to the existing survey —
  a real quote needs a different, non-GA storage path plus explicit
  per-response consent to display it publicly, neither of which
  `StackSurvey.jsx` was built for.
- **Why it matters:** this isn't "add a testimonials section" (that would
  mean fabricating quotes, which the codebase already treats as
  disqualifying) — it's that no *honest path to ever having one* exists
  yet. Every day without a capture mechanism is a day of real user
  reactions (people who did complete a stack, did follow the roadmap)
  going uncaptured, unlike the GA survey answers which are already being
  collected. The gap is the missing plumbing, not the missing section.
- **Smallest useful version (what to actually build):**
  - A second, separate, optional prompt — not an extension of
    `StackSurvey.jsx` — shown only to a signed-in user with sync available
    (`isSupabaseConfigured()`, same feature-detection `sync.js` already
    uses) after a real usage milestone (e.g. a stack with 3+ tools and at
    least one tool cycled to "using" — signals this is a person who
    actually engaged, not someone bouncing off the quiz).
  - One free-text field ("What would you tell a friend deciding whether to
    try Toolnaut?") plus a required, separately-worded opt-in checkbox
    ("You can show this publicly, with my first name") — unchecked by
    default, so silence never becomes a public quote.
  - Written to a new Supabase table (`quotes`: user id, text, display_name
    or null, `public_ok` boolean, `created_at`, `featured` boolean a human
    sets later) via the same RPC-gated pattern `explorerCount()`/
    `subscriberCount()` already use — never through `useAnalytics()`/GA,
    keeping the free-text data out of the analytics pipeline entirely,
    which is what actually resolves the conflict with the privacy policy
    that blocked `StackSurvey.jsx` from doing this.
  - `StatsSection.jsx`'s own rule extends naturally: a small quote-carousel
    section renders only when at least one row has `featured = true`, and
    disappears entirely otherwise — a landing page with zero real quotes
    should show none, not a stock placeholder.
  - **What this would NOT include** (kept out to bound the diff and because
    it's the whole point): no auto-publishing a submitted quote (a human
    sets `featured`, same manual-trust step radar's own status field
    uses); no star ratings or NPS score (a separate, larger feature — this
    is quote capture only); no editing after submission; no
    surfacing this on `StackSurvey.jsx` itself — it stays untouched,
    fixed-choice, GA-bound, exactly as designed.
- **Build size:** M — one new Supabase table plus RLS policy (opt-in write,
  `featured=true` rows public-readable only), one new prompt component
  gated the same way `sync.js` gates its own features, and a small
  conditional block in `StatsSection.jsx` or a new sibling section for
  display. No new dependency. Larger than a pure-frontend gap because it
  needs the schema change, same category as the shared-stacks-gallery gap
  above.
- **Found:** 2026-09-27 00:12 UTC

---

### No lookup surface outside toolnaut.xyz — every competitor pattern in this space now includes a way to check a tool without opening the directory
- **Status:** OPEN
- **Seen in:** studied fresh this run (new problem area — this file's grep
  for `extension|browser extension` before today turned up zero prior
  entries on the topic, only one unrelated mention of the dev-API gap
  naming "a Raycast extension" as a hypothetical downstream consumer of a
  public feed, never Toolnaut shipping its own lookup surface). Concretely:
  "AI Tools Explorer," a Chrome extension in active use today, adds a
  right-click "Check on AI Tools Explorer" context-menu item that looks up
  whatever tool/site you're on against its directory and opens the full
  profile — all local-storage, no account, no data collection, free
  (per its own DEV Community writeup, dev.to/aitoolsexplorer). Monica AI
  bundles the same "look this up without leaving the page" idea into its
  own browser extension, one layer up (image/video generation triggered
  from any page). The shape recurs because it solves a real moment: a
  visitor is reading about some tool on a third-party page or landing site
  and wants a fast, trustworthy second opinion, without a context switch to
  a new tab and a fresh search.
- **Gap:** confirmed Toolnaut has no lookup surface of any kind outside its
  own site — `find . -iname "manifest.json" -not -path "*/node_modules/*"`
  and `grep -rniE "manifest_version|chrome\.runtime"` across the repo both
  return zero hits, and neither `src/` nor `radar/` has a third directory
  for anything extension-shaped. This is not blocked on missing data: the
  same public, already-committed `public/tools.json` the "No public
  developer API" gap above documents in full (`slug, name, category,
  price, pricing, blurb, tags, website, status, ...`) is exactly the
  payload a lookup popup needs, and — unlike a same-origin `fetch()` from
  a third-party web page — a browser extension's own manifest
  `host_permissions` grant cross-origin access independent of the
  `Access-Control-Allow-Origin` header `vercel.json` is still missing
  today, so this gap does not need that one fixed first to be buildable
  (though both should ship the CORS header eventually, and an extension is
  exactly the kind of consumer that gap already predicted). `src/utils/
  search.js`'s `matchesQuery(tool, q)` — the same word-order-independent
  matcher `SearchTools.jsx` and `Discover.jsx` both already share — is a
  small, dependency-free pure function; an extension's popup script can
  vendor the same ~10 lines rather than reinvent search logic, keeping the
  two surfaces from silently drifting the way this file's own comment on
  `search.js` already warns against for the two in-app callers.
- **Why it matters:** every other public surface this file has logged
  (developer API, RSS feed, embeddable badge, public search) assumes the
  visitor is already on toolnaut.xyz or deliberately seeking it out. A
  lookup extension is the one surface that reaches a visitor who is
  somewhere else — reading a "best AI tools" blog post, a Product Hunt
  launch, a tool's own landing page — at the exact moment they're
  evaluating an AI tool and would benefit from Toolnaut's role-aware
  framing (is this Active/Uncertain/Discontinued per radar's own status
  field, what's the honest price, what tier does it sit at) instead of
  taking the tool's own marketing at face value. It is also a standing,
  low-maintenance growth channel: once installed, every lookup is an
  impression with no repeat marketing spend, the same "free distribution
  left on the table" argument the developer-API gap already makes for a
  different consumer.
- **Smallest useful version (what to actually build):** deliberately the
  narrowest version of this pattern, not the context-menu/auto-detect
  version competitors ship:
  - New top-level `extension/` directory (a third surface alongside
    `src/` and `radar/`, not inside either — it ships independently and
    on a different release cadence, the same reasoning that already keeps
    `radar/` out of `src/`).
  - Manifest V3, `popup` only: `manifest.json`, `popup.html`, `popup.js`,
    `popup.css`. No content script, no background service worker, no
    `host_permissions` beyond `https://toolnaut.xyz/tools.json` — the
    popup fetches the catalog on open (browser HTTP cache keeps repeat
    opens cheap) and filters client-side with a vendored copy of
    `matchesQuery()`.
  - One search box; each result row shows name, category, live/uncertain
    status badge (reusing radar's existing `status` field, same badge
    logic `ToolDetail.jsx:123-130` already renders, ported to plain
    JS/CSS since the extension can't import React), and a link to the
    real `https://toolnaut.xyz/ai-tools/:slug` page for the full profile
    — the popup is a fast triage view, not a replacement for the site.
  - **What this would NOT include** (kept out to bound the diff and match
    this file's narrowest-useful-version discipline): no context-menu
    "check this page" integration and no content-script page scanning —
    that needs `activeTab`/broader host permissions and real accuracy
    work (matching a tool's own landing page to a catalog slug reliably)
    that a v1 popup search sidesteps entirely; no Firefox/Safari builds,
    Chrome/Chromium (MV3) only for v1; no telemetry or analytics inside
    the extension (a different privacy surface than the SPA's own GA4,
    not worth the scope this run); no publishing to the Chrome Web Store
    as part of this backlog item — that is a separate account/listing
    task for a human, out of scope for an automated build; no CORS header
    change bundled in (that stays the separate, already-logged dev-API
    gap, even though both would benefit from it).
- **Build size:** M — new top-level directory and build target the repo
  doesn't have today (manifest + popup HTML/JS/CSS, no bundler needed for
  a popup this small), one vendored copy of an existing pure function, no
  backend and no schema change. Larger than a pure-`src/`-diff gap only
  because it is a new artifact type this repo has never shipped, not
  because any single file is large.
- **Found:** 2026-09-27 21:20 UTC

---

### None of the app's 7 modal overlays trap keyboard focus — Tab walks a keyboard user straight through the backdrop into the page behind it
- **Status:** SHIPPED 70ceb14 (2026-09-30) — `src/hooks/useFocusTrap.js` wired
  into all 7 surfaces exactly as scoped below. One deviation from the spec:
  the unit test targets a pure `wrapTarget()` helper extracted from the hook
  rather than mounting a real DOM fixture — this repo has no jsdom (or any
  React-component-testing infra) installed, and `test:app` only ever tests
  pure `src/utils/*` logic, so adding one for a single hook's test would have
  been a bigger diff than the hook itself. The DOM glue (querySelectorAll,
  `.focus()`) is manually verified instead: a real-browser Playwright check
  against the built app confirmed Tab wraps inside CommandPalette, never
  escapes to the page behind it, and Escape restores focus to the "Quick
  jump" trigger. DeleteAccount's dialog (the highest-stakes surface) could
  not be exercised the same way in this environment — it renders `null`
  without an authenticated Supabase session — but uses the identical
  `useFocusTrap(dialogRef, open)` wiring as the verified surfaces.
- **Seen in:** not a competitor pattern — a baseline conformance gap against
  the WAI-ARIA Authoring Practices Guide's own Dialog (Modal) pattern, which
  every serious component library (Radix `Dialog`, Headless UI `Dialog`,
  react-aria's `useDialog` + `FocusScope`) implements as table stakes: while
  a modal is open, `Tab`/`Shift+Tab` must cycle only through the modal's own
  focusable elements, never escape to the page underneath. This is a fresh
  problem area for this file — grepped `focus trap|focus-trap|trapFocus|
  keyboard trap` across `docs/research-backlog.md` before writing this up,
  zero prior hits.
- **Gap:** `grep -rln 'role="dialog"' src/` finds exactly six files —
  `InstallPrompt.jsx:78`, `DeleteAccount.jsx:140`, `CommandPalette.jsx:64`,
  `AppTour.jsx:196`, `GuestImportPrompt.jsx:71`, and `AppShell.jsx:334` (the
  mobile bottom-sheet wrapper around `ChatPanel`) — plus `GalaxyExplorer.jsx`,
  a seventh full-screen overlay that closes on `Escape` (`GalaxyExplorer.jsx:
  109`) but was never even marked `role="dialog"`. Checked every one of the
  seven for `'Tab'`/`"Tab"`/`key === 'Tab'` handling: zero hits in any of
  them. `CommandPalette.jsx` (shipped this same day, read in full while
  investigating this) is representative — its `onKey` handler
  (`CommandPalette.jsx:48-59`) handles `Escape`/`ArrowDown`/`ArrowUp`/`Enter`
  but nothing for `Tab`, so from the search input, `Tab` moves focus to the
  close button, and `Tab` again lands on whatever the *next DOM element after
  the dialog* is — the app's own sidebar/nav behind the `bg-black/70`
  backdrop the dialog itself renders to visually block it. A sighted mouse
  user never notices; a keyboard-only or screen-reader user tabbing through
  is dropped into a part of the page that looks covered but is fully
  interactive underneath. None of the seven restore focus to the triggering
  element on close either (confirmed no `document.activeElement` capture or
  `.focus()` call on any close path) — closing `CommandPalette` with `Escape`
  after opening it from the sidebar's Cmd/Ctrl+K trigger leaves focus
  wherever `Tab` last wandered, not back on the trigger, which is the other
  half of the same APG requirement.
- **Why it matters:** this is infrastructure, the same class of gap as the
  already-shipped skip-link fix above — it doesn't add a feature, it fixes a
  baseline expectation that affects every keyboard or screen-reader visitor
  on every one of these seven surfaces, several of which (`GuestImportPrompt`,
  the mobile chat sheet, `AppTour`) a new user hits within their first minute
  in `/app`. `DeleteAccount.jsx` is the highest-stakes instance: its dialog
  gates an irreversible action behind a multi-step confirmation
  (`step !== 'done'`), and a keyboard user whose focus silently leaks behind
  the backdrop mid-flow can end up interacting with the page underneath
  without any visual sign the modal lost their input. WCAG 2.1's own
  "keyboard trap" criterion (2.1.2) is usually read as "don't trap focus
  inside a widget with no way out" — modal dialogs are the documented
  exception the APG carves out precisely because *not* containing focus is
  the actual accessibility failure there.
- **Smallest useful version (what to actually build):**
  - One new `src/utils/useFocusTrap.js` hook: `useFocusTrap(containerRef,
    active)`. On `active` becoming `true`, captures
    `document.activeElement` to restore later; queries
    `containerRef.current.querySelectorAll('a[href], button:not([disabled]),
    input:not([disabled]), textarea:not([disabled]), select:not([disabled]),
    [tabindex]:not([tabindex="-1"])')` for the focusable set; adds a
    `keydown` listener that, on `Tab`, wraps `Shift+Tab` from the first
    focusable element to the last and `Tab` from the last back to the first
    (the standard two-branch wrap the APG pattern describes), letting every
    other key pass through untouched so it never fights a dialog's own
    `Escape`/arrow-key handling. On cleanup (`active` → `false` or unmount),
    restores focus to the captured element. Pure DOM + one `useEffect`, no
    new dependency — this codebase already has no focus-trap library
    installed (checked `package.json`), and the logic is small enough that
    adding one (`focus-trap-react` et al.) would be a heavier fix than
    writing the ~30 lines directly, consistent with this repo's existing
    preference for small hand-rolled utilities over new dependencies (same
    reasoning `CommandPalette.jsx` used reusing `matchesQuery()` instead of a
    command-palette library).
  - Wire it into all seven surfaces: each already has (or, for
    `GalaxyExplorer.jsx`, would gain) a container `ref` and a boolean for
    "is this open" — `useFocusTrap(dialogRef, open)` is a one-line addition
    per file, not a rewrite. `GalaxyExplorer.jsx` additionally needs
    `role="dialog"`/`aria-modal="true"` added alongside the trap, since it's
    currently missing both.
  - **What this would NOT include** (kept out to bound the diff): no new
    generic `<Modal>` component wrapping all seven — this file's own
    "Share/export" entry already noted the codebase's deliberate
    per-component dialog precedent over a shared abstraction, and a focus-
    trap hook composes onto that precedent without forcing a structural
    rewrite; no change to any dialog's visual design, animation, or existing
    `Escape`/arrow-key behavior; no focus trapping for non-modal overlays
    that don't block the page (e.g. any dropdown/tooltip that isn't in the
    `role="dialog"` list above) — scope is exactly these seven full-page
    overlays.
  - `scripts/smoke.mjs` renders routes headlessly and asserts zero console
    errors; it doesn't simulate `Tab` key sequences, so this fix needs a
    plain `node --test` unit test against the hook itself (mount a small DOM
    fixture with three focusable children, dispatch `Tab`/`Shift+Tab` events,
    assert wraparound) rather than relying on the existing smoke/build gates
    to catch a regression here.
- **Build size:** S/M — one new hook file (~30 lines) plus a one-line call
  added to seven existing components (`role="dialog"` added to one of them),
  no new dependency, no backend, no visual change.
- **Found:** 2026-09-28 21:20 UTC

---

### No OpenSearch descriptor — the site's own `/search?q=` page is invisible to every browser's built-in "add as a search engine" detector
- **Status:** SHIPPED 70ceb14 (2026-09-30) — bundled as this same run's small
  bonus improvement alongside the focus-trap feature above, built exactly as
  scoped below: `public/opensearch.xml` plus the one `<link rel="search">`
  tag in `index.html`. No suggestions endpoint, no install-prompt UI, no
  `Discover.jsx` equivalent — same exclusions as originally scoped.
- **Seen in:** this is a decades-old, still-supported browser standard (the
  `<link rel="search" type="application/opensearchdescription+xml">` tag),
  not a competitor-specific pattern — but directory sites are exactly where
  it earns its keep: Wikipedia, MDN, and most dictionary/reference sites
  ship one so a visitor who types the site's name into Chrome/Firefox/Edge's
  address bar, hits Tab, then types a query goes straight to a results page
  with zero clicks. Checked whether any AI-directory competitor in this
  file's usual set (Futurepedia, There's An AI For That) ships one —
  neither does, which makes it a genuine differentiator rather than table
  stakes to merely match.
- **Gap:** confirmed both halves are missing. `find . -iname "*opensearch*"
  -not -path "*/node_modules/*"` and `grep -rn "opensearchdescription\|rel=\"search\""
  src index.html` both return zero hits — no descriptor XML file exists under
  `public/` (which already holds the equivalent `manifest.webmanifest` for
  PWA install, same static-asset pattern this would follow) and `index.html`'s
  `<head>` has no `<link rel="search">` pointing to one. This is not a
  missing capability, only a missing few lines of glue: `src/pages/
  SearchTools.jsx` already is exactly the target this needs —public, no
  session required, reads/writes its query via `?q=` on `useSearchParams()`
  (`SearchTools.jsx:15-16,54`), so the OpenSearch template URL is already
  `https://toolnaut.xyz/search?q={searchTerms}` with no new route or page
  to build, only a descriptor file pointing at what's already there.
- **Why it matters:** every other public search/lookup surface this file has
  logged (the public search page itself, the RSS feed, the dev API, the
  browser-extension lookup gap) still requires the visitor to first navigate
  to toolnaut.xyz. An OpenSearch descriptor is the one integration that
  reaches a returning visitor who is already sitting in their own browser's
  address bar — once Chrome/Firefox auto-detects the tag on a single visit to
  `/search`, the visitor can permanently add "toolnaut.xyz" as a custom
  search-engine keyword (Chrome: Settings → Search engines → "Manage search
  engines," auto-populated; Firefox: a one-click "Add Search Engine" icon
  appears in the address bar itself) and thereafter type e.g. `toolnaut
  video editor` directly into the address bar from any tab, skipping the
  homepage and the quiz entirely. It costs nothing to maintain and, unlike
  the browser-extension gap above, needs no install flow at all — detection
  is automatic the moment a visitor's browser sees the `<link>` tag on any
  page they land on.
- **Smallest useful version (what to actually build):**
  - New static `public/opensearch.xml` (served at `/opensearch.xml`, same
    zero-build-step pattern as `public/manifest.webmanifest`): the standard
    OpenSearch 1.1 XML — `ShortName` ("Toolnaut"), `Description` ("Search
    Toolnaut's 1,000+ AI tool catalog"), one `Url` element with
    `type="text/html"` and
    `template="https://toolnaut.xyz/search?q={searchTerms}"`, and an
    `Image` pointing at the existing `favicon-32.png` (16x16/32x32, already
    committed, no new asset needed).
  - One `<link rel="search" type="application/opensearchdescription+xml"
    title="Toolnaut" href="/opensearch.xml">` tag added to `index.html`'s
    `<head>`, next to the existing `<link rel="manifest">` — static, so
    every crawler and every first page-load sees it with no JS required,
    same reasoning `head.js`'s own top comment already gives for why
    crawler-visible tags live in static HTML rather than only being set by
    a `useEffect`.
  - **What this would NOT include** (kept out to bound the diff): no
    `suggestions` endpoint (the `Url type="application/x-suggestions+json"`
    OpenSearch also supports, for live autocomplete in the address bar
    dropdown before Enter) — that needs a real JSON endpoint returning
    ranked completions, a meaningfully bigger build than a static
    descriptor; no per-browser install prompt or onboarding UI nudging
    visitors to add it (detection is the browser's own native UI, not
    something this app should duplicate); no equivalent descriptor for the
    in-app `Discover.jsx` search (that page sits behind `AppShell`'s
    session guard, not a target for an address-bar shortcut a signed-out
    browser would use).
- **Build size:** S — one new static XML file (no build step, same as
  `manifest.webmanifest`) plus one `<link>` tag in `index.html`. No backend,
  no new dependency, no new route, no change to `SearchTools.jsx` itself.
- **Found:** 2026-09-29 03:20 UTC

---

### No time/value calculator — a self-reported ROI widget, not a catalog-price one, sidesteps the exact blocker that already stopped the dollar-cost gap
- **Status:** SHIPPED 2855c9e — built exactly as scoped below: `src/utils/stackValue.js`
  (`estimateValue`, 6 new tests), `src/components/app/StackValue.jsx` rendered
  beside `StackCost` in `Stack.jsx`'s "your kit" header, gated on the stack
  being non-empty the same way `StackCost` is. Two number inputs (hours/wk
  saved, hourly value), both empty by default, persisted via `scopedStorage`
  under `exus_stack_value_v1` so they survive a reload but are never required
  or synced. Currency symbol from `region.js`'s `initialCurrency()`, no new
  detection path. Verified live in a local dev server (not just the smoke
  test) by seeding a stack and a completed quiz, typing 5 hrs/wk and $20/hr,
  and confirming "≈ $433/mo in time saved" renders and survives a reload.
- **Seen in:** studied fresh this run: "SaaS AI Tools" (a 400+ tool AI-SaaS
  directory) lists "ROI calculators for business tools" as a named feature
  alongside its enterprise filters and daily updates — distinct from a price
  aggregator, this pattern asks the visitor for their own inputs (time spent,
  hourly value) rather than trying to total up vendor list prices. Whizi and
  the pricing-aggregator sites this file's own "Stack cost estimate" gap
  already cites (`aipricingcalculators.com`, `itoolverse`) all work the other
  way — summing *catalog* dollar figures Toolnaut doesn't have — which is
  exactly why that gap is blocked (`radar/schema.js` has no `priceAmount`
  field, confirmed there and re-confirmed here). An ROI/time-value calculator
  is the one competitor-observed pattern in this family that needs no such
  field: it multiplies numbers the *visitor* supplies, not numbers the
  catalog would have to supply.
- **Gap:** confirmed absent — `grep -rniE "roi|time saved|hours saved|hourly
  rate|value calculator" src/` returns zero hits outside unrelated substring
  noise (`toolResources.js`'s device-name lists, `haptics.js`'s comment). The
  existing `StackCost.jsx` (wired into `Stack.jsx:320`) already answers "how
  many of my tools are free/freemium/paid" as counts, deliberately never a
  dollar figure, per its own header comment ("Adding those up into
  '₹4,200/month' would be inventing a number"). Nothing anywhere answers the
  next question a stack-builder actually has: "is the time I'll spend
  learning/using these tools worth it?" `quizStore.js`'s `answers` object
  (checked in full) carries no time-budget or hours-per-week field to seed
  one from either — this would be the first such input Toolnaut collects.
- **Why it matters:** it's the natural companion to the already-shipped cost
  counts on the exact same page — `Stack.jsx`'s "your kit" section
  (`Stack.jsx:312-320`) already tells a visitor what their stack costs in
  subscription-type terms; it says nothing about what it's worth. Unlike the
  blocked dollar-cost gap, this one needs no new radar field, no LLM
  enrichment change, and no backfill — every number it uses is typed in by
  the visitor at the moment they use it, so there is no fabrication risk:
  Toolnaut supplies the arithmetic, never an assumed "AI tools save you N
  hours" multiplier per tool or category (that would be exactly the kind of
  invented number the cost-estimate and catalogue-count entries in this file
  both already refuse to ship).
- **Smallest useful version (what to actually build):**
  - New pure util `src/utils/stackValue.js`: `estimateValue({ hoursSavedPerWeek,
    hourlyValue })` → `{ weeklyValue, monthlyValue }` (simple multiplication,
    monthly = weekly × ~4.33) — trivial, testable arithmetic with no currency
    logic of its own.
  - New `src/components/app/StackValue.jsx`, rendered directly beside
    `StackCost` in `Stack.jsx`'s "your kit" header row (`Stack.jsx:319-320`):
    two small number inputs (hours/week you expect these tools to save you,
    your hourly value, in your own currency) defaulting to empty — never a
    pre-filled guess — and, once both are filled, one line of output: "≈
    {symbol}{monthly}/mo in time saved, by your own estimate" with a small
    "your inputs, not ours" caption so it's legible as user-supplied math,
    not a Toolnaut claim. The ₹/$ symbol reuses `src/utils/region.js`'s
    `initialCurrency`/`fetchCountry` — the same INR-vs-USD detection
    `PricingSection.jsx:29-37` already runs — rather than a new detection
    path; since the visitor types the amount directly in their own currency,
    no conversion is needed, only the right symbol. Inputs persist locally
    (same `scopedStorage` pattern every other `src/state/*` module already
    uses) so they don't reset every visit, but are never synced or required —
    closing without filling them in changes nothing else on the page.
  - **What this would NOT include** (kept out to bound the diff): no
    per-tool or per-category default multiplier of any kind — the entire
    reason this gap is buildable where the dollar-cost one isn't is that it
    invents nothing; no combination with `StackCost`'s dollar figures (that
    stays blocked on real catalog data, unrelated to this); no historical
    tracking of value over time, no export, no sharing of the computed
    number; no application of this pattern anywhere outside `Stack.jsx` (not
    Discover, not the quiz) since a value estimate only makes sense once a
    stack exists to estimate.
- **Build size:** S — one new pure util (`stackValue.js`, trivially unit-
  testable), one small new component reusing `region.js`'s existing currency
  detection, two number inputs wired into `Stack.jsx`'s existing header row
  next to `StackCost`. No backend, no new dependency, no radar/schema change,
  no new route.
- **Found:** 2026-09-29 06:10 UTC

---

### Research check 2026-09-29 09:00 UTC — no new gap found, small fix shipped instead
Research run (UTC hour 09). CI green on master, radar health OK (1 run in 26h
window, feed at 382 tools, last publish 33h ago — inside window), no
agent-fixable issues open.

Every one of the 29 OPEN entries above already carries a "Smallest useful
version" section (spot-checked two in full — the extension/lookup-surface
gap and the focus-trap gap — both genuinely build-ready, nothing thin enough
to deepen further). Per the cumulative-research rule this hour studied three
fresh competitor patterns instead: FutureTools.io's community upvoting,
TopAI.tools' personalized collections, and the price-intelligence/price-drop-
alert pattern common to shopping extensions. All three came back already
covered: upvoting already exists as community-thread upvotes
(`communityStore.js`) and per-tool ratings are already the logged "Per-tool
ratings & reviews" OPEN gap; personalized collections are already the logged
"Collections" OPEN gap; price-drop tracking is blocked by the same missing
catalog field (`radar/schema.js` has no price-amount field, only the
free/freemium/paid enum) the already-logged Stack Cost Estimate gap
documents. Also checked reduced-motion support (already respected in
`Landing.jsx`/`ToolStars.jsx`) and the "no credit card" claims fixed in an
earlier run (`CTASection.jsx:53`, `ContactSection.jsx:112-114` both still
correctly branch on `VITE_PAYMENTS_ENABLED` — no regression).

Per the "never invent a gap to fill the hour" rule, appended nothing new.
Instead shipped the one already-fully-specced, small, real fix sitting in
this backlog: the "Live Tool Comparison" integrations-row entry above,
marked SHIPPED in place with its sha in DEVLOG.

---

### Research check 2026-09-29 15:00 UTC — no new gap found, none of the 29 OPEN entries thin enough to deepen
Off-cycle research run. CI green on master (run #474, `18e4762`), radar
health OK (1 run in 26h window, feed at 382 tools, last publish 39h ago —
inside window), no `agent-fixable` issues open.

Noted but out of scope for this run: 25 open `bot/*` PRs sit unmerged going
back to 2026-09-03 (`#3`…`#82`), several superseding each other (three
separate "deepen embed-badge gap" / "re-verify subcategory-pages" passes).
That is a merge-queue problem, not a research gap, and cleaning it up isn't
this hour's job — flagging it here so the digest run sees it.

Spot-checked three more of the 29 OPEN entries in full this run (Weekly
trending tools, Stack overlap warning, First-session onboarding checklist) —
all three still genuinely build-ready with concrete "Smallest useful
version" sections, nothing thin enough to deepen further.

Studied four directories not yet cited in this file: ToolDirectory.ai,
AIXploria, RankmyAI and PoweredbyAI (via a 2026 roundup plus direct search),
plus re-checked ToolJunction's "scored verdicts" framing. Every distinctive
feature found was already shipped, already logged, or blocked on the same
invented-data risk already documented elsewhere in this file:
- ToolDirectory.ai's "graveyard" of discontinued tools → already the logged
  "Tool graveyard page" OPEN gap.
- ToolDirectory.ai's "review dates" (when a listing was last verified) →
  already shipped, and more honest than the competitor version: checked
  `src/components/app/TrustPanel.jsx:111-115` — every tool page already has
  a "Last checked" row reading `tool.discoveredAt`, and it says outright
  "not re-verified on a schedule" rather than implying active upkeep.
- Toolify.ai's "Most Used This Month" / AIXploria's "real-time Top 10" /
  RankmyAI's traffic-driven rankings → same usage-ranking shape as the
  already-logged (and detailed) "leaderboard goes real" and "Weekly trending
  tools" OPEN gaps.
- RankmyAI's funding data alongside tool metrics → would need a new,
  unverifiable catalog field (`radar/schema.js` has no funding field), the
  same invented-data risk that blocks the dollar-cost-estimate gap.
- ToolJunction's "scored verdicts naming each tool's limitations" → already
  shipped as `TrustPanel.jsx`'s "Watch out for" row (`limitationOf()`,
  `TrustPanel.jsx:30-38`), derived from catalogue data only, no LLM opinion.

Also ran one small honest bug check this run (grep for `<img` across `src/`
for missing/decorative alt text) — the one image in the app
(`InstallPrompt.jsx:81`) is already correctly `alt=""` as decorative. No fix
to make.

Per the "never invent a gap to fill the hour" rule, appended no new gap and
made no code change this run.

---

### Research check 2026-09-29 21:00 UTC — no new gap found, third pass today came back covered
Off-cycle research run. CI green on master (`Release` run #409, `f709837`,
the 18:xx feature-run digest commit), radar health OK (2 runs in 26h window,
feed at 394 tools, last publish 5.1h ago), no `agent-fixable` issues open.

Noted, not actioned: the open-`bot/*`-PR pile flagged in issue #67 is now 27
PRs (`#3`…`#82`), still unmerged; today's 18:18 UTC digest run already left
an update comment there clarifying it's a separate `agent-*.yml` PR-based
flow, not this scheduled routine (which pushes straight to `master`), so no
further comment added here.

This is the third research pass today (following the 09:00 and 15:00 UTC
entries above) and the backlog is now heavily saturated — grepped this file
for prior competitor citations before searching to avoid re-covering ground:
StackShare, Futurepedia, TAAFT, ToolFinder, Product Hunt, G2, Capterra,
FutureTools, TopAI.tools, ToolDirectory.ai, AIXploria, RankmyAI, PoweredByAI,
ToolJunction, Toolify.ai, AlternativeTo, SaaSHub and Zapier are all already
cited. Two fresh angles were checked instead of re-running those:
- Feature-request/roadmap-voting boards (Canny/Frill-style, common on SaaS
  marketing sites) — would need a shared vote count visible across users,
  which this client-side-only SPA with no backend can't honestly provide
  (same constraint that already got the email-digest and vendor-deals gaps
  REJECTED above); not logged.
- Dark mode / theme toggle, sometimes missing on directory sites — already
  shipped: `src/state/themeStore.js`, `prefers-color-scheme` handling in
  `src/index.css`, and `CursorStars.jsx` all branch on theme. Not a gap.
- WebSearch for 2026 AI-directory feature roadmaps (There's An AI For That,
  OpenFuture AI, Garanix) surfaced only listing-count/category-count PR
  copy, nothing naming a concrete feature not already covered above.

Also re-ran the marketing-copy-vs-code check the "gap between promise and
behaviour" hint calls for, on `src/components/sections/*.jsx` this time
(prior runs checked payment/pricing claims specifically) — grepped for
overclaiming language (`guarantee`, `100% accurate/secure/verified`,
`real-time`, `instantly`, `unlimited`, `always up-to-date`, `automatically
sync/updated`): zero hits. No stale claim to fix.

Per the "never invent a gap to fill the hour" rule, appended no new gap and
made no code change this run.

---

### Research check 2026-09-30 06:00 UTC — no new gap found, two OPEN entries re-verified against current master
First research run of the day. CI green on `master` (`Release`/`CI` both
passing at `404b855`; the newer `48be4d5` radar-publish commit hadn't yet
triggered a fresh run), `npm run radar:health` `OK` (2 runs in the 26h
window, last publish 5.3h ago, 7 tools, feed at 401 total), no `agent-fixable`
issues open.

Re-verified two OPEN entries directly against current code rather than
trusting their last-checked date, since yesterday shipped two features
(Command Palette, self-reported time-value calculator) that could have made
either stale:
- "The public search page's own placeholder promises task search" (found
  2026-09-16): read `src/utils/search.js` in full — `matchesQuery()` is
  still an exact-substring-per-word check with no stem/prefix matching, so
  "transcribe meetings" still returns zero results against the live catalog
  while `Otter.ai`/`Notta`/`Fireflies.ai` etc. remain unreachable by that
  query. Still accurate, still OPEN, still build-ready.
- "None of the app's 7 modal overlays trap keyboard focus" (found
  2026-09-28, the same day `CommandPalette.jsx` shipped): confirmed the
  entry already accounts for `CommandPalette.jsx` in its seven-surface count
  (it was written the same evening the palette landed) — no update needed,
  not stale.

Checked one fresh pattern from this run's competitor search: a proprietary
"Trust Score" / "Verified" badge system, used by several smaller AI-tool
review sites (e.g. Mr Review AI) to rank/badge listings. Deliberately not
logged as a gap — `TrustPanel.jsx`'s own header comment states the
component's whole design principle is "everything is derived, nothing is
invented," and a numeric trust score has no honest catalogue-derived source
(no review volume, no uptime data, no independent audit) to compute it from;
inventing one would be the same fabricated-number problem this file's own
"Stack cost estimate" and "RankmyAI funding data" entries above already
reject for the same reason. `TrustPanel.jsx`'s existing "Watch out for" /
"Last checked" / "Commercial ties" rows already give a visitor everything a
trust score would gesture at, without inventing a score.

Also checked the second half of that badge idea (per-tool "Verified" status)
against what Toolnaut already ships: `ToolDetail.jsx`'s existing
Active/Uncertain/Discontinued status badge, sourced from radar's own
`status` field, already is the honest version of "verified" — no gap there
either.

Per the "never invent a gap to fill the hour" rule, appended no new gap and
made no code change this run.

---

### Research check 2026-09-30 09:00 UTC — no new gap found, MCP-marketplace and verified-review angles both already covered
Off-cycle research run (fired ~09:03 UTC, outside the usual 00/06/12/18
schedule). CI green on `master` (`CI`/`Release` both passing at `8eb416a`),
`npm run radar:health` `OK` (2 runs in the 26h window, last publish 8.3h
ago, 7 tools, feed at 401 total), no `agent-fixable` issues open. The
`Agent · Bugfix` scheduled workflow shows a `failure` conclusion at
08:50 UTC on this same commit — that is a separate `agent-*.yml` automation,
not the CI/build/smoke gate this routine owns, and master's own CI stayed
green, so left uninvestigated per this run's scope.

This is the fifth research pass since 2026-09-29 09:00 UTC. Confirmed
programmatically before searching that all 32 OPEN entries already carry a
"Smallest useful version" section (`grep -c` template-only match), so none
are thin enough to deepen — same conclusion the 09:00/15:00 UTC passes on
2026-09-29 already reached.

Two fresh angles checked against 2026 sources, both already covered:
- WebSearch on Futurepedia's 2026 changes: its headline addition is
  "verified reviews" replacing star ratings — same shape as this file's
  already-detailed, build-ready "Per-tool ratings & reviews" OPEN gap
  (line 587), which already specs an author+rating+body review surface
  layered on `ToolDetail.jsx`. Nothing to add.
- WebSearch on the MCP-server-marketplace trend (11,000+ indexed servers,
  described as AI tooling's "App Store moment" in 2026) as a possible new
  catalog category. Checked whether Toolnaut's schema or catalog actually
  lacks this: `radar/schema.js`'s `SOURCE_CATEGORIES` already has an
  "AI Agents & Automation" domain, catalog tags already include a
  cross-cutting `agent` tag (90 tools, noted in the 2026-09-13 entry above),
  and `grep -ic mcp public/tools.json` returns 76 hits already in shipped
  tool blurbs — MCP support is already a well-represented feature across
  existing catalog entries, not a missing category. A dedicated
  MCP-server-only directory section would also be a developer-infra feature
  sitting oddly against Toolnaut's role-based, largely non-developer quiz
  audience. Not logged.

Also checked one shipped-yesterday surface for bugs rather than gaps, per
the "small real improvement" allowance: read `StackValue.jsx` and
`stackValue.js` in full (the time-value calculator from the 18:14 UTC ship)
and confirmed it's wired into `Stack.jsx:326` and visible, its
`localStorage` read/write is wrapped in `try/catch` per the `src/state/*`
rule, and `estimateValue()` correctly excludes non-positive/non-finite
inputs from the result. No bug found.

Per the "never invent a gap to fill the hour" rule, appended no new gap and
made no code change this run.

---

### Research check 2026-09-30 12:03 UTC — no new gap found, sixth pass since yesterday comes back covered
Research run (UTC hour 12, on the regular 00/06/12/18 schedule). CI green on
`master` (`CI`/`Release` both passing at `88e5d6f`), `npm run radar:health`
`OK` (2 runs in the 26h window, last publish 11.3h ago, 7 tools, feed at
401 total), no `agent-fixable` issues open.

This is the sixth research pass since 2026-09-29 09:00 UTC and all 32 OPEN
entries already carry a build-ready "Smallest useful version" section (per
the fifth pass's confirmation above), so this run searched fresh ground
instead of re-reading the list:
- JSON-LD/structured data, sitemap.xml, robots.txt — already shipped
  (`src/utils/toolSeo.js`, `src/utils/head.js`, `public/sitemap.xml`,
  `public/robots.txt` all present and wired in). Not a gap.
- Keyboard-shortcut discoverability for the Cmd/Ctrl+K command palette —
  already has a visible `⌘K` hint rendered in `AppShell.jsx:208`. Not a gap.
- Legal.jsx's "New-tool alerts... store your email address and the
  categories you chose" claim, checked against actual code since this file's
  own "best kind of find" hint is a promise/behaviour mismatch: real,
  fully built — `Settings.jsx`'s Notifications section renders a genuine
  `AlertSettings` component when signed in, backed by real Supabase/Resend
  integration (`@supabase/supabase-js`, `razorpay`, `@sentry/react` are all
  real dependencies in `package.json`, not aspirational). Confirms this
  project has more real backend surface than `CLAUDE.md`'s "no backend, all
  state in localStorage" line describes for `src/` alone — that line is
  accurate for the *quiz/discovery* half but the account/sync/payments path
  genuinely talks to Supabase, Razorpay and Resend. Not a gap, not
  something to fix (the line describes the SPA's default/guest path
  correctly), but worth noting for future research runs so nobody logs
  "no backend" as a reason to reject a signed-in-only feature without
  checking first.
- Affiliate links / vendor deal codes — already deliberately absent by
  design (`TrustPanel.jsx:118`, `Methodology.jsx:132` both state "no
  affiliate links" as a trust position) and already REJECTED in this file
  (line 3830). Re-confirmed, not re-logged.
- i18n / regional-language localization — confirmed genuinely absent
  (`grep -rniE "i18n|locale|translat"` returns no real hits), and worth
  naming explicitly as *considered and passed over* rather than silently
  skipped: Toolnaut's INR-aware pricing (`region.js`) and Razorpay
  integration suggest a partly Indian audience, which is exactly the profile
  full localization would serve. Not logged as an OPEN gap because it fails
  this file's own size test — translating the quiz, ~1000 tool blurbs, all
  marketing copy and every UI string is an L-or-larger, ongoing-maintenance
  commitment with no scoped-down S/M slice, unlike every other entry in this
  file. A single-language toggle with no actual translations would be worse
  than not having one.

Also ran `npm run build` and `npm run smoke` directly (not just as part of
this backlog check) to look for a small real fix per the "small real
improvement" allowance: build produced all 19 static routes + 1075 tool
pages with no errors, smoke rendered all 24 routes clean with 0 console
errors on each. No bug found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap and
made no code change this run.

---

### Research check 2026-09-30 15:03 UTC — no new gap found, seventh pass tried three genuinely new angles
Off-cycle research run (fired ~15:04 UTC). CI green on `master` (`CI` run
#482 / `Release` run #413, both `success` at `26eae9b`), `npm run radar:health`
`OK` (2 runs in the 26h window, last publish 14.3h ago, 7 tools, feed at
401 total), no `agent-fixable` issues open. Noted, not actioned: the
`Agent · Research` scheduled workflow shows a `failure` conclusion at
10:05 UTC on `88e5d6f` — same as the `Agent · Bugfix` failure the 09:00 UTC
entry above already flagged, a separate `agent-*.yml` automation, not the
CI/build/smoke gate this routine owns; master's own CI stayed green.

Seventh research pass since 2026-09-29 09:00 UTC. Rather than re-running the
same competitor-name sweep as the last three passes (all 32 OPEN entries are
still build-ready per the fifth pass's programmatic check, so nothing to
deepen), tried three angles none of the prior six passes used:

- **Fresh WebSearch for Sept 2026 AI-directory launches** ("AI tool directory
  website new feature launch September 2026" and a Toolify.ai/Supertools.io
  features search): surfaced OpenResources (280 tools), AIToolsHub's "AI
  Intelligence Terminal" (live pricing/velocity dashboards), Critiqs AI
  (5,000+ tools with reviews), and Garanix (1,000+ "verified" tools) as 2026
  launches, plus Toolify's traffic-stats-driven ranking as its headline
  differentiator. Every one of these lands on a shape this file already has
  logged: traffic/velocity dashboards → the already-detailed "leaderboard
  goes real" and "Weekly trending tools" OPEN gaps; reviews → the OPEN
  "Per-tool ratings & reviews" gap; "verified" badges → already checked and
  passed over by the 06:00 UTC entry above (no honest data source to compute
  one from). Nothing new.
- **Cross-checked `capabilityMatrix.js` against `AlertSettings.jsx`/`api/alerts.js`**
  — the promise-vs-code check this file's own hint calls for, aimed at a
  surface no prior pass tried: the pricing capability table's "Alerts" row
  claims Free gets a "General new-tool feed" while Pro (`planned`) gets
  "Price changes, better alternatives, stack drift." Read `AlertSettings.jsx`
  in full: it's ungated behind any tier check in `Settings.jsx` (line 419,
  no entitlement wrapper), and it's actually domain-filtered (6 category
  toggles: code/design/writing/data/automation/learning), which is a closer
  read on "general" than the row's plain wording suggests but is not a false
  claim — a domain-filtered new-tool feed is still a new-tool feed, not a
  price/drift alert, so it doesn't collide with the still-`planned` Pro row
  either. Confirmed accurate, not a gap.
- **Tried real production telemetry via the Vercel MCP tools** (`list_teams`,
  `list_projects`) instead of only local `build`/`smoke` checks, on the
  theory that a live runtime-error cluster would be a gap no static check
  could find. `list_teams` returns exactly one team
  (`saikiranreddy18s-projects`); `list_projects` against it returns zero
  projects, with or without a name filter. This session's Vercel credentials
  are not connected to the deployed `toolnaut` project (or any project), so
  `get_runtime_errors`/`get_runtime_logs` were never reachable this run.
  Worth a future run retrying this once/if the Vercel connector is scoped to
  the real project — production error clusters are a category of gap this
  file has never been able to check for.

Also looked at `radar/sources/` for a discovery-source gap (Reddit, Hugging
Face Spaces, arXiv are all absent — only GitHub/HN/Product Hunt/RSS exist)
but did not log it: `RSS_FEEDS` is already an env-configured escape hatch
for arbitrary feeds with zero code change, and a wholly new source is
radar-pipeline infra work, not the client-side product gap shape every
other entry in this file takes. Left unlogged rather than force-fit.

Per the "never invent a gap to fill the hour" rule, appended no new gap and
made no code change this run.

---

### Research check 2026-09-30 21:03 UTC — no new gap found, eighth pass; Vercel telemetry still unreachable
Off-cycle research run. CI green on `master` (`CI` run #485 / `Release` run
#416, both `success` at `eac94ba`), `npm run radar:health` `OK` (2 runs in
the 26h window, last publish 5.1h ago, 6 tools, feed at 407 total), no
`agent-fixable` issues open (`search_issues label:agent-fixable state:open`
returns zero).

Eighth research pass since 2026-09-29 09:00 UTC. All 29 real OPEN entries
(30 minus the `<short gap name>` format template) still carry a build-ready
"Smallest useful version" section from prior passes, so this run again
looked for fresh ground rather than re-reading the list:

- **Retried the Vercel MCP telemetry path** the seventh pass flagged as
  worth another attempt (`list_teams` → `list_projects`): `list_teams`
  still returns exactly one team (`saikiranreddy18s-projects`);
  `list_projects` against it still returns zero projects. This session's
  Vercel credentials remain unconnected to the deployed `toolnaut` project,
  so `get_runtime_errors`/`get_runtime_logs` stay unreachable. Not
  re-flagging again as a "retry later" — two attempts on two different days
  both came back empty, so this path needs someone to actually scope the
  Vercel connector to the project, not another agent retry.
- **Two fresh WebSearches**: "AI tool directory new feature launched this
  week September 2026" and a gamification/badges-specific search. Surfaced
  nothing dated this week; the only new names (AI ToolFit's "describe what
  you need" natural-language search, The AI Library's gamified leaderboard)
  land on shapes already logged here — AI ToolFit matches the OPEN "public
  search page... still only knows literal word stems" gap, The AI Library's
  leaderboard matches the OPEN "leaderboard's own precondition" and "Weekly
  trending tools" gaps. Nothing new.
- **Re-audited `AudienceSection.jsx` and `HowItWorksSection.jsx`** — the
  two marketing sections with the fewest prior mentions in this file (2
  each, vs. 6-20 for every other section). `AudienceSection.jsx`'s two
  claims ("Build your edge before your first job", "Adapt without carving
  out a sabbatical") are aspirational framing with no specific, checkable
  feature promise — nothing to verify against code. `HowItWorksSection.jsx`'s
  "Master... Track progress against your role" line is the same claim the
  sixth pass already logged as the OPEN "no benchmark of either kind exists"
  gap; re-read in full, nothing beyond what that entry already covers.
- **Self-audit: `prefers-reduced-motion` coverage.** Checked whether the
  focus-trap fix shipped at 18:03 UTC today left a matching a11y gap
  nearby. Grepped `src/` for `prefers-reduced-motion`/`useReducedMotion`:
  9 files respect it directly (`CursorStars`, `AnimatedWordmark`, `Tilt`,
  `DottedWordmark`, `SignInPage`, `ArrivalLaunch`, `RolesSection`,
  `HeroSection`, `ToolStars`) plus 3 `@media` blocks in `index.css` and an
  explicit mention in `Settings.jsx`. Thorough, not a gap.
- Ran `npm test` (311/311), `npm run build` (19 static routes + 1081 tool
  pages, no errors), and `npm run smoke` (24/24 routes, 0 console errors
  each) directly against current master to check for a small real fix per
  the "small real improvement" allowance. All three clean. No bug found.

Per the "never invent a gap to fill the hour" rule, appended no new gap and
made no code change this run.

---

### Research check 2026-10-01 00:04 UTC — no new product gap found, ninth pass; shipped the one real bug it turned up
Research run (UTC hour 00). CI green on `master` (`CI` run #486 / `Release`
run #417, both `success` at `abad463`), `npm run radar:health` `OK` (2 runs
in the 26h window, last publish 8.1h ago, 6 tools, feed at 407 total), no
`agent-fixable` issues open.

Noted, not actioned: issue #67 ("22+ open bot PRs, none merged") is a known,
already-tracked problem with the separate `.github/workflows/agent-*.yml`
PR-based flow `CLAUDE.md` governs — confirmed again this run (27 open
`bot/*`/`feat/*` PRs, oldest `#3` from 2026-08-22) but it is not this
routine's queue (this routine ships straight to `master`, per its own
instructions, and a prior comment on #67 already established that split).
Two backlog entries above (`Stack overlap warning`, `Cookie-consent gate for
GA4`) are specifically blocked on that same stuck queue — PR #75 and PR #70
already implement them in full and green, waiting on a human merge. Not
re-litigating either; both already say "do not rebuild."

Ninth research pass since 2026-09-29 09:00 UTC. All 28 real OPEN entries
still carry a build-ready "Smallest useful version" from prior passes (spot-
checked the oldest-untouched ones — `First-session onboarding checklist`,
`Per-tool ratings & reviews`, `PDF roadmap export`, `Discover's filter chips`,
`Tool "graveyard" page` — each already has a 2026-09 "Deepened"/"Re-verified"
note, none are thin or stale), so this pass tried fresh ground instead of
re-reading the list:

- **Fetched the live production site directly** (`https://toolnaut.xyz`, not
  just local `build`/`smoke`) for the first time in this file's history —
  prior passes only tried this via the Vercel MCP telemetry tools, which stay
  unreachable. The rendered page matches local `build` output exactly: hero,
  stats (1,109 tools / 26 categories / 790 free-to-start / 30 new this week —
  consistent with this run's own `npm run build` log: "1109 tools (704
  bundled + 405 live)"), community numbers, methodology section, roles
  section, footer all present, zero visible errors or stale-cache artifacts.
  Production and `master` agree; not a gap.
- **WebSearch for AI-directory feature launches dated this week**: nothing
  new surfaced beyond names already logged (OpenResources, Critiqs AI,
  AIDIRS.best — the latter's "Email Updates" feature maps to the already-OPEN
  RSS-feed gap). Nothing new.
- **Read `src/hooks/useFocusTrap.js` and every one of its 7 call sites fresh**
  — new code (shipped yesterday 18:03 UTC, so no prior pass had reason to
  check it) rather than a re-audit of old files. Found a real, demonstrable
  bug: `InstallPrompt.jsx` got `useFocusTrap` wired in that same commit but,
  unlike the other three dialogs shipped alongside it (`DeleteAccount.jsx`,
  `GuestImportPrompt.jsx`, `AppTour.jsx` — all three already had a pre-existing
  focus-on-open call before yesterday's commit even touched them), nothing
  ever moved focus into it. `GuestImportPrompt.jsx`'s own comment states the
  rule directly: "a full-screen dialog still has to receive focus on open...
  or a keyboard/screen-reader user is left behind it with no indication
  anything opened." Worse for `InstallPrompt` specifically: it appears on its
  own (a `beforeinstallprompt` event or a timed iOS hint), never from a user
  clicking a trigger, so there is no prior click near it for focus to land on
  either — a keyboard/screen-reader user got zero signal it ever opened.
  Confirmed `aria-modal` was correctly left off (unlike the other four, this
  is a non-blocking toast with no backdrop, so `aria-modal="true"` would be
  inaccurate) — only the missing initial-focus half of the pattern was a bug.
  **Fixed this run**: added a `useEffect` that calls `dialogRef.current?.focus()`
  when `show` becomes true (mirrors `GuestImportPrompt.jsx`'s exact pattern)
  and `tabIndex={-1}` on the dialog container so it's focusable. `npm test`
  (311/311), `npm run build` (19 routes + 1081 tool pages), and `npm run
  smoke` (24/24 routes, 0 console errors) all re-run clean after the fix.
- Per the "never invent a gap to fill the hour" rule, no new product gap was
  invented — the one real finding this run surfaced was a bug, not a gap, and
  it shipped directly rather than being logged for a future feature run.

**Status: small real fix shipped this run** (see commit — `InstallPrompt.jsx`
focus-on-open), no new OPEN gap appended.

---

### LLM API cost calculator — a narrower, buildable cousin of the stack-cost gap the catalog schema still blocks
- **Status:** BUILT, UNMERGED — PR #86 (2026-10-01) implements this as scoped
  below, with one deliberate deviation: the spec said to scope the calculator
  by a tool's `pricing` field being "API"/"Usage-based API"/"Enterprise API",
  but `chatgpt`/`claude`/`gemini` are all tagged `Freemium`/`Paid` in the
  catalog, not API — scoping by that field would have hidden the calculator
  from the exact three tools this gap's own worked example names. Built to key
  off a direct `toolSlug` match in the new `modelPricing.js` table instead.
  Not pushed to `master` directly: a repo-level guard blocks merging without
  review from this session, so it is a PR awaiting the project owner's merge,
  same as the stack-overlap-warning (#75) and GA4 cookie-consent (#57/#70)
  entries elsewhere in this file. `npm test`/`build`/`smoke` all green on the
  branch; see PR #86 for the full verification record. **Do not rebuild
  this** — it needs a human to merge #86, not more agent code. This status
  line was correct on the PR #86 branch since 2026-10-01 but never carried
  over to `master`, where every later research pass (13th/14th/15th) kept
  re-noting the same fact in prose without fixing the entry itself — fixed
  2026-10-02 15:04 UTC.
- **Seen in:** AI Tools Mentor (found via WebSearch "AI tool comparison
  directory pricing calculator ROI feature 2026") — "an API cost calculator
  for 33 models from 8 providers" alongside its stack builder; Swfte AI
  Directory — "an AI Cost Calculator to estimate monthly AI API spend for any
  usage profile". Distinct from the subscription-price aggregators (Whizi,
  itoolverse, aipricingcalculators.com) already logged under the "Stack cost
  estimate" entry above — those total what a *stack of SaaS subscriptions*
  costs per month; this is what *calling one model's API* costs per month,
  a question with its own public, independently-known price list (dollars
  per million input/output tokens) that has nothing to do with our catalog's
  `pricing` field.
- **Gap:** our catalog already carries `ChatGPT`, `Claude`, `Claude Code`,
  `Gemini`, `Gemini CLI`, `Gemini Code Assist`, `OpenAI Codex`, `OpenAI
  Agents SDK` (`grep -noiE '"name": "[^"]*(chatgpt|claude|gemini|openai)[^"]*"'
  src/utils/toolsCatalog.js`, 12 hits) inside the "ML Infrastructure &
  LLMOps" (58 tools) and "AI Coding & Development" (62 tools) source
  categories — exactly the categories mapped to the Engineer persona's
  `code` domain (`src/utils/rolesData.js:12`). None of their tool-detail
  pages, nor any other page, answer the question a developer actually has
  when picking between them: "if I send N requests a day of this shape,
  what does GPT-4o vs. Claude vs. Gemini cost me a month?" Checked
  `ToolDetail.jsx` and `CategoryLanding.jsx` for any cost math beyond the
  three-value pricing badge (free/freemium/paid) — none exists; checked
  `grep -rn "token\|per1M\|inputCost" src/` — zero hits, nothing like this
  has ever been attempted.
- **Why it matters:** this is the one AI-cost question Toolnaut's existing
  "Usage-based API" tagged tools actively raise and the site has no answer
  for, and — unlike the dollar-amount half of "Stack cost estimate" above —
  it does not need a radar schema change or a `priceAmount` field on every
  catalog record to exist first. Frontier model API pricing (GPT-4o/mini,
  Claude Opus/Sonnet/Haiku, Gemini Pro/Flash) is a short, independently-known
  reference table, not something the radar pipeline would ever need to
  discover or enrich — so this is buildable today, where the broader
  stack-cost gap still isn't.
- **Build size:** S-M — one new static data file, one pure calculator
  function, one small UI component surfaced only on the handful of tools it
  applies to.
- **Smallest useful version (what to actually build):**
  - New `src/data/modelPricing.js`: a short static array — 6-10 entries for
    the frontier model families actually in the catalog (GPT-4o family,
    Claude family, Gemini family), each `{ slug, model, provider,
    inputPer1M, outputPer1M, asOf, sourceUrl }`. `slug` matches the
    catalog's own tool slug so a result can link back via `getTool(slug)`
    from `toolsCatalog.js`. Carrying `asOf` + `sourceUrl` on every row and
    showing both next to the result is the same honesty pattern
    `PRICE_LABELS` and the status-note gap already established in this
    file — model prices change and a stale silent number is worse than a
    dated, sourced one.
  - New `src/utils/apiCost.js`: pure `estimateApiCost({ model,
    requestsPerDay, avgInputTokens, avgOutputTokens })` → monthly $. Same
    self-reported-inputs shape `src/utils/stackValue.js` already
    established for the time-value calculator (the visitor types their own
    usage shape, Toolnaut only multiplies) — zero catalog-schema
    dependency, easy to unit test with `node --test` the same way
    `stackValue.js` already is.
  - New `src/components/app/ApiCostCalculator.jsx`: a model dropdown
    (`modelPricing.js` entries) + 3 number inputs, visual style matching
    `StackValue.jsx` (pill inputs, `role="status"` result, "your inputs,
    not ours" disclaimer). Surfaced only on `ToolDetail.jsx` for a tool
    whose `pricing` is `API`/`Usage-based API`/`Enterprise API` — reuses the
    pricing-badge check already there — not a global/always-visible widget,
    since a token calculator makes no sense on a Canva or Notion listing.
  - **What this would NOT include** (kept out to bound the diff): no
    live/scraped pricing feed — a hand-maintained table re-verified like any
    other dated fact in this app; no "which model is cheapest for my
    workload" cross-model ranking in v1, one model at a time only; no
    attempt to cover all 12 LLM-named catalog tools, just the 3 frontier
    families that account for the overwhelming majority of real
    "which model's API should I use" searches.
- **Found:** 2026-10-01 03:09 UTC

---

### Research check 2026-10-01 03:09 UTC — tenth pass; fixed GalaxyExplorer's half of yesterday's focus-trap commit, logged one new buildable gap
Research run (UTC hour 03). CI green on `master` (`CI` run #487 / `Release`
run #418, both `success` at `166056c`), `npm run radar:health` `OK` (2 runs
in the 26h window, last publish 2.2h ago, 8 tools, feed at 415 total — now
417 after this run's own build), no `agent-fixable` issues open
(`list_issues label:agent-fixable state:OPEN` returns zero).

Tenth research pass since 2026-09-29 09:00 UTC. All 30 real OPEN entries
(31 minus the `<short gap name>` template) already carry a build-ready
"Smallest useful version" from prior passes — spot-checked several of the
least-recently-touched ones, none thin — so this pass again looked for
fresh ground before adding anything:

- **Read `useFocusTrap.js` and all 4 of its call sites the ninth pass's own
  fix didn't re-check** (`CommandPalette.jsx`, `GalaxyExplorer.jsx`,
  `DeleteAccount.jsx`, `GuestImportPrompt.jsx`, `AppTour.jsx` — the ninth
  pass only read the 7 sites to find the `InstallPrompt.jsx` bug, not to
  re-audit the fix's own completeness). `CommandPalette.jsx` already moves
  focus to its search input (`inputRef.current?.focus()`), confirmed fine.
  **`GalaxyExplorer.jsx` had the exact same bug class**: wired `useFocusTrap`
  in the same 70ceb14 commit, got `role="dialog"`/`aria-modal="true"`, but
  no `tabIndex` and no focus-on-open call anywhere in the file — unlike
  `InstallPrompt.jsx`, this dialog does have a real trigger (Landing.jsx's
  "Explore" button, which stays visible and focused at z-[76], above the
  dialog's own z-[75]), so Tab from it happens to land inside the dialog
  next in DOM order — but a screen reader never gets the focus-move signal
  that announces a modal opened, the same WAI-ARIA Dialog pattern half
  `GuestImportPrompt.jsx`'s own comment states as the rule. **Fixed this
  run**: added `tabIndex={-1}` to the dialog's root div and a
  mount-only `useEffect` calling `root.current?.focus()` (no `active`
  toggle needed — this component only exists while `explore` is true, so
  mount-time is open-time). `npm test` (311/311), `npm run build` (19
  routes + 1089 tool pages, feed grew to 417 live tools this run), and
  `npm run smoke` (24/24 routes, 0 console errors) all clean after the fix.
- **Two fresh WebSearches** ("AI tool directory new feature launch October
  2026", "AI tool comparison directory pricing calculator ROI feature
  2026") surfaced nothing dated this week, but turned up a feature shape no
  prior pass had logged: AI Tools Mentor's and Swfte's **API cost
  calculators** (dollars per request/token for specific LLM models) —
  distinct from the dollar-amount "Stack cost estimate" gap already OPEN
  above, which totals SaaS *subscriptions* and stays blocked on a missing
  `priceAmount` catalog field. An LLM API cost calculator needs no catalog
  schema change at all — model token pricing is an independent, short,
  hand-maintained reference table — so it's buildable where the broader gap
  isn't. Logged as a new OPEN entry above with a build-ready "Smallest
  useful version."
- Confirmed via `grep` that none of this file's 30 OPEN/prior entries
  already cover this specific shape before logging it (searched for
  "API cost calculator", "token cost", "per-token", "LLM pricing" — zero
  hits before this run).

**Status: one real a11y bug shipped this run** (see commit —
`GalaxyExplorer.jsx` focus-on-open, mirroring yesterday's `InstallPrompt.jsx`
fix), one new OPEN gap appended (LLM API cost calculator).

---

### Research check 2026-10-01 06:04 UTC — no new gap found, confirmed the focus-trap pattern is now fully complete across all 7 dialogs
Research run (UTC hour 06). CI green on `master` (`CI` run #488 / `Release`
run #419, both `success` at `01aed7a`), `npm run radar:health` `OK` (2 runs
in the 26h window, last publish 5.2h ago, 8 tools, feed at 415 total), no
`agent-fixable` issues open.

Eleventh research pass since 2026-09-29 09:00 UTC. The last two passes
(ninth, tenth) each found one dialog in the `useFocusTrap` rollout missing
its focus-on-open half (`InstallPrompt.jsx`, then `GalaxyExplorer.jsx`), so
this pass finished that audit rather than assuming it was done: re-read all
7 call sites fresh against current `master` (`01aed7a`) —
`CommandPalette.jsx` (`inputRef.current?.focus()`), `InstallPrompt.jsx` and
`GalaxyExplorer.jsx` (both fixed in the last two passes), `GuestImportPrompt.jsx`,
`AppTour.jsx` (`cardRef.current.focus()` gated on `open`, line 149),
`DeleteAccount.jsx` (`firstRef.current.focus()`, line 79), and the mobile
chat bottom sheet in `AppShell.jsx` — this last one looked unverified since
no prior pass had traced it past `useFocusTrap(mobileChatSheetRef, chatOpen)`,
but `ChatPanel.jsx:22-24` (the component both the mobile sheet and desktop
rail mount) already calls `closeBtnRef.current?.focus()` in a mount-only
effect, and the sheet/rail mount together on `chatOpen` per `AppShell.jsx`'s
own comment — so it already had the open-half, just living in the child
component rather than the shell. All 7 now confirmed complete; no 8th bug to
fix.

Also checked three marketing sections not explicitly named in any prior
pass's notes (`FeaturesSection.jsx`, `HowItWorksSection.jsx`,
`AudienceSection.jsx`, `ContactSection.jsx`) line by line against the app's
real behavior — every claim in them (role-aware discovery, learning paths,
live tool comparison, progress tracking, signal-over-noise, weekly fresh
finds, spend audit, "track progress against your role, not generic
benchmarks", footer's "corrections welcome") already maps either to a
shipped feature or to an OPEN entry already logged in this file (the
benchmark claim is the already-OPEN "Track progress against your role"
entry from 2026-09-15; "corrections welcome" is the already-OPEN "No way to
flag a wrong listing" entry from 2026-09-16). No undisclosed gap between
copy and code found.

Two fresh WebFetches on directory-feature round-ups surfaced this run
(OpenFuture AI review, a "where to list your AI tool" roundup covering
Product Hunt/TAAFT/Vantaige/Toolify/Futurepedia/AlternativeTo) — every
feature shape they named (manual-browse favorites, no API, no comparison,
no integration data, structured pricing/FAQ data for AI citation,
alternative-page SEO) was already either shipped (JSON-LD, FAQPage schema on
`Support.jsx`/`Pricing.jsx`/`About.jsx`, `public/llms.txt`, favorites,
public Compare) or already an OPEN entry (public developer API,
per-tool Alternatives pages). Nothing new.

Per the "never invent a gap to fill the hour" rule, appended no new gap and
made no code change this run — the dialog audit found nothing left to fix.

---

### Research check 2026-10-01 12:04 UTC — no new gap found, twelfth pass; G2's AI-review-summary feature traces back to the already-OPEN reviews gap, not a new one
Research run (UTC hour 12). CI green on `master` (`CI` run #489 `success` at
`f00189d`), `npm run radar:health` `OK` (2 runs in the 26h window, last
publish 11.2h ago, 8 tools, feed at 415 total), no `agent-fixable` issues
open. Noted for awareness, not actioned: issue #67 ("22 open bot PRs...")
is still open and growing — those PRs come from the separate
`agent-*.yml` GitHub Actions automation (per-branch, PR-based, governed by
`CLAUDE.md`'s "never merge your own PR" rule), a different system from
this session's own direct-to-`master` runs; merging/closing them needs a
human with merge rights, as #67 itself already says, so it stays
unactioned here.

Twelfth research pass since 2026-09-29 09:00 UTC. Two fresh WebSearches
("AI tool directory new feature launched September 2026",
"G2 Capterra AI software category page features 2026 verified reviews
badges") surfaced one shape worth checking against this file before
logging it as new: G2's product pages now lead with an "AI buyer summary"
— a weekly-refreshed synthesis of verified-user reviews into structured
pros/cons/use-case fit. Checked whether this is a new gap or a restatement
of one already here: it isn't new. `ToolDetail.jsx`'s `TrustPanel` already
renders an algorithmic pros/cons/best-for/limitations panel (confirmed
still mounted, `ToolDetail.jsx:208` per the reviews gap's own 2026-09-20
deepening), so the only thing G2's version adds is that its summary is
synthesized from *real peer reviews* rather than written editorially — and
Toolnaut has zero peer reviews to synthesize from in the first place. That
precondition is exactly the still-OPEN "Per-tool ratings & reviews" gap
(2026-08-24, deepened 2026-09-20) — an AI-summary layer on top of reviews
that don't exist yet is a follow-on refinement of that entry, not an
independent one, so it was not logged separately; the existing entry's
"what this would NOT include" scope cut already keeps v1 to raw
rating+text, which is the correct build order regardless.

A third search ("AI tools directory browser extension Chrome check tool
while browsing 2026") returned the same "AI Tools Explorer" extension and
pattern already logged as the "No lookup surface outside toolnaut.xyz" gap
(2026-09-27) — confirmed no new information in today's results changes
that entry's scope or build plan.

Also re-read `StatsSection.jsx` fresh (not explicitly re-audited by name in
the last several passes' notes) against its own claims: every number is
either read live from `TOOLS`/`SOURCE_CATEGORIES`/`getNewTools()` or
fetched from `explorerCount()`/`subscriberCount()` with an explicit
null-means-unknown-never-zero contract documented in the file's own
header comment — no placeholder or stale figure found. Grepped
`src/**/*.jsx` for `<img` tags missing an `alt` attribute (a common silent
a11y regression) — all 5 hits (`AIRobot.jsx` ×3, `SpiralMark.jsx`,
`Mascot.jsx`) already carry a real or explicitly-empty `alt` plus
`aria-hidden` where decorative. No bug found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap and
made no code change this run.

---

### Research check 2026-10-02 00:04 UTC — no new gap found, thirteenth pass; uptime-tracker idea considered and set aside as backend-shaped
Research run (UTC hour 00). `master` was stale in this session's local
checkout (8 commits behind `origin/master`, left over from a prior
detached-HEAD state) — fast-forwarded before anything else ran. CI green on
`master` at `9dcbc18` (`CI` #491, `Release` #421 both `success`), `npm run
radar:health` initially reported `STALE` against the un-fast-forwarded
checkout's `radar/data/runs.log.json`; re-ran after the fast-forward and it
came back `OK` (2 runs in the 26h window, last publish 7.6h ago, 5 tools,
feed at 420 total). No `agent-fixable` issues open. Noted for awareness, not
actioned: issue #67 ("22 open bot PRs...") is still open — now **28** open
`bot/*`/`feat/*` PRs, oldest (`#3`) six weeks old; same conclusion as every
prior pass, merging/closing needs a human with merge rights. Also noted: PR
`#86` ("LLM API cost calculator") from the 2026-10-01 18:03 UTC feature run
landed as an open PR (`bot/claude/api-cost-calculator-2026-10-01`) rather
than a direct push to `master` — the backlog's "LLM API cost calculator"
entry (2026-10-01, this file) is therefore still correctly `OPEN`, not
`SHIPPED`, since nothing reached `master`. Flagging here so tonight's
feature run checks that PR before re-building the same feature from
scratch.

Thirteenth research pass since 2026-09-29 09:00 UTC. Re-verified the two
smallest build-ready OPEN entries against current `master` rather than
trusting the backlog's own text: `grep -n "DeleteAccount\|new Blob\|
createObjectURL" src/pages/app/Settings.jsx` still shows only the
`DeleteAccount` import/mount, no export util or download button — "Download
my data" (2026-09-13) is unchanged and still the smallest build-ready gap in
the file. `grep -rn "report\|incorrect\|flag" src/pages/app/ToolDetail.jsx
src/pages/ToolPublic.jsx` and `grep -rn "suggestTool\|SuggestTool" src/`
both still return zero hits — "No way to flag a wrong listing" (2026-09-16)
and the "Suggest a tool" entry it extends are both still accurate, neither
util exists yet.

Tried one fresh angle: WebSearched "AI tool directory status page outage
tracker 2026" after noticing OpenAI/Anthropic/Google/Microsoft all run
live status pages and wondering whether a directory-level "is my AI stack
down" aggregator was a gap. It's a real pattern (found an open-source "AI
Tool Status Checker" doing exactly this), but it requires polling every
listed tool's endpoint on a schedule and holding the results somewhere
queryable — the same backend shape this file's ranking note already treats
as the default REJECTED case (digest email, Discord bot, vendor deals
above), not a client-side SPA feature. Not logged as OPEN; would need to be
proposed alongside real infra (a cron + a datastore), not as a frontend
gap. A second search ("AI tools directory new feature launch 2026") surfaced
three new-to-this-file directories (AIToolsHub, Garanix, AIToolly) — none
do anything Toolnaut doesn't already have or hasn't already logged
(AIToolsHub's "Algorithmic Tool Radar" is the same discovery-pipeline shape
as this project's own `radar/`; Garanix's "1,000+ verified tools" claim is a
catalog-size flex, not a feature; AIToolly is a bare curated list with no
feature beyond what `Discover.jsx` already does).

Per the "never invent a gap to fill the hour" rule, appended no new gap and
made no code change this run.

---

### Research check 2026-10-02 03:04 UTC — no new gap found, fourteenth pass; flagging a missing 2026-10-01 DEVLOG entry
Research run (UTC hour 03). `master` was detached locally at session start
(left over from a prior run); re-pointed to `origin/master` before anything
ran. CI green at `73814fa` (`CI`/`Release` both `success`), `npm run
radar:health` `OK` (2 runs in the 26h window, last publish 2.0h ago, 8
tools, feed at 428 total), no `agent-fixable` issues open.

Fourteenth research pass since 2026-09-29 09:00 UTC. All 31 real OPEN entries
still carry a build-ready "Smallest useful version" (spot-checked the two
smallest — "Download my data", "No way to flag a wrong listing" — both
re-confirmed accurate against current `master` via the same greps the
thirteenth pass used), so this pass again looked for fresh ground:

- **Two WebSearches** ("AI tool directory new feature launched October
  2026", "best AI tool finder directory 2026 compare/stack-builder/team-
  workspace feature") surfaced three names not previously cited here
  (AIToolIndex, YouTools.ai, FutureStack) plus a re-mention of AI Comparator.
  All land on shapes already covered: AIToolIndex's "alternatives, comparison
  context, editorial guides" maps to the already-OPEN "Per-tool Alternatives
  SEO pages" and "No educational/how-to content" gaps; YouTools.ai's
  structured compare-to-alternatives framing is the same; AI Comparator's
  200-tool compare feature matches Toolnaut's own already-shipped
  `Compare.jsx`/`PublicCompare.jsx`. Nothing new.
- **Checked a genuinely untried angle**: bulk/multi-select actions on
  `Stack.jsx`/`Favorites.jsx` (remove several tools at once), a pattern
  common in list-management SaaS UIs. Read both files in full — a user's
  stack is quiz-derived and typically single digits of tools, and no
  competitor cited anywhere in this file ships bulk-select for a
  Spotify-playlist-sized list. Thin value, correctly left unlogged rather
  than force-fit to fill the hour.
- **Checked an annual-vs-monthly pricing toggle** (the one explicitly-excluded
  detail from the Stack-cost-estimate entry's scope cut, line ~5097) against
  Toolnaut's own Pricing page rather than the catalog-tool-pricing gap it was
  excluded from: `Pricing.jsx:17` gates all paid-plan rendering behind
  `VITE_PAYMENTS_ENABLED`, a pre-revenue beta kill-switch per `CLAUDE.md` —
  building a billing-cycle toggle for a payment surface not confirmed live
  would be solving a problem that may not exist yet. Not logged.
- Confirmed by re-reading the build output directly that the "Toolnaut vs
  [competitor]" SEO pages this file already marks `SHIPPED 83805fc` are real
  and current: `npm run build` prerendered both `/vs/theres-an-ai-for-that`
  and `/vs/futurepedia` with real text content, and `npm run smoke` rendered
  `/vs/futurepedia` with 0 console errors — no regression.

**Process note, not a product gap:** `DEVLOG.md` has no 2026-10-01 section —
its newest entry is still 2026-09-30, even though this backlog shows four
research passes and a feature-run ship attempt happened on 2026-10-01 (the
13th pass, 2026-10-02 00:04 UTC entry above, already flagged that the
10-01 18:03 UTC feature run's output landed as an open PR, `#86`, rather than
a `master` push). That same run appears to have skipped writing its DEVLOG
entry and digest issue too — both are scoped to the FEATURE RUN's job, not
this hour's, so left unwritten here, but flagging explicitly so tonight's
18:03 UTC feature run checks whether `#86` should be merged/ported and
writes DEVLOG sections for both the missing 10-01 day and today rather than
assuming yesterday closed cleanly.

Ran `npm test` (311 app tests + radar suite, all pass), `npm run build` (19
static routes + 1102 tool pages, no errors), and `npm run smoke` (24/24
routes, 0 console errors) directly against current `master` to check for a
small real fix per the "small real improvement" allowance. All three clean.
No bug found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap and
made no code change this run.

---

### Research check 2026-10-02 06:04 UTC — no new gap found, fifteenth pass; pricing-model filter idea folds into the already-OPEN access-method entry
Research run (UTC hour 06). Session's local checkout was detached at start
(leftover from a prior run, same as the 03:04 UTC pass); re-pointed to
`origin/master` and fast-forwarded 11 commits before anything ran. CI green
on `master` at `aad59be` (checked via `mcp__github__` tools: `CI`, `Release`,
`Radar`, and `Daily report` workflows all `success`; one `Claude` run shows
`skipped`, triggered by an `issue_comment` event, not a failure). `npm run
radar:health` `OK` (2 runs in the 26h window, last publish 5.0h ago, 8
tools, feed at 428 total). No `agent-fixable` issues open. Confirmed again:
the 28 open `bot/claude/*`/`bot/deps/*` PRs flagged by every pass since the
13th are a separate `agent-*.yml` automation this session's own direct-to-
`master` runs don't touch; newest is still `#86` (the LLM API cost
calculator from the 2026-10-01 18:03 UTC feature run, which landed as an
open PR instead of a `master` push — tonight's 18:03 UTC feature run needs
to check it before rebuilding that gap from scratch, same note the 13th/14th
passes already left).

Fifteenth research pass since 2026-09-29 09:00 UTC. All OPEN entries still
carry a build-ready "Smallest useful version," so this pass again looked for
fresh ground rather than re-sweeping what's already there:

- **Two fresh WebSearches** ("AI tool directory accessibility seat-based
  team pricing comparison export feature 2026", "Futurepedia Toolify
  There's An AI For That new feature launch October 2026") surfaced one
  shape worth checking seriously: several 2026 directories (Benchmark
  Directory, WorthToTry) now filter/compare by **pricing model** — per-seat
  vs. usage-based vs. pay-as-you-go — as a facet distinct from a tool's
  price tier. Checked whether this is genuinely new ground or a restatement
  of something already here: it's the latter. The already-OPEN "Access-
  method facet" entry (2026-09-06, deepened 2026-09-10) already worked
  through this exact shape — deriving a clean enum from the catalog's
  free-text `pricing` field — and deliberately kept it to three broad,
  honestly-derived buckets (`web`/`api`/`self-hosted`) rather than a finer
  pricing-model taxonomy, for the same reason a per-seat/usage-based/flat
  split would hit: `pricing` strings ("Usage-based API", "Freemium/API",
  "Enterprise", "Open weights", ...) are free text written by radar's LLM
  enrichment step, not a controlled vocabulary, so a finer split would
  either need the same LLM-re-enrichment-across-704-records cost that
  entry already rejected, or produce a noisier derived label than the
  three-bucket version already scoped. Not logged as a separate gap — it's
  the same access-method entry's problem restated with more buckets, not a
  new one.
- The two searches also surfaced no features dated this week; the directory
  names that came up (Benchmark Directory, WorthToTry, Stripe.Directory,
  YouTools.ai) either repeat ground already covered (comparison, pricing
  transparency) or, per the "which tools integrate with each other" angle
  Stripe.Directory raises, trace back to the already-`SHIPPED` "Live Tool
  Comparison" integrations row.
- **Retried the Vercel-telemetry angle** flagged open by the 7th/9th/13th
  passes: `list_teams` still returns exactly one team
  (`saikiranreddy18s-projects`), `list_projects` against it still returns
  zero. Still not connected to the deployed project; nothing new to check
  here yet.

Ran `npm test` (311/311), `npm run build` (19 static routes + 1102 tool
pages, feed holding at 428 tools, no errors), and `npm run smoke` (24/24
routes, 0 console errors) directly against current `master` to check for a
small real fix per the "small real improvement" allowance. All three clean,
no bug found.

Per the "never invent a gap to fill the hour" rule, appended no new gap and
made no code change this run.

---

### Research check 2026-10-02 15:04 UTC — no new gap found, sixteenth pass; fixed a stale Status field the PR #86 branch carried but master never got
Research run (UTC hour 15, an off-schedule firing between the usual
00:03/06:03/12:03/18:03 UTC slots). CI green on `master` at `a227c99`
(checked via `mcp__github__actions_list` filtered to `ci.yml`: run #497,
`success` — the unfiltered `list_workflow_runs` call this session tried
first returned a stale-looking page capped at 2026-09-11 and should not be
trusted without the per-workflow filter). `npm run radar:health` `OK` (2
runs in the 26h window, last publish 14h ago, 8 tools, feed at 428 total).
No `agent-fixable` issues open.

**Fixed a real inconsistency before searching anything new:** the "LLM API
cost calculator" entry (found 2026-10-01, line ~8736) was still plain `OPEN`
on `master`, even though PR #86's own diff (confirmed by reading it directly
via `pull_request_read`) already rewrote this exact entry's Status field to
`BUILT, UNMERGED — PR #86` back on 2026-10-01 — that rewrite lives only on
the unmerged PR branch and never reached `master`, so every pass since
(13th, 14th, 15th) kept re-noting "PR #86 still open" in its own prose
without correcting the entry itself. Verified PR #86's diff still matches
the entry's "Smallest useful version" as written (same `modelPricing.js`
shape, same `toolSlug`-keyed deviation from the `pricing`-field scoping rule,
same tests-plus-build-plus-smoke green record) before copying its Status
line onto `master`, following the exact convention already used for the
stack-overlap-warning (#75) and GA4 cookie-consent (#57/#70) entries. This is
a documentation correction, not a new finding — the 28+ open `bot/*` PR
pileup this file has flagged since the 13th pass is still a human merge
queue problem, not something this session's direct-to-`master` runs can or
should route around.

**New competitor checked:** GateOnAI (via Capterra listing, not previously
named in this file). Its three pitched differentiators — a "GateOnAI Score"
(uptime + pricing + features rolled into one rating), an "AI Stack Builder"
("create and share custom tool workflows ... without needing an account"),
and a side-by-side comparison view — all trace back to ground this file
already covers, not new gaps:
- The uptime component of the Score is the same shape the 13th pass already
  considered and set aside ("uptime-tracker idea needs backend infra") —
  scheduled polling plus a datastore this static-SPA-plus-radar architecture
  doesn't have.
- The quality-rating component is the already-OPEN "Per-tool ratings &
  reviews" entry (line 587) — a rating needs real review data first, which
  doesn't exist yet here either.
- The Stack Builder's "share... without needing an account" framing is
  exactly what Toolnaut's own `/app/stack` already does today (localStorage-
  backed, no sign-in required) plus the already-`SHIPPED` share/export flow
  — the one genuinely-missing half of that pattern (a public page to browse
  *other* people's shared stacks) is already the OPEN "No browsable gallery
  of shared stacks" entry (line 7537), not a new one.

Ran `npm test` (311/311), `npm run build` (19 static routes + 1102 tool
pages, feed holding at 428 tools, no errors), and `npm run smoke` (24/24
routes, 0 console errors) directly against current `master`. All three
clean, no bug found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — only the one-line Status correction above, which fixes an existing
entry's accuracy rather than adding ground.

---

### Vendor/maker claim-listing path — a third, still-missing direction alongside "suggest a tool" and "report a wrong listing"
- **Status:** OPEN — DEEPENED 2026-10-06 00:10 UTC, plan re-grounded against
  the two sibling paths that shipped since this entry was found; see below.
- **Seen in:** "claim your listing" is a standing feature on every
  established review/directory site that lists businesses or products it
  didn't create itself — G2 and Capterra both run a vendor-facing "claim
  this profile" flow distinct from their visitor-facing review/correction
  paths; AI Kaptan (a 15,000+-tool AI directory/launch platform) frames
  itself explicitly as a two-sided product — visitors discover tools, makers
  launch and manage their own listing — the same two-sided pattern G2/
  Capterra run, just newer to this specific AI-directory niche. This pass's
  fresh competitor check (WebSearch, "claim your listing AI tool directory
  vendor verification flow 2026") confirms the lightweight industry-standard
  pattern: a verification *email* sent to an address at the product's own
  domain qualifies for instant approval, anything else (a personal email, a
  social-profile link) goes to manual review within a day or two — directories
  don't try to cryptographically prove ownership, they gate on domain-matched
  email or a human's judgment call. Toolnaut has no email capture anywhere
  (no backend, no mailer) and isn't adding one for this, so the plan below's
  GitHub-issue-only, fully-manual-triage approach is the correct shape for a
  static SPA, not a corner cut relative to what competitors actually do for
  their non-domain-matched claims.
- **Gap:** Toolnaut already has two visitor-facing correction paths, and both
  have since shipped — confirmed `src/utils/suggestTool.js` exists (2026-10-05,
  `feat(catalog)` commit `3a7a173`) exporting `buildSuggestToolUrl()` (a
  missing tool) and `buildReportIssueUrl()` (an existing listing that's
  wrong), both thin `issueUrl({ title, body, labels })` wrappers around a
  `GitHub issues/new` URL. Neither is from the maker's own side — the
  "Suggest a tool" entry explicitly scoped out "a separate vendor/company
  submission path" as not-included, and this is that excluded path. Grepped
  `claim` across `src/` and `radar/` again this pass: still only
  `FounderRibbon.jsx`/`FounderOffer.jsx`'s unrelated "Claim founder price"
  checkout copy and `toolResources.js`'s `tool_claims` Supabase table (sourced
  *integration facts*, confirmed by `supabase/migrations/0003_tool_claims.sql`,
  not vendor identity — still a coincidental name collision). There is still
  no "are you the maker of this tool?" link on `ToolDetail.jsx` or
  `ToolPublic.jsx`.
- **Why it matters:** radar discovers and enriches tools automatically, which
  means every one of the 700+ catalog entries describes a product from the
  outside, on a schedule the vendor never agreed to or gets a say in — the
  maker of a tool is the single most motivated, most informed person to flag
  a stale price, a wrong category, or a shut-down product, and today they
  have no path to do that distinct from a random visitor's. It's also a
  legitimate distribution incentive for vendors to link back to their
  Toolnaut listing (same growth logic as the already-OPEN "Embeddable
  Featured on Toolnaut badge" entry) once they know a listing is something
  they can claim and keep accurate.
- **Smallest useful version (what to actually build):** extend, don't
  duplicate, the util the other two correction paths already ship with —
  re-verified every reference below against current `master`:
  - Add a third export to **the now-existing** `src/utils/suggestTool.js` —
    `buildClaimListingUrl({ slug, name, role, note })` reusing the file's own
    private `issueUrl({ title, body, labels })` helper (`suggestTool.js:6-9`),
    `title` pre-filled with the tool name, a structured `body` asking for the
    claimant's role and a link proving affiliation (the tool's own site, a
    social profile, or a company email domain — a human reads and judges
    this, same as the industry's own non-domain-matched claims, see above),
    `labels: 'vendor-claim'`.
  - One small, low-emphasis link next to the two correction links that
    already ship this exact way: `ToolDetail.jsx:167-174`'s "Something wrong
    here?" (`buildReportIssueUrl`, plain-text `<a>`, not an `nb-btn`, styled
    `text-xs text-zinc-500 underline`) and the identical link at
    `ToolPublic.jsx:92-99`. Add "Are you the maker? Claim this listing" as a
    second plain-text link right after each, same classes, same
    `target="_blank" rel="noopener noreferrer"` pattern, `href=
    {buildClaimListingUrl({ slug: tool.slug, name: tool.name })}` — no modal,
    no in-app form, no new import beyond the one extra named export.
  - **What this would NOT include** (kept out to bound the diff, and to stay
    honest about what a GitHub issue can and can't prove): no identity or
    domain-verification *automation* of any kind — a human triages every
    claim exactly like every `tool-submission`/`tool-report` issue already
    is, matching how competitors themselves still hand-review every
    non-domain-matched claim; no vendor login, dashboard, or self-service
    edit rights to the catalog record — a confirmed claim still goes through
    a manual edit or the next radar enrichment pass, same as any other
    correction; no automatic "verified maker" badge on the tool card (a
    fabricated-trust-signal risk this file has consistently avoided
    elsewhere, e.g. the status-note and leaderboard-sample-data entries); no
    change to `tool.status` or any other catalog field from this build alone.
- **Build size:** S — one more export in the already-shipped `suggestTool.js`,
  two one-line link additions (`ToolDetail.jsx`, `ToolPublic.jsx`) placed
  right next to each file's existing "Something wrong here?" link. No
  backend, no new dependency, no new route, no new file. Cheaper to build now
  than when found, since the util and both integration points this entry
  depends on already exist — this is the single cheapest OPEN entry in the
  file to ship next.
- **Found:** 2026-10-03 21:11 UTC

---

### Research check 2026-10-03 21:11 UTC — seventeenth pass; synced two stale Status fields PR #89 already carried, logged one new gap
Research run (UTC hour 21, one of the three research slots on a feature-run
day). CI green on `master` (`ci.yml` run #499, `success` at `c4a24deb`; the
two `master` commits since then are both `github-actions[bot]` radar
publishes, which don't trigger `push`-based workflows under GitHub's own
default token-permission behaviour — not a CI failure). `npm run
radar:health` `OK` (2 runs in the 26h window, last publish 6.7h ago, 4 tools,
feed at 446 total). No `agent-fixable` issues open. One open PR per agent
rule: this session is the scheduled cloud routine, not one of the
`agent-*.yml` workflows or an `@claude`-mention responder CLAUDE.md scopes
that rule to, so it proceeded same as every prior research pass in this log.

**Synced two stale Status fields before searching anything new:** today's
feature run (PR #89, opened 18:21 UTC) rewrote both the "Access-method
facet" entry (to `BUILT, UNMERGED — PR #89`) and the "Download my data"
entry (to `SHIPPED c4a24deb`, since that gap's code has been live on
`master` since 2026-10-02) on its own branch — but `git push origin master`
had blocked that session the same way it blocked the 2026-10-01 and
2026-10-02 feature runs (see PR #89's own body and the backfilled
2026-10-03 `DEVLOG.md` section once PR #89 merges), so neither correction
had reached `master` yet. Read PR #89's diff directly via
`pull_request_read` to confirm both rewrites before copying them over,
following the exact convention already used for PR #86's entry by the
sixteenth pass. This is a documentation correction, not a new finding — the
growing open-PR pileup (issue #67) is still a human-merge-queue problem, not
something a research pass's direct-to-`master` docs commit can route around
for the code itself.

**New gap logged:** the vendor/maker claim-listing path above. Checked three
fresh sources this run — Meta Tools and Vantaige (both via WebSearch for
2026 AI-tool-finder features: Meta Tools' "Community Stacks" and "Stack
Packs" both trace back to the already-OPEN "browsable gallery of shared
stacks" and "Collections" entries respectively, not new ground; Vantaige's
quiz is the same personalized-recommendation pattern Toolnaut's own quiz
already covers) and a general "what do AI directories get criticized for
lacking" search (an OpenFuture AI directory review), whose "no watchlists or
change tracking" point traces back to the already-rejected price-drop-alert
finding from the ninth pass (blocked on the same missing catalog price-
amount field as Stack Cost Estimate) — but whose "thin community layer...
missing case studies, verification, [vendor] documentation" framing pointed
at AI Kaptan's explicit two-sided maker/visitor framing, which is genuinely
new: Toolnaut has a visitor-submission path and a visitor-correction path,
but no maker-side path at all. Confirmed via grep that a commit message
referencing this same idea ("log vendor claim-listing gap") exists in this
file's own git history (commit `986c146`) but its actual content was
destroyed by that commit's own truncation bug and never recovered by the
2026-09-28 restoration pass (which rebuilt from `3dca42e`, a commit that
predates `986c146`) — so this is that idea, researched and written up
properly for the first time, not a duplicate.

Ran `npm test`, `npm run build` and `npm run smoke` directly against current
`master` to check for a small real fix per the "small real improvement"
allowance. All three green, no bug found to fix this run.

---

### Research check 2026-10-04 00:04 UTC — no new gap found, eighteenth pass; browser-extension find re-confirmed as a duplicate, prompt-library idea folds into the already-OPEN guides entry
Research run (UTC hour 00). CI green on `master`: `ci.yml` run #502,
`success`, at `c18ef991` (the commit the seventeenth pass made). The current
`master` tip, `1006a8b`, is a `github-actions[bot]` radar-publish commit with
no corresponding `push`-triggered CI run — consistent with every prior
pass's note that bot-authored pushes don't fire `push`-based workflows under
GitHub's default token permissions, not a CI gap. `npm run radar:health`
`OK` (3 runs in the 26h window, last publish 7 minutes before this check,
450 tools in the feed, up from 446 last pass). No `agent-fixable` issues
open. Session's local checkout was detached and tracking a stale
`origin/master` (`abad463`, from 2026-09-30) at start, same failure mode the
14th/15th passes hit — fetched and re-pointed to current `origin/master`
before running any check. Open-PR count and shape unchanged from the
seventeenth pass (#89, #86, #75 still the three `BUILT, UNMERGED` entries;
still a human-merge-queue problem, not something this session's direct-to-
`master` docs commits can route around).

All 25 real OPEN entries still carry a build-ready "Smallest useful
version," so this pass again looked for fresh ground:

- **Re-audited every landing-page marketing section** against current code
  (`StatsSection.jsx`, `FeaturesSection.jsx`, `HowItWorksSection.jsx`,
  `RolesSection.jsx`, `AudienceSection.jsx`, `ContactSection.jsx`,
  `CTASection.jsx`) per this file's own standing instruction to check
  `src/components/sections/` promises against real behaviour. Nothing
  unlogged: `FeaturesSection.jsx`'s "Spend audit" card (`:12`) is copy this
  file's own capability-matrix work already wrote to describe PR #75's
  still-unmerged overlap-warning feature (traced to line ~7386, "do not
  rebuild — needs a human to merge #75"); `HowItWorksSection.jsx`'s "Master"
  step ("Track progress against your role, not generic benchmarks") is the
  already-OPEN benchmark-tracking entry's own title (line ~6997), verbatim;
  `ContactSection.jsx`'s payment-status line is flag-driven
  (`VITE_PAYMENTS_ENABLED`), not typed as a fact, per its own comment —
  already the fix the "Free public beta" staleness entry (line ~4553)
  describes, not a new instance of the bug it already caught.
- **Two fresh WebSearches** ("AI tool directory browser extension save
  tools 2026", "best AI tools directory new feature launch 2026 workflow
  templates prompt library"). The first surfaced "AI Tools Explorer for
  Chrome" as a live, currently-shipping example — but re-reading the
  already-OPEN "No lookup surface outside toolnaut.xyz" entry (line ~7927)
  confirmed it already names this exact extension by the same DEV Community
  source (`dev.to/aitoolsexplorer`) as its own "Seen in" evidence; today's
  search found nothing that entry doesn't already cite. The second
  surfaced AIChief's new "Prompt Library" feature (hand-picked prompts per
  tool, with exact model/generation settings). Considered this seriously
  before folding it: it's hand-curated content tied to specific tasks, the
  same shape the already-OPEN "No educational/how-to content" entry
  (line ~7699) already scopes a build for (`src/content/guides.js`,
  hand-written, no LLM-generated prose) — a prompt library is a narrower
  content type within that same guide-content gap, not a separate product
  surface, and splitting it out would just fragment one entry's eventual
  build into two. Not logged separately.
- Checked whether PR #86/#89/#75 status had changed (merged, closed, or
  rebased) since the seventeenth pass: `list_pull_requests` shows all three
  still open, unchanged head SHAs. Nothing to re-sync this pass.

Ran `npm test` (311/311), `npm run build` (19 static routes + 1118 tool
pages, feed holding at 450 tools, no errors), and `npm run smoke` (24/24
routes, 0 console errors) directly against current `master`. All three
clean, no bug found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run.

---

### Research check 2026-10-04 03:04 UTC — no new gap found, nineteenth pass; oldest untouched OPEN entry re-verified clean, three fresh angles traced back to existing ground
Research run (UTC hour 03). CI green on `master` (`ci.yml` run #503,
`success`, at `05c37337` — the eighteenth pass's own commit). `npm run
radar:health` `OK` (2 runs in the 26h window, last publish 3.0h ago, 4 tools
published that run, feed holding at 450 total). No `agent-fixable` issues
open. Open-PR shape unchanged from the eighteenth pass: `list_pull_requests`
shows 30 open, the same three `BUILT, UNMERGED` entries this file already
tracks (#89 access-method facet, #86 LLM cost calculator, #75 stack overlap
warning) all still open with unchanged head SHAs — nothing to re-sync.

**Re-verified the oldest untouched OPEN entry** ("Track progress against
your role," found 2026-09-15, 19 days with no Deepened note — the longest
gap of any OPEN entry per a full audit of every `### `/`Deepened` line pair
in this file). Checked every cited reference against current `src/`:
`progressStore.js:10`'s `STATUSES` array, `Stack.jsx:234`'s
`persona.stack.map((t) => ({ ...t, starter: true }))`, the unused `starter`
read at `Stack.jsx:368`, and `HowItWorksSection.jsx:9`'s exact "Track
progress against your role, not generic benchmarks" copy — all four still
match verbatim. Nothing drifted; the entry's own "Smallest useful version"
already fully specifies the build (one derived stat, one "core" tag reusing
the existing `starter` flag), so there was nothing to add beyond confirming
it's still accurate and still buildable as scoped.

**Three fresh angles checked, all traced back to ground this file already
holds:**
- WebSearch ("AI tool directory 2026 referral program / waitlist / AI agent
  marketplace / browser extension") surfaced PoweredByAI's new AI-agent
  marketplace (build/submit/earn from agents) and Toolify's Chrome-extension
  sub-directory. The agent marketplace is the same MCP/agent-marketplace
  shape the thirteenth pass already considered and set aside as backend-
  shaped (accounts, publishing, payouts — none of which this static SPA
  has); the Chrome-extension point is the same "AI Tools Explorer for
  Chrome" finding the already-OPEN "No lookup surface outside toolnaut.xyz"
  entry (line ~7927) already cites, re-confirmed a duplicate for the second
  pass running.
- WebSearch on FutureTools.io/Toolify.ai feature sets turned up nothing not
  already covered by this file's own "Seen in" citations for those two
  sites elsewhere.
- Considered internationalization (grepped `src/` for `i18n`, `locale`,
  `translat` — only false positives: CSS `transform`, date-formatting
  `toLocaleString`, and unrelated prose, confirmed genuinely absent) as a
  possible new gap. Set aside without logging: every directory this file has
  studied (TAAFT, Futurepedia, FutureTools, Toolify, GateOnAI, Whizi, AI
  Kaptan) is itself English-only, so this isn't a competitor-pattern gap the
  way every other OPEN entry is; and a real build would mean translating the
  quiz, roadmap, and all marketing copy — a content-generation problem this
  file's own LLM-enrichment-accuracy rules (the dollar-amount pricing gap's
  "extraction, not estimation" standard) would require real care over, not a
  same-day feature-run diff. Noted here so a future pass doesn't re-spend
  time confirming the same absence, but not logged as OPEN — it's not
  "promising but thin," it's simply not yet a validated, boundable gap.
- Also checked dark mode and a service-worker/offline pass as possible
  gaps before researching further — both already exist (`ThemePicker.jsx`,
  `moonStore.js` for the former; `public/sw.js` with the build-stamped cache
  this file's own CLAUDE.md flags as load-bearing, for the latter) — not
  gaps.

Ran `npm test` (311/311), `npm run build` (19 static routes, feed at 450
tools, no errors), and `npm run smoke` (24/24 routes, 0 console errors)
directly against current `master`. All three clean, no bug found to fix
this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run.

---

### Research check 2026-10-04 06:04 UTC — twentieth pass; no new gap, but the changelog staleness bug from the 2026-09-23 fix had quietly recurred and is fixed again
Research run (UTC hour 06). `npm run radar:health` `OK` (2 runs in the 26h
window, last publish 6.0h ago, 4 tools published that run, feed holding at
450 total). No `agent-fixable` issues open. `list_pull_requests` shows the
same 30 open, with the same three `BUILT, UNMERGED` entries this file
already tracks (#89 access-method facet, #86 LLM cost calculator, #75 stack
overlap warning) unchanged — nothing to re-sync.

Surveyed every OPEN entry for one thin enough to deepen (sorted all
`### `/`Status: OPEN` pairs by line length and by `Found:` date). Read the
three shortest/oldest candidates in full — "No browsable gallery of shared
stacks," "Vendor/maker claim-listing path," and "Changelog only looks
backward" — all three already carry a complete "Smallest useful version,"
file:line citations, and an explicit "what this would NOT include" section;
none were thin. Rather than force a deepening pass on already-complete
entries, re-opened the "Changelog only looks backward" entry's own
2026-09-23 "Deepened" note, since it diagnosed a recurring *process* failure
(feature runs shipping without adding a `changelogData.js` entry) rather
than a one-time bug, and a process failure is exactly the kind of thing that
recurs.

**It had recurred.** `src/utils/changelogData.js`'s newest entry was still
dated 2026-09-19 — the same file the 2026-09-23 pass had backfilled up to
`83805fc` — while four real, user-visible commits had shipped since and were
never added: `2cce654` (2026-09-28, Cmd/Ctrl+K command palette), `18e4762`
(2026-09-29, Compare's integrations row wired to real data), `2855c9e`
(2026-09-29, self-reported time-value calculator beside StackCost), `70ceb14`
(2026-09-30, focus-trap fix across all 7 modals + OpenSearch browser-search
descriptor), and `c4a24deb` (2026-10-02, "Download my data" button). Verified
each sha's actual diff with `git show --stat` before writing its entry, same
standard the original backfill used — no invented copy. (Two narrower
same-feature follow-up fixes, `166056c` and `01aed7a`, and one internal
copy-accuracy fix, `0afe1d9`, were left out as not independently user-facing,
already folded into the `70ceb14` focus-trap entry or too minor for this
page's voice — consistent with the original backfill's own bar.)
`/changelog`'s own "Shipping, almost every day" claim was true again only
retroactively, same false-claim shape the 2026-09-23 note already described.

**Fixed in this run**: added all five entries to `CHANGELOG` in
`src/utils/changelogData.js`, newest-first, same plain-language voice (no
shas, no file paths) the file's own header comment requires. This is a
second instance of the exact same honesty gap, not a new one — the
underlying fix (translate `SHIPPED` backlog entries into this file as part
of the feature run's own write-up step) is still the "Smallest useful
version" this entry already specifies and is still OPEN; a one-off backfill
does not close a recurring process gap, so the entry's own scope is
unchanged.

Also checked one fresh angle: WebSearch for "AI tool directory 2026 vendor
claim listing verified badge trust signal" to see whether the already-OPEN
"Vendor/maker claim-listing path" entry (found 2026-10-03) had any newer
competitor precedent worth folding in. Found two real examples — AIChief
pays a "Verified Owner Badge" to vendors who claim their listing (cited at
2.4x higher click-through), and TopAI.tools uses a "Verified" badge to mean
pricing/maintenance claims were checked — but both are the automatic
verified-badge-on-claim pattern that entry's own "what this would NOT
include" section already rules out by name, as the same class of
fabricated-trust-signal risk this file avoids everywhere else (status-note,
leaderboard-sample-data). Confirms the existing scope rather than widening
it; nothing to fold in.

Ran `npm test` (311/311), `npm run build` (19 static routes including a
clean `/changelog` prerender, feed at 450 tools), and `npm run smoke` (24/24
routes, 0 console errors) against the `changelogData.js` change before
committing. All three clean.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — logged a recurrence of an existing one instead, and fixed it the same
way the first occurrence was fixed.

---

### Research check 2026-10-04 09:04 UTC — no new gap found, twenty-first pass; one real CSS bug fixed instead
Research run (fired off-cycle at UTC hour 09, not one of the 00/06/12/18
schedule points — treated as a normal research hour per "any other ->
RESEARCH RUN"). `npm run radar:health` `OK` (2 runs in the 26h window, last
publish 9.0h ago, 4 tools published that run, feed holding at 450 total).
No `agent-fixable` issues open. `ci.yml` green on `master` at `b408265` (the
twentieth pass's own commit). A separate, unrelated scheduled workflow,
`.github/workflows/agent-bugfix.yml` ("Agent · Bugfix", run #80), failed at
08:39 UTC — its single step failure was in `anthropics/claude-code-action@v1`
itself (22s runtime, no app code executed), not in this project's `ci.yml`,
and that workflow is outside this routine's scope per CLAUDE.md's "never
modify `.github/workflows/`" and this prompt's own urgent-work list (which
names `ci.yml`, radar health, and `agent-fixable` issues, not every
scheduled workflow in the repo) — noted here for visibility, not acted on.
`list_pull_requests`/`pull_request_read` on #89, #86, #75 confirm all three
still open with unchanged head SHAs — the same three `BUILT, UNMERGED`
entries this file has tracked since the seventeenth pass; nothing to
re-sync.

**Re-audited four marketing/pricing sections the nineteenth pass's sweep did
not cover** (`PricingSection.jsx`, `FounderOffer.jsx`, `HeroSection.jsx`,
`CapabilityMatrix.jsx` — the eighteenth/nineteenth passes' own audits named
only `Stats/Features/HowItWorks/Roles/Audience/Contact/CTASection.jsx`).
All four hold up: `PricingSection.jsx`'s comparison table already renders
`'planned'` as a dimmed badge rather than a live claim; `FounderOffer.jsx`'s
deadline is the fixed `FOUNDER_DEADLINE` constant (not a per-visitor
countdown-from-load lie) and already renders nothing once it expires;
`HeroSection.jsx`'s trust-row claims (`count`, `updated`, "no credit card")
are all read live from the catalogue or gated on `VITE_PAYMENTS_ENABLED`,
same pattern the "Free public beta" staleness entry already fixed
elsewhere; `CapabilityMatrix.jsx`'s live/planned split is correct and
payment-flag-driven. No unlogged promise/reality gap found in any of the
four. Also re-checked `Support.jsx` on the theory its FAQ accordion might be
missing `FAQPage` JSON-LD the way the structured-data gap's own three
call-sites didn't originally cover it — it already has one
(`Support.jsx:53-86`), built some earlier run this file has no dedicated
entry for; not a gap.

**Two fresh WebSearches** ("AI tool directory 2026 new feature team
workspace collaboration shared workspace", "best AI tools directory site
2026 launch new feature roundup"). The first surfaced Chipp/TeamAI/Juma —
all "AI workspace for teams" products for *using* multiple LLMs together
inside shared prompts/folders, not directory-discovery products; the shape
closest to Toolnaut (multi-user collaboration on a stack) is the same
backend-shaped ground the already-OPEN "Team tier" (`src/content/
capabilityMatrix.js`-adjacent, found earlier) and "No browsable gallery of
shared stacks" entries already claim — not a new surface. The second
surfaced only aggregate market-size stats (~47,400 AI tools listed
globally, Toolify's 29,900-tool catalogue) and a speculative "AI
Intelligence Terminal" product page with no concrete, reproducible feature
description beyond marketing copy — nothing citable or buildable. Also
re-checked referral/affiliate, newsletter, Discord/Slack-bot, and rate-limit
angles by grepping this file for prior mentions — all four are already
logged as REJECTED or folded into existing OPEN entries (`TrustPanel.jsx`'s
explicit "no affiliate link, no referral code" stance; digest-email and
Discord-bot defaults rejected at the ninth/thirteenth passes; rate limiting
already scoped into the dev-API gap).

**One real bug found and fixed**: `CapabilityMatrix.jsx` (two call sites,
the per-cell `<td>` and the per-row `<th scope="row">`) used
`border-t-2 border-white/10/60` — a double opacity-modifier Tailwind class
(`color/10/60`) that is not a valid utility. Confirmed by building and
grepping `dist/assets/index-*.css`: `border-t-2` emitted its width rule as
expected, but `border-white/10/60` matched zero rules anywhere in the
compiled stylesheet, meaning the capability-matrix table's row dividers
carried no border-color utility at all and fell back to the browser
default. The sibling comparison table in `PricingSection.jsx` uses the
correct single-opacity form (`border-b-2 border-white/10`) for the exact
same row-divider purpose, confirming this was a typo, not an intentional
double-modifier. Fixed both occurrences to `border-white/10`; rebuilt and
confirmed `dist/assets/index-*.css` now contains exactly one
`border-white/10`-derived rule and zero `border-white/10/60` matches.

Ran `npm test` (311/311), `npm run build` (19 static routes, 1122 tool
pages, feed at 450 tools), and `npm run smoke` (24/24 routes, 0 console
errors) against the `CapabilityMatrix.jsx` fix before committing. All three
clean.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — the two fresh angles traced back to ground already covered or
rejected, and the hour's real find was the CSS bug above, not a product
gap.

---

### Research check 2026-10-04 12:04 UTC — no new gap found, twenty-second pass; a competitor citation checked out false before it got logged
Research run (UTC hour 12). `npm run radar:health` `OK` (2 runs in the 26h
window, last publish 12.0h ago, 4 tools published that run, feed at 450
total). No `agent-fixable` issues open. `ci.yml` green on `master` at
`e4dcafb` (`chore(release): v0.72.33`, the twenty-first pass's own release
tag — `Agent · Research` (run #36, 10:17 UTC) shows a `failure` conclusion,
but that is the separate `agent-research.yml` scheduled workflow, not this
session's own routine or `ci.yml`; outside this prompt's named urgent-work
list (`ci.yml`, radar health, `agent-fixable` issues) same as the
`Agent · Bugfix` failure the twenty-first pass already noted and left
alone. `list_pull_requests` shows the same 30 open PRs, including the same
three `BUILT, UNMERGED` entries this file has tracked since the seventeenth
pass (#89, #86, #75) with unchanged head SHAs — nothing to re-sync. Local
checkout was in detached-HEAD state at start (same recurring failure mode
the 14th/15th/18th passes hit) — fetched and re-pointed `master` to
`origin/master` before running any check.

**One fresh angle looked promising, then fell apart under verification.**
A WebFetch of a "Best AI Tool Directories 2026" roundup (`fast.io/resources/
best-ai-tool-directories-2026.md`) listed, among real directories (TAAFT,
Toolify, ToolDirectory.ai, AIXploria, RankmyAI), a line crediting "Fast.io"
itself with "access through a remote MCP server" and a "command line
client... on npm" — which read as a new angle on the already-OPEN "No
public developer API" entry (line ~5426): exposing Toolnaut's own catalog
to AI agents via an MCP endpoint, not just a human-facing docs page, given
this app already runs serverless functions under `api/` (`api/chat.js`
etc.) that an MCP transport could reuse. Checked the claim before writing
anything: a second WebSearch on "fast.io AI tool directory MCP server API"
confirms Fast.io is an AI-first *file-sharing and collaboration* platform
(50GB free storage, branded shares, built-in RAG) that published an SEO
listicle about AI tool directories to catch exactly this kind of search —
it does not operate one itself, and its MCP server fronts its own file
storage, not a tool catalog. Not a real "competitor does this" citation,
so not logged; this file's own standard (every "Seen in" claim gets
checked against the source's real behavior, not just its marketing copy)
is exactly what caught it. The underlying idea (MCP access to
`tools.json`) may still be worth a real competitor citation if one
surfaces later — none exists yet.

**Second angle: considered whether to add a "last verified" date to
`ToolDetail.jsx`**, since `ToolDirectory.ai`'s graveyard section (already
cited in the "Tool graveyard" OPEN entry, line ~2649) also publishes
"review dates" showing when each listing was re-checked. Toolnaut's
catalog does carry a timestamp (`discoveredAt`), but grepping `radar/` for
any re-verification pass (`recheck|reverify|re-verify|refresh.*existing|
updateExisting`) returns zero hits — radar only discovers new candidates,
it never revisits a published record to confirm it still holds. Showing
`discoveredAt` as if it meant "checked recently" would be the same
fabricated-trust-signal shape this file has consistently ruled out
elsewhere (the status-note entry, the leaderboard-sample-data entry, the
vendor-claim entry's "no automatic verified badge") — the date would be
honest about *discovery*, not *verification*, and labeling it the latter
would be the lie. Not logged; radar would need an actual re-check pass
before this is buildable honestly, which is a pipeline change well outside
a research pass's scope.

Ran `npm test` (311/311), `npm run build` (19 static routes, 1122 tool
pages, feed at 450 tools), and `npm run smoke` (24/24 routes, 0 console
errors) directly against current `master`. All three clean, no bug found
to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap
this run — one angle traced back to a false competitor citation before it
could be logged, the other is blocked on a radar pipeline capability that
doesn't exist yet, and the day's two other checks (CI, open-PR sync) found
nothing changed.

### Research check 2026-10-04 15:04 UTC — no new gap found, twenty-third pass (off-cycle fire); oldest untouched OPEN entry re-verified clean
Off-cycle run — the schedule's four fixed slots are 00:03/06:03/12:03/18:03
UTC and this one fired at 15:04, between the twenty-second pass (12:04) and
the day's feature run (18:03); treated as an ordinary research hour per the
routine's hour-based dispatch (only hour 18 is feature+digest, everything
else is research). CI green on `master` (`ci.yml` run #507, `success`, at
`fec35de` — the push before the radar bot's own `cedc24d` auto-commit, which
does not retrigger CI since it's pushed by `github-actions[bot]` via the
workflow's own token, the same no-retrigger behavior every prior radar
commit in this repo has shown). `npm run radar:health` → `OK` (3 runs in the
26h window, last run/publish 16m old at check time, 4 tools published that
run, feed now at 454 total — local `master` had briefly read `STALE` before
this check because the clone's branch hadn't been fast-forwarded past
`abad463`; merging to `origin/master` fixed the read, not a real pipeline
problem). No `agent-fixable` issues open. Open-PR shape unchanged: spot-
checked all three tracked `BUILT, UNMERGED` entries individually (`pull_request_read`)
— #89 (access-method facet), #86 (LLM cost calculator), #75 (stack overlap
warning) all still open, unmerged, same head SHAs as the prior pass recorded.

**Re-verified the oldest untouched OPEN entry** ("Discover only ever ranks
toward the mainstream — no hidden-gem/serendipity path," found 2026-09-15
21:06, line ~7072 — next-oldest after "Track progress against your role,"
which the nineteenth pass already re-verified on 2026-10-04). Checked every
cited reference against current `src/`: `prominence.js`'s `FLAGSHIP` (line
24), `starterScore` (line 37), `byProminence` (line 88) all unchanged in
shape and still exported with no `isFlagship` sibling anywhere in the file.
`Discover.jsx`'s `freshTools`/`recentlyViewed` rails have drifted a few
lines (now 232–277, was cited as "~233–260") but the markup pattern the
entry proposes copying — `sticker` card, `w-40 shrink-0`, `arcade-heading
compact text-sm`, line-clamp blurb — is identical at both rail sites, so the
proposed third rail still slots in exactly as scoped. `Stack.jsx`'s
`toolOfTheDay()` is now at line 26 (was "25–34"), with `.slice(0, 12)` at
line 31 and the `Math.floor(Date.now() / 86400000)` rotation key at line 33
— same one-line drift pattern every other re-verified entry in this file has
shown, nothing structural. Re-ran the entry's own grep (`random|surprise|
shuffle|serendip|hidden gem` across `src/`) — still only animation/jitter
hits (`ParticleField.jsx`, `cursorEffects.js`, `Galaxy.jsx`,
`AppErrorBoundary.jsx`'s one `Math.random()`) plus the unrelated
`roadmapGenerator.js` quiz-distractor `shuffleWithAnswer()` and
`goalChat.js`'s `random` keyword list — no discovery-facing hit exists yet.
Nothing drifted in substance; the entry's "Smallest useful version" (one
pure `isFlagship()` export, one `useMemo` in `Discover.jsx`, one rail block
copied from an existing pattern, build size S) is still accurate and still
the most build-ready OPEN entry in the file after the two LLM-cost-calculator
and access-method-facet gaps already sitting in unmerged PRs.

**Fresh angles checked, all traced back to ground this file already holds:**
- WebSearch ("AI tool directory 2026 onboarding personalization") surfaced
  mostly enterprise-HR-onboarding SaaS content (Disco, Guidde, BenchPrep) —
  a different product category entirely, not an AI-tool-directory pattern —
  plus a Fast.io listicle citing itself, the same self-promotional-SEO shape
  the twenty-second pass already flagged as unreliable. Nothing Toolnaut-
  relevant.
- WebSearch ("Futurepedia Toolify new feature October 2026") returned no
  dated feature announcement for either site; the substantive claims that
  did surface (Futurepedia's 5,000+ tool count, capability-combination
  filtering, near-instant indexing) are the same facts this file's existing
  Futurepedia citations already cover, not new ground.
- Checked a referral/invite-program angle (prompted by the nineteenth pass's
  PoweredByAI mention) against both the backlog and current `src/` — the
  embeddable-badge gap already covers the "backlink + referral traffic"
  mechanic for vendors, and the Discord-invite gap already covers the only
  actual invite-link surface in the app; grepped `src/` for `referral` and
  `invite` and found no unrelated hit. Not a new gap.

Ran `npm test` (311/311), `npm run build` (19 static routes, feed at 454
tools, no errors), and `npm run smoke` (24/24 routes, 0 console errors)
directly against current `master`. All three clean, no bug found to fix
this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run.

### Research check 2026-10-04 21:04 UTC — no new gap found, twenty-fourth pass (off-cycle fire); oldest untouched OPEN entry re-verified clean, feature run's new PR synced
Off-cycle run — fired at 21:04 UTC, between the day's own feature+digest run
(18:03) and the next scheduled slot (00:03); treated as an ordinary research
hour per the routine's hour-based dispatch. `npm run radar:health` → `OK` (2
runs in the 26h window, last publish 6.3h ago, 4 tools published that run,
feed at 454 total). No `agent-fixable` issues open. `ci.yml`/`release.yml`
green on `master` at `89828d9` (the twenty-third pass's own commit; local
checkout was again in detached-HEAD state at start, same recurring mode the
14th/15th/18th/22nd passes hit — re-pointed `master` to `origin/master`
before running any check).

**Open-PR shape changed since the last sync**: `list_pull_requests` now shows
31 open PRs, one more than every prior pass since the seventeenth —
today's 18:03 feature run shipped PR #91
(`bot/claude/discover-hidden-gems-rail-2026-10-04`, sha `605eacc`,
"feat(discover): hidden-gems rail surfaces the catalog's long tail"). This is
exactly the "Discover only ever ranks toward the mainstream" entry (line
~7072) the twenty-third pass re-verified six hours ago and called the most
build-ready OPEN entry in the file — confirms that call was right. The entry
itself (below) is updated from OPEN to BUILT, UNMERGED to match, joining the
three already-tracked unmerged PRs (#89 access-method facet, #86 LLM cost
calculator, #75 stack overlap warning), all four still open/unmerged with
unchanged head SHAs on spot-check via `pull_request_read`.

**Re-verified the next-oldest untouched OPEN entry** ("Sharing a stack link
produces zero personalized preview," found 2026-09-16 03:20 UTC, line ~7236 —
next after "Track progress against your role" and "Discover only ever ranks
toward the mainstream," both re-verified earlier today by the nineteenth and
twenty-third passes). Checked every cited reference against current `src/`:
`src/utils/shareStack.js` and `src/pages/SharedStack.jsx` (the backlog's own
first-ever SHIPPED entry) are unchanged; `SharedStack.jsx:21-41`'s `useHead()`
call still only fires client-side via `useEffect` and still never sets
`og:image`/`twitter:image` (`src/utils/head.js` grepped for both — zero hits,
confirmed again); `index.html:21` (`og:image`) and `:29` (`twitter:image`)
are still the exact lines holding the one static pair, matching the entry's
citation verbatim; `vercel.json`'s catch-all rewrite
(`"/((?!api/).*)": "/_shell.html"`) is unchanged and still sends every
`/s/:slug` request to the unrendered shell; `getTool` is still at
`toolsCatalog.js:763`; no `middleware.js` exists anywhere in the repo
(confirmed by listing the repo root). Nothing drifted — the entry's
"Smallest useful version" (one Vercel Edge Middleware matching `/s/:slug*`,
reusing the two already-pure utils it names, build size M) is still accurate
and still the next most build-ready OPEN entry in the file once the four
PRs above merge or get superseded.

**Two fresh angles checked, both traced back to ground this file already
holds or to a different product category:**
- WebSearch ("AI tool directory 2026 gamification badges leaderboard streak
  engagement feature") surfaced "The AI Library," a gamified AI-launchpad
  directory (live leaderboards for new *launches*, XP/streak APIs like
  Trophy 1.0). That's the submission-launchpad shape (vendors submitting,
  users upvoting) the already-OPEN "leaderboard's own precondition" entry
  (line ~5275) and the already-REJECTED vendor-claim/affiliate angles cover,
  not a new gap — Toolnaut's own "leaderboard" is a personal
  progress-ranking feature, not a launch-upvote board, so the pattern
  doesn't transfer as-is.
- WebSearch ("AI tool directory website accessibility WCAG screen reader
  2026") surfaced AIChief's published WCAG 2.1 AA accessibility statement.
  Checked whether this is a real, uncovered Toolnaut gap: the app has
  already shipped focus-trap fixes across all 7 modals (`70ceb14`), a
  skip-to-content link for signed-in routes, and keyboard-navigable
  command-palette (`2cce654`) — piecemeal a11y work already exists, it's
  just never been written up as its own named gap with a single audit and
  fix list the way other gaps in this file are scoped. Didn't log it: unlike
  every other OPEN entry, there's no single concrete, bounded defect to cite
  yet (no failing contrast ratio, no untrappable focus, no missing
  alt-text found by grep) — only "no one has done a full WCAG pass," which
  isn't the checkable, demonstrable-gap bar this file holds elsewhere
  (favorites, PDF export, etc. are all backed by a specific `grep` showing
  zero matches). Worth a dedicated audit pass if a future run has the hour
  for it, but not yet a "promising but thin" entry — it's not thin, it's
  unstarted and unscoped.

Ran `npm test` (311/311), `npm run build` (19 static routes, 1126 tool pages,
feed at 454 tools, no errors), and `npm run smoke` (24/24 routes, 0 console
errors) directly against current `master`. All three clean, no bug found to
fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — synced one entry's status to match today's feature-run PR, re-verified
the next-oldest OPEN entry clean, and both fresh angles traced back to an
existing category or an unscoped (not yet "thin") idea.

### Research check 2026-10-05 03:03 UTC — no new gap found, twenty-fifth pass; oldest untouched OPEN entry re-verified clean
Scheduled run, UTC hour 03 (research hour). `npm run radar:health` → `OK`
(2 runs in the 26h window, last publish 2.9h ago, 5 tools published that
run, feed at 459 total). `list_workflow_runs` on `master`: `CI`/`Release`
both green at the latest push (`26f7479`/`57e2a8a`). No `agent-fixable`
issues open. Local checkout was again in detached-HEAD state at start, the
same recurring mode the 14th/15th/18th/22nd/23rd/24th passes hit —
re-pointed `master` to `origin/master` before running any check.

Open-PR count unchanged since the twenty-fourth pass's sync (still 31,
#89/#86/#75/#91 the four tracked `BUILT, UNMERGED` entries with unchanged
head SHAs) — nothing new to sync this run.

**Re-verified the next-oldest untouched OPEN entry** ("The public search
page's own placeholder promises task search," found 2026-09-16 09:10 UTC,
line ~7411 — next after "Track progress against your role" (19th pass),
"Discover only ever ranks toward the mainstream" (23rd pass, now PR #91),
and "Sharing a stack link produces zero personalized preview" (24th pass),
all three found within hours of each other on 2026-09-15/16 and now all
checked). Read `src/utils/search.js` directly: `matchesQuery()` is still
exactly the word-order-independent-but-literal-substring check the entry
cites (`words.every((word) => haystack.includes(word))`, line 15) — no
stemming, no prefix matching, unchanged since the entry was written.
Re-ran the entry's own worked example against the live catalog: `Otter.ai`,
`Notta`, and `Gladia` are all still tagged `meeting`/`transcription` in
`toolsCatalog.js` (grepped directly — same three tools cited originally,
unchanged tags), and the query "transcribe meetings" still fails to match
any of them under the current matcher, for the same two reasons the entry
names (plural "meetings" vs. singular tag "meeting"; "transcribe" vs.
"transcription" — neither a literal substring of the other). `SearchTools.jsx`
still carries the same placeholder/intro copy promising problem-shaped
search. Nothing drifted — the entry's "Smallest useful version" (a bounded
5-character leading-prefix match added to, not replacing, the exact-substring
check, build size S, one function + one test file) is still accurate and
still the next most build-ready OPEN entry in the file.

**Two fresh angles checked, both traced back to ground this file already
holds:**
- WebSearch ("AI tool directory 2026 compare feature side by side new
  launch competitor analysis") surfaced TheAISelect, YourAIFinder, Add AI
  Directory, and ToolsPedia all shipping side-by-side comparison as a 2026
  differentiator, and ToolJunction running a dedicated "ToolJunction vs
  Futurepedia" comparison page. Toolnaut already ships both: `Compare.jsx`
  (session) and `PublicCompare.jsx` (public, `/compare/:slugs`) predate this
  search by weeks (`cba2691`), and the `/vs/:competitor` page type
  (`83805fc`) is the exact "X vs Y" pattern ToolJunction runs, confirmed
  still live this run (`/vs/futurepedia` rendered clean in this run's own
  `npm run build`/`npm run smoke` output above). No new ground.
- WebSearch ("Futurepedia Toolify AI directory personalization
  recommendation feature 2026") surfaced Futurepedia's "scored verdicts" and
  "verified user reviews" framing and real-time-index claims. Scored
  verdicts/reviews is the already-OPEN "Per-tool ratings & reviews" entry
  (line ~587, found 2026-08-24, deepened); "real-time updates, new releases
  indexed almost immediately" is exactly what the radar pipeline already
  does on a daily cadence — not a gap, a description of a already-shipped
  mechanism. Checked whether Futurepedia's structured-course content
  ("education platform") was a new angle: it folds into the already-OPEN
  "No educational/how-to content" entry (line ~7708, found 2026-09-20), not
  a new one.

Ran `npm test` (311/311), `npm run build` (19 static routes, 1131 tool pages,
feed at 459 tools, no errors), and `npm run smoke` (24/24 routes, 0 console
errors) directly against current `master`. All three clean, no bug found to
fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — re-verified the next-oldest OPEN entry clean and both fresh angles
traced back to existing, already-logged categories.

### Research check 2026-10-05 06:04 UTC — no new gap found, twenty-sixth pass; oldest untouched OPEN entry re-verified clean
Scheduled run, UTC hour 06 (research hour). `npm run radar:health` → `OK`
(2 runs in the 26h window, last publish 5.9h ago, 5 tools published that
run, feed at 459 total). `list_workflow_runs` on `master`: `CI`/`Release`
both green at the latest push (`6183ae3`). No `agent-fixable` issues open.
Local checkout was again in detached-HEAD state at start — same recurring
mode most passes since the 14th have hit — re-pointed `master` to
`origin/master` before running any check.

Open-PR count unchanged: the four tracked `BUILT, UNMERGED` entries
(#91/#89/#86/#75) are all still open with unchanged head SHAs
(`605eacc`/`9db220e`/`b2b4a81`/`ffe7e84`) — nothing new to sync this run.

**Re-verified the next-oldest untouched OPEN entry** ("No way to flag a
wrong listing," found 2026-09-16 21:15 UTC, line ~7493 — next after "Track
progress against your role" (19th pass), "Discover only ever ranks toward
the mainstream" (23rd pass, now PR #91), "Sharing a stack link" (24th pass),
and "The public search page's own placeholder promises task search" (25th
pass), all found within hours of each other on 2026-09-15/16 and now all
checked). Grepped `report|incorrect|flag` across `src/pages/app/
ToolDetail.jsx` and `src/pages/ToolPublic.jsx` directly — still zero hits in
both, confirming the core gap (no user-facing "this is wrong" path anywhere)
is unchanged. The entry's planned build shares a util with the still-OPEN
"Suggest a tool" gap (`src/utils/suggestTool.js`'s `buildSuggestToolUrl` /
`GITHUB_REPO_URL`) — confirmed that file still does not exist anywhere in
`src/` and the Suggest-a-tool entry is still `OPEN`, so the shared-module
plan is still valid, neither half has shipped. Line citations re-checked
against current `master`: the status badge condition
(`tool.status && tool.status !== 'Active'`) is still at
`ToolDetail.jsx:123`, exactly as cited; the "Visit website" button block in
the same file now sits at 151-163 (drifted by a few lines from unrelated
changes, same range the entry already cites); `ToolPublic.jsx`'s button row
is now at 74-88, also still matching. Nothing drifted — the entry's
"Smallest useful version" (one added export on the Suggest-a-tool util, one
small text link on each of the two tool-detail surfaces, build size S) is
still accurate and still the next most build-ready OPEN entry in the file.

**Two fresh angles checked, both traced back to ground this file already
holds:**
- WebSearch ("AI tool directory 2026 data accuracy 'report incorrect
  listing' OR 'suggest edit' feature") surfaced The GTM Directory's "Suggest
  Edit" feature on every tool page plus accuracy-voting, with a committed
  5-business-day correction SLA — this is the exact same "report this is
  wrong" pattern the re-verified entry above already describes and plans to
  build, not a new angle. Confirms the gap is current competitor practice in
  2026, not stale research; no new entry needed.
- WebSearch ("SaaS directory site 2026 multi-language internationalization
  i18n OR dark mode toggle OR keyboard shortcuts power user feature")
  surfaced directory-builder platforms (Dirstarter, DirectoryStack, FormLine)
  shipping i18n and dark-mode toggles as 2026 differentiators. Both were
  already checked and closed in this file: dark mode / theme toggle (line
  ~8403, "already [ruled out / not a gap]" — Toolnaut's single dark theme is
  a deliberate design choice, not a missing feature) and i18n/localization
  (line ~8551 and re-confirmed line ~9498, grepped `i18n|locale|translat`
  across `src/` with no real hits, rejected as a multi-week SEO/localization
  project rather than a buildable gap). Re-ran both greps this run to be
  sure neither state had changed — `grep -rniE "i18n|locale|translat" src/`
  still returns only false positives (component names like
  `GalaxyExplorer.jsx`'s unrelated math, not real i18n code), and
  `grep -rln "theme toggle\|prefers-color-scheme" src/` still returns only
  `src/index.css`'s system-preference media query, no user-facing toggle.
  Both still closed, not reopened.

Ran `npm test` (311/311), `npm run build` (19 static routes, 1131 tool pages,
feed at 459 tools, no errors), and `npm run smoke` (24/24 routes, 0 console
errors) directly against current `master`. All three clean, no bug found to
fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — re-verified the next-oldest OPEN entry clean and both fresh angles
traced back to existing, already-logged categories.

### Research check 2026-10-05 09:03 UTC — no new gap found, twenty-seventh pass; oldest untouched OPEN entry re-verified clean
Scheduled run, UTC hour 09 (off-cycle fire — between the 06:03 and 12:03
research slots). `npm run radar:health` → `OK` (2 runs in the 26h window,
last publish 8.9h ago, 5 tools published that run, feed at 459 total).
`list_workflow_runs` on `master`: `CI`/`Release` both green at the latest
push (`0d56f29`). No `agent-fixable` issues open. Local checkout was again
in detached-HEAD state at start, same recurring mode noted since the 14th
pass — re-pointed `master` to `origin/master` before running any check.

Open-PR count: the four tracked `BUILT, UNMERGED` entries (#91/#89/#86/#75)
are still open; spot-checked #91 directly — still open, head sha `605eacc`
unchanged from the 26th pass's record. Nothing new to sync this run.

**Re-verified the next-oldest untouched OPEN entry** ("No browsable gallery
of shared stacks," found 2026-09-17 03:20 UTC, line ~7562 — next after "No
way to flag a wrong listing" (26th pass), itself after the four entries
found within hours of each other on 2026-09-15/16 that the 19th/23rd/24th/
25th passes worked through). Re-checked every claim against current
`master`: `src/utils/shareStack.js` is still exactly `encodeStackSlugs`/
`decodeStackSlugs`, no storage write; `grep -rn "shared_stacks\|public_stacks\|from('stack" src`
still returns zero hits; `src/App.jsx` still has no `/gallery` route;
`src/pages/SharedStack.jsx` still reads only from the URL param;
`src/state/communityStore.js` is still free-text forum posts, not a
structured stack object; the Legal.jsx server-storage claim is still at
lines 78-82, unchanged. Nothing drifted — the entry's "Smallest useful
version" (one Supabase table, one store module, one new public route, one
opt-in toggle on `Stack.jsx`, build size M) is still accurate. One minor
precision note, not worth its own edit: the entry cites `entitlement.js`
alongside `src/state/sync.js` in a way that could read as the same
directory — it actually lives at `src/utils/entitlement.js`. Left as-is
since the citation doesn't assert a path and three other citations of the
same file elsewhere in this backlog (lines 925, 2074, 6483) already get it
right.

**Two fresh angles checked, both traced back to ground this file already
holds:**
- WebSearch ("Toolify.ai FutureTools.io features 2026 AI tool directory")
  and ("AI tool directory SaaS onboarding referral program feature 2026")
  surfaced only facts this file already cites (FutureTools' community
  upvoting and weekly catalogue refresh, There's An AI For That and
  Futurepedia's directory dominance) plus a referral-program angle the 24th
  pass already checked and closed — Toolnaut's "no affiliate link, no
  referral code" stance (`TrustPanel.jsx:118`, `Methodology.jsx:132`) is a
  deliberate anti-dark-pattern position, not a gap. Re-grepped `src/` for
  `referral` to confirm the stance hasn't changed; still only those two
  copy lines.
- WebSearch ("AI tool discovery platform 2026 personalization feature gap
  directory") surfaced "independent verification" / tools-not-tested-by-
  the-directory as a cited 2026 gap for competitors like OpenFuture AI —
  this is the same ground the already-OPEN "Per-tool ratings & reviews"
  gap (line ~588) and the twelfth pass's G2-AI-review-summary check already
  cover, not a new angle. Also re-confirmed `src/components/sections/`
  marketing claims have no unaudited section left: `AudienceSection`,
  `StatsSection`, `HowItWorksSection`, `RolesSection`, `ContactSection`, and
  `CTASection` each already have 6+ prior references in this file from past
  promise-vs-reality audits.

Ran `npm test` (311/311), `npm run build` (19 static routes, 1131 tool
pages, feed at 457 live tools, no errors), and `npm run smoke` (24/24
routes, 0 console errors) directly against current `master`. All three
clean, no bug found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — re-verified the next-oldest OPEN entry clean and both fresh angles
traced back to existing, already-logged categories.

### Research check 2026-10-05 12:04 UTC — no new gap found, twenty-eighth pass; four fresh angles all traced back to existing ground
Scheduled run, UTC hour 12. `npm run radar:health` → `OK` (2 runs in the 26h
window, last publish 11.9h ago, 5 tools published that run, feed at 459
total). `list_workflow_runs` on `master`: `CI`/`Release` both green at the
latest push (`f17461a`). No `agent-fixable` issues open. (Separately noted,
not actioned: the three scheduled `Agent · Research/Maintainer/Bugfix`
GitHub Actions workflows — a different automation lane from this session,
governed by `CLAUDE.md`'s bot/PR rules — are failing on every run at the
`claude-code-action` step, and ~20 `bot/claude/*` PRs sit open and unmerged
on that lane. Out of scope here: workflow files other than `radar.yml` are
off-limits, and the actual build-gating CI is green.)

**Re-verified the next-oldest untouched OPEN entry** ("No educational/
how-to content — the footer's own 'Resources' column links only to existing
product pages," found 2026-09-17, line ~7708 — next after "No browsable
gallery of shared stacks" (27th pass)). Re-checked every claim against
current `master`: `scripts/prerender.mjs`'s `ROUTES` (`:42-62`) still has no
`/guides` entry; `src/App.jsx` still has no `Guide`/`guides` route or lazy
import; `src/components/sections/ContactSection.jsx`'s "Resources" column
(`:43-49`) still links only "How it works," "How we choose," "What's new,"
and "Open the app" — four existing product pages relabeled, exactly as
described. Nothing drifted — the "Smallest useful version" (one
`src/content/guides.js` array, `Guide.jsx` + `Guides.jsx`, one route
pattern, two prerender/sitemap additions, one footer link edit, build size
S) is still accurate and still the smallest unclaimed SEO gap in this file.

**Four fresh angles checked, all traced back to ground this file already
holds:**
- Team/collaborative-workspace features (Chipp Workspaces, TeamAI, Miro/
  Notion-style AI collaboration, surfaced via WebSearch "ai tool directory
  team workspace collaborate feature 2026") — these are themselves AI
  *tools*, not directory features, and the shape doesn't transfer to a
  discovery product. The already-OPEN "Pro chat assistant & Team tier" gap
  (line ~1289) already flags Toolnaut's own Team tier as the backend-shaped
  problem here, not something to build more of.
- Trust-score / verified-review AI directories (Mr Review AI's proprietary
  Trust Score, AIToolsRecap's practitioner reviews, surfaced via WebSearch
  "AI tool directory verified reviews trust score 2026") — same ground the
  already-OPEN "Per-tool ratings & reviews" gap (line ~588) and the twelfth
  pass's G2-AI-review-summary check already cover.
- G2's 2026 buyer-intent/MCP push (WebSearch "G2 Capterra AI software
  category new features 2026 buyer intent"), prompted by its own cited stat
  that 51% of B2B buyers now start research in an AI chatbot rather than
  Google — checked whether Toolnaut has an equivalent AI-answer-engine
  surface. It already does, and already predates this pass:
  `public/robots.txt` explicitly allows GPTBot/ClaudeBot/PerplexityBot/
  OAI-SearchBot/Google-Extended/etc. with a comment naming this exact
  rationale, and `public/llms.txt` (prose summary for AI crawlers,
  last touched 2026-09-18 per the 11th-pass note at line ~5549) already
  ships. Nothing new to log.
- Re-confirmed i18n/localization and a user-referral program are still
  correctly out of scope: `grep -rniE "i18n|locale|translat" src/` still
  returns no real hits (rejected before as a multi-week SEO/localization
  project, lines ~8551/9498/10028); `TrustPanel.jsx`/`Methodology.jsx` still
  carry the explicit "no affiliate link, no referral code" stance, so a
  referral program would contradict the product's own stated position, not
  fill a gap in it (rejected before at lines ~9811/10090).

Ran `npm test` (311/311), `npm run build` (19 static routes, 1131 tool
pages, feed at 457 live tools, no errors), and `npm run smoke` (24/24
routes, 0 console errors) directly against current `master`. All three
clean, no bug found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — re-verified the next-oldest OPEN entry clean and all four fresh
angles traced back to existing, already-logged, or already-shipped ground.

### Research check 2026-10-05 15:05 UTC — no new gap found, twenty-ninth pass (off-cycle fire); oldest untouched OPEN entry re-verified clean
Scheduled run, UTC hour 15 (off-cycle fire — between the 12:03 and 18:03
slots). `npm run radar:health` → `OK` (2 runs in the 26h window, last publish
15.0h ago, 5 tools published that run, feed at 459 total). `list_workflow_runs`
on `master`: `CI`/`Release` both green at the latest push (`0c4ee41`). No
`agent-fixable` issues open. Local checkout was again detached from `master`
at session start, same recurring mode noted since the 14th pass — fetched and
re-pointed to `origin/master` before running any check.

Open-PR count unchanged: the four tracked `BUILT, UNMERGED` entries
(#91/#89/#86/#75) are all still open with unchanged head SHAs (`605eacc`/
`9db220e`/`b2b4a81`/`ffe7e84`) — nothing new to sync this run.

**Re-verified the next-oldest untouched OPEN entry** ("No testimonial or
social-proof quote exists anywhere on the site," found 2026-09-27 00:12 UTC,
line ~7859 — next after "No educational/how-to content" (28th pass), itself
after the run of four entries found within hours of each other on
2026-09-15/16 that the 19th/23rd/24th/25th passes worked through, and the two
after those the 26th/27th passes covered). Re-checked every claim against
current `master`: `grep -rniE "testimonial|review quote|case stud|social
proof|trustpilot" src/` still returns zero hits; `src/components/app/
StackSurvey.jsx` is still fixed-choice with no free-text field, its own
header comment still states answers go to GA4 and that "a text box would
break" the privacy policy's promise; `src/components/sections/
StatsSection.jsx`'s "a number on a landing page is a claim" discipline
comment is still at line 23, unchanged, and both real counts
(`explorerCount()`/`subscriberCount()`) still render only when non-null,
nothing backfilled; `isSupabaseConfigured` is confirmed (again) to be the
boolean export from `src/utils/supabase.js:22`, re-exported by
`src/state/sync.js`, matching the entry's "same feature-detection sync.js
already uses" framing — grepped every call site
(`SignInPage.jsx`/`BillingCard.jsx`/`authStore.js`/`sync.js`/`entitlement.js`/
`subscriberCount.js`/`explorerCount.js`) and all nine treat it as a plain
boolean, never with `()`; the entry's own prose calls it
"`isSupabaseConfigured()`" with parens once, a cosmetic mismatch against how
the codebase actually uses it, not worth its own edit since the entry never
cites a line number for that symbol and the build plan doesn't depend on its
being callable. No new Supabase `quotes` table exists (`grep -rn "quotes\b"
src/` returns only unrelated code-comment uses of the English word "quotes").
Nothing drifted — the entry's "Smallest useful version" (new opt-in Supabase
table + RLS policy, a second milestone-gated prompt component separate from
`StackSurvey.jsx`, a conditional quote-carousel in or beside
`StatsSection.jsx`, build size M) is still accurate.

**Two fresh angles checked, both traced back to ground this file already
holds:**
- WebSearch ("AI tool directory 2026 user testimonial quote collection
  feature trust") confirmed community-driven reviews and verified user
  testimonials are standard 2026 directory practice (AiToolsList.Tools and
  similar platforms cited) — this reaffirms the re-verified entry's premise
  rather than surfacing anything new; the entry already treats "add a
  testimonials section" as the wrong shape (fabricating quotes) and scopes
  the real gap as the missing honest-capture plumbing.
- WebSearch ("AI tool discovery platform 2026 new feature AI agent workflow
  builder missing directory") surfaced no-code AI agent builders as a 2026
  trend — these are themselves AI *tools* Toolnaut's catalogue already
  indexes (same category of non-finding as the 28th pass's team-workspace
  check), not a directory feature Toolnaut is missing. No new entry.

Ran `npm test` (311/311), `npm run build` (19 static routes, 1131 tool pages,
feed at 457 live tools, no errors), and `npm run smoke` (24/24 routes, 0
console errors) directly against current `master`. All three clean, no bug
found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — re-verified the next-oldest OPEN entry clean and both fresh angles
traced back to existing, already-logged ground.

### Research check 2026-10-05 21:04 UTC — no new gap found, thirtieth pass (off-cycle fire); oldest untouched OPEN entry re-verified clean
Off-cycle run (fired at 21:04, between the day's feature run at 18:03/18:35
and the next scheduled slot at 00:03) — treated as an ordinary research hour
per the routine's hour-based dispatch, same as the 23rd/24th/29th off-cycle
fires. `npm run radar:health` → `OK` (2 runs in the 26h window, last run/
publish 2.6h ago, 6 tools published that run, feed at 465 total). CI green
on `master`: `list_workflow_runs` on `ci.yml` shows run #516 (`success`) at
`23d4899` — the day's own dev-digest push — as the latest CI-triggering
commit; the repo's `HEAD` has since advanced to `b326645` (radar bot's
"publish newly discovered tools" auto-commit), which per every prior pass's
confirmed behavior does not retrigger CI on its own. No `agent-fixable`
issues open (`search_issues` zero results). Local checkout was again
detached at session start — fetched and re-pointed to `origin/master`
(`b326645`, matches `origin/master` exactly) before running any check.

Open-PR shape unchanged: all four tracked `BUILT, UNMERGED` entries (#91
hidden-gems rail, #89 access-method facet, #86 LLM cost calculator, #75
stack overlap warning) confirmed still open via `list_pull_requests` —
nothing new to sync this run.

**Re-verified the next-oldest untouched OPEN entry** ("No lookup surface
outside toolnaut.xyz," found 2026-09-27 21:20 UTC, line ~7958 — next after
"No testimonial or social-proof quote" (29th pass), itself the entry after
"No educational/how-to content" (28th pass) in the chain the 19th/23rd/24th/
25th/26th/27th passes built working forward from "Track progress against
your role" (found 2026-09-15, the oldest entry with no prior re-verification
note). Checked every cited reference against current `master`: `find .
-iname "manifest.json" -not -path "*/node_modules/*"` still returns zero
hits — no extension directory exists anywhere in the repo. `src/utils/
search.js:9`'s `matchesQuery(tool, q)` is still the shared, dependency-free
matcher both `SearchTools.jsx` and `Discover.jsx` import, still ~10 lines,
still vendorable as-is. `ToolDetail.jsx`'s status badge (cited as
"`:123-130`") has drifted one line to `:124-130` (`{tool.status &&
tool.status !== 'Active' && (...)}`, hot-pink pill rendering `tool.status`
directly) — same one-line drift pattern every other re-verified entry in
this file has shown, not structural. `vercel.json`'s `/tools.json` rule
(now at line 90, was unlabeled) still sets only `Cache-Control`, no
`Access-Control-Allow-Origin` — confirmed the entry's "CORS still missing,
but this gap doesn't need it fixed first" framing still holds, since a
Manifest V3 extension's `host_permissions` grant cross-origin fetch
independent of that header. Nothing drifted in substance; the entry's
"Smallest useful version" (new top-level `extension/` directory, MV3 popup
only — manifest + popup.html/js/css, no content script, no background
worker, vendored `matchesQuery()`, Chrome-only v1, no Web Store publish,
build size M) is still accurate and still the backlog's one gap that ships
a wholly new artifact type rather than a `src/`-only diff.

**Two fresh angles checked, both traced back to ground this file already
holds:**
- WebSearch ("AI tool directory website 2026 new feature MCP server
  listing comparison") surfaced a real 2026 trend — dedicated MCP-server
  directories (Smithery, PulseMCP, Glama, MCP.so, MCP.Directory) letting
  developers discover/compare/one-click-install MCP servers — but this is
  the same ground the 2026-09-30 09:00 UTC pass already closed: `grep -ic
  mcp public/tools.json` was checked then and returns 76 hits already
  inside shipped tool blurbs, and that pass concluded a dedicated MCP-only
  directory section is a developer-infra feature outside this consumer
  product's remit. Re-ran the same grep this pass to confirm it still
  holds — unchanged. Not a new gap.
- WebSearch ("AI tool discovery platform 2026 personalization feature gap
  users want") returned only e-commerce personalization-engine marketing
  content (Bloomreach, Voyado, generic "hyper-contextual orchestration"
  listicles) — a different product category (retail merchandising AI, not
  tool-discovery directories) with no pattern that maps onto Toolnaut's
  existing quiz/persona/stack personalization. Nothing relevant surfaced.

Ran `npm test` (315/315), `npm run build` (19 static routes, 1137 tool
pages, feed at 465 live tools, no errors), and `npm run smoke` (24/24
routes, 0 console errors) directly against current `master`. All three
clean, no bug found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — re-verified the next-oldest OPEN entry clean and both fresh angles
traced back to existing, already-logged ground.

### Research check 2026-10-06 00:10 UTC — no new gap found, thirty-first pass; deepened the claim-listing entry instead of re-verifying another clean one
Research run (UTC hour 0, one of the three research slots on a non-feature
day). `npm run radar:health` → `OK` (2 runs in the 26h window, last run/
publish 5.6h ago, 6 tools published that run, feed at 465 total — unchanged
from the 30th pass, no new radar activity since). CI green on `master`:
`list_workflow_runs` on `ci.yml` shows run #517 (`success`) at `1281608`, the
30th pass's own push, as the latest commit — nothing has landed since. No
`agent-fixable` issues open (`list_issues` zero results). Local checkout was
again detached at session start — fetched and re-pointed to `origin/master`
before running any check, same recurring container-start behavior every
prior pass has noted.

Open-PR shape unchanged and explicitly re-confirmed stale: `list_pull_requests`
returns 29 open `bot/claude/*`/`bot/deps/*` PRs going back to #10
(2026-08-26), none merged, none closed. The four most recent (#91 hidden-gems
rail, #89 access-method facet, #86 LLM cost calculator, #75 stack overlap
warning) are feature branches from the GitHub Actions `agent-*.yml` track
CLAUDE.md's "one open PR per agent" rule scopes to; this session is the
scheduled cloud routine using the master-direct workflow documented in every
prior pass's entry here (and in `DEVLOG.md`'s own "SHIPPED <sha>" pattern),
so that rule doesn't gate this session and this pass proceeded the same way
the last 30 have.

**Deepened rather than re-verified:** the oldest-untouched-entry chain (most
recently "No lookup surface outside toolnaut.xyz," 30th pass) has now run six
re-verifications in a row that found the cited entry "still accurate, no
drift, nothing new" — diminishing returns on that specific mechanical check.
Per the "if an OPEN gap is promising but thin, DEEPEN it" instruction, picked
a different, newer entry instead: "Vendor/maker claim-listing path" (found
2026-10-03 21:11 UTC), whose own plan had gone stale in a genuinely useful
way — it was written against `src/utils/suggestTool.js` as a file that
"doesn't exist yet," and that file shipped two days later (2026-10-05,
`3a7a173`) as part of the "Suggest a tool"/"report a wrong listing" build.
Re-read `suggestTool.js`, `ToolDetail.jsx`, and `ToolPublic.jsx` on current
`master`, updated every file/line reference in the entry to match what
actually shipped, and ran one fresh competitor search (WebSearch, "claim
your listing AI tool directory vendor verification flow 2026") that
surfaced the industry's actual verification mechanic — domain-matched email
gets instant approval, everything else goes to manual review — which
confirms (rather than contradicts) the entry's existing no-backend,
fully-manual-triage plan: Toolnaut has no mailer, so matching what
competitors do for their own non-domain-matched claims is the honest
ceiling, not a corner cut. The entry is now the cheapest OPEN item in this
file to build (one new named export in an existing file, two one-line links
next to links that already ship) and does not need another deepening pass
before the next feature run picks it up.

Ran `npm test` (315/315), `npm run build` (19 static routes, 1137 tool pages,
feed at 465 live tools, no errors), and `npm run smoke` (24/24 routes, 0
console errors) directly against current `master`. All three clean, no bug
found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — deepened an existing thin entry instead, with one fresh competitor
search backing the update.

### Research check 2026-10-06 03:04 UTC — no new gap found, thirty-second pass; a tempting competitor claim didn't survive primary-source verification
Scheduled run, UTC hour 03 (one of the three research slots on a non-feature
day). `npm run radar:health` → `OK` (2 runs in the 26h window, last run/
publish 1.2h ago, 3 tools published that run, feed at 468 total). CI green on
`master`: `list_workflow_runs` shows `Radar` run #91 (`success`) at `1ca6dd9`
as the latest activity, with `CI`/`Release` both green on the push before it
(`1ca6dd9`, the 31st pass's own commit) — nothing red since. No
`agent-fixable` issues open (`list_issues` zero results).

Open-PR shape unchanged: `list_pull_requests` still returns the same 29 open
`bot/claude/*`/`bot/deps/*`/`feat/*` PRs going back to #10, none merged or
closed — this remains the separate GitHub-Actions `agent-*.yml` queue
CLAUDE.md's "one open PR per agent" rule scopes to, not this session's
master-direct routine, same conclusion every prior pass has reached.

**A WebSearch lead that didn't hold up:** two searches for 2026 AI-directory
feature trends turned up a claim worth chasing — that some directories
"distinguish wrapper tools (thin API wrappers around GPT/Claude/Gemini) from
native/foundational AI products" as a trust signal for privacy-conscious
power users. That would have been a genuinely new axis, distinct from the
already-OPEN "Access-method facet" gap (which is about deployment shape —
web app/API/self-hosted — not about what model sits underneath). Before
logging it, fetched the two actual primary sources this category runs on
rather than trusting the review-blog summary: `theresanaiforthat.com` and
`futurepedia.io` directly. Neither shows any wrapper/native distinction —
Futurepedia presents ChatGPT and Claude with identical treatment, no badge
or filter separates API-wrapped tools from foundational ones. The claim
traced back to low-quality SEO content-farm pages (`fast.io/resources/...`,
`aiindigo.com/blog/...`), not real competitor behavior. Per "read the actual
page before claiming a gap," this was not logged — it would have been
build-size M for a feature that doesn't exist anywhere to copy and has no
reliable data source (most tool descriptions never disclose what model they
wrap). Same two fetches did reconfirm Futurepedia's real, visible feature:
per-tool interaction counts and review counts next to every listing (ChatGPT:
6,719 interactions / 9 reviews; Claude: 1,081 / 12) — this directly
corroborates two gaps already OPEN in this file ("Popularity signal discarded
before it reaches a record" and "Per-tool ratings & reviews"), not a reason
to log a third.

**Re-verified "Popularity signal discarded before it reaches a record"**
(found 2026-09-28 09:09 UTC) against current `master` since the Futurepedia
fetch directly touches its premise: `radar/sources/github.js:9` still queries
`sort=stars&order=desc` and stores `stargazers_count` into `raw.stars`
(line 25); `radar/sources/hackernews.js:27` still stores `hit.points` into
`raw.points`; `radar/enrich.js` still never reads either field (grepped
`stars|points|popularity` across the file, zero hits); `radar/schema.js` has
no `popularity` field in `makeToolRecord()`; `radar/scripts/sync-to-app.js`'s
`FIELDS` allowlist (line 12) still enumerates the same 16 field names with no
`popularity` entry; `src/utils/sortResults.js` still only exports
`compareByNewest`/`compareByName`, no `compareByPopularity`. Nothing drifted
— the entry's build-size-S plan (one schema field, one `enrich.js` line, one
allowlist entry, one new comparator, one Discover pill) is still accurate and
still ready for a feature run.

Spot-checked the most recently shipped feature (`src/utils/suggestTool.js`
and its three call sites in `Discover.jsx`/`ToolDetail.jsx`/`ToolPublic.jsx`/
`Settings.jsx`, shipped 2026-10-05 `3a7a173`) for a fresh bug the way the 10th
pass caught the `InstallPrompt` focus bug in new code the day after it
shipped: all four external links carry `target="_blank" rel="noopener
noreferrer"`, the GitHub issue URL builder correctly URL-encodes title/body/
labels via `URLSearchParams`, and `Discover.jsx`'s inline form's
`window.open(...)` call passes the `noopener` string correctly. No bug found.

Ran `npm test` (315/315), `npm run build` (19 static routes, 1140 tool pages,
feed at 466 live tools, no errors), and `npm run smoke` (24/24 routes, 0
console errors) directly against current `master`. All three clean, no bug
found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — the one new lead failed primary-source verification, so nothing was
logged; re-verified an existing OPEN entry clean instead.

### Research check 2026-10-06 06:04 UTC — no new gap found, thirty-third pass; re-verified the oldest never-touched OPEN entry
Scheduled run, UTC hour 06 (one of the three research slots on a non-feature
day). `npm run radar:health` → `OK` (2 runs in the 26h window, last run/
publish 4.2h ago, 3 tools published that run, feed at 468 total — unchanged
from the 32nd pass, no new radar activity since). `list_workflow_runs` on
`master`: `CI`/`Release` both green at the latest push (`9f960ce`, the 32nd
pass's own commit) — nothing red since. No `agent-fixable` issues open
(`list_issues` zero results).

Open-PR shape unchanged: this remains the master-direct scheduled routine,
separate from the `agent-*.yml`/`bot/claude/*` PR queue CLAUDE.md's "one
open PR per agent" rule scopes to, per every prior pass's conclusion — not
re-checked line by line this pass since nothing in this session touches
that queue.

**Re-verified the oldest OPEN entry that has never been re-verified at
all** — "First-session onboarding checklist" (found 2026-08-23 06:06 UTC,
line ~357), which predates the "Track progress against your role" chain the
19th/23rd–30th passes worked through and sits further back than any entry
that chain has reached. Checked every claim against current `master`:
`grep -rniE "checklist|getting.started|onboard" src/` still finds no
persistent nudge/checklist component — only `FlowSteps.jsx` (the three-step
progress bar shown during the quiz→app transition itself, inside
`OnboardingShell.jsx`) and unrelated analytics-event/copy hits
(`funnel.js`, `analyticsEvents.js`, `roadmapGenerator.js` copy strings).
`Stack.jsx`'s "Next up" card is still exactly two items — add a tool from
Discover (shown only while `addedTools.length === 0`) or continue the
roadmap — confirming the gap's "only ever nudges toward Discover or the
roadmap" framing still holds; Community, Settings, and "post your first
thread" are still never surfaced as next steps anywhere. `stackStore.js`'s
`loadStack()`, `quizStore.js`'s `loadQuiz().completed`, and
`roadmapStore.js`'s `isStepDone`/`allStepsDone` (now at lines 25/29, drifted
from the cited 7-28 — same one-line-type drift every other re-verified
entry in this file has shown) are all still exactly the shape the plan
needs. `communityStore.js` still has no `hasPostedThread()`-equivalent
export — `loadThreads()`/`getThread()` are the only reads, confirming the
plan's "needs one new one-line export" is still accurate. Line references
have drifted (streak card now ~274-294, not 199-219; "Next up" card now
~434-460, not 337-356; `OnboardingShell` route now `App.jsx:139`, not `:79`)
but nothing structural moved — the entry's build-size-S plan (one pure
util, one new component, one community-store export, wired into `Stack.jsx`)
is still accurate and still buildable as scoped.

**One fresh search, reconfirming rather than adding:** WebSearch ("AI tool
directory 2026 onboarding checklist new user activation getting started")
surfaced only AI-powered onboarding *tooling* for other products (Userpilot,
Chameleon-class platforms) — a different thing (software that builds
checklists) from the pattern itself (a directory having one). It did
reconfirm the activation stat this entry's "why it matters" already leans
on: roughly 75% of new signups churn within the first week after hitting a
single point of setup friction. Not a new gap — the entry's premise, not
its build plan, is what this search touched.

Ran `npm test` (315/315), `npm run build` (19 static routes, 1140 tool
pages, feed at 466 live tools, no errors), and `npm run smoke` (24/24
routes, 0 console errors) directly against current `master`. All three
clean, no bug found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — re-verified the oldest never-touched OPEN entry clean instead, with
one fresh search reconfirming its premise.

### Research check 2026-10-06 09:04 UTC — no new gap found, thirty-fourth pass; enterprise-compliance-badge lead fails primary-source verification
Scheduled run, UTC hour 09 (one of the three research slots on a non-feature
day). `npm run radar:health` → `OK` (2 runs in the 26h window, last run/
publish 7.2h ago, 3 tools published that run, feed at 468 total — unchanged
from the 33rd pass, no new radar activity since). `list_workflow_runs` on
`master`: `CI`/`Release` both green at the latest push (`b390e1a`, the 33rd
pass's own commit) — nothing red since. No `agent-fixable` issues open
(`list_issues` zero results). Local checkout was again detached at session
start — fetched and re-pointed to `origin/master` before running any check,
same recurring container-start behavior every prior pass has noted.

Open-PR shape: `list_pull_requests` now returns 31 open `bot/claude/*`/
`feat/*`/`docs(research)`-titled PRs (up from 29 at the 31st pass, oldest
still #3), none merged or closed — still the separate GitHub-Actions
`agent-*.yml` queue CLAUDE.md's "one open PR per agent" rule scopes to, not
this session's master-direct scheduled routine, same conclusion every prior
pass has reached.

**A WebSearch lead that didn't hold up:** searched whether AI tool
directories display third-party security/compliance certifications (SOC2,
GDPR, HIPAA, ISO 27001) per listing — a trust-signal axis genuinely distinct
from everything already in this file (peer reviews, popularity counts,
vendor claim-listing, and Toolnaut's *own* GDPR-consent-gate for its
analytics are all covered, but none of them is about surfacing a *catalog
tool's* compliance posture). Two leads looked promising at the snippet
level: "Toolify" and "AI Tools Explorer" allegedly show or filter by these
certifications. Per "read the actual page before claiming a gap," fetched
the primary sources instead of trusting the summaries. `opentools.ai`'s
ChatGPT listing has no certification badges, verification seals, or audit
links anywhere on the page — only a prose "Is ChatGPT Safe?" section with
checkmarked bullets reproducing OpenAI's own paid-tier marketing copy
("ChatGPT Business includes compliance support and encryption"), not a
verified third-party badge. `toolify.ai` returned HTTP 403 to a direct
fetch — could not verify directly, so not relied on. "AI Tools Explorer"
turned out not to be an independently fetchable live product at all: the
only source for its "filter by GDPR/HIPAA/SOC2/ISO27001" claim is its own
self-submitted listing page on `hunted.space` (a directory-of-tools
submission site), and no search surfaced an actual URL for the tool itself
to inspect — the claim is the product's own marketing copy about itself on
a third-party directory, not something loadable and checkable. Net: one
inspectable primary source shows no real badge system, and the other
specific claim has no inspectable primary source at all. Not logged as a
gap — same bar the 32nd pass's wrapper/native lead failed to clear.

Ran `npm test` (315/315), `npm run build` (19 static routes, 1140 tool
pages, feed at 466 live tools, no errors), and `npm run smoke` (24/24
routes, 0 console errors) directly against current `master`. All three
clean, no bug found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — the one new lead failed primary-source verification on both halves,
so nothing was logged.

### Research check 2026-10-06 12:04 UTC — no new gap found, thirty-fifth pass; changelog staleness recurred a third time and is fixed again
Scheduled run, UTC hour 12 (one of the three research slots on a non-feature
day). `npm run radar:health` → `OK` (2 runs in the 26h window, last run/
publish 10.3h ago, 3 tools published that run, feed at 468 total — unchanged
from the 34th pass). `list_workflow_runs` on `master`: `CI`/`Release` both
green at the latest push (`bfee31e`, the 34th pass's own commit) — nothing
red since. No `agent-fixable` issues open. Local checkout was again detached
at session start — stashed, fetched, and re-pointed to `origin/master` before
running any check, same recurring container-start behavior every prior pass
has noted.

**The changelog staleness bug (first found and fixed 2026-09-23, recurred and
re-fixed 2026-10-04) had recurred a third time.** Per the 20th pass's own
"a process failure is exactly the kind of thing that recurs" note, checked
`src/utils/changelogData.js`'s newest entry against real shipped work:
`git log --since=2026-10-02` on `master` shows one feature-run commit since
the 20th pass's backfill that was never added — `3a7a173` (2026-10-05,
"Suggest a tool" / "Report a wrong listing," shipped same day per the dev
digest issue, `src/pages/app/Discover.jsx`, `ToolDetail.jsx`, `ToolPublic.jsx`,
`Settings.jsx`, `src/utils/suggestTool.js`) — `changelogData.js`'s newest
entry was still dated 2026-10-02 (`c4a24de`, Download my data, already
present). Verified the commit's actual diff with `git show --stat` before
writing the entry, same standard every prior backfill in this file uses — no
invented copy. **Fixed in this run**: added one entry to `CHANGELOG` in
`src/utils/changelogData.js`, same plain-language voice (no shas, no file
paths) the file's header comment requires, newest-first ahead of the
2026-10-02 entry.

This is a third instance of the same recurring process gap the "Changelog
only looks backward" entry's 2026-09-23 and 2026-10-04 deepening notes
already describe — the underlying fix (translate `SHIPPED` backlog entries
into `changelogData.js` as part of the feature run's own end-of-day write-up
step, not left to research passes to catch after the fact) is still that
entry's own "Smallest useful version" and is still OPEN. Not re-logging a
fourth time in that entry's body per this pass's own convention (the 20th
pass's recurrence note already lives in its dated research-check entry, not
back-inserted into the gap's body); noting the third occurrence here instead,
same place the second one was noted.

Ran `npm test` (315/315), `npm run build` (19 static routes including a
clean `/changelog` prerender, feed at 468 tools, 1140 tool pages), and
`npm run smoke` (24/24 routes, 0 console errors) against the
`changelogData.js` change before committing. All three clean.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — logged and fixed a recurrence of an existing one instead, same as the
20th pass.

### Research check 2026-10-06 15:04 UTC — no new gap found, thirty-sixth pass; re-verified the next-oldest untouched OPEN entry
Scheduled run, UTC hour 15 (one of the three research slots on a non-feature
day). `npm run radar:health` → `OK` (2 runs in the 26h window, last run/
publish 13.2h ago, 3 tools published that run, feed at 468 total — unchanged
from the 35th pass). `list_workflow_runs` on `master`: `CI`/`Release` both
green at the latest push (`2b4d173`, the 35th pass's own commit) — nothing
red since. No `agent-fixable` issues open (`list_issues` zero results).
Local checkout was again detached at session start (pointing at the correct
tip already) — checked out `master` and fast-forwarded, same recurring
container-start behavior every prior pass has noted.

**Two fresh WebSearches, both traced back to existing ground, not new gaps:**
"AI tool directory price tracking / notify me / saved search" surfaced an
indie-built "Price Explorer" (budget slider) and a daily "Tool of the Day"
with a countdown. Checked both against the catalog before considering
either: `public/tools.json`'s `pricing` field has a digit in only 3 of 468
records (`python3` scan this run) — the same "no numeric price data" wall
the already-REJECTED stack-cost-estimate gap hit, so a budget slider isn't
buildable. "Tool of the Day" turned out to already exist —
`Stack.jsx`'s `toolOfTheDay()` (cited directly in the "hidden gems" entry at
line ~7072) rotates a daily pick today, just scoped to the signed-in user's
own top matches rather than the whole catalog; not a gap. A second search
("AI tool directory browser extension 2026") surfaced real competitor
extensions (AI Tools Explorer, Quick AI) that confirmed, rather than added
to, the already-OPEN "No lookup surface outside toolnaut.xyz" entry
(found 2026-09-27) — same shape, same examples that entry already cites.

**Re-verified the next-oldest untouched OPEN entry** — "Per-tool ratings &
reviews" (found 2026-08-24, deepened once on 2026-09-20; the 33rd pass's
re-verification of "First-session onboarding checklist" was the
oldest-of-all entry, this is the one after it in found-date order). Checked
every claim against current `master`: `TrustPanel`/`ToolResources` placement
in `ToolDetail.jsx` has drifted again since the 09-20 deepening —
`<TrustPanel>` now at `:219` (was `:208`), `<ToolResources>` now at `:222`
(was `:211`), "Related tools" heading now at `:226` (was `:213`), the "Why
it fits" sticker block now starts at `:196` (was `:185`), and the MATCH/
status badge row is now `:111-132` (was `:110-131`) — all one-line-type
drift, nothing structural. The corrected placement (REVIEWS section after
`<ToolResources>`, immediately before "Related tools") still applies at the
new line numbers. `communityStore.js`'s `read`/`write` still wrap
`scopedRead`/`scopedWrite` from `scopedStorage.js` exactly as the 09-20
deepening described, and `exus_threads_v1`/`exus_replies_v1`/
`exus_upvotes_v1` are still the two arrays (`PORTABLE_KEYS`, `AUTHORED_KEYS`)
a new `exus_tool_reviews_v1` key would need to join. All five example seed
slugs (`chatgpt`, `claude`, `notion-ai`, `perplexity`, `cursor`) still
resolve — confirmed in `src/utils/toolsCatalog.js`'s static 704-tool `TOOLS`
array (not `public/tools.json`, the radar feed, which is a separate,
smaller set and was the wrong file to check first). No rating/review
surface has shipped anywhere since: `grep -rn "toolReviews" src/` is still
empty, and `toolSeo.js:18`'s own comment ("no rating, no review count and
no price figure the catalogue does not hold") independently confirms the
gap from the structured-data side. Core claim and build plan both still
hold, only line references needed correcting.

Ran `npm test` (315/315), `npm run build` (19 static routes, 1140 tool
pages, feed at 466 live tools, no errors), and `npm run smoke` (24/24
routes, 0 console errors) directly against current `master`. All three
clean, no bug found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — both fresh searches traced back to existing ground and the
next-oldest untouched OPEN entry was re-verified clean instead.

### Research check 2026-10-06 21:04 UTC — thirty-seventh pass; next-oldest untouched OPEN entry turned out to be already shipped
Scheduled run, UTC hour 21 (one of the three research slots on a non-feature
day; hour 18 earlier today was the feature run, which shipped per-tool
ratings & reviews — `0448e6f` — and is marked SHIPPED above).
`npm run radar:health` → `OK` (2 runs in the 26h window, last run/publish
5.1h ago, 10 tools published that run, feed at 478 total — growing).
`list_workflow_runs` on `master`: `CI`/`Release` both green at the latest
push (`76310d4`, today's feature-run digest commit) — nothing red since. No
`agent-fixable` issues open (`list_issues` zero results).

**Continued the found-date sweep the 31st–36th passes have been running.**
"Per-tool ratings & reviews" (found 2026-08-24, re-verified by the 36th
pass) shipped in today's feature run, so the next-oldest untouched-by-a-
dedicated-pass OPEN entry in found-date order is "Per-tool 'Alternatives'
SEO pages" (found 2026-08-28 06:10 UTC, deepened once 2026-09-12). Re-
verifying it for the usual line-number drift instead found the entire
feature already live on `master`, built wider than this entry ever scoped
it — see the long discovery note now appended to that entry above rather
than repeated here. Short version: `src/pages/ToolPublic.jsx` at public
route `/ai-tools/:slug` already renders an "Alternatives to {tool.name}"
section per tool, `scripts/gen-tool-pages.mjs` already statically generates
one page per catalog tool (1150 of them, confirmed via this run's own
`npm run build` log) and sitemaps all of them, and `toolSeo.js` already
emits real JSON-LD for it. This backlog had simply never been told —
the same class of bug as the changelog-staleness note recorded three times
earlier in this file, just for a bigger feature that one research pass
after another kept re-verifying as "still open" without anyone actually
opening the file it points at. Marked the entry `SHIPPED` and flagged it so
the pattern (verify by reading the live code, not by trusting the backlog's
last description of it) stays visible for whichever pass hits the next one.

**The one real, small thing this discovery exposed:** `scripts/smoke.mjs`
never had `/ai-tools/:slug` in its route list, despite that being an
explicit line item in this entry's own original build plan. A statically-
generated, publicly crawlable page with no smoke coverage can regress
silently — this is exactly the class of gap the "no signal, no PR" rule
still allows fixing on sight. Added `/ai-tools/chatgpt` to the route array
(one line). No other code touched.

Ran all three checks against the fix: `npm test` (315/315), `npm run build`
(19 static routes + 1150 `/ai-tools/*` pages, feed at 1180 tools counting
the live radar overlay, no errors), and `npm run smoke` (25/25 routes
clean, including the newly-added `/ai-tools/chatgpt`). All green.

Per the "never invent a gap to fill the hour" rule, appended no new gap this
run — the hour went to correcting a stale SHIPPED/OPEN status on an
already-live feature and closing the one real coverage gap that discovery
turned up.

### Research check 2026-10-07 00:04 UTC — no new gap found, thirty-eighth pass; deepened the shared-stacks-gallery entry instead of re-verifying another clean one

No new product gap logged this run — urgent-work checks came back clean
first (CI green on `df5f382`, `npm run radar:health` reports STATUS: OK,
478 tools published, no `agent-fixable` issues open), so the hour went to
backlog work per the "deepen before adding" rule.

Picked the thinnest plain-OPEN entry by line count ("No browsable gallery
of shared stacks", 61 lines, found 2026-09-17) over re-verifying yet another
already-thorough entry. Re-confirmed the core gap still holds against
current master, then traced the one thing its build plan got wrong: the
"owner id or null for a guest share" detail doesn't fit this project's RLS
model — every write policy in `supabase/migrations/` is `to authenticated`,
and `api/`'s own history (the 12-function Vercel Hobby cap it already hit
once) rules out spending a serverless function to work around that for v1.
Corrected the entry to publish-requires-sign-in, which reuses the existing
`tool_refs` policy shape exactly and drops the build size from M to S/M.
See the "Deepened 2026-10-07 00:10 UTC" note on that entry for the full
detail. No code changed this run — the backlog edit is the only diff.

---

### No public email capture anywhere on the marketing site — every directory in this category runs this growth loop, Toolnaut runs none of it
- **Status:** OPEN
- **Seen in:** There's An AI For That's own newsletter is self-reported at
  2.1M readers; Futurepedia's weekly digest at 350K subscribers — both
  numbers come from the directories' own newsletter-signup marketing, not a
  third-party estimate, and `src/content/comparisons.js:13` already quotes
  TAAFT's "~2.5M-subscriber newsletter" line in Toolnaut's own
  Toolnaut-vs-TAAFT comparison copy, so this project already knows the
  number without having the feature it describes. A public, no-signup email
  box in the site footer or hero is the oldest, cheapest acquisition loop in
  this category — visible on every major directory's homepage before a
  visitor ever creates an account.
- **Gap:** Toolnaut has an email-alert feature, but it is a different thing
  wearing a similar name: `AlertSettings.jsx` and `/api/alerts` (confirmed
  by reading both in full) only work for a signed-in account —
  `api/alerts.js:78-82,89-92` calls `getUserFromRequest(req)` and returns
  401 for GET and POST alike when there is no session, by explicit design
  ("THE ADDRESS COMES FROM THE VALIDATED TOKEN, NEVER THE REQUEST," the
  file's own header comment). A visitor reading the landing page who has
  never taken the quiz or made an account has no way to leave an email
  address anywhere. Grepped the whole `src/` tree for
  `newsletter|email.*capture|subscribe` (case-insensitive): the only hits
  are the signed-in alert toggle, `StatsSection.jsx`'s "Subscribers" tile
  (which counts *paid plan* subscribers via `public.subscriber_count()`,
  confirmed by reading its own code comment at `StatsSection.jsx:17-20` — an
  unrelated meaning of the same word), and the comparisons-copy line cited
  above describing a competitor's own newsletter, not Toolnaut's.
  `ContactSection.jsx` (the sitewide footer, read in full) has a social-icon
  row and a `mailto:` contact link and nothing else — no form, no input, no
  email field anywhere on any public page.
- **Why it matters:** every visitor who closes the tab without starting the
  quiz is a dead end today — there is no way to stay in touch with someone
  who isn't ready to commit to the 60-second quiz on their first visit, the
  exact audience a newsletter list exists to recapture. This is the
  pre-funnel counterpart to the already-shipped weekly-alerts feature: that
  one re-engages someone already inside the app; this one captures someone
  who never got there at all.
- **Smallest useful version (what to actually build):**
  - The backend already exists in the shape this needs: `alert_subscribers`
    (`supabase/migrations/0007_alert_subscribers.sql`) stores `email`,
    `domains text[]` (confirmed via `api/alerts-send.js:112`: an empty array
    means "alert on everything," not "alert on nothing" — exactly the
    no-picker default a one-field signup wants), and a per-row
    `unsubscribe_token uuid` already generated by the database default.
    Reusing this table for anonymous public signups needs exactly one new
    column: `confirmed boolean not null default true` (default `true` so
    every already-subscribed signed-in row, which went through a real
    Supabase session to get there, needs no retroactive action — only new
    anonymous inserts explicitly set it `false`).
  - **Why this can't just call `/api/alerts`:** that endpoint's entire
    security model is "the address comes from the session, never the
    request body" — precisely to stop one person subscribing or
    unsubscribing an address that isn't theirs. A public signup box has no
    session to read an address from, so it must accept an email in the
    request body, which means it needs the double-opt-in confirmation every
    real newsletter uses instead: insert the row unconfirmed, email a
    confirm link, only start sending once that link is clicked. This is not
    a corner cut — it's the industry-standard way anonymous capture stays
    safe from someone entering a stranger's address.
  - **The 12-function ceiling this has to fit inside:** `api/` holds exactly
    11 route files today (`ls api/*.js` minus the six `_`-prefixed helpers:
    `account-delete`, `alerts-send`, `alerts-unsubscribe`, `alerts`, `chat`,
    `create-order`, `entitlement`, `geo`, `metrics`, `razorpay-webhook`,
    `verify-payment`) against Vercel Hobby's hard cap of 12 — the same
    ceiling `api/alerts.js`'s own header comment says the project hit once
    already. This build gets exactly one new file, not two: a single
    `api/newsletter-subscribe.js` handles both halves the way
    `alerts-unsubscribe.js` already handles GET-shows-a-page vs.
    POST-takes-the-action in one file — `POST { email }` inserts the
    unconfirmed row and sends the confirmation email (via the existing
    `sendEmail()` in `_mail.js`, same helper `alerts-send.js` and
    `_accountDeletion.js` already share), `GET ?token=...` flips that row's
    `confirmed` to `true` and shows a plain HTML success page, styled like
    `alerts-unsubscribe.js`'s own `page()` helper (copy that pattern instead
    of inventing a second one). That is the 12th and last function slot —
    worth saying plainly in the PR, since nothing after this one ships
    without either freeing a slot or paying for Vercel Pro.
  - `alerts-send.js`'s subscriber query (`api/alerts-send.js:101`) needs one
    added filter, `&confirmed=eq.true`, so the daily digest cron never mails
    a pending, unconfirmed address.
  - One small frontend widget — an email `<input>` and a submit button,
    posting to `/api/newsletter-subscribe` — placed in `ContactSection.jsx`'s
    left column, directly under the social-icon row (`ContactSection.jsx:79-
    101`) and above the "count tools · catalogue updated" line
    (`ContactSection.jsx:105`), the same column every competitor's own
    newsletter box sits in relative to their social row. Reuses
    `useAnalytics()`/`EVENTS.CTA_CLICK` (already imported in this file) to
    track submission the same way the contact-email link already does
    (`ContactSection.jsx:153`), and `rateLimit()` from `_security.js`
    (already the pattern every other POST endpoint in `api/` uses) against
    the new endpoint.
  - **What this would NOT include** (kept out to bound the diff): no
    domain-preference picker on the public form (ships as "everything,"
    matching the already-existing empty-array default — a picker is a fast
    follow once the box itself exists, not a v1 requirement); no change to
    the signed-in `AlertSettings.jsx`/`/api/alerts` flow, which stays
    authenticated and untouched; no new email-template design system — the
    confirmation email reuses the same plain inline-styled HTML
    `alerts-send.js`'s digest template already uses, just a different body;
    no second placement (hero, a modal, an exit-intent popup) — one footer
    box, since that is the one placement every cited competitor actually
    uses and the one that cannot be dismissed as a dark pattern.
- **Build size:** M — one migration column, one new serverless function
  (the project's last available slot under the Hobby cap), one query filter
  added to an existing file, one small footer widget, one reused mail
  helper. Cannot be fully verified by this repo's own three local gates
  (`npm test`/`npm run build`/`npm run smoke` never execute `api/`) — same
  limitation every other `api/`-touching entry in this file already carries;
  needs a real Vercel preview deploy to confirm the function actually
  serves before calling it done.
- **Found:** 2026-10-07 06:20 UTC

---

### Research check 2026-10-07 06:04 UTC — thirty-ninth pass; changelog staleness recurred a fourth time, fixed again; logged a genuinely new gap after the re-verification sweep hit diminishing returns

Scheduled run, UTC hour 06 (one of the three research slots on a
non-feature day). `npm ci` clean. Local checkout started detached again —
same recurring container-start behavior every prior pass has noted; checked
out `master` and fast-forwarded from `df5f382` to `df6dcd7` before running
any check. `npm run radar:health` → `OK` (2 runs in the 26h window, last
run/publish 5.1h ago, 5 tools published that run, feed at 483 total,
growing). `list_workflow_runs` on `master`: `CI` green at the latest push
(`1805a87`, the 38th pass's own commit, followed by a clean radar-publish
commit `df6dcd7`) — nothing red since. No `agent-fixable` issues open
(`list_issues` zero results).

**The changelog-staleness bug (first found 2026-09-23, recurred and
re-fixed 2026-10-04, recurred a third time and re-fixed 2026-10-06) had
recurred a fourth time.** Today's own earlier feature run shipped per-tool
ratings & reviews (`0448e6f`, 2026-10-06 18:19 UTC) and the digest commit
(`76310d4`) that followed it only touched `DEVLOG.md` and the backlog —
`src/utils/changelogData.js`'s newest entry was still 2026-10-05's "Suggest
a tool," confirmed by grepping the file for `review` (zero hits) before
touching anything. Fixed in this run: added one newest-first entry dated
2026-10-06 ("Rate and review tools"), same plain-language voice (no shas,
no file paths) the file's header comment requires. The underlying process
gap this keeps exposing — translating a `SHIPPED` backlog entry into
`changelogData.js` as part of the feature run's own end-of-day step, not
left for research passes to catch after the fact — is still the "Changelog
only looks backward" entry's own open "Smallest useful version" and is
still OPEN; not re-logging a fifth note inside that entry's body, flagging
the fourth occurrence here instead, same place the second and third were
noted.

**Re-verification of the next untouched OPEN entry in the ongoing sweep
hit diminishing returns, so this run deepened instead of re-verifying
clean.** The last several passes (32nd–38th) each re-verified one more
already-thorough OPEN entry and found "no drift, nothing new" every time —
real signal that the backlog's existing OPEN entries are, at this point,
fully specified and simply waiting on a feature run, not short on detail.
Rather than re-verify a ninth entry clean in a row, spent this hour on two
fresh competitor searches instead. The first (AI model benchmark/leaderboard
display per tool listing) traced to real products (DataLearner, FlowHunt,
Arena) but no viable build: Toolnaut's catalogue has no structured
benchmark field and no reliable per-tool data source to backfill one across
~704 entries — the same wall the already-REJECTED stack-cost-estimate gap
hit for price data, so not logged. The second (newsletter/email-capture
patterns on competitor directories) held up on every count after reading
Toolnaut's own code: a real, universal pattern (TAAFT, Futurepedia, both
cited by name and reader count already living in this project's own
comparison copy), genuinely absent from `src/` (confirmed by grep and by
reading `ContactSection.jsx`/`AlertSettings.jsx`/`api/alerts.js` in full),
and buildable within a real, already-identified constraint (the 12-function
Hobby ceiling, with exactly one slot free) by reusing the existing
`alert_subscribers` table and `_mail.js` helper rather than inventing new
infrastructure. Logged above as "No public email capture anywhere on the
marketing site."

Ran `npm test` (315/315), `npm run build` (19 static routes, 1150
`/ai-tools/*` pages, feed at 483 tools, no errors), and `npm run smoke`
(25/25 routes, 0 console errors) against the `changelogData.js` fix before
committing. All three clean.

Per the "never invent a gap to fill the hour" rule, one genuine new gap was
logged this run, backed by two fresh competitor searches (one of which
failed verification and was correctly discarded) and a full reading of
every file the build plan touches — not a vague one-liner.

### Research check 2026-10-07 12:04 UTC — no new gap found, fortieth pass; re-verified the entry nobody had touched in over two weeks

Scheduled run, UTC hour 12 (one of the three research slots on a non-feature
day). `npm ci` clean. `npm run radar:health` → `OK` (2 runs in the 26h
window, last run/publish 11.1h ago, 5 tools published that run, feed at 483
total). `list_workflow_runs` on `master`: `CI`/`Release` both green at the
latest push (`f92c4995`, the 39th pass's own commit) — nothing red since.
No `agent-fixable` issues open (`list_issues` zero results). The two
scheduled `Agent · Research`/`Agent · Bugfix` GitHub Actions runs that fired
at 09:02 and 10:41 UTC today both show `conclusion: failure` in
`list_workflow_runs` — these are a separate automation's own runs (not this
session's master-direct routine, which has no corresponding workflow run of
its own to check), and CLAUDE.md scopes "CI red on master" to the actual
`CI` workflow, which stayed green throughout — not investigated further per
every prior pass's same scoping conclusion for the adjacent `bot/claude/*`
PR queue.

**Checked the last-touched date of every OPEN entry's own deepening/
re-verification note** (not just found-date, which the 33rd–37th passes'
sweep already exhausted down to "First-session onboarding checklist") to
find which one had gone longest without a dedicated pass. "Tool 'graveyard'
page" (found 2026-08-28, deepened once 2026-09-20) was the stalest at 17
days — older than "Embeddable badge" and "RSS feed" (both ~09-20/21), the
facet-counts and leaderboard entries (~09-22), the developer-API entry
(09-23), and "Weekly trending tools" (09-27, the freshest of the group).
Re-verified it in full against current `master` rather than re-verifying a
fresher one. Every substantive claim still held — the 652/52 Active/
Uncertain split is byte-identical, `ToolPublic.jsx` still has no `status`
row, neither `sitemap.xml` nor `smoke.mjs` has a `/graveyard` line — only
the `App.jsx` route-insertion line numbers had drifted by three (an
unrelated comment block landed above them). Correction appended to the
entry itself rather than repeated here.

**One fresh competitor lead checked and not logged:** a WebSearch into
whether any AI-tool directory lets a signed-in user keep more than one
named personal list/stack (as opposed to Toolnaut's single `stackStore.js`
array) surfaced only indirect, weak sources — a directory-of-directories
listing page for "Meta Tools" describing its own "Stack Packs"/"Community
Stacks" by name only, and a Product-Hunt-launch blurb for "stackd.cc"
describing a cross-user leaderboard. Neither is a primary source for the
actual feature (both read as the submitting product's own marketing copy
on a third-party aggregator, the same category of source the 34th pass's
compliance-badge lead already failed on), and both shapes described —
curated multi-tool bundles, and a cross-user ranking — are already covered
by this file's own still-OPEN "Collections" and "leaderboard-goes-real"
entries respectively. Not logged as a new gap; multi-list-per-user stays
unconfirmed as a real, buildable pattern rather than invented to fill the
hour.

Ran `npm test` (315/315), `npm run build` (19 static routes, 1150
`/ai-tools/*` pages, feed at 483 tools, no errors), and `npm run smoke`
(25/25 routes, 0 console errors) directly against current `master` — no
code changed this run, these confirm the backlog edit didn't need a code
fix alongside it. All three clean.

Per the "never invent a gap to fill the hour" rule, appended no new gap
this run — the one fresh lead failed primary-source verification, so the
hour went to re-verifying the longest-untouched OPEN entry instead.

### Research check 2026-10-07 15:04 UTC — no new gap found, forty-first pass; re-verified the longest-untouched OPEN entry, two fresh competitor searches came back empty

Scheduled run, UTC hour 15 (off-cycle fire between the 12:04 and 18:03
slots; the schedule's own 00:03/06:03/12:03/18:03 cadence drifts by a few
minutes run to run, same behavior every prior off-cycle pass has noted).
`npm ci` clean. Local checkout started detached again (same recurring
container-start behavior every prior pass has flagged); checked out
`master` and fast-forwarded from `204f40e` to `cc76cc2` before running any
check. `npm run radar:health` → `OK` (2 runs in the 26h window, last
run/publish 14.1h ago, 5 tools published that run, feed at 483 total,
unchanged since the 40th pass). `list_workflow_runs` on `master`'s `CI`
workflow specifically (the plain `list_workflow_runs` call without a
`resource_id` returned stale September data this run, worth noting for
whichever pass hits it next — re-querying with `resource_id: "ci.yml"`
returned the real current list): green at the latest push (`cc76cc2`, the
40th pass's own commit) — nothing red since. No `agent-fixable` issues open
(`list_issues` zero results).

**Checked the last-touched date of every OPEN entry again, this time by
"Found" date with no later Deepened/Re-verified note at all** (not just
longest-since-last-pass, which the 40th pass already covered for entries
that had at least one prior touch). "Track progress against your role, not
generic benchmarks" (found 2026-09-15, never deepened, never re-verified)
was the actual most-neglected entry at 23 days — older than the 40th pass's
own target (graveyard page, 17 days since its last touch, but that one had
already been deepened once). Re-verified it in full against current
`master`: every substantive claim still held except one real piece of
drift worth flagging — half its "smallest useful version" (the "core" tag
distinguishing starter-stack cards) turns out to already be shipped, under
different wording (`Stack.jsx`'s "From your persona" label), apparently
pre-existing and simply missed when the entry was written. The actual
deliverable, a derived mastery-count stat, is still entirely unbuilt.
Correction and narrowed scope appended to the entry itself.

**Two fresh WebSearches, neither produced a new gap.** Searched for recent
(2026) feature coverage of TAAFT/Futurepedia/Toolify — came back with
general directory-size/editorial-depth comparisons (task-based search,
video courses, ChatGPT-assisted auto-updates), each already mapped to an
existing OPEN entry (task search, educational content) or too vague to
act on (Toolify's "ChatGPT integration" has no checkable product surface).
Searched for AI-directory deal/discount/price-drop-alert patterns on the
theory it might differ from the already-REJECTED stack-cost-estimate gap —
results were generic e-commerce price-tracking tools with no AI-directory
angle at all, and the underlying blocker is identical to the existing
rejection (no price data source in the catalog). Also checked one
code-only lead before it got far enough to search for: whether a
referral/invite-a-friend growth loop (the pattern the newly-logged
email-capture gap's own research didn't cover) was missing — reading
`TrustPanel.jsx:118` and `Methodology.jsx:132` first showed Toolnaut states
"no referral code" as one of its own stated trust differentiators, so
building one would contradict the product's existing public position;
discarded before a web search was even worth running.

Ran `npm test` (315/315), `npm run build` (19 static routes, 1150
`/ai-tools/*` pages, feed at 483 tools, no errors), and `npm run smoke`
(25/25 routes, 0 console errors) directly against current `master` — no
code changed this run, these confirm the backlog edit didn't need a code
fix alongside it. All three clean.

Per the "never invent a gap to fill the hour" rule, appended no new gap
this run — both fresh leads failed verification, so the hour went to
re-verifying the longest-truly-untouched OPEN entry instead.

### Research check 2026-10-08 00:04 UTC — no new gap found, forty-second pass; flagging a skipped feature+digest run and a lost radar publish

`npm ci` clean. `master` at `3d1e3f0` (the 41st pass's own commit) in both
the local checkout and `origin/master` — nothing landed on `master` in the
~9h since, which the two findings below explain. CI green at `3d1e3f0`
(`ci.yml` run #530 and `release.yml` run #455, both `success`). No
`agent-fixable` issues open (`list_issues` zero results). `npm run
radar:health` → `OK` (1 run in the 26h window, last run/publish 23.1h ago,
5 tools published that run, feed at 483 total) — the script itself reports
healthy, but see the first finding below for what it can't see.

**Finding 1 — a radar run found and then lost 4 tools to a GitHub-side
outage, invisible to `radar:health`.** `actions_list` on `master` showed
the most recent `Radar` workflow run (`#94`, 2026-10-07 16:33 UTC)
completed `failure`, contradicting the healthy `radar:health` read above.
Pulled its job log: the discovery pipeline ran clean end to end (75
candidates, 4 published, `sync-to-app.js` wrote 487 tools), but the
`Commit the store and the app feed` step's own commit (`972f20d`,
local-only, never reached `origin`) failed to push three times in a row —
not a real conflict, GitHub's API itself returned `500 Internal Server
Error` on all three attempts (`remote: Internal Server Error`, three
distinct Request IDs, ~8s apart). The workflow's existing retry loop
(`radar.yml`'s commit step: 3 attempts, 5s sleep) wasn't built to survive
a provider-side outage that long, so those 4 tools and that commit are
gone — not recoverable from this machine, the runner that held them no
longer exists. `radar:health` reads clean because its 26h window's
*successful* runs (01:01 UTC, 5 published) already satisfy the health
bar; it has no way to see a run that found real candidates and then
silently failed to persist them. Not fixing the retry loop tonight — it
would mean editing `radar.yml` for a one-off provider 500 with only one
occurrence on record, and the health signal the routine is told to trust
came back `OK`. Worth a note for whoever next touches `radar.yml`: the
commit step's retry count/backoff is tuned for a push race against this
same routine's own commits, not for GitHub API downtime, and the two
failure modes look identical in the log until you read the error text.

**Finding 2 — the 2026-10-07 18:03 UTC feature+digest run appears to have
not fired at all.** `DEVLOG.md`'s newest section is still `2026-10-06`;
issue #94 (`Dev digest 2026-10-06`) is still `OPEN`, not closed by a
following day's digest the way every prior digest issue in this list
closes the one before it; and `git log origin/master` has zero commits
between `3d1e3f0` (15:10 UTC) and now (00:04 UTC the next day) — no
feature commit, no digest-issue creation, nothing. Every previous day in
this backlog's history has exactly one `## YYYY-MM-DD` `DEVLOG.md` section
and one closed digest issue; yesterday has neither. This isn't a run that
shipped nothing and said so (the instructions' explicit "shipping nothing
is a last resort, but a valid one" path) — there is no digest issue at
all for 2026-10-07, which every previous "shipped nothing" day still
produced. This looks like the scheduled trigger for that slot simply
didn't fire, which is outside what a research-hour pass run from inside
the routine can diagnose or fix (it would need access to whatever cron/
trigger config schedules these runs, not this repo). Flagging it plainly
rather than attempting a feature run out of turn — this pass fired at
hour 00, a research slot, and the dispatch rule names hour 18 as the only
feature+digest slot.

No new product gap found this run — the backlog's own fresh-competitor
rotation (23 competitor/problem-area studies logged across the last
~15 passes, per the `Seen in:` lines above) has reached the point where
two independent fresh searches this run (AI-directory "stack builder"/
matcher trend: Swaposaur, Meta Tools, GateOnAI, AI Tools Mentor; and
their shared "cost visibility before you commit" angle) both traced
straight back to ground already covered here — stack builders and
community-shared stacks to the already-OPEN "No browsable gallery of
shared stacks" (deepened 38th pass) and the task-first natural-language
search angle to the already-OPEN "public search page's own placeholder
promises task search"; the cost-visibility angle to the already-REJECTED
stack-cost-estimate gap's catalog-schema blocker. Ran `npm test`
(315/315), `npm run build` (19 static routes, 1155 `/ai-tools/*` pages),
and `npm run smoke` (25/25 routes, 0 console errors) directly against
current `master` to confirm nothing drifted — all three clean, no code
changed this run.

---

### Research check 2026-10-08 09:04 UTC — no new gap found, forty-third pass; second-sweep re-verification of the oldest OPEN entry, per-tool reviews confirmed shipped

Scheduled run, UTC hour 09 (one of the three research slots on a non-feature
day). `npm ci` clean. Local checkout was detached at session start again
(same recurring container-start behavior every prior pass has noted) —
checked out `master` and fast-forwarded 18 commits from `origin/master`
(`204f40e` → `2135406`), which turned out to include the 42nd pass's
own radar-health and process findings plus a full feature+digest cycle
this pass hadn't seen yet: **"per-tool ratings & reviews" (flagged as
SHIPPED in this backlog, 36th/37th passes) is confirmed actually on
`master`** — `src/state/toolReviewsStore.js` and
`src/utils/toolReviewsData.js` both exist, `ToolDetail.jsx` grew by 128
lines to wire them in. `npm run radar:health` → `OK` (1 run in the 26h
window, last run/publish 3.0h ago, 9 tools published that run, feed at 492
total, growing). `list_workflow_runs` on `master`: `CI`/`Release` both
green at the latest push (`677c1f2`, a direct radar-fix commit — see
below). No `agent-fixable` issues open (`list_issues` zero results).

**The 42nd pass's "missing 2026-10-07 18:03 UTC feature+digest run"
finding still stands, unresolved.** `DEVLOG.md`'s newest section is still
`## 2026-10-06`; issue #94 (`Dev digest 2026-10-06`) is still `OPEN`,
unclosed by a following day's digest. Over 24h have now passed since that
slot was due with no feature or digest commit on `master` — the only
`master` activity since has been a direct radar-pipeline fix
(`677c1f2`, "stop retrying LLM timeouts at full budget," fixing the exact
STALE radar run the 42nd pass's own research pass had separately flagged)
and routine radar publishes. This is still outside what a research-hour
pass can diagnose from inside the repo (no access to the scheduler/trigger
config) — noted again rather than re-investigated, since nothing new is
knowable about it from here. The open `bot/claude/*` PR queue (`#91`/`#89`/
`#86`/`#75`, per every prior pass's tracking) is unchanged at the same four
head SHAs already on record — nothing to sync.

**Full re-verification sweep (passes 19–41) having completed one full
cycle through every OPEN entry's found-date order, started a second pass
at the beginning of that order** rather than force a new competitor search
to fill the hour. Two fresh WebSearches were tried first and both traced
back to existing ground: "AI tool directory save favorites / personalized
shortlist / side-by-side compare" surfaced Powered By AI, OpenFuture AI,
AIAnyTool and AInexfinder (all Product-Hunt-era launches), but every
feature described already exists here — favoriting/shortlisting maps to
the existing `stackStore.js` + `progressStore.js` (want/using/tried
status, already shipped), compare maps to the existing `/compare/:slugs`
and `/app/compare` routes (both confirmed live in `App.jsx:124,155`), and
"filter by whether a tool has an API" maps to the already-shipped
access-method facet (PR #89). A second search for 2026 directory deals/
price-alert features turned up only a hardware-compute-price monitor
(irrelevant) and an AppSumo-style deals marketplace still "coming soon" on
its own listing (unconfirmed, and this file's vendor-deal/coupon angle is
already REJECTED — no vendor relationships exist to back one).

**Re-verified "First-session onboarding checklist"** (found 2026-08-23
06:06 UTC, the single oldest OPEN entry by found-date, last touched only
once by the 33rd pass on 2026-10-06) against current `master` — a genuine
second look, not a repeat of the first sweep. Core claim still holds:
`grep -rniE "checklist|getting.started|onboard" src/` still turns up no
persistent post-signup nudge UI — only `src/components/onboarding/
FlowSteps.jsx` (the pre-quiz "Getting started" nav, a different surface:
shown only on the three onboarding *screens*, not after) and
`src/utils/funnel.js`'s `markOnboarded()` (a one-shot analytics event, not
a visible checklist). `communityStore.js` (read in full) still has no
`hasPostedThread()`-shaped export — `loadThreads`/`getThread`/
`toggleUpvote`/`addReply`/`addThread` are the only exports, exactly as the
entry describes, so the planned one-line addition is still accurate.
`roadmapStore.js`'s `allStepsDone`/`isStepDone` exports (cited by the
entry) are both still present and unchanged. Line-number drift found and
worth flagging for whoever builds this: `Stack.jsx` has grown from the
~470-line file the entry was written against to 471 lines today, but the
cited anchors moved further than the file grew — "Next up" is now at
`Stack.jsx:436` (entry says `337-356`) and the streak-card section the
entry plans to mount the checklist under now starts around `Stack.jsx:273`
(entry says `199-219`), roughly 100 lines of drift from several features
shipping in between (ratings/reviews, hidden-gems rail's eventual merge,
etc.). `stackStore.js:7` now holds `loadStack` (entry says `:6`) — one-line
drift, same pattern every other re-verified entry in this file has shown.
Correcting the anchors here rather than editing the entry itself, since
the plan's shape is otherwise untouched and a future builder should expect
one more drift pass by the time they actually pick this up.

Ran `npm test` (315/315), `npm run build` (19 static routes, 1163 tool
pages, feed at 492 live tools, no errors), and `npm run smoke` (25/25
routes, 0 console errors) directly against current `master` — all three
clean, no bug found to fix this run.

Per the "never invent a gap to fill the hour" rule, appended no new gap
this run — both fresh searches traced back to existing ground or an
already-REJECTED angle, so the hour went to starting a second
re-verification sweep at the oldest OPEN entry instead.

---

### Tool pages' JSON-LD still says "no rating ... the catalogue does not hold" — the ratings data it was waiting on shipped three weeks ago
- **Status:** OPEN
- **Seen in:** not a new competitor citation — this is the "Structured data
  (JSON-LD)" entry above (`docs/research-backlog.md:3226`, SHIPPED
  2026-08-29) catching up with its own explicitly-deferred follow-up, the
  same "precondition shipped, nobody flipped it" pattern this file already
  logged once for the leaderboard entry. G2/Capterra's `aggregateRating`
  markup (cited by that original entry) is exactly what makes their listings
  show a star rating directly in the Google search snippet instead of a
  plain blue link.
- **Gap:** `src/utils/toolSeo.js`'s own file header states the rule under
  which `toolJsonLd()` was written: "NO INVENTED FACTS... there is no
  rating, no review count and no price figure the catalogue does not hold."
  `toolJsonLd(t, related)` (`toolSeo.js:81-98`) emits `SoftwareApplication` +
  `BreadcrumbList` (+ an `ItemList` of alternatives) — no `aggregateRating`,
  no `review`, confirmed by reading the function in full. That was the
  correct call when written: the JSON-LD entry's own 2026-08-29 scoping note
  (`docs/research-backlog.md:3282-3284`) explicitly left `aggregateRating`
  out "because the per-tool ratings/reviews gap above is still OPEN — don't
  emit a rating schema with no rating data behind it." That gap shipped
  2026-10-06 (`0448e6f`, confirmed in DEVLOG's 2026-10-06 entry) —
  `src/utils/toolReviewsData.js` now holds 20 real seed reviews across 15
  slugs as a plain static export (`REVIEWS`, read in full), and
  `src/state/toolReviewsStore.js`'s `getAverageRating(slug)`/`getReviews(slug)`
  (read in full) compute a real, non-fabricated average — `getAverageRating`
  returns `null`, never a fake `0.0`, for a tool with zero reviews. Checked
  `scopedStorage.js`'s `read()` (`scopedStorage.js:44-52`, read in full): it
  wraps `localStorage.getItem` in try/catch and returns the fallback on any
  throw, so `getReviews()`/`getAverageRating()` are already safe to call
  from Node with no `window` — they'd just see the seed set, since the
  user-review branch falls back to `[]`. The precondition the original
  entry was waiting on has held for three weeks and nothing came back to
  use it.
- `toolJsonLd()` is called from exactly two places, both already confirmed
  by the file's own header comment to share one implementation on purpose
  ("SHARED BY TWO RUNTIMES ON PURPOSE"): `src/pages/ToolPublic.jsx:29` (the
  live, client-hydrated `/ai-tools/:slug` page) and
  `scripts/gen-tool-pages.mjs:67` (the static-HTML generator that writes
  `dist/ai-tools/<slug>/index.html` for all ~1,100+ crawlable tool pages —
  the actual bytes Googlebot receives, confirmed by reading the script's own
  header comment). Fixing `toolJsonLd()` once fixes both runtimes, same as
  every prior SEO entry in this file.
- **Why it matters:** this is the exact rich-result win the original
  JSON-LD entry was built to chase, now unlocked for free — and the 15
  slugs that already have seed reviews (`chatgpt`, `claude`, `notion-ai`,
  `perplexity`, `cursor`, `midjourney`, `github-copilot`, `v0`, `runway`,
  `grammarly`, `notebooklm`, `figma-make`, `gemini`, `grok`, `deepseek`) are
  also the highest-traffic tool pages in the catalog, so the upside
  concentrates exactly where it's most visible.
- **Smallest useful version (what to actually build):** inside
  `toolJsonLd()`, after building `app`, import `getAverageRating`/
  `getReviews` from `../state/toolReviewsStore` and, only when
  `getReviews(t.slug).filter(r => r.seed).length > 0`, add
  `app.aggregateRating = { '@type': 'AggregateRating', ratingValue: avg,
  reviewCount: seedCount }` using the **seed-only** count and average, not
  the full `getReviews()` result. Seed reviews are identical in every
  browser and in the Node build step; a signed-in visitor's own freshly
  added review lives in that one browser's `scopedStorage` and is invisible
  to `gen-tool-pages.mjs` — counting it would make the static page Google
  indexed and the live page the visitor sees disagree about the same tool's
  rating the moment they submit a review, which is exactly what this file's
  shared-runtime design exists to prevent.
- **What this would NOT include** (kept out to bound the diff): no
  individual `Review` objects in the JSON-LD — Google's own guidance treats
  `AggregateRating` alone as sufficient, and a full `Review` array for 15
  tools is unnecessary payload for a first cut; no change to the ~1,085
  tools with zero seed reviews — they keep emitting exactly the JSON-LD they
  do today, with the field absent rather than a fabricated `0`, matching
  this file's own standing rule; no backend or Supabase change, no new
  store, no new route.
- **Build size:** S — a few lines added inside the existing `toolJsonLd()`
  function in `toolSeo.js`, reusing `getAverageRating`/`getReviews` from the
  already-shipped `toolReviewsStore.js`. No new file, no new dependency.
- **Found:** 2026-10-08 12:04 UTC

---

### Research check 2026-10-08 15:09 UTC — no new gap found, forty-fifth pass; second sweep continues at the next-oldest OPEN entry

Scheduled run, UTC hour 15 (a research slot). `npm ci` clean. Local checkout
was detached at session start again (the same recurring container-start
behavior every prior pass has noted) — checked out `master` and
fast-forwarded 20 commits from `origin/master` (`204f40e` → `b6389ed`),
which included the 44th pass's own JSON-LD aggregateRating finding (new OPEN
entry, build size S, not yet picked up by a feature run) on top of the
43rd pass's per-tool-reviews confirmation. `npm run radar:health` → `OK`
(1 run in the 26h window, last run/publish 8.9h ago, 9 tools published that
run, feed at 492 total). `list_workflow_runs` on `master`: `CI` green at the
latest push (`b6389ed`). No `agent-fixable` issues open (`list_issues` zero
results). The open `bot/claude/*` PR queue (`list_pull_requests`, 28 open
PRs from `#10` through `#91`) is the same long-stale backlog every prior
pass has tracked — unchanged, nothing new to sync, and outside what a
research-hour pass can act on (these predate and run parallel to this
backlog-driven routine, not something this routine opens or closes).

**Second sweep continued at the next-oldest OPEN entry by found-date.** The
43rd pass closed the oldest entry ("First-session onboarding checklist,"
2026-08-23); the next-oldest is "PDF roadmap export" (2026-08-25,
previously deepened 2026-09-03 and re-verified 2026-09-23). Re-verified it
again against current `master` (full detail appended inline to the entry
itself, above, matching that entry's own established pattern of in-place
deepening rather than a separate note here): the build plan, the
entitlement-gating logic (`guru`/`founder`/`pandava` paid tiers vs. the
free `shishya` tier, confirmed against current `planData.js` ids), and the
dependency-free `window.print()` approach all still hold exactly as last
corrected. One more small anchor drift found and fixed: a new `<p>` eyebrow
line ("Learn") was added above `Learning.jsx`'s `<h1>`, shifting the
previously-pinned insertion point by three lines. Nothing else changed.

Two fresh searches were tried first, before falling back to the sweep, per
the "deepen before you add" rule: "AI tool directory 2026 pricing
calculator / newsletter / roadmap builder / integration marketplace" and
"AI tool directory deprecation / alternatives finder / migration guide
feature 2026" (WebSearch, both standard mode). Neither turned up a real,
shipped competitor pattern — the first returned only unrelated SEO-spam
listicles and generic "best AI directories" roundups with no concrete
feature to cite; the second surfaced only OpenAI/GitHub Copilot's own
model-deprecation pages (a different product category entirely, not an
AI-tool-directory feature) and no directory that actually builds a
migration-guide surface. Nothing genuine to log as a new gap, and this
file's existing coverage is already wide enough (26 OPEN entries spanning
sharing, export, search, filtering, personalization, onboarding, a public
API, RSS, a backlink badge, visual identity, collections, a leaderboard,
benchmarks, testimonials, email capture, a browser-extension lookup
surface, vendor claims, and now structured-data ratings) that two searches
this hour both traced back to ground already covered rather than opening
new ground — consistent with the pattern the last several passes have
already reported.

Ran `npm test` (315/315), `npm run build` (19 static routes, 1163 tool
pages, feed at 492 live tools, no errors), and `npm run smoke` (25/25
routes, 0 console errors) directly against current `master` — all three
clean, no bug found to fix this run. Per the "never invent a gap to fill
the hour" rule, appended no new gap this run — the hour went to the PDF
roadmap export re-verification instead.

---

### Research check 2026-10-09 00:04 UTC — no new gap found, forty-seventh pass; second sweep moves to "Discover's filter chips carry no facet counts"

Scheduled run, UTC hour 00 (a research slot). `npm ci` clean. Local checkout
was detached at session start again (same recurring container-start
behavior every prior pass has noted) — checked out `master` and confirmed
already at `origin/master`'s tip (`a234dbf`, no commits to fast-forward).
`npm run radar:health` → `OK` (2 runs in the 26h window, last run/publish
7.5h ago, 4 tools published that run, feed at 496 total). `list_workflow_runs`
on `master`: `CI` and `Release` both green at the latest push (`a234dbf`).
No `agent-fixable` issues open (`list_issues` zero results).

**Second sweep continued at the next-oldest OPEN entry by found-date.** The
46th pass deepened "Pro chat assistant & the entire Team tier" (found
2026-08-25 15:35, still OPEN — correctly unbuildable client-side, not a
candidate for closing); the next-oldest OPEN entry by found-date, skipping
everything that shipped in between (tool status-note reasons, command
palette, category landing pages, weekly digest email), is "Discover's
filter chips carry no facet counts" (found 2026-08-27 15:07, last deepened
2026-09-22). Re-verified it in full against current `master` (detail
appended inline to the entry itself, above, matching this file's own
established in-place-deepening pattern): read the current 455-line
`Discover.jsx` top to bottom rather than trust any previously-cited line
number. Substance holds exactly as every prior check found it — `Pill`
still takes only `{ active, onClick, children }`, the `cat`/`price`/`level`
filter predicate is still three inline equality checks never extracted
into a shared helper, `matchesQuery()` still covers only the free-text
half, and `find src -iname '*facet*'` still returns zero hits. Only the
line numbers moved (a fifth drift pass, caused by the fresh-tools recency
window and recently-viewed rail landing since the last check) — corrected
in the entry itself. This is now four independent re-verifications (09-01,
09-02, 09-22, 10-09) that have found this entry's build plan unchanged in
substance, making it one of the most verification-hardened OPEN entries in
this file and a strong candidate whenever a feature run wants a small,
well-scoped slice.

Two fresh searches were tried first, before falling back to the sweep, per
the "deepen before you add" rule: "AI tool directory 2026 'compare price'
OR 'price alert' OR 'tool stack sharing' new feature launch" and "There's
An AI For That OR Futurepedia OR ToolFinder new feature 2026 'AI agent'
recommendations" (WebSearch, both standard mode). Neither turned up a
verifiable, sourced competitor feature this file doesn't already cover —
the first returned only self-reported Product Hunt listings with unconfirmed
launch dates and no primary-source feature confirmation (closest overlap,
"AI Tools Mentor," already maps to this file's already-OPEN stack-cost and
shared-stacks-gallery entries); the second returned mostly unrelated
consumer-AI/Samsung-event noise and third-party review-blog copy
(`aiindigo.com` again) with no official changelog or announcement for any
of the three named directories. Nothing genuine to log as a new gap.

Ran `npm test` (315/315) directly against current `master` — clean. This
was a docs-only research pass (no `src/`/`radar/`/`api/` edit), so
`npm run build`/`npm run smoke` were not re-run; nothing in this commit
touches build output or runtime behavior. Per the "never invent a gap to
fill the hour" rule, appended no new gap this run — the hour went to the
Discover-filter-chips re-verification instead.

---

### Research check 2026-10-08 21:04 UTC — no new gap found, forty-sixth pass; second sweep moves to "Pro chat assistant" and finds a real provider-drift correction

Scheduled run, UTC hour 21 (a research slot). `npm ci` clean. Local
checkout was detached at session start again (same recurring behavior
every prior pass has noted) — checked out `master` and fast-forwarded 24
commits from `origin/master` (`204f40e` → `4ba50d2`), which included the
45th pass's own PDF-export re-verification and the feature run that shipped
it (`408a2b3`) plus its digest (`4ba50d2`). `npm run radar:health` → `OK`
(2 runs in the 26h window, last run/publish 4.5h ago, 4 tools published
that run, feed at 496 total). `list_workflow_runs` on `master`: `CI` and
`Release` both green at the latest push (`4ba50d2`); the one `failure`
conclusion in the recent run list belongs to an earlier, superseded push
(`408a2b3`) that a later commit on the same branch already supersedes with
a green run — not current-head CI red. No `agent-fixable` issues open
(`list_issues` zero results).

**Second sweep continued at the next-oldest OPEN entry by found-date.**
The 43rd pass closed "First-session onboarding checklist" (2026-08-23);
the 45th closed "PDF roadmap export" (2026-08-25 03:20, now SHIPPED
`408a2b3`); the next-oldest OPEN entry is "Pro chat assistant & the entire
Team tier are unbacked and unbuildable client-side" (found 2026-08-25
15:35, last deepened 2026-09-23). Re-verified Gap 1 in full against
current `master` (detail appended inline to the entry itself, above,
matching its own established in-place-deepening pattern) and found a real
drift worth correcting, not just a clean re-confirmation: `api/chat.js`
quietly switched its entire LLM provider from Featherless/Qwen2.5-7B to
NVIDIA (`integrate.api.nvidia.com`, default model
`meta/llama-3.1-8b-instruct`, key env var now `NVIDIA_API_KEY`) at some
point after 09-23 — the file's own header comment documents the switch
and the reasoning. That also makes the 09-23 deepening's pre-ship caution
(issue #63's Featherless-invoice outage, flagged as a risk for anything
copying `api/chat.js`'s scaffolding) doubly moot: the issue itself closed
2026-09-27 (`completed`, confirmed via `issue_read`), and separately the
endpoint this entry's build plan would copy from no longer calls
Featherless at all. Net effect: Gap 1's build plan and M sizing are
unchanged, but it now carries one fewer caveat than before — a cleaner
pick for a feature run than the 09-23 note suggested.

Two fresh searches were tried first, before falling back to the sweep,
per the "deepen before you add" rule: "AI tool directory 2026 'tool stack'
API marketplace integrations feature" and "There's An AI For That OR
Futurepedia 2026 new feature saved searches alerts community" (WebSearch,
both standard mode). Neither turned up a verifiable, sourced competitor
feature — both came back as thin third-party review-blog copy (mostly
`aiindigo.com`) with no primary-source confirmation of any concrete
feature this file doesn't already cover, consistent with the pattern the
last several passes have reported. Nothing genuine to log as a new gap.

Ran `npm test` (315/315) directly against current `master` — clean. This
was a docs-only research pass (no `src/`/`radar/`/`api/` edit), so
`npm run build`/`npm run smoke` were not re-run; nothing in this commit
touches build output or runtime behavior. Per the "never invent a gap to
fill the hour" rule, appended no new gap this run — the hour went to the
Pro-chat-assistant provider-drift correction instead.

---

### Research check 2026-10-09 03:04 UTC — no new gap found, forty-eighth pass; second sweep moves to "Embeddable Featured on Toolnaut badge," the stalest-by-last-check OPEN entry

Scheduled run, UTC hour 03 (a research slot). `npm ci` clean. Local checkout
was detached at session start again (same recurring container-start behavior
every prior pass has noted) — checked out `master` and fast-forwarded one
commit from `origin/master` (`204f40e` → `60b1132`, a radar publish commit,
no backlog/src change). `npm run radar:health` → `OK` (3 runs in the 26h
window, last run/publish 1.6h ago, 1 tool published that run, feed at 497
total). `list_workflow_runs` on `master`: `CI`/`Release`/`Radar` all green at
the latest push (`9de7497`, one pass ahead of the fetched `60b1132` tip —
confirmed via `list_workflow_runs`, not a red run). No `agent-fixable` issues
open (`list_issues` zero results).

**Second sweep continued at the next-oldest OPEN entry by found-date**, but
with a twist worth recording: the strict next entry after the 47th pass's
"Discover's filter chips" (found 08-27 15:07) is "Tool 'graveyard' page"
(found 08-28 00:15) — however that entry was already independently
re-verified twice, 09-20 and 10-07, just two days ago, and found fully
unchanged both times ("the most build-ready entry nobody has touched in
over two weeks" as of the 10-07 check). Re-running the same check two days
later would have been pure repetition with nothing left to find, so this
pass instead applied the sweep's actual intent — surface whichever OPEN
entry is stalest by *last-check* date, not just next by found-date — and
re-verified "Embeddable 'Featured on Toolnaut' badge" (found 08-28 03:15,
last deepened 09-22, 17 days stale, the longest gap of any OPEN entry's own
last-check timestamp as of this run). Full detail appended inline to the
entry itself (above), matching this file's established in-place-deepening
pattern. Substance holds completely: `embedBadge.js` still does not exist,
`grep -rniE "embed|badge|featured on toolnaut" src/` still returns nothing
relevant. Lines drifted again (`ToolDetail.jsx`'s "Visit website" anchor
moved from `151-163` to `234-246`; the `/s/:slugs` route from `App.jsx:120`
to `:123`; both copy-to-clipboard precedents moved too), and one real
wrinkle turned up: a new "Something wrong here?" report-issue link now sits
directly after "Visit website" on `ToolDetail.jsx` (added since the last
check), which the original plan's "mount directly after Visit website"
instruction didn't anticipate — corrected to mount the embed disclosure
after the stack/favorite action row instead, preserving the page's existing
primary-CTA-then-quiet-link ordering rather than wedging a third thing
between two deliberately-ordered elements. No change to build size or scope.

Two fresh searches were tried first, before the sweep, per the "deepen
before you add" rule: "AI tool directory 2026 new feature 'AI readiness' OR
'team onboarding' OR 'tool migration' launch" and "Futurepedia OR 'There's
An AI For That' OR Toolify 2026 new feature announcement changelog"
(WebSearch, both standard mode). Neither surfaced a verifiable, sourced,
dated feature announcement from any named directory — both came back as
third-party review-blog summaries (several from `aiindigo.com` again) with
conflicting, unsourced claims (one source puts Futurepedia's catalog size at
"150+," another at "2,500+," a third at "12,000+" — not something to cite
as fact) and no primary-source changelog for any of the three directories
checked. Consistent with the pattern the last several passes have reported.
Nothing genuine to log as a new gap.

Ran `npm test` (315/315) directly against current `master` — clean. This
was a docs-only research pass (no `src/`/`radar/`/`api/` edit), so
`npm run build`/`npm run smoke` were not re-run; nothing in this commit
touches build output or runtime behavior. Per the "never invent a gap to
fill the hour" rule, appended no new gap this run — the hour went to the
embed-badge re-verification instead.

### Research check 2026-10-09 06:09 UTC — no new gap found, forty-ninth pass; second sweep moves to "RSS feed of newly discovered tools"

Scheduled run, UTC hour 06 (a research slot). `npm ci` clean. Local checkout
was detached at session start again (same recurring container-start behavior
every prior pass has noted) — checked out `master` and fast-forwarded 28
commits from `204f40e` to `519357d` (the 48th pass's own commit plus the
intervening radar/release automation). `npm run radar:health` → `OK` (3 runs
in the 26h window, last run/publish 4.6h ago, 1 tool published that run, feed
at 497 total). `list_workflow_runs` on `master`'s `CI` workflow specifically:
green at the latest push (`519357d`) — nothing red since. No `agent-fixable`
issues open (`list_issues` zero results).

**Second sweep continued at the next-stalest-by-last-check OPEN entry.** The
48th pass closed out "Embeddable 'Featured on Toolnaut' badge" (last touched
09-22 03:20, the stalest at the time). Checked every OPEN entry's own
last-check timestamp again: "RSS feed of newly discovered tools" (found
09-02, deepened once on 09-22 06:20 — three hours fresher than the badge
entry was, which is exactly why the 48th pass's sweep reached the badge
first) is now the stalest at 17 days. Re-verified it in full against current
`master`. The core gap holds completely — `public/feed.xml` does not exist,
no `<link rel="alternate" type="application/rss+xml">` tag anywhere in
`index.html`. Three pieces of drift found and corrected inline on the entry
itself (not repeated here): the entry's own "zero hits" grep claim needed a
scoping caveat now that `radar/sources/rss.js` exists as an unrelated input
discovery source; a stronger sitemap-generation precedent
(`gen-tool-pages.mjs` + `stamp-sitemap.mjs`) has landed since this entry was
found, strengthening rather than weakening the plan; and the "session-gated
route" wrinkle the entry flagged on `NewTools.jsx`'s JSON-LD is now stale —
that page emits the public `/ai-tools/:slug` route today, so the feed's own
`<link>` needs no such caveat. Still Build size S, still fully unbuilt.

**Two fresh WebSearches, neither produced a new gap.** Searched for 2026
feature launches from Futurepedia/"There's An AI For That" (comparison,
integration directory, workflow templates) and from Toolify/
AIToolsDirectory — both came back with unrelated results (Samsung Galaxy
AI features, enterprise SaaS release notes, third-party directory-roundup
pages with the same conflicting unsourced catalog-size figures prior passes
have already flagged) and no primary-source changelog from any named
competitor. Consistent with the pattern every recent pass has reported.
Nothing genuine to log as a new gap.

Ran `npm test` (315/315) directly against current `master` — clean. This
was a docs-only research pass (no `src/`/`radar/`/`api/` edit), so
`npm run build`/`npm run smoke` were not re-run; nothing in this commit
touches build output or runtime behavior. Per the "never invent a gap to
fill the hour" rule, appended no new gap this run — the hour went to the
RSS-feed re-verification instead.

---

### Research check 2026-10-09 09:04 UTC — no new gap found, fiftieth pass; second sweep moves to "26 real source categories," corrects the sitemap-stamping precedent's blind spot

Scheduled run, UTC hour 09 (a research slot). `npm ci` clean. Local checkout
was detached at session start again (the same recurring container-start
behavior every prior pass has noted) — fetched and fast-forwarded to
`origin/master` (`733cd25`). `npm run radar:health` → `OK` (2 runs in the
26h window, last run/publish 7.6h ago, 1 tool published that run, feed at
497 total). `list_workflow_runs` on `master`'s `CI` workflow: green at the
latest push (`733cd25`), nothing red since. No `agent-fixable` issues open
(`list_issues` zero results).

**Second sweep continued at the next-stalest-by-last-check OPEN entry.**
The 49th pass closed out "RSS feed of newly discovered tools" (last
touched 09-22, the stalest at the time). Recomputing every OPEN entry's
own last-check timestamp by actually reading each entry's most recent
dated note (not just its `Found:` date — several entries carry a later
`Deepened`/`Verification` note that sits well after when they were first
found) turned up "26 real source categories exist, only the 6 broad domain
pages shipped" (found 2026-09-05, last verified 2026-09-25) as the true
stalest at 14 days — older than it first looked, since a `Verification
2026-09-25 12:07 UTC` note deep inside the entry had been easy to miss
against its `Found:` date alone. Re-verified it in full against current
`master`: the core two-part gap holds completely unchanged — still only 6
`/tools/:domain` routes exist for 26 real `SOURCE_CATEGORIES`, still no
pagination cap on any of them, all five domain tool-count sums re-checked
against current `toolsCatalog.js` and unchanged since the entry was found.
Corrected three lines of citation drift inline on the entry (`Discover.jsx`
grew to 455 lines since 09-25, moving `PAGE_SIZE` and the LOAD-MORE button;
`CategoryLanding.jsx` gained an unrelated empty-state branch). Found one
genuine new wrinkle worth logging rather than just drift: `scripts/
stamp-sitemap.mjs` + `freshness.js`'s `stampSitemap` — the same
sitemap-freshness precedent the 49th pass noted had strengthened the RSS
entry's plan — keys its `<lastmod>` map by the 6-domain `category` field
only, so the 26 new subcategory URLs this entry's plan would add get no
freshness date unless a second `sourceCategory`-keyed loop is added. Noted
as optional (a missing `<lastmod>` is explicitly neutral per that script's
own comment), not a blocker. Still OPEN, still Build size M.

Two fresh WebSearches, neither produced a new gap: Futurepedia/"There's An
AI For That" 2026 changelogs (returned nothing relevant — neither site
appears to publish an indexed public changelog, consistent with every
prior pass's experience trying the same two named competitors) and AI
directory subcategory/long-tail-SEO practice in 2026 (returned indie-
builder write-ups whose consensus — niche long-tail category pages beat
broad ones, add them once the directory already has real content, show
freshness/trust signals — reaffirms this entry's own thesis rather than
surfacing a new feature to log; also surfaced a general caution that
mass-generated programmatic pages carry Google spam-policy risk, which
doesn't apply here since these 26 pages are real curated catalog data, not
auto-generated thin content, but is worth keeping in mind if this ever
scales past the real 26 categories).

Ran `npm test` (315/315) directly against current `master` — clean. This
was a docs-only research pass (no `src/`/`radar/`/`api/` edit), so
`npm run build`/`npm run smoke` were not re-run; nothing in this commit
touches build output or runtime behavior. Per the "never invent a gap to
fill the hour" rule, appended no new gap this run — the hour went to the
"26 source categories" re-verification instead.

---

### Research check 2026-10-09 12:04 UTC — no new gap found, fifty-first pass; second sweep closes "Sharing a stack link" preview gap, four BUILT-UNMERGED PRs still waiting on human merge

Scheduled run, UTC hour 12 (a research slot). `npm ci` clean. `npm run
radar:health` → `OK` (2 runs in the 26h window, last run/publish 10.6h ago,
1 tool published that run, feed at 497 total). `list_workflow_runs` on
`master`'s `CI` workflow: green at the latest push (`d58a40c`), nothing red
since. No `agent-fixable` issues open (`list_issues` zero results). Noted in
passing but out of scope for this run: GitHub Actions' own separate
`Agent · Research` and `Agent · Bugfix` workflows both show `conclusion:
failure` for their most recent runs today (11:00 and 09:24 UTC) — those are
a different automation (`.github/workflows/agent-*.yml`, governed by
`CLAUDE.md`, triggered by GitHub Actions directly) from this scheduled
session, and the actual `CI` workflow they'd affect is green, so left alone
per this run's own "CI red on master" check passing clean.

**Second sweep continued at the next-stalest-by-last-check OPEN entry.**
Recomputed every OPEN entry's own last dated note (not just its `Found:`
line) directly from the file rather than trusting the running tally in
prose, which turned up "Sharing a stack link produces zero personalized
preview" (found 2026-09-16 03:20, never touched since) as the stalest by a
wide margin — 23 days, against the next entry's 2026-09-16 09:10. Full
re-verification and three line-citation drift fixes appended inline on the
entry itself (above), matching this file's established in-place-deepening
pattern. Core gap holds completely: still no `middleware.js`, `head.js`
still never sets `og:image`/`twitter:image`, `prerender.mjs`'s `ROUTES`
still has no `/s/:slug` entry. Also fresh-checked (not just assumed) the
plan's one platform-behavior premise — that Vercel Edge Middleware runs
before `vercel.json` rewrites — against current docs rather than carrying
it forward unverified; it held, and a Next.js-specific rename the same
search surfaced (`middleware.ts` → `proxy.ts` in Next.js 16) was confirmed
not to apply to this Vite SPA.

**Checked the four tracked `BUILT, UNMERGED` entries** (PRs #75, #86, #89,
#91) via `pull_request_read` — all four still `state: open`, `merged:
false`, unchanged head SHAs. PR #89 (access-method facet) re-confirmed
directly: still open, same `9db220e`. These need a human to merge, not more
agent work, per every prior pass's same conclusion — not re-litigated
further this run.

**Two fresh WebSearches, neither produced a new gap.** Tried two angles not
run in recent passes rather than repeating Futurepedia/TAAFT again: AI-tool
browser extensions/price-comparison tooling (returned generic SEO listicles
and unrelated shopping-extension results, nothing resembling a directory
feature Toolnaut lacks) and Toolify.ai/AIToolsDirectory 2026 feature
launches (no primary-source changelog from either; the one concrete detail
— Toolify's category/region/revenue tool-ranking — traces straight to the
already-OPEN "leaderboard" gap, not a new one). Consistent with the pattern
every recent pass has reported. Nothing genuine to log as a new gap.

Ran `npm test` (315/315) directly against current `master` — clean. This
was a docs-only research pass (no `src/`/`radar/`/`api/` edit), so
`npm run build`/`npm run smoke` were not re-run; nothing in this commit
touches build output or runtime behavior. Per the "never invent a gap to
fill the hour" rule, appended no new gap this run — the hour went to the
"Sharing a stack link" re-verification instead.
