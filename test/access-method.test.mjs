// accessMethodOf() backs Discover's access-method facet and matchScore's
// soft bias — a regression here silently mislabels tools as beginner-ready.
import test from 'node:test'
import assert from 'node:assert/strict'
import { accessMethodOf, ACCESS_METHODS, ACCESS_METHOD_LABELS } from '../src/utils/accessMethod.js'

test('a tool tagged api is labelled api', () => {
  assert.equal(accessMethodOf({ tags: ['api'], pricing: 'Freemium' }), 'api')
})

test('pricing stating API is labelled api even without the tag', () => {
  assert.equal(accessMethodOf({ tags: [], pricing: 'Usage-based API' }), 'api')
})

test('a tool tagged open-source is labelled self-hosted', () => {
  assert.equal(accessMethodOf({ tags: ['open-source'], pricing: 'Free' }), 'self-hosted')
})

test('pricing stating Open weights is labelled self-hosted even without the tag', () => {
  assert.equal(accessMethodOf({ tags: [], pricing: 'Open weights' }), 'self-hosted')
})

test('api takes priority when pricing is both API and open weights', () => {
  assert.equal(accessMethodOf({ tags: [], pricing: 'Open weights + API' }), 'api')
})

test('everything else defaults to web — the common, sign-up-and-use case', () => {
  assert.equal(accessMethodOf({ tags: ['writing'], pricing: 'Freemium' }), 'web')
})

test('tolerates a tool with no tags array', () => {
  assert.equal(accessMethodOf({ pricing: 'Free' }), 'web')
})

test('every label has an entry and the list has exactly three buckets', () => {
  assert.equal(ACCESS_METHODS.length, 3)
  for (const m of ACCESS_METHODS) assert.ok(ACCESS_METHOD_LABELS[m])
})
