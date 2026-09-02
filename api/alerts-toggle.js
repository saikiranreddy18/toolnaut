// Turn tool alerts on or off for the signed-in account.
//
// The address is taken from the validated Supabase token, never from the
// request body — otherwise anyone could subscribe (or silently UNsubscribe)
// somebody else by posting their address.
//
// Off means the row is deleted, not flagged. A subscriber list is a list of
// email addresses, and "no longer subscribed" is the one state where not
// holding the address is strictly better than holding it.
import { alertsConfigured, DOMAIN_KEYS, rest } from './_alerts.js'
import { getUserFromRequest } from './_supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!alertsConfigured) {
    return res.status(503).json({ error: 'Alerts are not configured yet' })
  }

  const user = await getUserFromRequest(req)
  if (!user?.email) {
    return res.status(401).json({ error: 'Sign in to change your alert settings' })
  }
  const email = user.email.toLowerCase()

  const enabled = req.body?.enabled === true
  // Unknown keys are dropped rather than rejected, matching alerts-subscribe:
  // a stale client after a domain rename should still work, just narrower.
  const domains = Array.isArray(req.body?.domains)
    ? [...new Set(req.body.domains.filter((d) => DOMAIN_KEYS.has(d)))].slice(0, 6)
    : []

  if (!enabled) {
    const del = await rest(`alert_subscribers?email=eq.${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: { prefer: 'return=minimal' },
    })
    if (!del.ok) {
      console.error('alerts-toggle delete', del.status, del.text?.slice(0, 200))
      return res.status(502).json({ error: 'Could not turn alerts off' })
    }
    return res.status(200).json({ ok: true, subscribed: false, domains: [] })
  }

  const up = await rest('alert_subscribers?on_conflict=email', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: [{ email, domains }],
  })
  if (!up.ok) {
    console.error('alerts-toggle upsert', up.status, up.text?.slice(0, 200))
    return res.status(502).json({ error: 'Could not turn alerts on' })
  }
  return res.status(200).json({ ok: true, subscribed: true, domains })
}
