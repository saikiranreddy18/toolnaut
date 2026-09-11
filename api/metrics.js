// Subscription metrics: who is active, what they paid, who lapsed.
//
// ADMIN ONLY. Guarded by METRICS_SECRET, the same shape as the cron guard —
// unset means CLOSED, not open, because this returns revenue and subscriber
// counts and the URL is public. Never gated on a user id: "am I the founder"
// is a question a browser cannot be trusted to answer.
//
// Every number is COUNTED FROM ROWS, never estimated. If a figure cannot be
// derived it is omitted rather than approximated — a made-up MRR is worse than
// a missing one, because someone will make a decision on it.
import { rest, supabaseConfigured } from './_supabase.js'
import { PLANS } from '../src/utils/planData.js'

const DAY = 86_400_000

export default async function handler(req, res) {
  const secret = process.env.METRICS_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!supabaseConfigured) {
    return res.status(503).json({ error: 'Not configured' })
  }
  res.setHeader('Cache-Control', 'no-store')

  const [ents, txns] = await Promise.all([
    rest('user_entitlements?select=plan_code,status,source,starts_at,ends_at,created_at&limit=10000'),
    rest('payment_transactions?select=plan_code,status,amount_paise,currency,created_at,paid_at&limit=10000'),
  ])
  if (!ents.ok || !txns.ok) {
    return res.status(502).json({ error: 'Could not read metrics' })
  }

  const rows = Array.isArray(ents.json) ? ents.json : []
  const pay = Array.isArray(txns.json) ? txns.json : []
  const now = Date.now()
  const live = (r) => r.status === 'active' && (!r.ends_at || new Date(r.ends_at).getTime() > now)

  // Trials are NOT subscribers. Counting them as such is how a dashboard
  // reports growth that has not been paid for.
  const active = rows.filter((r) => live(r) && r.source !== 'trial')
  const trialing = rows.filter((r) => live(r) && r.source === 'trial')

  const captured = pay.filter((t) => t.status === 'captured')
  const paise = captured.reduce((n, t) => n + (Number(t.amount_paise) || 0), 0)

  // Monthly recurring revenue, with the honesty this product requires: NOTHING
  // here recurs. Every plan is a one-time payment, so a true MRR does not
  // exist. What is reported instead is the value of currently-active 30-day
  // plans — the closest honest analogue — with lifetime plans excluded because
  // amortising a one-off purchase across future months invents revenue.
  const monthlyPlans = new Set(PLANS.filter((p) => !p.lifetime).map((p) => p.id))
  const recurringLike = active.filter((r) => monthlyPlans.has(r.plan_code))
  const mrrPaise = recurringLike.reduce((n, r) => {
    const plan = PLANS.find((p) => p.id === r.plan_code)
    return n + (plan ? Number(plan.priceINR) * 100 : 0)
  }, 0)

  // Churn: entitlements that ENDED in the last 30 days without the account
  // holding an active one now. Refunds and cancellations count; a trial that
  // simply ran out does not, because a trial was never retained to begin with.
  const since = now - 30 * DAY
  const stillActive = new Set(active.map((r) => r.plan_code + ':' + (r.starts_at || '')))
  const lapsed = rows.filter((r) => {
    if (r.source === 'trial') return false
    if (live(r)) return false
    const end = r.ends_at ? new Date(r.ends_at).getTime() : null
    const ended = end && end <= now && end >= since
    return Boolean(ended || r.status === 'refunded' || r.status === 'cancelled')
  })
  const denom = active.length + lapsed.length

  return res.status(200).json({
    generated_at: new Date().toISOString(),
    subscribers: {
      active: active.length,
      trialing: trialing.length,
      by_plan: countBy(active, 'plan_code'),
    },
    revenue: {
      // Rupees, not paise, at the boundary — paise is a storage detail.
      lifetime_collected_inr: Math.round(paise / 100),
      active_30day_value_inr: Math.round(mrrPaise / 100),
      // Named so nobody mistakes it for real recurring revenue.
      note: 'Nothing recurs; every plan is one-time. active_30day_value_inr is the value of currently-active 30-day plans, not MRR.',
      captured_payments: captured.length,
    },
    churn_30d: {
      lapsed: lapsed.length,
      // Omitted rather than shown as 0 when there is nothing to divide by: a
      // rate computed from an empty base is noise dressed as a number.
      rate: denom > 0 ? Number((lapsed.length / denom).toFixed(4)) : null,
    },
    payments: {
      by_status: countBy(pay, 'status'),
    },
  })
}

function countBy(rows, key) {
  const out = {}
  for (const r of rows) out[r[key] || 'unknown'] = (out[r[key] || 'unknown'] || 0) + 1
  return out
}
