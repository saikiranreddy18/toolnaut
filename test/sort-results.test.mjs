// compareByNewest/compareByName back Discover's sort control — a regression
// here silently reorders the highest-traffic page in the app.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

const { compareByNewest, compareByName } = await import('../src/utils/sortResults.js')

describe('compareByNewest', () => {
  test('newest discoveredAt sorts first', () => {
    const older = { name: 'Older', discoveredAt: '2026-08-01T00:00:00Z' }
    const newer = { name: 'Newer', discoveredAt: '2026-08-20T00:00:00Z' }
    assert.ok(compareByNewest(newer, older) < 0)
    assert.ok(compareByNewest(older, newer) > 0)
  })

  test('tools with no discoveredAt sort after every dated tool', () => {
    const dated = { name: 'Zeta', discoveredAt: '2026-08-01T00:00:00Z' }
    const undated = { name: 'Alpha' }
    assert.ok(compareByNewest(dated, undated) < 0)
    assert.ok(compareByNewest(undated, dated) > 0)
  })

  test('an invalid discoveredAt is treated as undated', () => {
    const dated = { name: 'Zeta', discoveredAt: '2026-08-01T00:00:00Z' }
    const bad = { name: 'Alpha', discoveredAt: 'not-a-date' }
    assert.ok(compareByNewest(dated, bad) < 0)
  })

  test('undated tools fall back to alphabetical among themselves', () => {
    const a = { name: 'Alpha' }
    const b = { name: 'Beta' }
    assert.ok(compareByNewest(a, b) < 0)
    assert.ok(compareByNewest(b, a) > 0)
  })
})

describe('compareByName', () => {
  test('sorts alphabetically, case-insensitively', () => {
    const a = { name: 'apple' }
    const b = { name: 'Banana' }
    assert.ok(compareByName(a, b) < 0)
    assert.ok(compareByName(b, a) > 0)
  })
})
