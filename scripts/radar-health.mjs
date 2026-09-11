// Is the radar actually discovering tools, or has it quietly stopped?
//
// This exists because the pipeline can fail in ways that look like success.
// It ran green for weeks while publishing nothing, because every LLM enrichment
// aborted at a 30s timeout, fell back to the rules classifier, scored below the
// publish threshold, and landed in the review queue. Nothing errored. The only
// visible symptom was a catalogue that never grew — which nobody was watching.
//
// So this checks the OUTCOME, not the exit code. Three distinct failures:
//
//   STALE      no run at all inside the window — the schedule is broken,
//              disabled, or the workflow is failing before the pipeline starts
//   NO-PUBLISH runs are happening and finding candidates, but nothing reaches
//              the catalogue — enrichment or scoring is degraded
//   NO-SOURCE  runs are happening but finding no candidates at all — the
//              discovery sources are broken or rate-limited
//
// Exit 0 healthy, 1 unhealthy. Anything can branch on that: CI, a cron, or the
// autonomous dev routine deciding whether tonight's job is "fix the radar".
//
//   node scripts/radar-health.mjs              # 26h window (24h cron + grace)
//   node scripts/radar-health.mjs --hours 48
//   node scripts/radar-health.mjs --json

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const RUNS = path.join(root, 'radar', 'data', 'runs.log.json')
const FEED = path.join(root, 'public', 'tools.json')

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const hoursArg = args.indexOf('--hours')
// 24h schedule plus 2h of grace: a run that starts at 01:00 and takes an hour
// must not read as stale to a check running at 01:30 the next day.
const WINDOW_HOURS = hoursArg !== -1 ? Number(args[hoursArg + 1]) : 26
// How many recent runs may publish nothing before that itself is the problem.
// One empty night is normal — the internet does not produce a new AI tool every
// day. Three in a row, while candidates are still arriving, is a broken pipeline.
const DRY_RUN_TOLERANCE = 3

const readJson = (p, fallback) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fallback }
}

const runs = readJson(RUNS, null)
const feed = readJson(FEED, null)
const now = Date.now()
const hoursSince = (iso) => (now - new Date(iso).getTime()) / 36e5
const fmt = (h) => (h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`)

const result = {
  status: 'OK',
  reason: '',
  fix: '',
  lastRunAt: null,
  hoursSinceLastRun: null,
  lastPublishAt: null,
  publishedLastRun: null,
  runsInWindow: 0,
  feedSize: Array.isArray(feed) ? feed.length : 0,
  windowHours: WINDOW_HOURS,
}

if (!Array.isArray(runs) || runs.length === 0) {
  result.status = 'STALE'
  result.reason = 'radar/data/runs.log.json is missing or empty — the pipeline has never completed a run here.'
  result.fix = 'Check that the Radar workflow exists, is enabled, and has run at least once. Trigger it manually: gh workflow run radar.yml'
} else {
  const sorted = [...runs].sort((a, b) => new Date(b.at) - new Date(a.at))
  const last = sorted[0]
  const inWindow = sorted.filter((r) => hoursSince(r.at) <= WINDOW_HOURS)
  const lastPublished = sorted.find((r) => (r.counts?.published ?? 0) > 0)

  result.lastRunAt = last.at
  result.hoursSinceLastRun = Number(hoursSince(last.at).toFixed(2))
  result.runsInWindow = inWindow.length
  result.publishedLastRun = last.counts?.published ?? 0
  result.lastPublishAt = lastPublished?.at ?? null

  if (inWindow.length === 0) {
    result.status = 'STALE'
    result.reason = `No radar run in the last ${WINDOW_HOURS}h. Last run was ${fmt(hoursSince(last.at))} ago.`
    result.fix = 'The schedule is not firing. Check the Radar workflow is enabled and its recent runs did not fail. GitHub disables scheduled workflows on repos with no activity for 60 days.'
  } else {
    const recent = sorted.slice(0, DRY_RUN_TOLERANCE)
    const publishedRecently = recent.some((r) => (r.counts?.published ?? 0) > 0)
    const candidatesRecently = recent.some((r) => (r.counts?.candidates ?? 0) > 0)

    if (!candidatesRecently) {
      result.status = 'NO-SOURCE'
      result.reason = `The last ${recent.length} run(s) found zero candidates. Discovery sources are returning nothing.`
      result.fix = 'Check radar/sources/* against the live APIs. GitHub and Hacker News need no key but are rate-limited; a GITHUB_TOKEN raises the limit.'
    } else if (!publishedRecently) {
      const reviewed = recent.reduce((n, r) => n + (r.counts?.review ?? 0), 0)
      result.status = 'NO-PUBLISH'
      result.reason = `Candidates are arriving but nothing has published in the last ${recent.length} run(s)${reviewed > 0 ? ` — ${reviewed} went to the review queue instead` : ''}.`
      result.fix = reviewed > 0
        ? 'Records are scoring below RADAR_PUBLISH_THRESHOLD. The usual cause is LLM enrichment failing and falling back to the rules classifier — check the run logs for "using fallback" and confirm FEATHERLESS_TIMEOUT_MS is high enough for the configured model.'
        : 'Everything is being rejected or deduped. Check radar/filter.js and radar/validate.js against a sample candidate.'
    }
  }
}

if (asJson) {
  console.log(JSON.stringify(result, null, 2))
} else {
  const line = (k, v) => console.log(`  ${k.padEnd(18)} ${v}`)
  console.log('RADAR HEALTH')
  line('window', `${WINDOW_HOURS}h`)
  line('last run', result.lastRunAt ? `${result.lastRunAt}  (${fmt(result.hoursSinceLastRun)} ago)` : 'never')
  line('runs in window', String(result.runsInWindow))
  line('published last run', result.publishedLastRun === null ? '—' : String(result.publishedLastRun))
  line('last publish', result.lastPublishAt ? `${result.lastPublishAt}  (${fmt(hoursSince(result.lastPublishAt))} ago)` : 'never')
  line('feed size', `${result.feedSize} tools in public/tools.json`)
  console.log('')
  console.log(`STATUS: ${result.status}`)
  if (result.status !== 'OK') {
    console.log(`REASON: ${result.reason}`)
    console.log(`FIX:    ${result.fix}`)
  }
}

process.exit(result.status === 'OK' ? 0 : 1)
