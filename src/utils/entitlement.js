import { supabase, isSupabaseConfigured } from './supabase'

// What the client is allowed to believe about a paid plan.
//
// THIS IS DISPLAY LOGIC, NOT ENFORCEMENT.
// The value returned here decides what a person SEES — an upgrade prompt
// versus a manage-billing link. It must never be the thing that decides what
// they can DO. Anything that actually costs money to serve, or exposes paid
// output, has to re-check server-side against public.subscriptions, because
// everything in this file runs on a machine the visitor controls.
//
// The row itself is unforgeable: 0004_subscriptions.sql grants SELECT and
// nothing else, so the browser can read its own subscription and cannot write
// anyone's. That is what makes reading it safe — not this module.
//
// FEATURE-DETECTED, like state/sync.js
// supabase/migrations/0004_subscriptions.sql may not have been applied. Rather
// than every signed-in visitor eating a failed round trip and a console full of
// 42P01s, one call decides per tab whether billing exists at all, and until the
// table is there this reports 'free' and says why.

// unknown | free | active | unavailable
let cached
let inFlight

export const FREE_PLAN = 'free'

// 42P01 is Postgres for "relation does not exist" — the migration has not run.
const MISSING_TABLE = '42P01'

export function resetEntitlementCache() {
  cached = undefined
  inFlight = null
}

// Resolves to { plan, reason }. Never throws: a billing lookup failing must not
// take down a page that works perfectly well for a free user.
export async function loadEntitlement() {
  if (cached !== undefined) return cached
  if (inFlight) return inFlight

  inFlight = (async () => {
    if (!isSupabaseConfigured || !supabase) {
      return { plan: FREE_PLAN, reason: 'supabase-unconfigured' }
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session?.user) {
        return { plan: FREE_PLAN, reason: 'signed-out' }
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, current_period_end, cancel_at_period_end')
        .maybeSingle() // RLS scopes this to the caller's own row

      if (error) {
        if (error.code === MISSING_TABLE) {
          return { plan: FREE_PLAN, reason: 'billing-not-deployed' }
        }
        return { plan: FREE_PLAN, reason: 'lookup-failed' }
      }
      if (!data) return { plan: FREE_PLAN, reason: 'no-subscription' }

      // past_due is still entitled on purpose: the card failed, the person has
      // not cancelled, and locking them out mid-dunning loses both the customer
      // and the recovery. Mirrors has_active_subscription() in the migration.
      const live = ['active', 'trialing', 'past_due'].includes(data.status)
      const notExpired = !data.current_period_end || new Date(data.current_period_end) > new Date()

      return live && notExpired
        ? { plan: 'pro', reason: data.status, cancelAtPeriodEnd: Boolean(data.cancel_at_period_end), renewsAt: data.current_period_end }
        : { plan: FREE_PLAN, reason: data.status || 'inactive' }
    } catch {
      return { plan: FREE_PLAN, reason: 'offline' }
    }
  })()

  cached = await inFlight
  inFlight = null
  return cached
}

// Convenience for UI. Deliberately named to read as a question about display,
// not a permission check.
export async function showsProFeatures() {
  const { plan } = await loadEntitlement()
  return plan === 'pro'
}

// Starts checkout. Returns a URL to redirect to, or null with a reason.
export async function startCheckout() {
  if (!supabase) return { url: null, reason: 'supabase-unconfigured' }
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return { url: null, reason: 'signed-out' }

  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) return { url: null, reason: res.status === 503 ? 'billing-not-configured' : 'checkout-failed' }
  const body = await res.json().catch(() => ({}))
  return { url: body.url || null, reason: body.url ? null : 'no-url' }
}

// Opens Stripe's hosted billing portal — cancellation, invoices, card updates.
export async function openBillingPortal() {
  if (!supabase) return { url: null, reason: 'supabase-unconfigured' }
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return { url: null, reason: 'signed-out' }

  const res = await fetch('/api/portal', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) return { url: null, reason: res.status === 404 ? 'no-billing-account' : 'portal-failed' }
  const body = await res.json().catch(() => ({}))
  return { url: body.url || null, reason: body.url ? null : 'no-url' }
}
