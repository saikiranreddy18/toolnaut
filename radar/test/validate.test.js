import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validate } from '../validate.js'
import { makeToolRecord } from '../schema.js'

const good = () =>
  makeToolRecord({
    slug: 'acme-ai',
    name: 'Acme AI',
    category: 'code',
    sourceCategory: 'AI Coding & Development',
    price: 'freemium',
    pricing: 'Freemium',
    level: 'beginner',
    blurb: 'An AI pair programmer for your editor.',
    website: 'https://acme.ai',
    tags: ['code', 'agent'],
    dev: 'Acme',
    audience: 'Developers',
    enrichedBy: 'llm',
  })

test('publishes a clean LLM record', () => {
  const v = validate(good())
  assert.equal(v.valid, true)
  assert.equal(v.decision, 'publish')
  assert.ok(v.confidence >= 0.75)
})

test('rejects on missing required field', () => {
  const r = good()
  r.website = ''
  const v = validate(r)
  assert.equal(v.decision, 'reject')
  assert.ok(v.errors.some((e) => e.includes('website')))
})

test('rejects an invalid enum', () => {
  const r = good()
  r.category = 'banana'
  assert.equal(validate(r).decision, 'reject')
})

test('rejects a non-URL website', () => {
  const r = good()
  r.website = 'acme.ai'
  assert.equal(validate(r).decision, 'reject')
})

test('a fallback-enriched record routes to review, not publish', () => {
  const r = good()
  r.enrichedBy = 'fallback:rules'
  r.dev = ''
  r.audience = ''
  const v = validate(r)
  assert.equal(v.valid, true)
  assert.equal(v.decision, 'review')
})

test('respects custom thresholds', () => {
  const r = good()
  r.enrichedBy = 'fallback:rules'
  const v = validate(r, { publishThreshold: 0.5, reviewThreshold: 0.2 })
  assert.equal(v.decision, 'publish')
})
