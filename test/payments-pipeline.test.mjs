// The webhook is the payment pipeline's authoritative path, and its signature
// check is the lock on the door — same test discipline as razorpay.test.mjs
// applies to the checkout signature.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

const { verifyWebhookSignature } = await import('../api/_supabase.js')

const SECRET = 'whsec_test_secret'
const sign = (body, secret = SECRET) =>
  crypto.createHmac('sha256', secret).update(body).digest('hex')

describe('verifyWebhookSignature — the lock on the webhook', () => {
  const body = JSON.stringify({ event: 'payment.captured', payload: {} })

  test('accepts the genuine signature over the raw body', () => {
    assert.equal(verifyWebhookSignature(body, sign(body), SECRET), true)
  })
  test('rejects a signature made with a different secret', () => {
    assert.equal(verifyWebhookSignature(body, sign(body, 'wrong'), SECRET), false)
  })
  test('rejects when the body was altered after signing', () => {
    assert.equal(verifyWebhookSignature(body + ' ', sign(body), SECRET), false)
  })
  test('rejects missing pieces without throwing', () => {
    assert.equal(verifyWebhookSignature('', sign(body), SECRET), false)
    assert.equal(verifyWebhookSignature(body, '', SECRET), false)
    assert.equal(verifyWebhookSignature(body, sign(body), ''), false)
    assert.equal(verifyWebhookSignature(body, 'deadbeef', SECRET), false)
  })
})
