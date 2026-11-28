import test from 'node:test'
import assert from 'node:assert/strict'

// creditReferral's date/branching logic, exercised against a fake PostgREST —
// same approach as entitlement-activation.test.mjs. The module reads its
// config at import time, so the environment is set before the dynamic import.
process.env.SUPABASE_URL = 'https://fake.supabase.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_fake'

const { creditReferral, REFERRAL_BONUS_DAYS, REFERRAL_CAP } = await import('../api/entitlement.js')

const DAY = 86_400_000
const REFERRER = '11111111-1111-1111-1111-111111111111'
const NEW_USER = '22222222-2222-2222-2222-222222222222'

// Models one referrals table (with a UNIQUE referred_id) and one
// user_entitlements table, keyed by whatever the test seeds. Records every
// write so assertions can check outcomes, not call shapes.
function fakeDb({ referralsCount = 0, referrerRow = null } = {}) {
  const writes = []
  const referredIds = new Set()
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url, opts = {}) => {
    const method = opts.method || 'GET'
    const path = String(url)
    const body = opts.body ? JSON.parse(opts.body) : null

    if (path.includes('/referrals') && method === 'POST') {
      const referredId = body[0].referred_id
      if (referredIds.has(referredId)) {
        return new Response('{"message":"duplicate key"}', { status: 409 })
      }
      referredIds.add(referredId)
      writes.push({ table: 'referrals', method, body })
      return new Response(null, { status: 201 })
    }
    if (path.includes('/referrals?referrer_id=') && method === 'GET') {
      return new Response(JSON.stringify(Array.from({ length: referralsCount }, (_, i) => ({ id: `r${i}` }))), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    }
    if (path.includes('/user_entitlements?user_id=') && method === 'GET') {
      return new Response(JSON.stringify(referrerRow ? [referrerRow] : []), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    }
    if (path.includes('/user_entitlements?id=eq.') && method === 'PATCH') {
      writes.push({ table: 'user_entitlements', method, path, body })
      return new Response(null, { status: 204 })
    }
    throw new Error(`unexpected request: ${method} ${path}`)
  }
  return { writes, restore: () => { globalThis.fetch = realFetch } }
}

test('a valid, non-self referral extends the new user and the referrer', async () => {
  const db = fakeDb({ referralsCount: 1, referrerRow: { id: 'ent_referrer', ends_at: null } })
  try {
    const newRow = { id: 'ent_new', ends_at: new Date(Date.now() + 7 * DAY).toISOString() }
    const bonusEndsAt = await creditReferral(REFERRER, NEW_USER, newRow)

    assert.ok(bonusEndsAt, 'must report the new user\'s extended end date')
    const newDays = (new Date(bonusEndsAt).getTime() - Date.now()) / DAY
    assert.ok(newDays > 13 && newDays < 15, `expected ~14 days (7 trial + 7 bonus), got ${newDays.toFixed(1)}`)

    const referralWrite = db.writes.find((w) => w.table === 'referrals')
    assert.ok(referralWrite, 'must record the referral')
    assert.equal(referralWrite.body[0].referrer_id, REFERRER.toLowerCase())
    assert.equal(referralWrite.body[0].referred_id, NEW_USER)

    const referrerWrite = db.writes.find((w) => w.table === 'user_entitlements' && w.path.includes('ent_referrer'))
    assert.ok(referrerWrite, 'the referrer\'s active row must be extended too')
  } finally { db.restore() }
})

test('self-referral is a no-op', async () => {
  const db = fakeDb()
  try {
    const newRow = { id: 'ent_new', ends_at: new Date(Date.now() + 7 * DAY).toISOString() }
    const result = await creditReferral(NEW_USER, NEW_USER, newRow)
    assert.equal(result, null)
    assert.equal(db.writes.length, 0, 'nothing should be written for a self-referral')
  } finally { db.restore() }
})

test('a syntactically invalid code is a no-op', async () => {
  const db = fakeDb()
  try {
    const newRow = { id: 'ent_new', ends_at: new Date(Date.now() + 7 * DAY).toISOString() }
    const result = await creditReferral('not-a-uuid', NEW_USER, newRow)
    assert.equal(result, null)
    assert.equal(db.writes.length, 0)
  } finally { db.restore() }
})

test('a referral already recorded for this friend does not double-credit', async () => {
  // Simulates the retried-request case the UNIQUE constraint exists for: the
  // insert conflicts, so neither side should be extended.
  const db = fakeDb()
  try {
    const newRow = { id: 'ent_new', ends_at: new Date(Date.now() + 7 * DAY).toISOString() }
    await creditReferral(REFERRER, NEW_USER, newRow) // first call succeeds
    db.writes.length = 0
    const result = await creditReferral(REFERRER, NEW_USER, newRow) // retried
    assert.equal(result, null, 'a conflicting insert must not report a bonus')
    assert.equal(db.writes.length, 0, 'a retried, already-recorded referral must write nothing')
  } finally { db.restore() }
})

test('the referrer stops getting credited once the cap is reached', async () => {
  // REFERRAL_CAP successful referrals already on record — this one tips it
  // over, so the referrer must not be extended, though the new user still is.
  const db = fakeDb({ referralsCount: REFERRAL_CAP + 1, referrerRow: { id: 'ent_referrer', ends_at: null } })
  try {
    const newRow = { id: 'ent_new', ends_at: new Date(Date.now() + 7 * DAY).toISOString() }
    const bonusEndsAt = await creditReferral(REFERRER, NEW_USER, newRow)

    assert.ok(bonusEndsAt, 'the new user is still credited regardless of the referrer\'s cap')
    const referrerWrite = db.writes.find((w) => w.table === 'user_entitlements' && w.path.includes('ent_referrer'))
    assert.equal(referrerWrite, undefined, 'the referrer must not be extended past the cap')
  } finally { db.restore() }
})

test('REFERRAL_BONUS_DAYS and REFERRAL_CAP are real exported constants', () => {
  assert.equal(typeof REFERRAL_BONUS_DAYS, 'number')
  assert.equal(typeof REFERRAL_CAP, 'number')
})
