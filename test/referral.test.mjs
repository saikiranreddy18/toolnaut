// Shims localStorage and window before importing the module under test, same
// reasoning as recently-viewed-store.test.mjs: a static import would evaluate
// referral.js against an empty global scope and crash.
import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

let replacedTo = null
globalThis.window = {
  location: { href: 'https://toolnaut.xyz/' },
  history: { replaceState: (_state, _title, url) => { replacedTo = url } },
}

const { stashRef, consumeRef } = await import('../src/utils/referral.js')

describe('referral capture', () => {
  beforeEach(() => {
    store.clear()
    replacedTo = null
  })

  test('stashes a ?ref= code and strips it from the URL', () => {
    window.location.href = 'https://toolnaut.xyz/?ref=11111111-1111-1111-1111-111111111111'
    stashRef()
    assert.equal(consumeRef(), '11111111-1111-1111-1111-111111111111')
    assert.ok(replacedTo && !replacedTo.includes('ref='), 'the query param must be stripped')
  })

  test('a visit with no ref param stashes nothing', () => {
    window.location.href = 'https://toolnaut.xyz/goal'
    stashRef()
    assert.equal(consumeRef(), null)
  })

  test('consumeRef is one-shot: a second read gets nothing', () => {
    window.location.href = 'https://toolnaut.xyz/?ref=22222222-2222-2222-2222-222222222222'
    stashRef()
    assert.equal(consumeRef(), '22222222-2222-2222-2222-222222222222')
    assert.equal(consumeRef(), null, 'the stashed code must be deleted on read')
  })

  test('other query params survive the strip', () => {
    window.location.href = 'https://toolnaut.xyz/?utm_source=x&ref=33333333-3333-3333-3333-333333333333'
    stashRef()
    assert.ok(replacedTo.includes('utm_source=x'), 'unrelated params must not be dropped')
    assert.ok(!replacedTo.includes('ref='))
  })
})
