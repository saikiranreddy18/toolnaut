// Razorpay webhook — the durable half of the payment record.
//
// The checkout callback (verify-payment.js) answers the person while they
// wait; THIS is the source of truth, because it arrives server-to-server and
// does not care whether the payer's browser survived the redirect. Configure
// it in Razorpay Dashboard -> Account & Settings -> Webhooks, pointed at
// https://toolnaut.xyz/api/razorpay-webhook with RAZORPAY_WEBHOOK_SECRET,
// subscribed to payment.captured, payment.failed and refund.processed.
//
// SECURITY MODEL
// - The signature is HMAC-SHA256 over the RAW bytes, so body parsing is
//   disabled and the stream is read by hand — a re-serialised JSON body would
//   never verify.
// - Idempotent by construction: the event id is inserted first with
//   on-conflict-do-nothing; only the request that lands the row processes the
//   event, so Razorpay's retries and duplicates are no-ops.
// - The user comes from the order notes written by create-order, never from
//   the payload's own claims about who to upgrade.
import { PLANS } from '../src/utils/planData.js'
import {
  supabaseConfigured,
  rest,
  activateEntitlement,
  verifyWebhookSignature,
} from './_supabase.js'

export const config = { api: { bodyParser: false } }

const MAX_BODY = 100_000 // Razorpay events are a few KB; anything huge is not one

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) { req.destroy(); reject(new Error('body too large')); return }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim()
  if (!secret || !supabaseConfigured) {
    // Unconfigured is closed, not open — same direction as the kill switch.
    return res.status(503).json({ error: 'Webhook not configured' })
  }

  let raw
  try { raw = await readRawBody(req) } catch { return res.status(413).json({ error: 'Too large' }) }

  if (!verifyWebhookSignature(raw, req.headers['x-razorpay-signature'], secret)) {
    console.error('razorpay webhook: SIGNATURE MISMATCH')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  let event
  try { event = JSON.parse(raw) } catch { return res.status(400).json({ error: 'Bad JSON' }) }

  // x-razorpay-event-id uniquely identifies a delivery's event; fall back to
  // payload identity for older event shapes.
  const eventId = String(req.headers['x-razorpay-event-id'] || '').slice(0, 128) ||
    `${event?.event}_${event?.payload?.payment?.entity?.id || ''}_${event?.created_at || ''}`
  const eventType = String(event?.event || 'unknown').slice(0, 64)

  // Claim the event. A duplicate delivery loses the insert and returns 200
  // immediately — Razorpay just needs to hear "received", not our life story.
  const claim = await rest('webhook_events?on_conflict=razorpay_event_id', {
    method: 'POST',
    headers: { prefer: 'resolution=ignore-duplicates,return=representation' },
    body: [{ razorpay_event_id: eventId, event_type: eventType, payload: event }],
  })
  const claimed = claim.ok && Array.isArray(claim.json) && claim.json.length > 0
  if (!claimed) return res.status(200).json({ ok: true, duplicate: true })

  const finish = async (status, error) => {
    await rest(`webhook_events?razorpay_event_id=eq.${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      headers: { prefer: 'return=minimal' },
      body: { processing_status: status, error_message: error || null, processed_at: new Date().toISOString() },
    })
  }

  try {
    const payment = event?.payload?.payment?.entity
    const orderId = payment?.order_id || null
    const stamp = new Date().toISOString()

    if (eventType === 'payment.captured' && orderId) {
      const upd = await rest(`payment_transactions?razorpay_order_id=eq.${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { prefer: 'return=representation' },
        body: { status: 'captured', razorpay_payment_id: payment.id, paid_at: stamp, updated_at: stamp },
      })
      const tx = Array.isArray(upd.json) ? upd.json[0] : null
      // Notes travel on the payment entity too; prefer our own row, fall back
      // to the notes create-order wrote on the order.
      const userId = tx?.user_id || (typeof payment?.notes?.user_id === 'string' && payment.notes.user_id) || null
      const planCode = tx?.plan_code || payment?.notes?.plan || null
      if (userId && planCode) {
        // Lifetime comes from PLANS, the same list the pricing page renders, so
        // the promise on the page and the grant in the database cannot diverge.
        const lifetime = Boolean(PLANS.find((pl) => pl.id === planCode)?.lifetime)
        await activateEntitlement({
          userId, planCode, transactionId: tx?.id || null,
          periodDays: lifetime ? null : 30,
        })
      } else {
        console.error('webhook captured but no user/plan to activate', { orderId })
      }
    } else if (eventType === 'payment.failed' && orderId) {
      await rest(`payment_transactions?razorpay_order_id=eq.${encodeURIComponent(orderId)}&status=not.eq.captured`, {
        method: 'PATCH',
        headers: { prefer: 'return=minimal' },
        body: { status: 'failed', updated_at: stamp },
      })
    } else if (eventType === 'refund.processed') {
      const refPaymentId = event?.payload?.refund?.entity?.payment_id
      if (refPaymentId) {
        const upd = await rest(`payment_transactions?razorpay_payment_id=eq.${encodeURIComponent(refPaymentId)}`, {
          method: 'PATCH',
          headers: { prefer: 'return=representation' },
          body: { status: 'refunded', updated_at: stamp },
        })
        const tx = Array.isArray(upd.json) ? upd.json[0] : null
        if (tx?.user_id) {
          // 'refunded', NOT 'revoked'. The status check constraint allows
          // active/expired/cancelled/refunded, so 'revoked' was rejected with a
          // constraint violation on every refund — and because the result was
          // never inspected, the webhook reported success while the refunded
          // customer kept their paid access indefinitely.
          //
          // Scoped to the active row too: an unfiltered PATCH would rewrite
          // every historical row for this user, and those rows are the audit
          // trail of what they were entitled to and when.
          const rev = await rest(
            `user_entitlements?user_id=eq.${tx.user_id}&status=eq.active`,
            {
              method: 'PATCH',
              headers: { prefer: 'return=minimal' },
              body: { status: 'refunded', updated_at: stamp },
            },
          )
          // Raise rather than log. A refund that does not remove access is the
          // one failure here that costs real money every day it goes unnoticed,
          // so it must retry and stay visible instead of reporting success.
          if (!rev.ok) {
            throw new Error(`refund did not revoke access: ${rev.status} ${(rev.text || '').slice(0, 200)}`)
          }
        }
      }
    }
    // Every other subscribed-by-accident event type is recorded and skipped.

    await finish('processed')
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('webhook processing', e?.message || e)
    await finish('error', String(e?.message || e).slice(0, 300))
    // 500 so Razorpay retries — the event row keeps retries idempotent... but
    // it was claimed, so flip it back to let the retry through.
    await rest(`webhook_events?razorpay_event_id=eq.${encodeURIComponent(eventId)}`, {
      method: 'DELETE', headers: { prefer: 'return=minimal' },
    })
    return res.status(500).json({ error: 'Processing failed' })
  }
}
