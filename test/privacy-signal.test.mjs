// isPrivacyConscious backs Discover's privacy-facet toggle — a regression
// here either hides tools that should pass the filter or leaks ones that
// shouldn't.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

const { isPrivacyConscious } = await import('../src/utils/privacySignal.js')

describe('isPrivacyConscious', () => {
  test('matches a tool tagged privacy', () => {
    assert.equal(isPrivacyConscious({ tags: ['privacy'] }), true)
  })

  test('matches any of the recognized signal tags, not just "privacy"', () => {
    for (const tag of ['local-first', 'on-device', 'self-hosted', 'encryption']) {
      assert.equal(isPrivacyConscious({ tags: [tag] }), true)
    }
  })

  test('a self-hosted tool still needs its own tag, open-source alone is not enough', () => {
    assert.equal(isPrivacyConscious({ tags: ['open-source'] }), false)
  })

  test('no privacy-signal tags returns false', () => {
    assert.equal(isPrivacyConscious({ tags: ['code', 'free'] }), false)
  })

  test('missing tags array does not throw', () => {
    assert.equal(isPrivacyConscious({}), false)
  })
})
