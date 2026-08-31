import { admin, billingConfigured, stripe, userFromRequest } from './_billing.js'
import { originAllowed } from './chat.js'

// Starts a Stripe Checkout session for the signed-in user.
//
// The user id comes from a VERIFIED Supabase token, never from the request
// body. A checkout that trusted a client-supplied id would let anyone attach a
// paid subscription to another person's account.

const PRICE_ID = process.env.STRIPE_PRICE_ID

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!originAllowed(req.headers.origin)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (!billingConfigured || !PRICE_ID) {
    return res.status(503).json({ error: 'Billing not configured' })
  }

  const user = await userFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Sign in required' })

  try {
    // Reuse the Stripe customer if this person has subscribed before, so the
    // billing portal shows one history rather than a new customer per attempt.
    const { data: existing } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const origin = req.headers.origin || 'https://toolnaut.xyz'
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      // The webhook reads this to know whose subscription this is.
      client_reference_id: user.id,
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: user.email }),
      success_url: `${origin}/app/settings?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('checkout: failed', err?.message)
    return res.status(500).json({ error: 'Could not start checkout' })
  }
}
