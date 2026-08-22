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
  public tech-stack profiles built to be shared), and export-to-CSV/JSON
  patterns on Futurepedia and There's An AI For That's tool-list exports.
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
- **Build size:** S/M — no backend needed. `Discover.jsx` already proves the
  pattern this project wants: state encoded in the URL (`?q=`, `?cat=`, etc.)
  for shareable, back-button-safe links. The same approach reconstructs a
  read-only stack view from a URL (e.g. base64/CSV of tool slugs in a query
  param), plus a "Copy link" / "Download as image or markdown" action on
  `Stack.jsx` and `QuizResult.jsx`. Touches those two pages, a small new
  encode/decode util, and possibly a read-only `/s/:payload` route.
- **Found:** 2026-08-22 09:58 UTC
