// Shims localStorage before importing the module under test — a static
// import would evaluate scopedStorage.js against an empty global scope and
// crash, same reasoning as recently-viewed-store.test.mjs.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
}

const { daysSinceLastVisit } = await import('../src/state/streakStore.js')

describe('daysSinceLastVisit', () => {
  test('returns null for an empty log', () => {
    assert.equal(daysSinceLastVisit([], new Date(2026, 8, 27)), null)
  })

  test('returns null when the only entry is today', () => {
    assert.equal(daysSinceLastVisit(['2026-09-27'], new Date(2026, 8, 27)), null)
  })

  test('returns 1 for a visit yesterday', () => {
    assert.equal(daysSinceLastVisit(['2026-09-26'], new Date(2026, 8, 27)), 1)
  })

  test('ignores today\'s own entry and finds the prior visit', () => {
    assert.equal(daysSinceLastVisit(['2026-09-20', '2026-09-27'], new Date(2026, 8, 27)), 7)
  })

  test('is unaffected by log order', () => {
    assert.equal(daysSinceLastVisit(['2026-09-27', '2026-09-15', '2026-09-20'], new Date(2026, 8, 27)), 7)
  })

  test('spans a month boundary correctly', () => {
    assert.equal(daysSinceLastVisit(['2026-08-30'], new Date(2026, 8, 1)), 2)
  })
})
