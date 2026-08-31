// Shared billing plumbing for the three Stripe endpoints.
//
// Nothing here runs in the browser. Every secret below is read from
// process.env WITHOUT a VITE_ prefix on purpose: Vite inlines any VITE_*
// variable into the client bundle at build time, so a STRIPE_SECRET_KEY named
// that way would ship to every visitor. The Supabase anon key is safe in the
// browser and these are not.

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Every one of these is optional at import time. A missing key must not crash
// the function on cold start — the handlers turn it into a clean 503 so the
// app keeps working without billing configured, the same way api/chat.js
// degrades when FEATHERLESS_API_KEY is absent.
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

export const billingConfigured = Boolean(STRIPE_SECRET && SUPABASE_URL && SERVICE_ROLE)

export const stripe = STRIPE_SECRET
  ? new Stripe(STRIPE_SECRET, { apiVersion: '2024-06-20' })
  : null

// Service-role client. Bypasses RLS, so it is the only thing allowed to write
// public.subscriptions — and it must never be handed a value that came from a
// browser without verification first.
export const admin = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null

export const webhookSecret = WEBHOOK_SECRET

// Reads the request body as raw bytes.
//
// THIS IS THE WHOLE REASON THE WEBHOOK VERIFIES.
// Stripe signs the exact bytes it sent. Vercel's Node runtime parses JSON
// bodies by default, and a parsed-then-restringified body differs from the
// original by key order and whitespace, so constructEvent fails every time
// with a signature error that looks like a wrong secret. The webhook route
// therefore sets `export const config = { api: { bodyParser: false } }` and
// calls this instead of touching req.body.
export function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      // Stripe events are small; anything this large is not one of ours.
      if (size > 1_000_000) {
        reject(Object.assign(new Error('body too large'), { statusCode: 413 }))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// Resolves the caller to a real Supabase user from their bearer token.
//
// The user id is NEVER taken from the request body. A checkout that trusted a
// client-supplied id would let anyone attach a subscription to someone else's
// account, or to an account that does not exist.
export async function userFromRequest(req) {
  if (!admin) return null
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

// Maps a Stripe subscription object onto our row shape.
export function subscriptionRow(sub, userId, eventCreated) {
  return {
    user_id: userId,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
    stripe_subscription_id: sub.id,
    status: sub.status,
    price_id: sub.items?.data?.[0]?.price?.id ?? null,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    event_created: eventCreated ? new Date(eventCreated * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }
}

// Writes a subscription row, refusing to apply an event older than the one
// already stored. Stripe does not guarantee delivery order, and without this a
// late "customer.subscription.updated" can undo a "deleted" that already
// arrived — silently restoring access to someone who cancelled.
export async function upsertSubscription(row) {
  const { data: existing } = await admin
    .from('subscriptions')
    .select('event_created')
    .eq('user_id', row.user_id)
    .maybeSingle()

  if (existing?.event_created && row.event_created && new Date(row.event_created) < new Date(existing.event_created)) {
    return { skipped: 'stale-event' }
  }

  const { error } = await admin.from('subscriptions').upsert(row, { onConflict: 'user_id' })
  if (error) throw error
  return { ok: true }
}
