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
  credentialShapeProblem,
  paymentsEnabled,
} from './_razorpay.js'
import { admin, isServiceConfigured, userFromToken } from './_supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  if (bodyTooLarge(req)) return res.status(413).json({ error: 'Request too large' })
  if (!originAllowed(req.headers.origin)) return res.status(403).json({ error: 'Forbidden' })
  if (rateLimited(clientIp(req))) return res.status(429).json({ error: 'Too many requests' })

  // Refused BEFORE credentials are even read: no order can be created, so no
  // new charge can begin, whatever the browser sends. Hiding the button is not
  // enough - anyone can POST here directly.
  if (!paymentsEnabled()) {
    return res.status(503).json({
      error: 'Payments are not available yet. Toolnaut Pro is currently in early access.',
    })
  }

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

  // SIGN-IN IS REQUIRED TO PAY.
  // payment_transactions.user_id is NOT NULL, and rightly so: an anonymous
  // payment cannot be attributed to anyone, cannot grant access, and cannot be
  // supported when the payer writes in asking where their plan went. The token
  // is validated against Supabase rather than merely decoded, so a forged JWT
  // yields no user.
  if (!isServiceConfigured) {
    console.error('create-order: service role not configured, cannot record orders')
    return res.status(503).json({ error: 'Payments are not configured' })
  }
  const user = await userFromToken(req.headers.authorization)
  if (!user) {
    return res.status(401).json({
      error: 'Please sign in before paying, so we can attach the plan to your account.',
      code: 'auth_required',
    })
  }

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

    // Recorded BEFORE the modal opens, so an abandoned checkout is still
    // visible and the webhook has a row to match its order id against. If this
    // fails the order is abandoned rather than opened: a payment we cannot
    // record is exactly the situation this whole pipeline exists to prevent.
    const { error: txnError } = await admin.from('payment_transactions').insert({
      user_id: user.id,
      plan_code: priced.planId,
      amount_paise: priced.paise,
      currency: priced.currency,
      status: 'created',
      razorpay_order_id: order.id,
      metadata: { receipt: order.receipt },
    })
    if (txnError) {
      console.error('create-order: could not record transaction', txnError.message)
      return res.status(500).json({ error: 'Could not start checkout' })
    }

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
    const detail = e?.error?.description || e?.message || String(e)
    console.error('razorpay create-order', e?.statusCode || '', detail)

    if (status === 401) {
      // A 401 has several causes that look identical from the outside, and
      // guessing between them wastes hours. Report the mode and any shape
      // problem - neither reveals a credential - so the next step is obvious.
      const shape = credentialShapeProblem(
        process.env.RAZORPAY_KEY_ID || '',
        process.env.RAZORPAY_KEY_SECRET || '',
      )
      console.error('razorpay auth diagnostics', {
        mode: creds.mode || 'unrecognised',
        shape: shape || 'looks well-formed',
        hint: creds.mode === 'live'
          ? 'live keys only work once Razorpay has activated the account (KYC complete)'
          : 'check the id and secret are from the SAME key pair',
      })
      return res.status(401).json({
        error: 'Payment gateway rejected our credentials',
        mode: creds.mode || 'unrecognised',
        reason: shape || 'rejected_by_gateway',
      })
    }

    return res.status(500).json({ error: 'Could not create order' })
  }
}
