// Whether this email is subscribed, and to which domains — so Settings can show
// the real state instead of a toggle that forgets what the server knows.
//
// Reads by EMAIL, which the caller must prove they own: the Supabase access
// token is validated server-side and the address comes from that token, never
// from the query string. Without this the endpoint would tell anyone whether a
// given address is on the list, which is a subscriber-list leak one guess at a
// time.
import { alertsConfigured, rest } from './_alerts.js'
import { getUserFromRequest } from './_supabase.js'

export default async function handler(req, res) {
  if (!alertsConfigured) {
    return res.status(200).json({ configured: false, subscribed: false, domains: [] })
  }

  const user = await getUserFromRequest(req)
  if (!user?.email) {
    return res.status(401).json({ error: 'Sign in to read your alert settings' })
  }

  const { ok, json } = await rest(
    `alert_subscribers?email=eq.${encodeURIComponent(user.email.toLowerCase())}&select=domains`,
  )
  if (!ok) return res.status(502).json({ error: 'Could not read your settings' })

  const row = Array.isArray(json) ? json[0] : null
  return res.status(200).json({
    configured: true,
    subscribed: Boolean(row),
    domains: row?.domains || [],
  })
}
