// The email-alerts surface (api/alerts-*.js) is a public endpoint holding a
// list of email addresses, so the two things worth locking down are the
// input gate (what counts as an email, which domain keys survive) — the same
// validation discipline chat-api.test.mjs applies to the chat endpoint.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

const { validEmail, DOMAIN_KEYS } = await import('../api/_alerts.js')

describe('validEmail — the only gate before storage', () => {
  test('accepts a normal address', () => {
    assert.equal(validEmail('sai@example.com'), true)
  })
  test('accepts plus-tags and subdomains', () => {
    assert.equal(validEmail('sai+radar@mail.example.co.in'), true)
  })
  test('rejects the obvious non-emails', () => {
    for (const bad of ['', 'nope', 'a@b', 'a b@c.com', 'a@c .com', null, undefined, 42]) {
      assert.equal(validEmail(bad), false, `should reject ${JSON.stringify(bad)}`)
    }
  })
  test('rejects addresses over the RFC length cap', () => {
    assert.equal(validEmail(`${'x'.repeat(250)}@example.com`), false)
  })
})

describe('DOMAIN_KEYS — mirrors quizLogic domains', () => {
  test('contains exactly the six galaxy domains', () => {
    assert.deepEqual(
      [...DOMAIN_KEYS].sort(),
      ['automation', 'code', 'data', 'design', 'learning', 'writing'],
    )
  })
})
