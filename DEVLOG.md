# Toolnaut dev log

One section per day, written by the autonomous dev routine at its end-of-day
run (16:51 UTC / 22:21 IST). Newest day first.

Each day records what was researched, which competitive gap was chosen, what
shipped, and what is queued next. The ranked gap list itself lives in
[docs/research-backlog.md](docs/research-backlog.md).

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
