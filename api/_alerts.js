// Shared plumbing for the email-alerts endpoints (underscore file = helper,
// not a route — same convention as _razorpay.js).
//
// STORAGE MODEL
// One Supabase table, alert_subscribers (see supabase/alert_subscribers.sql).
// RLS is enabled with NO anon policies, so the browser's anon key cannot read
// the subscriber list — only these serverless functions can, through the
// service-role key, which exists nowhere but Vercel env vars.
//
// The table is reached over PostgREST with plain fetch rather than
// @supabase/supabase-js: these functions each make one or two simple calls,
// and the codebase's serverless style (chat.js, _razorpay.js) is fetch.

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export const alertsConfigured = Boolean(SUPABASE_URL && SERVICE_KEY)

// The six galaxy domains from quizLogic.js — the only values a subscriber's
// interest list may contain. An empty list means "all domains".
export const DOMAIN_KEYS = new Set(['code', 'design', 'writing', 'data', 'automation', 'learning'])

// Practical length cap + shape check. Real validation is the email arriving.
export function validEmail(email) {
  return (
    typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  )
}

export async function rest(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-JSON error body */ }
  return { ok: res.ok, status: res.status, json, text }
}
