// Razorpay tests that need no live keys and no network.
//
// The signature check is the only thing separating "the browser said it paid"
// from actually granting anything, so it gets the most attention here — a
// verify endpoint that accepts a forged signature fails silently and expensively.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

const res = () => {
  const r = { statusCode: null, body: null, headers: {} }
  r.status = (c) => { r.statusCode = c; return r }
  r.json = (b) => { r.body = b; return r }
  r.setHeader = (k, v) => { r.headers[k] = v }
  return r
}

const SECRET = 'test_secret_for_signing'
const ORDER = 'order_ABC123'
const PAYMENT = 'pay_XYZ789'
const sign = (secret, order, payment) =>
  crypto.createHmac('sha256', secret).update(`${order}|${payment}`).digest('hex')

// Import fresh with the env set, since the handler reads the secret at module load.
async function verifyHandler() {
  process.env.RAZORPAY_KEY_SECRET = SECRET
  const mod = await import(`../api/razorpay-verify.js?t=${Date.now()}`)
  return mod.default
}

test('a genuine signature verifies', async () => {
  const handler = await verifyHandler()
  const r = res()
  await handler({
    method: 'POST',
    headers: {},
    body: { razorpay_order_id: ORDER, razorpay_payment_id: PAYMENT, razorpay_signature: sign(SECRET, ORDER, PAYMENT) },
  }, r)
  assert.equal(r.statusCode, 200)
  assert.equal(r.body.verified, true)
})

// The failure that matters: a forged signature must not be accepted, and must
// not be reported as a success anywhere.
test('a forged signature is rejected with 400 and verified:false', async () => {
  const handler = await verifyHandler()
  const r = res()
  await handler({
    method: 'POST',
    headers: {},
    body: { razorpay_order_id: ORDER, razorpay_payment_id: PAYMENT, razorpay_signature: 'f'.repeat(64) },
  }, r)
  assert.equal(r.statusCode, 400)
  assert.equal(r.body.verified, false)
})

test('a signature for a DIFFERENT order does not verify this one', async () => {
  const handler = await verifyHandler()
  const r = res()
  await handler({
    method: 'POST',
    headers: {},
    // correctly signed, but for another order — replaying it must fail
    body: { razorpay_order_id: ORDER, razorpay_payment_id: PAYMENT, razorpay_signature: sign(SECRET, 'order_OTHER', PAYMENT) },
  }, r)
  assert.equal(r.statusCode, 400)
  assert.equal(r.body.verified, false)
})

test('a signature made with the wrong secret does not verify', async () => {
  const handler = await verifyHandler()
  const r = res()
  await handler({
    method: 'POST',
    headers: {},
    body: { razorpay_order_id: ORDER, razorpay_payment_id: PAYMENT, razorpay_signature: sign('not_the_secret', ORDER, PAYMENT) },
  }, r)
  assert.equal(r.statusCode, 400)
  assert.equal(r.body.verified, false)
})

test('missing fields are a 400, not a crash', async () => {
  const handler = await verifyHandler()
  for (const body of [{}, { razorpay_order_id: ORDER }, { razorpay_payment_id: PAYMENT }, null]) {
    const r = res()
    await handler({ method: 'POST', headers: {}, body }, r)
    assert.equal(r.statusCode, 400)
    assert.equal(r.body.verified, false)
  }
})

test('both endpoints refuse a GET with 405 and an Allow header', async () => {
  for (const mod of ['../api/razorpay-order.js', '../api/razorpay-verify.js']) {
    const { default: handler } = await import(mod)
    const r = res()
    await handler({ method: 'GET', headers: {} }, r)
    assert.equal(r.statusCode, 405)
    assert.equal(r.headers.Allow, 'POST')
  }
})

// The amount is server configuration. If the client could choose it, anyone
// could buy lifetime access for one rupee and the signature would still verify,
// because the payment really was for one rupee.
test('create-order ignores any amount sent by the client', async () => {
  const src = await import('node:fs').then((fs) => fs.readFileSync('api/razorpay-order.js', 'utf8'))
  assert.match(src, /AMOUNT_PAISE = Number\(process\.env\.RAZORPAY_AMOUNT_PAISE\)/)
  assert.doesNotMatch(src, /req\.body/, 'the order endpoint must not read the request body')
})

// A misconfigured or below-floor price must not reach Razorpay.
test('an amount below the 100 paise floor is refused as unconfigured', async () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_x'
  process.env.RAZORPAY_KEY_SECRET = 'x'
  process.env.RAZORPAY_AMOUNT_PAISE = '50'
  const { default: handler } = await import(`../api/razorpay-order.js?t=${Date.now()}`)
  const r = res()
  await handler({ method: 'POST', headers: {} }, r)
  assert.equal(r.statusCode, 503)
  delete process.env.RAZORPAY_AMOUNT_PAISE
})
