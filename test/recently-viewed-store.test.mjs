// Shims localStorage before importing the module under test — a static
// import would evaluate scopedStorage.js against an empty global scope and
// crash, same reasoning as app-state.test.mjs.
import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

const { loadRecentlyViewed, recordView } = await import('../src/state/recentlyViewedStore.js')

describe('recentlyViewedStore', () => {
  beforeEach(() => store.clear())

  test('starts empty', () => {
    assert.deepEqual(loadRecentlyViewed(), [])
  })

  test('records a view most-recent-first', () => {
    recordView('chatgpt')
    recordView('claude')
    assert.deepEqual(loadRecentlyViewed(), ['claude', 'chatgpt'])
  })

  test('re-viewing a slug moves it to the front without duplicating it', () => {
    recordView('chatgpt')
    recordView('claude')
    recordView('chatgpt')
    assert.deepEqual(loadRecentlyViewed(), ['chatgpt', 'claude'])
  })

  test('caps at 12 entries, dropping the oldest', () => {
    for (let i = 0; i < 15; i++) recordView(`tool-${i}`)
    const result = loadRecentlyViewed()
    assert.equal(result.length, 12)
    assert.equal(result[0], 'tool-14')
    assert.ok(!result.includes('tool-0'))
    assert.ok(!result.includes('tool-2'))
  })
})
