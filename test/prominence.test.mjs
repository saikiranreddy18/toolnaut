import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FLAGSHIP, isFlagship } from '../src/utils/prominence.js'

test('every FLAGSHIP name across every domain reads as a flagship', () => {
  for (const names of Object.values(FLAGSHIP)) {
    for (const name of names) {
      assert.ok(isFlagship({ name }), `${name} should be a flagship`)
    }
  }
})

test('a flagship from one domain counts everywhere, not just its own list', () => {
  // isFlagship has no domain argument on purpose: a hidden-gems rail has no
  // persona domain to scope to, so it needs "flagship at all," the union of
  // every FLAGSHIP array, not starterScore's per-domain list.
  assert.ok(isFlagship({ name: 'Figma' })) // design flagship
  assert.ok(isFlagship({ name: 'Zapier' })) // automation flagship
})

test('an obscure or missing name is not a flagship', () => {
  assert.equal(isFlagship({ name: 'some-random-radar-find' }), false)
  assert.equal(isFlagship({}), false)
  assert.equal(isFlagship(null), false)
})
