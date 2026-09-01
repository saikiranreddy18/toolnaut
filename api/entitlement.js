// GET /api/entitlement — the one question the app asks before showing premium
// anything: "what has this signed-in user actually paid for?"
//
// Answers from user_entitlements, never from the browser's idea of a plan.
// Also reports whether payments are switched on at all, so the client can
// distinguish "you need to pay" from "there is nothing to pay yet" — the
// paywall must never lock someone in front of a gateway that is off.
import { paymentsEnabled } from './_razorpay.js'
import { supabaseConfigured, rest, getUserFromRequest } from './_supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'GET only' })
  }

  // Entitlements are per-user truth — never cache them at the edge.
  res.setHeader('Cache-Control', 'no-store')

  const base = { payments_enabled: paymentsEnabled(), configured: supabaseConfigured }

  if (!supabaseConfigured) return res.status(200).json({ ...base, active: false })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ ...base, active: false, error: 'Not signed in' })

  const q = await rest(
    `user_entitlements?user_id=eq.${user.id}&select=plan_code,status,ends_at,starts_at`,
  )
  const row = Array.isArray(q.json) ? q.json[0] : null
  const active = Boolean(
    row && row.status === 'active' && (!row.ends_at || new Date(row.ends_at).getTime() > Date.now()),
  )

  return res.status(200).json({
    ...base,
    active,
    plan: active ? row.plan_code : null,
    ends_at: active ? row.ends_at : null,
  })
}
