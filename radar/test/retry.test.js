import { test } from 'node:test'
import assert from 'node:assert/strict'
import { retry, httpError } from '../util/retry.js'

test('fails fast on a 4xx that is not 429, without retrying', async () => {
  let calls = 0
  const err = new Error('bad request')
  err.status = 400
  await assert.rejects(
    () =>
      retry(
        () => {
          calls++
          throw err
        },
        { attempts: 3, baseMs: 1 }
      ),
    err
  )
  assert.equal(calls, 1)
})

test('retries a 429 and obeys the Retry-After hint', async () => {
  let calls = 0
  const start = Date.now()
  const result = await retry(
    () => {
      calls++
      if (calls === 1) {
        const e = new Error('rate limited')
        e.status = 429
        e.retryAfterMs = 20
        throw e
      }
      return 'ok'
    },
    { attempts: 3, baseMs: 1000 }
  )
  const elapsed = Date.now() - start
  assert.equal(result, 'ok')
  assert.equal(calls, 2)
  // Should honor the short Retry-After wait rather than the much larger baseMs backoff.
  assert.ok(elapsed < 500, `expected the 20ms Retry-After to be used, took ${elapsed}ms`)
})

test('retries a transient (non-4xx) failure and eventually succeeds', async () => {
  let calls = 0
  const result = await retry(
    () => {
      calls++
      if (calls < 3) {
        const e = new Error('network blip')
        e.status = 503
        throw e
      }
      return 'recovered'
    },
    { attempts: 3, baseMs: 1 }
  )
  assert.equal(result, 'recovered')
  assert.equal(calls, 3)
})

test('exhausts attempts and throws the last transient error', async () => {
  let calls = 0
  const err = new Error('still down')
  err.status = 503
  await assert.rejects(
    () =>
      retry(
        () => {
          calls++
          throw err
        },
        { attempts: 3, baseMs: 1 }
      ),
    err
  )
  assert.equal(calls, 3)
})

test('httpError reads a numeric Retry-After header as milliseconds', () => {
  const res = { status: 429, headers: { get: (k) => (k === 'retry-after' ? '2' : null) } }
  const e = httpError(res, 'rate limited')
  assert.equal(e.status, 429)
  assert.equal(e.retryAfterMs, 2000)
})

test('httpError ignores a missing or non-positive Retry-After', () => {
  const res = { status: 500, headers: { get: () => null } }
  const e = httpError(res, 'server error')
  assert.equal(e.status, 500)
  assert.equal(e.retryAfterMs, undefined)
})

test('httpError reads an HTTP-date Retry-After header as a future offset', () => {
  const future = new Date(Date.now() + 5000).toUTCString()
  const res = { status: 429, headers: { get: (k) => (k === 'retry-after' ? future : null) } }
  const e = httpError(res, 'rate limited')
  assert.equal(e.status, 429)
  assert.ok(e.retryAfterMs > 0 && e.retryAfterMs <= 5000, `expected a positive offset near 5000ms, got ${e.retryAfterMs}`)
})

test('httpError ignores a Retry-After HTTP-date that is already in the past', () => {
  const past = new Date(Date.now() - 5000).toUTCString()
  const res = { status: 429, headers: { get: (k) => (k === 'retry-after' ? past : null) } }
  const e = httpError(res, 'rate limited')
  assert.equal(e.retryAfterMs, undefined)
})
