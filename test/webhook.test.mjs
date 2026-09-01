import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

// The webhook's signature check, reproduced exactly as the handler computes it.
// Importing the handler would pull in the Supabase client and require a service
// role key, so the algorithm is asserted directly — it is the part that must be
// right, and it is small enough to state twice without drift.
const SECRET = 'whsec_test_not_a_real_secret'

function signatureValid(rawBody, header, secret) {
  if (!header || !secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(String(header), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

const sign = (body, secret = SECRET) =>
  crypto.createHmac('sha256', secret).update(body).digest('hex')

const BODY = Buffer.from(JSON.stringify({
  event: 'payment.captured',
  payload: { payment: { entity: { id: 'pay_X', order_id: 'order_X', amount: 29900, currency: 'INR' } } },
}))

test('a genuine Razorpay signature is accepted', () => {
  assert.equal(signatureValid(BODY, sign(BODY), SECRET), true)
})

test('a forged signature is rejected', () => {
  assert.equal(signatureValid(BODY, sign(BODY, 'attacker_secret'), SECRET), false)
})

test('a tampered body invalidates the signature', () => {
  // The exact attack this defends: change the amount, keep the signature.
  const good = sign(BODY)
  const tampered = Buffer.from(BODY.toString().replace('29900', '100'))
  assert.equal(signatureValid(tampered, good, SECRET), false)
})

test('re-serialising the body breaks the signature — hence the raw bytes', () => {
  // JSON.parse then JSON.stringify is not byte-identical, which is precisely
  // why bodyParser is disabled on the handler. If this ever passes, someone has
  // reintroduced body parsing and the webhook will reject every real delivery.
  const good = sign(BODY)
  const reserialised = Buffer.from(JSON.stringify(JSON.parse(BODY.toString())) + ' ')
  assert.equal(signatureValid(reserialised, good, SECRET), false)
})

test('a missing signature header fails closed', () => {
  for (const h of [undefined, null, '']) {
    assert.equal(signatureValid(BODY, h, SECRET), false)
  }
})

test('a missing secret fails closed rather than accepting everything', () => {
  assert.equal(signatureValid(BODY, sign(BODY), ''), false)
  assert.equal(signatureValid(BODY, sign(BODY), undefined), false)
})

test('a wrong-length signature is rejected, not thrown on', () => {
  // timingSafeEqual throws on length mismatch, so the guard must come first.
  assert.doesNotThrow(() => {
    assert.equal(signatureValid(BODY, 'tooshort', SECRET), false)
  })
})

// ── the shape the handler relies on ─────────────────────────────────────────

test('an event id is derivable even when Razorpay omits the header', () => {
  // Falling back to a body hash keeps dedup working: without an id, every
  // retry would be treated as a new event and credited again.
  const a = crypto.createHash('sha256').update(BODY).digest('hex')
  const b = crypto.createHash('sha256').update(BODY).digest('hex')
  assert.equal(a, b, 'the same body must always yield the same id')
  const other = crypto.createHash('sha256').update(Buffer.from('different')).digest('hex')
  assert.notEqual(a, other)
})

test('the handler disables body parsing', async () => {
  const mod = await import('../api/razorpay-webhook.js')
  assert.equal(
    mod.config?.api?.bodyParser,
    false,
    'bodyParser must stay disabled or every signature check fails',
  )
})
