// GET /api/entitlement — the one question the app asks before showing premium
// anything: "what has this signed-in user actually paid for?"
//
// Answers from user_entitlements, never from the browser's idea of a plan.
// Also reports whether payments are switched on at all, so the client can
// distinguish "you need to pay" from "there is nothing to pay yet" — the
// paywall must never lock someone in front of a gateway that is off.
import { paymentsEnabled } from './_razorpay.js'
import { rateLimit } from './_security.js'
import { supabaseConfigured, rest, getUserFromRequest, extendEntitlementDays } from './_supabase.js'

// How long a new account gets everything, free, before the paywall applies.
// One constant: change this line and the trial length changes everywhere,
// including the copy on the paywall and the expiry banner.
export const TRIAL_DAYS = 7

// Referral bonus: both sides of a redeemed invite get the same extra days,
// capped so the realistic lifetime abuse ceiling per referrer is bounded
// (REFERRAL_CAP * REFERRAL_BONUS_DAYS = 35 days, not unlimited).
export const REFERRAL_BONUS_DAYS = 7
export const REFERRAL_CAP = 5
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Redeem a `?ref=<uuid>` code against a brand-new trial row. Called only from
// inside the no-row-existed branch below, so a returning user's request can
// never reach this — a stale or resent code is always a no-op for them.
// Self-referral (the trivial case) is blocked by the id comparison; a
// determined person chaining separate Google accounts is the same residual
// risk every referral program accepts.
// Returns the new user's own extended ends_at, so the caller can reflect the
// bonus in the response it is about to send — without this, the person who
// just redeemed a code would see their OLD, pre-bonus expiry until their
// next unrelated entitlement fetch.
export async function creditReferral(refParam, userId, newRow) {
  if (!refParam || !UUID_RE.test(refParam)) return null
  const referrerId = refParam.toLowerCase()
  if (referrerId === userId.toLowerCase()) return null

  // The referred_id UNIQUE constraint is the whole integrity guarantee: a
  // retried request just hits it and no-ops instead of double-crediting.
  const ins = await rest('referrals', {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: [{ referrer_id: referrerId, referred_id: userId }],
  })
  if (!ins.ok) return null

  const ownExt = await extendEntitlementDays(newRow.id, newRow.ends_at, REFERRAL_BONUS_DAYS)

  // Cap credited referrals per referrer, lifetime — count AFTER this one was
  // recorded, so the Nth successful invite is the last one that pays out.
  const count = await rest(`referrals?referrer_id=eq.${referrerId}&select=id`)
  if (count.ok && Array.isArray(count.json) && count.json.length <= REFERRAL_CAP) {
    const referrer = await rest(
      `user_entitlements?user_id=eq.${referrerId}&status=eq.active&select=id,ends_at&limit=1`,
    )
    const row = Array.isArray(referrer.json) ? referrer.json[0] : null
    // No active row (never signed up, or it lapsed) — nothing to extend.
    if (row) await extendEntitlementDays(row.id, row.ends_at, REFERRAL_BONUS_DAYS)
  }

  return ownExt.ok ? ownExt.endsAt : null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }

  // Entitlements are per-user truth — never cache them at the edge.
  res.setHeader('Cache-Control', 'no-store')

  // Generous: the app asks this several times per page, and many Indian
  // mobile and campus users share one public IP. It exists to stop a script,
  // not a busy household.
  if (rateLimit(req, res, 'entitlement', { max: 120 })) return

  const base = { payments_enabled: paymentsEnabled(), configured: supabaseConfigured }

  if (!supabaseConfigured) return res.status(200).json({ ...base, active: false })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ ...base, active: false, error: 'Not signed in' })

  const q = await rest(
    `user_entitlements?user_id=eq.${user.id}&select=plan_code,status,ends_at,starts_at,source`,
  )
  let row = Array.isArray(q.json) ? q.json[0] : null

  // FIRST VISIT STARTS THE TRIAL.
  //
  // Granted here rather than at signup because this is the one place every
  // client already asks, so there is no second path to forget. Keyed on having
  // NO entitlement row at all: once a trial row exists — active, expired or
  // superseded by a purchase — this never fires again, so nobody restarts a
  // trial by signing out and back in.
  //
  // The insert can lose a race with a concurrent first request; the partial
  // unique index refuses the second, and the re-read below picks up whichever
  // won. That is the correct outcome either way.
  if (!row && q.ok && Array.isArray(q.json)) {
    const endsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString()
    const ins = await rest('user_entitlements', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: [{
        user_id: user.id,
        plan_code: 'trial',
        status: 'active',
        source: 'trial',
        ends_at: endsAt,
      }],
    })
    if (ins.ok && Array.isArray(ins.json) && ins.json[0]) {
      row = ins.json[0]
      const refParam = Array.isArray(req.query?.ref) ? req.query.ref[0] : req.query?.ref
      if (refParam) {
        const bonusEndsAt = await creditReferral(String(refParam), user.id, row)
        if (bonusEndsAt) row = { ...row, ends_at: bonusEndsAt }
      }
    } else {
      // Lost the race, or the write failed. Re-read rather than assume: a
      // failed grant must not silently hand out access it did not record.
      const again = await rest(
        `user_entitlements?user_id=eq.${user.id}&select=plan_code,status,ends_at,starts_at,source`,
      )
      row = Array.isArray(again.json) ? again.json[0] : null
      if (!row) console.error('entitlement: trial grant failed', ins.status, ins.text?.slice(0, 200))
    }
  }
  const active = Boolean(
    row && row.status === 'active' && (!row.ends_at || new Date(row.ends_at).getTime() > Date.now()),
  )

  // The client needs to tell a trial from a purchase — one shows "3 days left,
  // pick a plan", the other shows nothing at all — and needs the expiry even
  // once it has passed, so an expired page can say WHEN rather than just "no".
  return res.status(200).json({
    ...base,
    active,
    plan: active ? row.plan_code : null,
    ends_at: row?.ends_at ?? null,
    trial: row?.source === 'trial',
    trial_days: TRIAL_DAYS,
  })
}
