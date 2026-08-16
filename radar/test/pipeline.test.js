import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runPipeline } from '../pipeline.js'

// In-memory store stub — lets the pipeline run fully offline (no FS, no network,
// no LLM). With no LLM key set, enrichment uses the deterministic fallback,
// which lands records in `review` (that graceful degradation is the point).
function memStore() {
  const tools = new Map()
  const courses = new Map()
  const skills = new Map()
  const review = []
  const known = new Set()
  const dkeyOf = (u) => {
    try {
      return new URL(u).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  }
  return {
    getTool: (s) => tools.get(s) || null,
    getToolByDomain: () => null,
    countTools: () => tools.size,
    listTools: () => [...tools.values()],
    isKnown: (slug, d) => known.has(`s:${slug}`) || (d ? known.has(`d:${d}`) : false),
    markKnown(slug, d) {
      known.add(`s:${slug}`)
      if (d) known.add(`d:${d}`)
    },
    upsertTool(r) {
      r.version = (tools.get(r.slug)?.version || 0) + 1
      r.lifecycle = 'published'
      tools.set(r.slug, r)
      const d = dkeyOf(r.website)
      if (d) known.add(`d:${d}`)
    },
    enqueueReview(r) {
      review.push(r)
    },
    upsertCourse(c) {
      courses.set(c.id, c)
    },
    upsertSkill(s) {
      skills.set(s.id, s)
    },
    snapshot() {},
    appendRun() {},
    _tools: tools,
    _courses: courses,
    _skills: skills,
    _review: review,
  }
}

const candidates = [
  { name: 'CodePilot AI', url: 'https://codepilot.dev', description: 'An open-source AI coding agent for your terminal.', source: 'test', sourceUrl: 'https://x/1' },
  { name: 'PixelForge', url: 'https://pixelforge.art', description: 'Freemium AI image generation and editing studio.', source: 'test', sourceUrl: 'https://x/2' },
  { name: 'CodePilot AI', url: 'https://codepilot.dev', description: 'duplicate within the same batch', source: 'test', sourceUrl: 'https://x/3' },
]

test('classifies, enriches (fallback), validates and routes; in-batch dup collapses', async () => {
  const store = memStore()
  const r1 = await runPipeline({ store, candidates, now: '2026-01-01T00:00:00Z' })
  assert.equal(r1.counts.candidates, 3)
  assert.equal(r1.counts.new, 2) // third is a same-batch duplicate → collapsed
  // No LLM configured → deterministic fallback → review, not auto-publish.
  assert.equal(r1.counts.published, 0)
  assert.equal(r1.counts.review, 2)
  assert.equal(store._review.length, 2)
})

test('is idempotent — a second run re-processes nothing', async () => {
  const store = memStore()
  await runPipeline({ store, candidates, now: '2026-01-01T00:00:00Z' })
  const r2 = await runPipeline({ store, candidates, now: '2026-01-02T00:00:00Z' })
  assert.equal(r2.counts.new, 0)
  assert.equal(r2.counts.review, 0)
  assert.equal(r2.counts.skipped, 2)
})

test('dry-run writes nothing but still reports', async () => {
  const store = memStore()
  const r = await runPipeline({ store, candidates, now: '2026-01-01T00:00:00Z', dryRun: true })
  assert.equal(r.counts.new, 2)
  assert.equal(store._review.length, 0)
  assert.equal(store.countTools(), 0)
})
