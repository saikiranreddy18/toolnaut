import '../env.js'
import { createStore } from '../store/index.js'
import { assessmentFrom, scoreTool } from '../scorecard.js'
import { log } from '../util/logger.js'

// Re-scores every stored tool against the current clock. OFFLINE and pure: it
// re-runs scorecard.js over evidence the record already carries, and makes no
// network call, so it is safe to run on a schedule next to the daily pipeline.
//
// Why it has to exist: half the rubric is time-sensitive. A repo that was
// pushed yesterday when it was discovered has been silent for six months by
// spring, and its momentum and maturity scores must fall on their own — a radar
// that scores a tool once and never again is a snapshot of the day it launched,
// which is the failure this whole scoring layer is meant to avoid.
//
//   node scripts/rescore.js            # re-score and write
//   node scripts/rescore.js --dry-run  # report the movements, write nothing
const dryRun = process.argv.includes('--dry-run')
const now = new Date().toISOString()

const store = createStore()
const tools = store.listTools()
if (!tools.length) {
  log.error('no tools in the store — run the pipeline (or seed) first')
  process.exit(1)
}

const moved = []
const labels = {}
let changed = 0

for (const t of tools) {
  const before = t.scorecard
  const after = scoreTool({ signals: t.signals || null, assessment: assessmentFrom(t), now })
  labels[after.label] = (labels[after.label] || 0) + 1

  if (before?.label !== after.label) {
    moved.push({ slug: t.slug, from: before?.label || 'none', to: after.label })
  }
  if (before?.radar !== after.radar || before?.label !== after.label) {
    changed++
    if (!dryRun) store.updateTool(t.slug, { scorecard: after, updatedAt: now })
  }
}

log.info(`re-scored ${tools.length} tools — ${changed} changed${dryRun ? ' (dry run, nothing written)' : ''}`)
for (const [label, n] of Object.entries(labels).sort((a, b) => b[1] - a[1])) {
  log.info(`  ${label.padEnd(17)} ${n}`)
}
for (const m of moved.slice(0, 20)) log.info(`  ${m.slug}: ${m.from} → ${m.to}`)
if (moved.length > 20) log.info(`  …and ${moved.length - 20} more label changes`)
