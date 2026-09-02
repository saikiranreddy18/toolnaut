import test from 'node:test'
import assert from 'node:assert/strict'

// activateEntitlement's date arithmetic, exercised against a fake PostgREST.
//
// The bug this pins down shipped: verify-payment and the webhook both settle
// the same payment, and the extend-from-current-end rule could not tell a
// second PURCHASE from a second SETTLEMENT, so one payment granted two
// periods. Sixty days of access for thirty days of money, every single time.
//
// The module reads its config at import time, so the environment is set before
// the dynamic import below.
process.env.SUPABASE_URL = 'https://fake.supabase.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_fake'

const { activateEntitlement } = await import('../api/_supabase.js')

const DAY = 86_400_000

// A stand-in for the one table this touches. Records what was written so the
// assertions can look at the outcome rather than at the calls.
function fakeDb(existingRow) {
  const writes = []
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url, opts = {}) => {
    const method = opts.method || 'GET'
    if (method === 'GET') {
      return new Response(JSON.stringify(existingRow ? [existingRow] : []), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    }
    writes.push({ method, body: JSON.parse(opts.body) })
    return new Response(null, { status: 204 })
  }
  return { writes, restore: () => { globalThis.fetch = realFetch } }
}

test('a first payment grants exactly one period', async () => {
  const db = fakeDb(null)
  try {
    const r = await activateEntitlement({
      userId: 'u1', planCode: 'guru', transactionId: 'txn_1',
    })
    assert.equal(r.ok, true, 'a successful grant must report ok')
    const days = (new Date(r.endsAt).getTime() - Date.now()) / DAY
    assert.ok(days > 29 && days < 31, `expected ~30 days, got ${days.toFixed(1)}`)
  } finally { db.restore() }
})

test('settling the SAME payment twice does not extend the period', async () => {
  // This is the regression. verify-payment activates, then the webhook arrives
  // for the same payment and finds an active row whose end date is in the
  // future. Without the transaction check it extends again.
  const alreadyEnds = new Date(Date.now() + 30 * DAY).toISOString()
  const db = fakeDb({
    id: 'ent_1', ends_at: alreadyEnds, status: 'active', payment_transaction_id: 'txn_1',
  })
  try {
    const r = await activateEntitlement({
      userId: 'u1', planCode: 'guru', transactionId: 'txn_1',
    })
    assert.equal(r.ok, true, 'a repeat settlement is a success, not a failure')
    assert.equal(r.endsAt, alreadyEnds, 'the same payment must not buy a second period')
    assert.equal(db.writes.length, 0, 'a repeat settlement should not write at all')
  } finally { db.restore() }
})

test('a genuinely NEW payment still extends from the current end', async () => {
  // The other half: real renewals must keep working, and paying early must not
  // cost the customer the days they have left.
  const currentEnd = Date.now() + 10 * DAY
  const db = fakeDb({
    id: 'ent_1', ends_at: new Date(currentEnd).toISOString(), status: 'active',
    payment_transaction_id: 'txn_1',
  })
  try {
    const r = await activateEntitlement({
      userId: 'u1', planCode: 'guru', transactionId: 'txn_2', // a different payment
    })
    const days = (new Date(r.endsAt).getTime() - Date.now()) / DAY
    assert.ok(days > 39 && days < 41, `expected ~40 days (10 remaining + 30 bought), got ${days.toFixed(1)}`)
  } finally { db.restore() }
})

test('an expired entitlement restarts from now rather than the past', async () => {
  const db = fakeDb({
    id: 'ent_1', ends_at: new Date(Date.now() - 5 * DAY).toISOString(), status: 'active',
    payment_transaction_id: 'txn_old',
  })
  try {
    const r = await activateEntitlement({
      userId: 'u1', planCode: 'guru', transactionId: 'txn_new',
    })
    const days = (new Date(r.endsAt).getTime() - Date.now()) / DAY
    assert.ok(days > 29 && days < 31, `expected ~30 days from now, got ${days.toFixed(1)}`)
  } finally { db.restore() }
})

test('it asks only for the ACTIVE row', async () => {
  // An unfiltered query returns rows in no guaranteed order, so it could hand
  // back an expired row and this would PATCH it to active alongside the real
  // active row — colliding with user_entitlements_one_active_idx and failing
  // the write for someone who just paid.
  let askedFor = ''
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url, opts = {}) => {
    if ((opts.method || 'GET') === 'GET') askedFor = String(url)
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    await activateEntitlement({ userId: 'u1', planCode: 'guru', transactionId: 't' })
    assert.match(askedFor, /status=eq\.active/)
  } finally { globalThis.fetch = realFetch }
})

test('a LIFETIME grant reports success, not failure', async () => {
  // The trap this shape exists to close. A lifetime plan succeeds with a null
  // end date, so a bare-date return made success indistinguishable from a
  // failed write — and any caller checking "did it work" would have told every
  // Founder buyer their payment did not provision.
  const db = fakeDb(null)
  try {
    const r = await activateEntitlement({
      userId: 'u1', planCode: 'founder', transactionId: 'txn_life', periodDays: null,
    })
    assert.equal(r.ok, true, 'a lifetime grant is a success')
    assert.equal(r.endsAt, null, 'and it has no end date')
  } finally { db.restore() }
})

test('an existing lifetime entitlement is never downgraded', async () => {
  const db = fakeDb({
    id: 'ent_1', ends_at: null, status: 'active', payment_transaction_id: 'txn_old',
  })
  try {
    const r = await activateEntitlement({
      userId: 'u1', planCode: 'guru', transactionId: 'txn_new',
    })
    assert.equal(r.ok, true)
    assert.equal(r.endsAt, null, 'permanent access must survive a later purchase')
    assert.equal(db.writes.length, 0, 'and nothing should be written over it')
  } finally { db.restore() }
})

test('a failed write reports ok:false, never a silent success', async () => {
  // This is what verify-payment now keys "provisioned" on. If a failure ever
  // returned ok:true, a payer would be shown success and given nothing.
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url, opts = {}) => {
    if ((opts.method || 'GET') === 'GET') {
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response('{"message":"boom"}', { status: 500 })
  }
  try {
    const r = await activateEntitlement({
      userId: 'u1', planCode: 'guru', transactionId: 'txn_x',
    })
    assert.equal(r.ok, false, 'a 500 from the database must not read as granted')
    assert.equal(r.endsAt, null)
  } finally { globalThis.fetch = realFetch }
})
