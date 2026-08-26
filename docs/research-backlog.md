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
- **Status:** OPEN
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

### Pro chat assistant & the entire Team tier are unbacked and unbuildable client-side
- **Status:** REJECTED — needs a backend/multi-user system; logged so future
  research hours don't re-spend an hour rediscovering this, and so it's
  visible to a human rather than silently sitting on the pricing page.
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
- **Status:** OPEN
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
- **Status:** REJECTED — needs a backend/email-delivery system; logged so
  future research hours don't re-spend an hour rediscovering this, same
  reason the Pro chat assistant / Team tier finding above was logged rather
  than left silently on the pricing page.
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
- **Build size:** L (needs a transactional email or push provider, a
  server-held secret, and an ongoing content/ops process — none of which a
  client-only SPA change can provide) — out of scope for this backlog's
  client-only SPA model.
- **Found:** 2026-08-26 15:15 UTC

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
