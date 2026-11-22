import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Regression test for a bug that recurred 7+ times (see docs/research-backlog.md
// "changelog staleness"): the daily feature run ships a real commit but forgets
// src/utils/changelogData.js, so customer-facing changelog copy silently stops
// matching what actually shipped. Only checks the newest DEVLOG day — history
// before this test existed is not retrofitted.

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

test('the newest DEVLOG ship-day has a matching changelogData.js entry', () => {
  const devlog = read('DEVLOG.md')
  // The lookahead's bare `$` matches end-of-*line* under the `m` flag, so with
  // a lazy `[\s\S]*?` it used to stop zero characters in — right after the
  // heading itself — making `body` always empty and this test always pass.
  // Requiring a literal leading newline before the next heading (or genuine
  // end-of-string via `(?![\s\S])`) forces it to actually consume the section.
  const match = devlog.match(/^## (\d{4}-\d{2}-\d{2})\n([\s\S]*?)(?=\n## \d{4}-\d{2}-\d{2}\n|$(?![\s\S]))/m)
  assert.ok(match, 'DEVLOG.md must have at least one dated "## YYYY-MM-DD" section')
  const [, date, body] = match

  // A shipped-code day always cites a real commit sha as `abc1234` somewhere
  // in its section; a no-op day (radar-only, nothing landed) never does.
  if (!/`[0-9a-f]{6,40}`/.test(body)) return

  const changelog = read('src/utils/changelogData.js')
  const dates = [...changelog.matchAll(/date:\s*'(\d{4}-\d{2}-\d{2})'/g)].map((m) => m[1])
  assert.ok(
    dates.includes(date),
    `DEVLOG's newest entry (${date}) cites a shipped commit but changelogData.js has no entry dated ${date} — ` +
      `add one describing what actually shipped (see changelogData.js's own header comment).`,
  )
})
