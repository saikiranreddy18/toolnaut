// Creates a Razorpay order. Step one of Standard Checkout.
//
// The browser sends only a plan id. It does NOT send an amount — see the note
// in _razorpay.js for why that matters more than signature verification does.
//
// The key secret exists here and never leaves. Anything returned by this
// function is visible to the visitor, so the response carries the order id, the
// amount the server decided, and the PUBLIC key id — nothing else.
import Razorpay from 'razorpay'
import {
  planToAmount,
  originAllowed,
  rateLimited,
  clientIp,
  bodyTooLarge,
  credentials,
} from './_razorpay.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  if (bodyTooLarge(req)) return res.status(413).json({ error: 'Request too large' })
  if (!originAllowed(req.headers.origin)) return res.status(403).json({ error: 'Forbidden' })
  if (rateLimited(clientIp(req))) return res.status(429).json({ error: 'Too many requests' })

  const creds = credentials()
  if (!creds) {
    // Deliberately a 503 rather than a 500: nothing is broken, payments are
    // simply not configured on this deployment. Preview builds run without
    // credentials and the UI treats this as "checkout unavailable".
    console.error('razorpay: credentials not configured')
    return res.status(503).json({ error: 'Payments are not configured' })
  }

  const planId = typeof req.body?.planId === 'string' ? req.body.planId : null
  if (!planId) return res.status(400).json({ error: 'planId is required' })

  const priced = planToAmount(planId)
  // One message for both "no such plan" and "plan is not purchasable", so this
  // cannot be used to enumerate internal plan ids.
  if (!priced) return res.status(400).json({ error: 'Unknown plan' })

  try {
    const razorpay = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret })
    const order = await razorpay.orders.create({
      amount: priced.paise,
      currency: priced.currency,
      // Receipts are capped at 40 characters by Razorpay. Plan id plus a
      // timestamp stays well inside that and is enough to find the order again.
      receipt: `tn_${priced.planId}_${Date.now()}`.slice(0, 40),
      notes: { plan: priced.planId },
    })

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: { id: priced.planId, name: priced.name },
      key_id: creds.keyId, // public by design — the browser needs it to open checkout
    })
  } catch (e) {
    // Razorpay signals bad credentials as a 401. Surfacing that distinctly
    // makes a misconfigured deployment obvious instead of looking like an
    // outage, but the visitor still gets no detail.
    const status = e?.statusCode === 401 ? 401 : 500
    console.error('razorpay create-order', e?.statusCode || '', e?.error?.description || e?.message || e)
    return res.status(status).json({
      error: status === 401 ? 'Payment gateway rejected our credentials' : 'Could not create order',
    })
  }
}
