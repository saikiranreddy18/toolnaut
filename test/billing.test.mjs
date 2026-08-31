// Billing tests that need no Stripe account and no keys.
//
// What is worth testing here is the mapping and the refusals — the two places a
// billing bug is silent rather than loud. A wrong period-end writes a plausible
// row and locks someone out a month early; a missing guard hands a 500 to
// Stripe and gets the endpoint disabled after enough retries.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { billingConfigured, subscriptionRow } from '../api/_billing.js'

const res = () => {
  const r = { statusCode: null, body: null, headers: {} }
  r.status = (c) => { r.statusCode = c; return r }
  r.json = (b) => { r.body = b; return r }
  r.setHeader = (k, v) => { r.headers[k] = v }
  return r
}

const SUB = {
  id: 'sub_123',
  customer: 'cus_456',
  status: 'active',
  cancel_at_period_end: false,
  current_period_end: 1788000000, // seconds, as Stripe sends
  items: { data: [{ price: { id: 'price_789' } }] },
}

test('a Stripe subscription maps onto the row shape without losing anything', () => {
  const row = subscriptionRow(SUB, 'user-abc', 1787900000)
  assert.equal(row.user_id, 'user-abc')
  assert.equal(row.stripe_customer_id, 'cus_456')
  assert.equal(row.stripe_subscription_id, 'sub_123')
  assert.equal(row.status, 'active')
  assert.equal(row.price_id, 'price_789')
  assert.equal(row.cancel_at_period_end, false)
  // seconds -> ISO. Getting this wrong writes a plausible date that is out by
  // a factor of 1000 and expires someone in 1970.
  assert.equal(row.current_period_end, new Date(1788000000 * 1000).toISOString())
  assert.equal(row.event_created, new Date(1787900000 * 1000).toISOString())
})

test('the customer may arrive expanded as an object, not just an id', () => {
  const row = subscriptionRow({ ...SUB, customer: { id: 'cus_expanded' } }, 'u', 1)
  assert.equal(row.stripe_customer_id, 'cus_expanded')
})

test('a subscription with no period end or price does not invent them', () => {
  const row = subscriptionRow({ id: 's', customer: 'c', status: 'incomplete', items: { data: [] } }, 'u')
  assert.equal(row.current_period_end, null)
  assert.equal(row.price_id, null)
  assert.equal(row.event_created, null)
  assert.equal(row.cancel_at_period_end, false)
})

// Previews and local dev run with no Stripe keys at all. That has to be a clean
// "not configured", never a crash, exactly as api/chat.js behaves without
// FEATHERLESS_API_KEY.
test('with no keys configured, billing reports itself unconfigured', () => {
  assert.equal(billingConfigured, false)
})

test('every billing endpoint refuses a GET with 405 and an Allow header', async () => {
  for (const mod of ['../api/checkout.js', '../api/portal.js', '../api/stripe-webhook.js']) {
    const { default: handler } = await import(mod)
    const r = res()
    await handler({ method: 'GET', headers: {} }, r)
    assert.equal(r.statusCode, 405, `${mod} should 405 a GET`)
    assert.equal(r.headers.Allow, 'POST')
  }
})

test('unconfigured billing returns 503, not a 500 or a silent success', async () => {
  const { default: webhook } = await import('../api/stripe-webhook.js')
  const r = res()
  await webhook({ method: 'POST', headers: {} }, r)
  assert.equal(r.statusCode, 503)
  assert.match(r.body.error, /not configured/i)
})

// The webhook route must opt out of Vercel's body parser or Stripe signature
// verification fails on every event, with an error that reads like a wrong
// secret and sends people hunting in the dashboard.
test('the webhook disables the body parser, which is what makes signatures verify', async () => {
  const mod = await import('../api/stripe-webhook.js')
  assert.equal(mod.config?.api?.bodyParser, false)
})
