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
- **Status:** OPEN
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
- **Status:** OPEN
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
