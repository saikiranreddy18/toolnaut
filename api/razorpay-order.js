import Razorpay from 'razorpay'
import { originAllowed } from './chat.js'

// Creates a Razorpay order for the founder offer.
//
// THE AMOUNT IS DECIDED HERE, NOT BY THE BROWSER.
// The obvious shape for this endpoint is to accept { amount } from the client
// and pass it through. That is a hole: anyone with devtools can post
// { amount: 100 } and buy lifetime access for one rupee, and the signature on
// the way back verifies perfectly because the payment really was for a rupee.
// The price is server configuration; the client is told what it will be
// charged, it does not get to say.

const KEY_ID = process.env.RAZORPAY_KEY_ID
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
const CURRENCY = process.env.RAZORPAY_CURRENCY || 'INR'

// Razorpay's own floor is 100 paise. Ours is the founder price.
const MIN_PAISE = 100
const AMOUNT_PAISE = Number(process.env.RAZORPAY_AMOUNT_PAISE) || 0

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!originAllowed(req.headers.origin)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  // Unconfigured is not an error the visitor should see as a crash — previews
  // and local dev run without keys, same as api/chat.js without its key.
  if (!KEY_ID || !KEY_SECRET) {
    return res.status(503).json({ error: 'Payments not configured' })
  }
  if (!Number.isFinite(AMOUNT_PAISE) || AMOUNT_PAISE < MIN_PAISE) {
    // A misconfigured price is our bug, not the visitor's. Fail loudly in logs,
    // quietly to them.
    console.error('razorpay-order: RAZORPAY_AMOUNT_PAISE missing or below the 100 paise floor')
    return res.status(503).json({ error: 'Payments not configured' })
  }

  try {
    const rzp = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET })
    const order = await rzp.orders.create({
      amount: AMOUNT_PAISE,
      currency: CURRENCY,
      // Receipts are capped at 40 chars by Razorpay.
      receipt: `founder_${Date.now()}`.slice(0, 40),
      notes: { offer: 'founder-lifetime' },
    })

    // Only what the browser needs to open the modal. The key id is public by
    // design; the secret never leaves this function.
    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: KEY_ID,
    })
  } catch (err) {
    // Razorpay returns 401 for bad credentials. Surfacing that distinctly makes
    // a key typo diagnosable instead of looking like an outage.
    const status = err?.statusCode === 401 ? 401 : 500
    console.error('razorpay-order: failed', err?.error?.description || err?.message)
    return res.status(status).json({
      error: status === 401 ? 'Payment auth failed' : 'Could not create order',
    })
  }
}
