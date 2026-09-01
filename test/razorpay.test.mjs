import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {
  verifyPaymentSignature,
  planToAmount,
  originAllowed,
  MIN_PAISE,
} from '../api/_razorpay.js'
import { PLANS } from '../src/utils/planData.js'

const SECRET = 'test_secret_not_a_real_key'
const sign = (orderId, paymentId, secret = SECRET) =>
  crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')

// ── signature ────────────────────────────────────────────────────────────────

test('a correctly signed payment verifies', () => {
  const orderId = 'order_ABC123'
  const paymentId = 'pay_XYZ789'
  assert.equal(
    verifyPaymentSignature({ orderId, paymentId, signature: sign(orderId, paymentId), secret: SECRET }),
    true,
  )
})

test('a tampered payment id fails', () => {
  const signature = sign('order_ABC123', 'pay_XYZ789')
  assert.equal(
    verifyPaymentSignature({
      orderId: 'order_ABC123', paymentId: 'pay_ATTACKER', signature, secret: SECRET,
    }),
    false,
  )
})

test('a tampered order id fails', () => {
  const signature = sign('order_ABC123', 'pay_XYZ789')
  assert.equal(
    verifyPaymentSignature({
      orderId: 'order_OTHER', paymentId: 'pay_XYZ789', signature, secret: SECRET,
    }),
    false,
  )
})

test('a signature from a different secret fails', () => {
  const orderId = 'order_ABC123'
  const paymentId = 'pay_XYZ789'
  const forged = sign(orderId, paymentId, 'someone_elses_secret')
  assert.equal(verifyPaymentSignature({ orderId, paymentId, signature: forged, secret: SECRET }), false)
})

test('the order/payment pair cannot be swapped', () => {
  // "a|b" and "b|a" must not collide — the delimiter has to actually separate.
  const signature = sign('order_A', 'pay_B')
  assert.equal(
    verifyPaymentSignature({ orderId: 'pay_B', paymentId: 'order_A', signature, secret: SECRET }),
    false,
  )
})

test('missing pieces fail closed rather than throwing', () => {
  const full = { orderId: 'o', paymentId: 'p', signature: sign('o', 'p'), secret: SECRET }
  for (const field of ['orderId', 'paymentId', 'signature', 'secret']) {
    assert.equal(verifyPaymentSignature({ ...full, [field]: undefined }), false, `${field} missing`)
    assert.equal(verifyPaymentSignature({ ...full, [field]: '' }), false, `${field} empty`)
  }
})

test('a wrong-length signature is rejected, not thrown on', () => {
  // timingSafeEqual throws on length mismatch, so the guard must come first.
  assert.doesNotThrow(() => {
    assert.equal(
      verifyPaymentSignature({ orderId: 'o', paymentId: 'p', signature: 'short', secret: SECRET }),
      false,
    )
  })
})

// ── pricing is decided by the server ─────────────────────────────────────────

test('every real plan prices from the catalogue, above the Razorpay minimum', () => {
  // Currency is per-plan now: the founder plan is billed in USD, everything
  // else in INR. The amount must be derived from the price in THAT currency —
  // charging 29900 while telling Razorpay 'INR' would take ₹299 for something
  // sold at $299.
  for (const plan of PLANS) {
    const priced = planToAmount(plan.id)
    assert.ok(priced, `${plan.id} should be priceable`)
    const expectedCurrency = plan.currency === 'USD' ? 'USD' : 'INR'
    assert.equal(priced.currency, expectedCurrency, `${plan.id} currency`)
    const major = expectedCurrency === 'USD' ? plan.price : plan.priceINR
    assert.equal(priced.paise, Math.round(major * 100), `${plan.id} amount`)
    assert.ok(priced.paise >= MIN_PAISE, `${plan.id} is under the minimum`)
  }
})

test('every plan costs the same in INR from every country', () => {
  // One price worldwide is the current rule. Visitors abroad are SHOWN a
  // converted figure by currency.js, but that is a label — the charge is this,
  // and it must not vary by where the request came from.
  for (const plan of PLANS) {
    const baseline = planToAmount(plan.id, 'IN')
    for (const cc of ['US', 'GB', 'DE', 'AE', 'SG', '']) {
      const priced = planToAmount(plan.id, cc)
      assert.ok(priced, `${plan.id} should price from ${cc || 'unknown'}`)
      assert.equal(priced.currency, 'INR', `${plan.id} must be charged in INR`)
      assert.equal(priced.paise, baseline.paise,
        `${plan.id} charges a different amount from ${cc || 'unknown'} than from IN`)
    }
  }
})

test('the geo-restriction mechanism still refuses a restricted plan', () => {
  // No plan is restricted today, so this exercises the mechanism directly
  // rather than asserting one exists. It is the enforcement point if a plan is
  // ever geo-limited again, and an unexercised guard is one that quietly rots.
  const fake = { id: '__test_restricted__', priceINR: 999, excludeCountries: ['IN'] }
  PLANS.push(fake)
  try {
    assert.equal(planToAmount(fake.id, 'IN'), null, 'must be refused from an excluded country')
    assert.ok(planToAmount(fake.id, 'US'), 'must price elsewhere')
    assert.ok(planToAmount(fake.id, ''), 'must price when the country is unknown')
  } finally {
    PLANS.pop()
  }
})

test('an unknown or malformed plan is refused', () => {
  for (const bad of ['not_a_plan', '', null, undefined, 0, {}, []]) {
    assert.equal(planToAmount(bad), null, `${JSON.stringify(bad)} should not price`)
  }
})

test('a client-supplied amount cannot influence the price', () => {
  // The whole point: planToAmount's only input is the id. There is no argument
  // an attacker could add to make the Team plan cost less.
  const team = PLANS.find((p) => p.id === 'pandava')
  assert.equal(planToAmount(team.id).paise, Math.round(team.priceINR * 100))
  assert.equal(planToAmount(team.id, { amount: 100 })?.paise, Math.round(team.priceINR * 100))
})

// ── origin ───────────────────────────────────────────────────────────────────

test('the payment endpoints accept only our own origins', () => {
  for (const ok of [
    undefined, 'https://toolnaut.xyz', 'https://www.toolnaut.xyz',
    'http://localhost:5173', 'https://toolnaut.vercel.app',
  ]) assert.equal(originAllowed(ok), true, `${ok} should be allowed`)

  for (const bad of [
    'null', 'http://toolnaut.xyz.evil.example', 'https://toolnaut.xyz.evil.example',
    'https://evil.example', 'https://toolnaut-.vercel.app', 'http://toolnaut.vercel.app',
  ]) assert.equal(originAllowed(bad), false, `${bad} should be blocked`)
})

// ── the kill switch ──────────────────────────────────────────────────────────

test('payments are OFF unless explicitly enabled', async () => {
  const { paymentsEnabled } = await import('../api/_razorpay.js')
  const original = process.env.PAYMENTS_ENABLED
  try {
    // Every way of "not exactly true" must mean off. A payment system that
    // switches itself on when a variable goes missing is the wrong way round.
    for (const v of [undefined, '', 'false', 'TRUE', 'True', '1', 'yes', ' true']) {
      if (v === undefined) delete process.env.PAYMENTS_ENABLED
      else process.env.PAYMENTS_ENABLED = v
      assert.equal(paymentsEnabled(), false, `PAYMENTS_ENABLED=${JSON.stringify(v)} must be off`)
    }
    process.env.PAYMENTS_ENABLED = 'true'
    assert.equal(paymentsEnabled(), true)
  } finally {
    if (original === undefined) delete process.env.PAYMENTS_ENABLED
    else process.env.PAYMENTS_ENABLED = original
  }
})
