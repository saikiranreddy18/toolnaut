import { collectCandidates } from './sources/index.js'
import { looksLikeTool } from './filter.js'
import { classify } from './dedup.js'
import { enrich } from './enrich.js'
import { validate } from './validate.js'
import { generateCourse } from './courseGen.js'
import { skillsFor } from './skills.js'
import { config } from './config.js'
import { slugify, domainKey } from './util/slug.js'
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
//  - every processed item is marked known → the run is idempotent (safe re-run)
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

  // Collapse duplicates within this batch before doing any work.
  const seen = new Set()
  const batch = []
  for (const c of raw.slice(0, config.maxCandidates)) {
    if (!c?.name || !c?.url) continue
    const slug = slugify(c.name)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    batch.push({ candidate: c, slug })
  }

  for (const { candidate, slug } of batch) {
    // Cheap "is this actually a tool?" gate — drop article/headline noise
    // before spending any enrichment effort on it.
    const f = looksLikeTool(candidate)
    if (!f.ok) {
      report.counts.filtered++
      report.filtered.push({ name: candidate.name, reason: f.reason })
      continue
    }

    const cls = classify(candidate, store)
    if (cls.status === 'skip') {
      report.counts.skipped++
      continue
    }
    report.counts.new++
    const dkey = domainKey(candidate.url)

    let record
    try {
      record = await enrich(candidate, slug, { now })
    } catch (e) {
      log.error(`enrich crashed for ${slug}`, e.message)
      report.counts.rejected++
      report.rejected.push({ slug, reason: 'enrich-error' })
      if (!dryRun) store.markKnown(slug, dkey)
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
      if (!dryRun) store.enqueueReview(record)
    } else {
      report.counts.rejected++
      report.rejected.push({ slug, name: record.name, errors: v.errors })
    }

    if (!dryRun) store.markKnown(slug, dkey)
  }

  if (!dryRun) {
    store.snapshot(now.replace(/[:.]/g, '-'))
    store.appendRun(report)
  }
  return report
}
