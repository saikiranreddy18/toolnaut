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
