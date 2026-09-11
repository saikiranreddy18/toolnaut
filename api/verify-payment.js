// Verifies a completed payment. Step three of Standard Checkout.
//
// WHAT THIS PROVES AND WHAT IT DOES NOT
// A valid signature proves the payment id genuinely belongs to that order id
// and that the pair came from Razorpay. It does NOT prove the money arrived —
// the browser is the one telling us, and a browser can be scripted.
//
// So this re-fetches the payment from Razorpay and checks the amount, currency
// and status against the order itself. The checkout callback is treated as a
// claim to be checked, never as the record of truth.
//
// For anything with real money behind it the durable record must come from a
// Razorpay WEBHOOK, which arrives server-to-server and does not depend on the
// visitor's browser surviving the redirect. That is noted rather than built:
// this project takes no real payments yet, and there is no orders table to
// write to. See docs/razorpay.md.
import { PLANS } from '../src/utils/planData.js'
import Razorpay from 'razorpay'
import {
  verifyPaymentSignature,
  originAllowed,
  rateLimited,
  clientIp,
  bodyTooLarge,
  credentials,
} from './_razorpay.js'
import { supabaseConfigured, rest, activateEntitlement } from './_supabase.js'

// DELIBERATELY NOT GATED BY PAYMENTS_ENABLED.
//
// The kill switch stops create-order, which is where a new charge begins.
// Blocking verification too would strand anyone whose payment was already in
// flight when payments were switched off: their money has moved, and refusing
// to confirm it produces exactly the "charged with no access" outcome the
// switch exists to prevent. Verification cannot create a charge - it only
// confirms one that already happened - so leaving it open is the safe
// direction.
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
    console.error('razorpay: credentials not configured')
    return res.status(503).json({ error: 'Payments are not configured' })
  }

  const orderId = req.body?.razorpay_order_id
  const paymentId = req.body?.razorpay_payment_id
  const signature = req.body?.razorpay_signature

  if (
    typeof orderId !== 'string' || !orderId ||
    typeof paymentId !== 'string' || !paymentId ||
    typeof signature !== 'string' || !signature
  ) {
    return res.status(400).json({ verified: false, error: 'Missing payment fields' })
  }

  const signatureOk = verifyPaymentSignature({
    orderId, paymentId, signature, secret: creds.keySecret,
  })

  if (!signatureOk) {
    // Logged loudly: a mismatch is either a bug or someone forging a callback,
    // and both are worth seeing. The response says nothing beyond the verdict.
    console.error('razorpay: SIGNATURE MISMATCH', { orderId, paymentId })
    return res.status(400).json({ verified: false, error: 'Signature verification failed' })
  }

  // Signature is good. Now confirm with Razorpay that the payment actually
  // exists, is captured or authorized, and is for the amount the order asked
  // for. A signature alone cannot tell us any of that.
  try {
    const razorpay = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret })
    const [payment, order] = await Promise.all([
      razorpay.payments.fetch(paymentId),
      razorpay.orders.fetch(orderId),
    ])

    const settled = payment?.status === 'captured' || payment?.status === 'authorized'
    const amountMatches = Number(payment?.amount) === Number(order?.amount)
    const currencyMatches = payment?.currency === order?.currency
    const belongsToOrder = payment?.order_id === orderId

    if (!settled || !amountMatches || !currencyMatches || !belongsToOrder) {
      console.error('razorpay: payment did not reconcile', {
        orderId, paymentId, status: payment?.status,
        paymentAmount: payment?.amount, orderAmount: order?.amount,
      })
      return res.status(400).json({ verified: false, error: 'Payment could not be confirmed' })
    }

    // Reconciled. Record it and unlock the plan. The user id comes from the
    // ORDER NOTES — written server-side at create-order — never from this
    // request, so a stolen order/payment/signature triple can only ever
    // activate the account that created the order.
    //
    // Fast path only: the webhook (razorpay-webhook.js) repeats this settle
    // idempotently, so a browser that dies right here still gets its plan.
    let entitlementEndsAt = null
    // Did the plan actually get switched on? verified:true said only "the money
    // moved" — a payer whose entitlement write failed was shown success and
    // given nothing, with no way to tell. This separates the two facts.
    let provisioned = false
    const notesUser = typeof order?.notes?.user_id === 'string' && order.notes.user_id ? order.notes.user_id : null
    const planCode = order?.notes?.plan ?? null
    if (supabaseConfigured && notesUser && planCode) {
      try {
        const upd = await rest(`payment_transactions?razorpay_order_id=eq.${encodeURIComponent(orderId)}`, {
          method: 'PATCH',
          headers: { prefer: 'return=representation' },
          body: {
            status: 'captured',
            razorpay_payment_id: paymentId,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        })
        const txId = Array.isArray(upd.json) ? upd.json[0]?.id : null
        const granted = await activateEntitlement({
          userId: notesUser,
          planCode,
          transactionId: txId,
          periodDays: Boolean(PLANS.find((pl) => pl.id === planCode)?.lifetime) ? null : 30,
        })
        provisioned = Boolean(granted?.ok)
        entitlementEndsAt = granted?.endsAt ?? null
        if (!provisioned) {
          // Loud, because this is money taken for access not given. The webhook
          // will retry, but a silent line here is how it stays unnoticed until
          // the customer writes in.
          console.error('PAID BUT NOT PROVISIONED', { orderId, planCode, userId: notesUser })
        }
      } catch (err) {
        // The payment IS verified; a recording hiccup must not tell the payer
        // it failed. But it must not tell them it succeeded either — provisioned
        // stays false and the webhook settles it on its retry schedule.
        console.error('post-verify recording failed', err?.message || err)
      }
    }

    return res.status(200).json({
      verified: true,
      payment_id: paymentId,
      order_id: orderId,
      amount: order.amount,
      currency: order.currency,
      plan: planCode,
      status: payment.status,
      entitlement_ends_at: entitlementEndsAt,
      // verified = the money moved. provisioned = the plan is switched on.
      // They are different facts and the UI must be able to tell them apart:
      // "paid, unlocking..." is honest where a bare success tick is not.
      provisioned,
    })
  } catch (e) {
    // The signature checked out but Razorpay could not be reached. This is NOT
    // a success — refusing to confirm a payment we could not verify is the
    // safe direction to fail, and the visitor is told to check rather than
    // being told it failed outright.
    console.error('razorpay verify fetch', e?.statusCode || '', e?.error?.description || e?.message || e)
    return res.status(502).json({
      verified: false,
      error: 'Could not confirm the payment with the gateway',
    })
  }
}
