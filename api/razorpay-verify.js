import crypto from 'node:crypto'
import { originAllowed } from './chat.js'

// Verifies that a payment really happened, and really was for this order.
//
// This is the only thing standing between "the browser said it paid" and
// actually granting anything. The browser's success callback is not evidence:
// it is a value in a page the visitor controls. The signature is evidence,
// because only Razorpay and this server know KEY_SECRET.

const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET

// Constant-time compare. A plain === leaks, through timing, how many leading
// characters of a forged signature were correct, which is enough to build one
// byte at a time. The cost of doing it properly is one function call.
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a), 'utf8')
  const bufB = Buffer.from(String(b), 'utf8')
  // timingSafeEqual throws on length mismatch, so compare lengths first — that
  // much is not secret, since the signature length is fixed and public.
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!originAllowed(req.headers.origin)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (!KEY_SECRET) {
    return res.status(503).json({ error: 'Payments not configured' })
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {}
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment fields', verified: false })
  }

  // Razorpay's documented algorithm: HMAC-SHA256 of "order_id|payment_id",
  // keyed with the secret.
  const expected = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (!safeEqual(expected, razorpay_signature)) {
    // 400 and nothing granted. A mismatch is either tampering or a bug; either
    // way this payment does not count.
    console.error('razorpay-verify: signature mismatch for order', razorpay_order_id)
    return res.status(400).json({ error: 'Signature verification failed', verified: false })
  }

  // Verified. NOTE FOR WHOEVER GRANTS ACCESS NEXT:
  // this endpoint proves the payment is genuine, and nothing more. It does not
  // record anything, because master has no applied migrations to record into —
  // supabase/migrations 0001-0003 are unapplied in production, so there is no
  // durable place to write "this person paid". Until that exists, a paid user
  // who clears their browser has no way to prove it. Wire entitlement here once
  // the tables are live; do not grant from client state.
  return res.status(200).json({
    verified: true,
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
  })
}
