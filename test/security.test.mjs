import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { hit, rateLimit, bearerMatches, clientIp, securityLog, _resetBuckets } from '../api/_security.js'

beforeEach(() => _resetBuckets())

function fakeRes() {
  return {
    statusCode: 200, headers: {}, body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v },
    status(c) { this.statusCode = c; return this },
    json(b) { this.body = b; return this },
  }
}

test('a client is allowed up to the limit, then refused', () => {
  const now = 1_000_000
  for (let i = 0; i < 5; i++) assert.equal(hit('t', 'ip1', { max: 5, now }), false, `request ${i + 1}`)
  assert.equal(hit('t', 'ip1', { max: 5, now }), true)
})

test('the window slides: old requests stop counting', () => {
  for (let i = 0; i < 5; i++) hit('t', 'ip1', { max: 5, windowMs: 60_000, now: 1_000 })
  assert.equal(hit('t', 'ip1', { max: 5, windowMs: 60_000, now: 1_000 }), true)
  assert.equal(hit('t', 'ip1', { max: 5, windowMs: 60_000, now: 62_000 }), false)
})

test('clients and buckets are counted separately', () => {
  for (let i = 0; i < 3; i++) hit('chat', 'a', { max: 3 })
  assert.equal(hit('chat', 'a', { max: 3 }), true)
  assert.equal(hit('chat', 'b', { max: 3 }), false, 'another client is unaffected')
  assert.equal(hit('payments', 'a', { max: 3 }), false, 'another bucket is unaffected')
})

test('rateLimit answers 429 with Retry-After once over the limit', () => {
  const req = { headers: { 'x-real-ip': '203.0.113.9' }, url: '/api/x', method: 'POST' }
  for (let i = 0; i < 2; i++) assert.equal(rateLimit(req, fakeRes(), 'r', { max: 2 }), false)
  const res = fakeRes()
  const warn = console.warn
  console.warn = () => {}
  try {
    assert.equal(rateLimit(req, res, 'r', { max: 2 }), true)
  } finally { console.warn = warn }
  assert.equal(res.statusCode, 429)
  assert.equal(res.headers['retry-after'], '60')
})

test('admin secrets match only exactly, and never when unset', () => {
  assert.equal(bearerMatches('Bearer s3cret-value', 's3cret-value'), true)
  for (const bad of ['Bearer s3cret-valuE', 'Bearer s3cret', 's3cret-value', '', undefined, null]) {
    assert.equal(bearerMatches(bad, 's3cret-value'), false, String(bad))
  }
  assert.equal(bearerMatches('Bearer ', ''), false, 'an unset secret must lock the endpoint')
  assert.equal(bearerMatches('Bearer undefined', undefined), false)
})

test('the platform-set IP headers win over a client-supplied x-forwarded-for', () => {
  assert.equal(clientIp({ headers: { 'x-vercel-forwarded-for': '198.51.100.1', 'x-forwarded-for': '6.6.6.6' } }), '198.51.100.1')
  assert.equal(clientIp({ headers: { 'x-real-ip': '198.51.100.2', 'x-forwarded-for': '6.6.6.6' } }), '198.51.100.2')
  assert.equal(clientIp({ headers: { 'x-forwarded-for': '198.51.100.3, 10.0.0.1' } }), '198.51.100.3')
  assert.equal(clientIp({ headers: {} }), 'unknown')
})

test('security logs never contain the raw IP', () => {
  const lines = []
  const warn = console.warn
  console.warn = (s) => lines.push(s)
  try {
    securityLog('auth_token_rejected', { headers: { 'x-real-ip': '203.0.113.77', 'user-agent': 'curl/8' }, url: '/api/alerts?x=1', method: 'GET' }, { status: 401 })
  } finally { console.warn = warn }
  assert.equal(lines.length, 1)
  assert.doesNotMatch(lines[0], /203\.0\.113\.77/)
  const e = JSON.parse(lines[0])
  assert.equal(e.security, true)
  assert.equal(e.event, 'auth_token_rejected')
  assert.equal(e.route, '/api/alerts', 'query strings are not logged')
  assert.match(e.ip, /^[0-9a-f]{16}$/)
})
