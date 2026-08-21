import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contentHash } from '../util/hash.js'

const base = {
  name: 'Acme', category: 'writing', sourceCategory: 'writing', price: 'free',
  level: 'beginner', blurb: 'Does things', website: 'https://acme.dev',
  dev: 'Acme Inc', tags: ['ai', 'writing'],
}

test('same identity fields produce the same hash', () => {
  assert.equal(contentHash(base), contentHash({ ...base }))
})

test('16 lowercase hex chars', () => {
  assert.match(contentHash(base), /^[0-9a-f]{16}$/)
})

test('a change to any hashed field changes the hash', () => {
  const h0 = contentHash(base)
  for (const field of ['name', 'category', 'sourceCategory', 'price', 'level', 'blurb', 'website', 'dev']) {
    assert.notEqual(contentHash({ ...base, [field]: `${base[field]}-changed` }), h0, `field: ${field}`)
  }
})

test('tag order does not change the hash, but tag content does', () => {
  const h0 = contentHash(base)
  assert.equal(contentHash({ ...base, tags: ['writing', 'ai'] }), h0)
  assert.notEqual(contentHash({ ...base, tags: ['ai', 'writing', 'extra'] }), h0)
})

test('a field outside HASHED_FIELDS does not affect the hash', () => {
  assert.equal(contentHash({ ...base, confidence: 99, unrelated: 'x' }), contentHash(base))
})

test('missing fields are treated consistently, not thrown on', () => {
  assert.doesNotThrow(() => contentHash({}))
})
