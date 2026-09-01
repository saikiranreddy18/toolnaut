// Razorpay's webhook. THE authoritative record of what was paid.
//
// WHY THIS OUTRANKS THE BROWSER
// /api/verify-payment only runs if the payer's browser survives the redirect.
// Close the tab, lose signal, or have the page crash, and the money has moved
// with nothing written down. This arrives server-to-server and does not care
// what the browser did.
//
// THE RAW BODY MATTERS
// The signature is computed over the exact bytes Razorpay sent. Vercel parses
// JSON by default, and re-serialising a parsed object changes key order and
// whitespace, so the signature would never match. bodyParser is disabled below
// and the stream is read by hand.
//
// IDEMPOTENCY IS NOT OPTIONAL
// Razorpay retries deliveries until it gets a 2xx, so the same event WILL
// arrive more than once. Every event is recorded by its own id under a unique
// constraint; a duplicate loses the insert race and exits without touching
// money. Without that, one payment grants an entitlement twice.
import crypto from 'node:crypto'
import { admin, isServiceConfigured } from './_supabase.js'

// Vercel must not touch the body — see above.
export const config = { api: { bodyParser: false } }

const MAX_BODY_BYTES = 1_000_000

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY_BYTES) { reject(new Error('body too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// Constant-time compare. A plain === leaks, through timing, how much of a
// forged signature was correct.
function signatureValid(rawBody, header, secret) {
  if (!header || !secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(String(header), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// What a payment grants. Kept here rather than in the database so that changing
// what Pro includes is a code review, not a manual UPDATE against production.
function featuresFor(planCode) {
  const base = { stack_updates: true, weekly_digest: true, premium_recommendations: true }
  if (planCode === 'pandava') return { ...base, team_workspace: true, seats: 5 }
  if (planCode === 'guru') return base
  return { stack_updates: true }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !isServiceConfigured) {
    // 503, not 500: nothing is broken, this deployment simply is not wired for
    // webhooks. Razorpay will retry, which is the right behaviour if the
    // secret is added shortly after.
    console.error('webhook: not configured', {
      hasSecret: Boolean(secret), hasServiceRole: isServiceConfigured,
    })
    return res.status(503).json({ error: 'Webhook not configured' })
  }

  let raw
  try {
    raw = await readRawBody(req)
  } catch {
    return res.status(413).json({ error: 'Body too large' })
  }

  // Signature FIRST. Nothing from an unverified payload is parsed, stored or
  // acted on — an attacker who could get us to record their JSON would be
  // halfway to granting themselves a plan.
  if (!signatureValid(raw, req.headers['x-razorpay-signature'], secret)) {
    console.error('webhook: SIGNATURE MISMATCH', {
      event: req.headers['x-razorpay-event-id'] || 'unknown',
    })
    return res.status(400).json({ error: 'Invalid signature' })
  }

  let event
  try {
    event = JSON.parse(raw.toString('utf8'))
  } catch {
    return res.status(400).json({ error: 'Malformed payload' })
  }

  // Razorpay's own delivery id. Falls back to a hash of the body so an event
  // without the header still dedupes rather than being processed every retry.
  const eventId =
    String(req.headers['x-razorpay-event-id'] || '') ||
    crypto.createHash('sha256').update(raw).digest('hex')
  const eventType = event?.event || 'unknown'

  // The unique constraint on razorpay_event_id IS the idempotency lock. Two
  // concurrent deliveries both reach here; exactly one insert succeeds, and the
  // loser stops. Checking-then-inserting would leave a race between the two.
  const { error: insertError } = await admin
    .from('webhook_events')
    .insert({
      razorpay_event_id: eventId,
      event_type: eventType,
      payload: event,
      signature_valid: true,
      processing_status: 'received',
    })

  if (insertError) {
    // 23505 = unique_violation: seen before. Answer 200 so Razorpay stops
    // retrying — a duplicate is a success from its point of view.
    if (insertError.code === '23505') {
      return res.status(200).json({ ok: true, duplicate: true })
    }
    console.error('webhook: could not record event', insertError.message)
    return res.status(500).json({ error: 'Could not record event' })
  }

  try {
    const result = await processEvent(eventType, event)
    await admin.from('webhook_events')
      .update({ processing_status: result.status, processed_at: new Date().toISOString() })
      .eq('razorpay_event_id', eventId)
    return res.status(200).json({ ok: true, ...result })
  } catch (e) {
    console.error('webhook: processing failed', eventType, e?.message || e)
    await admin.from('webhook_events')
      .update({
        processing_status: 'failed',
        error_message: String(e?.message || e).slice(0, 500),
        processed_at: new Date().toISOString(),
      })
      .eq('razorpay_event_id', eventId)
    // 500 so Razorpay retries. The event row already exists, so the retry will
    // dedupe on it — which means a genuinely broken handler needs the row's
    // status cleared by hand rather than retrying forever. That is deliberate:
    // a silent infinite retry is worse than a visible stuck row.
    return res.status(500).json({ error: 'Processing failed' })
  }
}

async function processEvent(eventType, event) {
  const payment = event?.payload?.payment?.entity

  if (eventType === 'payment.captured') {
    if (!payment?.order_id) throw new Error('captured event carried no order_id')

    // The order was created by /api/create-order, so the row already exists and
    // carries the user and the amount WE decided. Matching on order id is what
    // ties Razorpay's view to ours.
    const { data: txn, error } = await admin
      .from('payment_transactions')
      .select('id, user_id, plan_code, amount_paise, currency, status')
      .eq('razorpay_order_id', payment.order_id)
      .maybeSingle()
    if (error) throw new Error(`lookup failed: ${error.message}`)
    if (!txn) {
      // An order we never created. Recorded rather than acted on.
      return { status: 'ignored', reason: 'unknown_order' }
    }

    // Reconcile before granting anything. A captured payment for the wrong
    // amount is not a valid purchase, however well-signed the webhook was.
    if (Number(payment.amount) !== Number(txn.amount_paise) ||
        payment.currency !== txn.currency) {
      await admin.from('payment_transactions')
        .update({ status: 'verification_failed', updated_at: new Date().toISOString() })
        .eq('id', txn.id)
      throw new Error(
        `amount mismatch: razorpay ${payment.amount} ${payment.currency} vs order ${txn.amount_paise} ${txn.currency}`,
      )
    }

    await admin.from('payment_transactions')
      .update({
        status: 'captured',
        razorpay_payment_id: payment.id,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', txn.id)

    // Retire any existing active entitlement before adding the new one: the
    // partial unique index allows exactly one active row per user, so an
    // upgrade would otherwise collide.
    await admin.from('user_entitlements')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('user_id', txn.user_id)
      .eq('status', 'active')

    const { error: entError } = await admin.from('user_entitlements').insert({
      user_id: txn.user_id,
      plan_code: txn.plan_code,
      status: 'active',
      source: 'razorpay_payment',
      payment_transaction_id: txn.id,
      features: featuresFor(txn.plan_code),
    })
    if (entError) throw new Error(`entitlement failed: ${entError.message}`)

    return { status: 'processed', granted: txn.plan_code }
  }

  if (eventType === 'payment.failed') {
    if (payment?.order_id) {
      await admin.from('payment_transactions')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('razorpay_order_id', payment.order_id)
    }
    return { status: 'processed' }
  }

  if (eventType === 'refund.processed') {
    const refund = event?.payload?.refund?.entity
    if (refund?.payment_id) {
      const { data: txn } = await admin
        .from('payment_transactions')
        .select('id, user_id')
        .eq('razorpay_payment_id', refund.payment_id)
        .maybeSingle()
      if (txn) {
        await admin.from('payment_transactions')
          .update({ status: 'refunded', updated_at: new Date().toISOString() })
          .eq('id', txn.id)
        // Access ends with the refund. Leaving it active would mean paying
        // customers and refunded ones are indistinguishable.
        await admin.from('user_entitlements')
          .update({ status: 'refunded', updated_at: new Date().toISOString() })
          .eq('user_id', txn.user_id)
          .eq('status', 'active')
      }
    }
    return { status: 'processed' }
  }

  // Everything else is recorded and acknowledged. Returning 200 for events we
  // do not act on stops Razorpay retrying them forever.
  return { status: 'ignored', reason: 'unhandled_event_type' }
}
