import { collectCandidates } from './sources/index.js'
import { looksLikeTool } from './filter.js'
import { classify } from './dedup.js'
import { enrich } from './enrich.js'
import { validate } from './validate.js'
import { generateCourse } from './courseGen.js'
import { skillsFor } from './skills.js'
import { config } from './config.js'
import { slugify } from './util/slug.js'
import { log } from './util/logger.js'

// THE ORCHESTRATOR — one full daily run:
//   collect → in-batch dedup → classify vs store → enrich → validate →
//   publish | review | reject → (on publish) course-gen + skill graph →
//   snapshot + run report.
//
// Design for "never breaks":
//  - candidates can be injected (tests) instead of hitting the network
//  - each candidate is isolated in try/catch: one bad item never aborts the run
//  - staged → validated → published: raw data never lands live unvalidated
//  - every published/review item is marked known → the run is idempotent
//    (safe re-run), while rejects stay reconsiderable on a later run
//  - dryRun computes the full report without writing anything
export async function runPipeline({ store, candidates, now = new Date().toISOString(), dryRun = false } = {}) {
  const report = {
    at: now,
    dryRun,
    counts: { candidates: 0, filtered: 0, new: 0, skipped: 0, published: 0, review: 0, rejected: 0, courses: 0 },
    published: [],
    review: [],
    rejected: [],
    filtered: [],
  }

  const raw = candidates || (await collectCandidates())
  report.counts.candidates = raw.length

  // Collapse duplicates within this batch, then apply the cheap "is this
  // actually a tool?" gate — drop article/headline noise before spending any
  // enrichment effort on it. The maxCandidates cap is applied AFTER filtering:
  // capping the raw list let a noisy source fill it with items that were about
  // to be dropped anyway, so later sources (RSS) were fetched then discarded.
  const seen = new Set()
  const batch = []
  for (const c of raw) {
    if (!c?.name || !c?.url) continue
    const slug = slugify(c.name)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    const f = looksLikeTool(c)
    if (!f.ok) {
      report.counts.filtered++
      report.filtered.push({ name: c.name, reason: f.reason })
      continue
    }
    batch.push({ candidate: c, slug })
  }

  for (const { candidate, slug } of batch.slice(0, config.maxCandidates)) {
    const cls = classify(candidate, store)
    if (cls.status === 'skip') {
      report.counts.skipped++
      continue
    }
    report.counts.new++

    let record
    try {
      record = await enrich(candidate, slug, { now })
    } catch (e) {
      log.error(`enrich crashed for ${slug}`, e.message)
      report.counts.rejected++
      report.rejected.push({ slug, reason: 'enrich-error' })
      continue
    }

    const v = validate(record, {
      publishThreshold: config.thresholds.publish,
      reviewThreshold: config.thresholds.review,
    })
    record.confidence = v.confidence

    if (v.decision === 'publish') {
      report.counts.published++
      report.published.push({ slug, name: record.name, confidence: v.confidence, by: record.enrichedBy })
      if (!dryRun) {
        store.markKnown(slug)
        store.upsertTool(record)
        try {
          store.upsertCourse(await generateCourse(record, { now }))
          report.counts.courses++
          for (const s of skillsFor(record, { now })) store.upsertSkill(s)
        } catch (e) {
          log.warn(`knowledge-build failed for ${slug}`, e.message)
        }
      }
    } else if (v.decision === 'review') {
      report.counts.review++
      report.review.push({ slug, name: record.name, confidence: v.confidence, warnings: v.warnings })
      if (!dryRun) {
        store.markKnown(slug)
        store.enqueueReview(record)
      }
    } else {
      // Rejects are NOT marked known — a bad threshold/config shouldn't
      // blacklist a tool forever; the next run gets to reconsider it.
      report.counts.rejected++
      report.rejected.push({ slug, name: record.name, errors: v.errors })
    }
  }

  if (!dryRun) {
    store.snapshot(now.replace(/[:.]/g, '-'))
    store.appendRun(report)
  }
  return report
}
