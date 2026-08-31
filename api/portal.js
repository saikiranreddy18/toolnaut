import { admin, billingConfigured, stripe, userFromRequest } from './_billing.js'
import { originAllowed } from './chat.js'

// Stripe's hosted billing portal.
//
// Worth having for one reason above all: it provides cancellation, invoice
// history and card updates without a line of UI from us. Three of the audit's
// paid-launch blockers close with this single call, and a self-built version
// would be worse at all three.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!originAllowed(req.headers.origin)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (!billingConfigured) {
    return res.status(503).json({ error: 'Billing not configured' })
  }

  const user = await userFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Sign in required' })

  const { data } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  // No customer means this person has never checked out. That is not an error
  // worth a 500 — the UI should simply not be offering them a billing portal.
  if (!data?.stripe_customer_id) {
    return res.status(404).json({ error: 'No billing account' })
  }

  try {
    const origin = req.headers.origin || 'https://toolnaut.xyz'
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${origin}/app/settings`,
    })
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('portal: failed', err?.message)
    return res.status(500).json({ error: 'Could not open billing portal' })
  }
}
