// Confidence is signal completeness + measured candidate pool — the tests pin
// the honesty properties: no percent theatre, bands move with answers, and a
// thin pool constrains rather than flattering.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const { hydrateCatalog } = await import('../src/utils/toolsCatalog.js')
const { readFileSync } = await import('node:fs')
hydrateCatalog(JSON.parse(readFileSync('public/tools.json', 'utf8')))
const { recommendationConfidence, BANDS } = await import('../src/utils/confidence.js')

const FULL = {
  domain: 'code', role: 'developer', career_stage: 'mid', experience: 'builder',
  goal: 'ship', budget: 'low', pace: 'steady', learning_style: 'tinker', blocker: 'toomany',
}

describe('recommendationConfidence', () => {
  test('empty answers -> Basic, with the highest-value next question first', () => {
    const c = recommendationConfidence({})
    assert.equal(c.band, 'basic')
    assert.equal(c.score, 0)
    assert.equal(c.nextSignal, 'your field of work') // domain carries the most weight
  })

  test('all nine answers -> Highly tailored, nothing left to ask', () => {
    const c = recommendationConfidence(FULL)
    assert.equal(c.band, 'tailored')
    assert.equal(c.nextSignal, null)
    assert.equal(c.known.length, 9)
  })

  test('bands are monotonic in answers — adding a signal never lowers the score', () => {
    let prev = recommendationConfidence({}).score
    const acc = {}
    for (const [k, v] of Object.entries(FULL)) {
      acc[k] = v
      const s = recommendationConfidence({ ...acc }).score
      assert.ok(s >= prev, `${k} lowered the score ${prev} -> ${s}`)
      prev = s
    }
  })

  test('score is bounded 0..100 and bands cover it', () => {
    for (const c of [recommendationConfidence({}), recommendationConfidence(FULL)]) {
      assert.ok(c.score >= 0 && c.score <= 100)
    }
    assert.equal(BANDS[BANDS.length - 1].min, 0)
  })

  test('pool is measured against the live catalogue when a domain exists', () => {
    const c = recommendationConfidence(FULL)
    assert.equal(typeof c.pool, 'number')
    assert.ok(c.pool >= 0)
    assert.equal(recommendationConfidence({}).pool, null) // nothing to score against
  })

  test('constrained flag only ever fires with an explanation-ready pool count', () => {
    const c = recommendationConfidence(FULL)
    if (c.constrained) assert.ok(c.pool < 3)
    else assert.ok(c.pool === null || c.pool >= 3)
  })
})
