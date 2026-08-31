import { admin, billingConfigured, rawBody, stripe, subscriptionRow, upsertSubscription, webhookSecret } from './_billing.js'

// The only writer of public.subscriptions.
//
// Everything paid hangs off this endpoint being correct, so it does the
// smallest possible number of things: verify the signature, translate the
// event, write the row. No business logic, no email, no analytics — those can
// be added later without risking the one guarantee this file makes.

// Stripe signs raw bytes. Vercel parses JSON bodies by default, and a parsed
// body re-serialised is not byte-identical, so verification would fail on every
// single event with an error that reads like a bad secret. Off it goes.
export const config = { api: { bodyParser: false } }

// Events we act on. Anything else is acknowledged with 200 and ignored —
// returning an error for an event we simply do not care about makes Stripe
// retry it for days and eventually disable the endpoint.
const HANDLED = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!billingConfigured || !webhookSecret) {
    // Billing is not set up on this deployment. Say so plainly rather than
    // 500ing — previews and local dev run without Stripe keys.
    return res.status(503).json({ error: 'Billing not configured' })
  }

  let event
  try {
    const body = await rawBody(req)
    event = stripe.webhooks.constructEvent(body, req.headers['stripe-signature'], webhookSecret)
  } catch (err) {
    // A failed signature is either an attacker or a misconfigured secret.
    // Neither deserves detail in the response.
    if (err?.statusCode === 413) return res.status(413).json({ error: 'Request too large' })
    console.error('stripe-webhook: signature verification failed')
    return res.status(400).json({ error: 'Invalid signature' })
  }

  if (!HANDLED.has(event.type)) return res.status(200).json({ received: true, ignored: event.type })

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      // client_reference_id is set by api/checkout.js from a VERIFIED token —
      // it is not something the browser can choose.
      const userId = session.client_reference_id
      if (!userId || !session.subscription) {
        return res.status(200).json({ received: true, ignored: 'no-subscription' })
      }
      const sub = await stripe.subscriptions.retrieve(session.subscription)
      await upsertSubscription(subscriptionRow(sub, userId, event.created))
      return res.status(200).json({ received: true })
    }

    // The subscription lifecycle events carry a customer, not our user id, so
    // the row is found by the customer id written at checkout. If we have never
    // seen that customer, there is nothing to update and inventing a row would
    // be worse than dropping the event.
    const sub = event.data.object
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
    const { data: existing } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()

    if (!existing?.user_id) {
      return res.status(200).json({ received: true, ignored: 'unknown-customer' })
    }

    const row = subscriptionRow(sub, existing.user_id, event.created)
    // A deleted subscription is recorded as canceled rather than removed: the
    // row is the audit trail for "this person used to pay", which support and
    // win-back both need.
    if (event.type === 'customer.subscription.deleted') row.status = 'canceled'
    await upsertSubscription(row)
    return res.status(200).json({ received: true })
  } catch (err) {
    // Return 500 so Stripe retries — a dropped write here means someone paid
    // and did not get access.
    console.error('stripe-webhook: handler failed', err?.message)
    return res.status(500).json({ error: 'Handler failed' })
  }
}
