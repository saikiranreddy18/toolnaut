// Server-side Supabase access for the payment pipeline (underscore file =
// helper, not a route). Same fetch-over-PostgREST style as _alerts.js, kept
// separate on purpose: the payment endpoints should depend on as little
// shared module state as possible (same reasoning as _razorpay.js's
// duplicated origin list).
//
// The architecture note asks for Supabase Edge Functions; these run as Vercel
// functions instead because that is where this app's server side already
// lives. The trust boundary is identical: the service-role key and Razorpay
// secret exist only here, never in the browser bundle.
import crypto from 'node:crypto'

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseConfigured = Boolean(SUPABASE_URL && SERVICE_KEY)

export async function rest(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-JSON body */ }
  return { ok: res.ok, status: res.status, json, text }
}

// Resolve the signed-in user from the browser's Supabase access token
// (Authorization: Bearer <jwt>). Asking Supabase's auth server — rather than
// decoding the JWT locally — means revoked sessions and clock skew are its
// problem, not ours. Returns { id, email } or null.
export async function getUserFromRequest(req) {
  if (!supabaseConfigured) return null
  const auth = String(req.headers.authorization || '')
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null
  if (!token || token.length > 4096) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const user = await res.json()
    return user?.id ? { id: user.id, email: user.email || null } : null
  } catch {
    return null
  }
}

// ── entitlement activation ───────────────────────────────────────────────────
// The one function that grants access, used by verify-payment (fast path) and
// the webhook (authoritative path) — both are idempotent through it. Renewal
// extends from the CURRENT end when it is still in the future, so paying
// early never eats days.
// periodDays === null grants access that never expires — the founder plan.
// current_entitlement() already reads a null ends_at as "still active"
// ("ends_at is null or ends_at > now()"), so nothing downstream needs to change.
export async function activateEntitlement({ userId, planCode, transactionId, periodDays = 30 }) {
  // Ask for the ACTIVE row specifically, not "any row for this user, take the
  // first". PostgREST returns no guaranteed order, so an unfiltered query on a
  // user with history could hand back an expired row — which this would then
  // PATCH to 'active' while their real active row still existed, colliding with
  // user_entitlements_one_active_idx. The write fails, and a customer who just
  // paid gets nothing. Filtering to status=active makes the partial unique
  // index a guarantee rather than a hazard: there is at most one such row.
  const existing = await rest(
    `user_entitlements?user_id=eq.${userId}&status=eq.active&select=id,ends_at,status,payment_transaction_id&limit=1`,
  )
  const row = Array.isArray(existing.json) ? existing.json[0] : null

  // ONE PAYMENT, ONE PERIOD.
  //
  // Both settle paths call this for the same payment: verify-payment when the
  // browser comes back, and the webhook when Razorpay reports the capture. The
  // extend-from-current-end rule below is correct for a genuine renewal, but it
  // cannot tell a second PURCHASE from a second SETTLEMENT of the same one — so
  // a single payment was granting two periods, thirty days of access nobody
  // paid for, every time both paths ran.
  //
  // The transaction id is what distinguishes them. If the active row already
  // points at this payment, the work is done; return the end date already
  // stored rather than pushing it further out.
  if (row && transactionId && row.payment_transaction_id === transactionId) {
    return row.ends_at
  }

  const now = Date.now()
  const base = row?.ends_at && new Date(row.ends_at).getTime() > now
    ? new Date(row.ends_at).getTime()
    : now
  // null, not a date far in the future. A sentinel date is a promise with an
  // expiry hidden in it, and "lifetime" that quietly ends in 2124 is still a
  // lie — just one nobody is around to catch.
  const endsAt = periodDays === null
    ? null
    : new Date(base + periodDays * 86_400_000).toISOString()

  // Never downgrade a lifetime entitlement. If someone with permanent access
  // buys anything else, their existing null ends_at must survive it.
  if (row && row.ends_at === null) return null

  const record = {
    user_id: userId,
    plan_code: planCode,
    status: 'active',
    source: 'razorpay_order',
    ends_at: endsAt,
    payment_transaction_id: transactionId || null,
    updated_at: new Date().toISOString(),
  }

  const res = row
    ? await rest(`user_entitlements?id=eq.${row.id}`, {
        method: 'PATCH', headers: { prefer: 'return=minimal' }, body: record,
      })
    : await rest('user_entitlements', {
        method: 'POST', headers: { prefer: 'return=minimal' }, body: [record],
      })

  if (!res.ok) console.error('entitlement write failed', res.status, res.text?.slice(0, 300))
  return res.ok ? endsAt : null
}

// ── webhook signature ────────────────────────────────────────────────────────
// HMAC-SHA256 over the RAW body with the webhook secret, compared in constant
// time — the same discipline as the checkout signature in _razorpay.js.
export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(String(signature), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
