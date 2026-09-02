// POST { code } — redeem a promo code for free access.
//
// This is an ENTITLEMENT GRANT, which is the most sensitive write in the
// product. The RLS tests exist to prove that no signed-in user can perform one;
// this endpoint is the only sanctioned path, and it runs with the service role
// after checking the code itself. The browser sends a string and nothing else —
// never a plan, never a duration, never a user id.
//
// Every rejection returns the SAME message. Distinguishing "no such code" from
// "expired" from "already used" would turn this into an oracle for guessing
// valid codes, and the person typing a real code does not need the difference
// explained.
import { originAllowed, rateLimited, clientIp, bodyTooLarge } from './_razorpay.js'
import { supabaseConfigured, rest, getUserFromRequest, activateEntitlement } from './_supabase.js'

const INVALID = 'That code is not valid, has expired, or has already been used.'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (bodyTooLarge(req)) return res.status(413).json({ error: 'Request too large' })
  if (!originAllowed(req.headers.origin)) return res.status(403).json({ error: 'Forbidden' })
  // Tighter than checkout: a code endpoint is the one worth brute-forcing.
  if (rateLimited(clientIp(req))) {
    res.setHeader('Retry-After', '60')
    return res.status(429).json({ error: 'Too many attempts. Try again in a minute.' })
  }
  if (!supabaseConfigured) return res.status(503).json({ error: 'Codes are not available yet' })

  // Redemption is attached to an account, exactly like a payment. Without a
  // signed-in user there is nobody to grant access to.
  const user = await getUserFromRequest(req)
  if (!user?.id) {
    return res.status(401).json({ error: 'Please sign in first — a code unlocks your account.', code: 'auth_required' })
  }

  const raw = typeof req.body?.code === 'string' ? req.body.code : ''
  // Normalised so PRO26, pro26 and " Pro26 " are the same code. Length-capped
  // before it reaches a query.
  const code = raw.trim().toLowerCase().slice(0, 40)
  if (!code || !/^[a-z0-9_-]+$/.test(code)) return res.status(400).json({ error: INVALID })

  const found = await rest(
    `promo_codes?code=eq.${encodeURIComponent(code)}&select=code,plan_code,period_days,max_redemptions,expires_at,active&limit=1`,
  )
  const promo = Array.isArray(found.json) ? found.json[0] : null
  if (!promo || promo.active !== true) return res.status(400).json({ error: INVALID })
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: INVALID })
  }

  // The cap. Checked before granting; the unique constraint below is what makes
  // the per-user rule airtight, but this one bounds the total.
  if (promo.max_redemptions != null) {
    // Ask for one row past the cap and count what comes back. Cheaper than
    // fetching every redemption, and it needs no response-header parsing —
    // rest() returns the body only.
    const used = await rest(
      `promo_redemptions?code=eq.${encodeURIComponent(code)}&select=id&limit=${promo.max_redemptions}`,
    )
    const count = Array.isArray(used.json) ? used.json.length : 0
    if (count >= promo.max_redemptions) return res.status(400).json({ error: INVALID })
  }

  // CLAIM FIRST, GRANT SECOND.
  //
  // The insert carries a unique (code, user_id), so a second attempt by the
  // same person — a double-click, a retry, a refresh — loses here and never
  // reaches activateEntitlement. Granting first and recording afterwards would
  // let a fast double-submit hand out two periods for one code.
  const claim = await rest('promo_redemptions', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: [{ code, user_id: user.id }],
  })
  if (!claim.ok) {
    // 23505 is the unique violation: already redeemed by this user.
    if (claim.status === 409 || /23505|duplicate key/i.test(claim.text || '')) {
      return res.status(400).json({ error: INVALID })
    }
    console.error('promo claim failed', claim.status, claim.text?.slice(0, 200))
    return res.status(500).json({ error: 'Could not apply that code. Nothing has changed.' })
  }

  const endsAt = await activateEntitlement({
    userId: user.id,
    planCode: promo.plan_code,
    transactionId: null,
    periodDays: promo.period_days,
  })

  if (!endsAt) {
    // The claim landed but the grant did not. Say so plainly rather than
    // reporting success — the same discipline as the payment path, where
    // pretending a failed activation worked is the outcome that costs trust.
    console.error('promo granted claim but entitlement write failed', { code, userId: user.id })
    return res.status(500).json({
      error: 'Your code was accepted but access could not be switched on. Contact support and quote this code.',
    })
  }

  // Best-effort: record what the redemption bought, for support and reporting.
  await rest(`promo_redemptions?code=eq.${encodeURIComponent(code)}&user_id=eq.${user.id}`, {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: { granted_until: endsAt },
  })

  return res.status(200).json({
    ok: true,
    plan: promo.plan_code,
    days: promo.period_days,
    ends_at: endsAt,
  })
}
