// Server-side Supabase, with the SERVICE ROLE key.
//
// THIS KEY BYPASSES ROW LEVEL SECURITY ENTIRELY.
// It is the one credential that can write payment_transactions, user_entitlements
// and webhook_events — tables that deliberately have no INSERT policy, so no
// browser can touch them. It must never get a VITE_ prefix, never be returned in
// a response, and never be logged.
//
// Underscore-prefixed so Vercel does not turn this into an endpoint.
//
// Absent key is a supported state, not a crash: preview deployments run without
// it and the callers return 503 rather than exploding. Same pattern as the
// payments kill switch.
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const isServiceConfigured = Boolean(url && serviceKey)

// No session persistence and no auto-refresh: this runs in a stateless function
// with no user, and a background refresh timer in a serverless invocation is a
// handle that never gets closed.
export const admin = isServiceConfigured
  ? createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

// Resolves the caller's user id from their Supabase access token.
//
// The token comes from the browser, so it is a CLAIM until Supabase validates
// it. getUser() does that server-side against the auth service — it does not
// merely decode the JWT — so a forged or expired token yields null rather than
// a user id we would then attach a payment to.
export async function userFromToken(authHeader) {
  if (!admin) return null
  const token = String(authHeader || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  try {
    const { data, error } = await admin.auth.getUser(token)
    if (error || !data?.user) return null
    return data.user
  } catch {
    return null
  }
}
