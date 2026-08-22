# Toolnaut dev log

One section per day, written by the autonomous dev routine at its end-of-day
run (16:51 UTC / 22:21 IST). Newest day first.

Each day records what was researched, which competitive gap was chosen, what
shipped, and what is queued next. The ranked gap list itself lives in
[docs/research-backlog.md](docs/research-backlog.md).

---

## 2026-08-22

**Researched today:** three gaps landed in `docs/research-backlog.md`, all
specced to file paths/line numbers — share/export a personal stack
(StackShare/Futurepedia pattern), side-by-side tool comparison (Capterra/G2
pattern), and surfacing tool freshness ("new this week", Product
Hunt/Futurepedia/There's An AI For That pattern).

**Shipped:** surface tool freshness on Discover —
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

**Queued next:** share/export-your-stack and side-by-side comparison are
both still OPEN and fully specced (new page + new route each, S/M build
size) — either is a good pick for tomorrow's feature run.

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
