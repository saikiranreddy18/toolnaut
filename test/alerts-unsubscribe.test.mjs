import { test } from 'node:test'
import assert from 'node:assert/strict'

// The regression this guards: GET used to delete the subscriber. Link scanners
// in Gmail, Outlook and corporate gateways GET every link in an incoming email,
// so the first digest unsubscribed its own recipient before they read it.
//
// The handler is exercised for real, against a stubbed fetch that records what
// it would have asked Supabase to do.
process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_test_not_a_real_key'

const calls = []
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), method: init.method || 'GET' })
  return new Response('[{"id":"row"}]', { status: 200, headers: { 'content-type': 'application/json' } })
}

const { default: handler } = await import('../api/alerts-unsubscribe.js')

const TOKEN = '123e4567-e89b-42d3-a456-426614174000'

function run(method, query) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v },
      status(c) { this.statusCode = c; return this },
      send(b) { resolve({ status: this.statusCode, body: String(b), headers: this.headers }) },
      json(b) { resolve({ status: this.statusCode, body: JSON.stringify(b), headers: this.headers }) },
    }
    handler({ method, query, headers: {}, body: {} }, res)
  })
}

const deletes = () => calls.filter((c) => c.method === 'DELETE')

test('a GET — what a link scanner sends — never deletes the subscriber', async () => {
  calls.length = 0
  const r = await run('GET', { token: TOKEN })
  assert.equal(r.status, 200)
  assert.equal(deletes().length, 0, 'GET must not delete')
  assert.match(r.body, /<form method="post"/, 'GET must offer a button that POSTs')
})

test('a HEAD never deletes either', async () => {
  calls.length = 0
  await run('HEAD', { token: TOKEN })
  assert.equal(deletes().length, 0)
})

test('a POST — the button, or one-click from the mail client — deletes exactly that subscriber', async () => {
  calls.length = 0
  const r = await run('POST', { token: TOKEN })
  assert.equal(r.status, 200)
  assert.equal(deletes().length, 1)
  assert.ok(
    deletes()[0].url.endsWith(`/rest/v1/alert_subscribers?unsubscribe_token=eq.${TOKEN}`),
    `deleted the wrong thing: ${deletes()[0].url}`,
  )
  assert.match(r.body, /unsubscribed/i)
})

test('a malformed token never reaches the database, whatever the method', async () => {
  for (const method of ['GET', 'POST']) {
    calls.length = 0
    const r = await run(method, { token: `${TOKEN}&unsubscribe_token=neq.x` })
    assert.equal(r.status, 400)
    assert.equal(calls.length, 0, `${method} with a bad token must not call Supabase`)
  }
})

test('other methods are refused without deleting', async () => {
  calls.length = 0
  const r = await run('DELETE', { token: TOKEN })
  assert.equal(r.status, 405)
  assert.equal(deletes().length, 0)
})
