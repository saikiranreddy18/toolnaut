// /api/alerts — the signed-in account's new-tool alert settings.
//   GET   whether this account is subscribed, and to which domains
//   POST  { enabled, domains } — turn alerts on or off
//
// ONE FUNCTION, NOT TWO. This was alerts-status.js and alerts-toggle.js.
// Vercel's Hobby plan caps a deployment at twelve functions, the project was
// at exactly twelve, and account deletion needed a slot. vercel.json rewrites
// both old paths here, so a browser still running an older bundle keeps
// working.
//
// THE ADDRESS COMES FROM THE VALIDATED TOKEN, NEVER THE REQUEST. Reading by an
// email the caller has proved they own stops this from confirming to anyone
// whether an address is on the list; writing by it stops anyone subscribing —
// or silently unsubscribing — somebody else.
//
// Off means the row is deleted, not flagged. A subscriber list is a list of
// email addresses, and "no longer subscribed" is the one state where not
// holding the address is strictly better than holding it.
import { alertsConfigured, DOMAIN_KEYS, rest } from './_alerts.js'
import { getUserFromRequest } from './_supabase.js'

async function readSettings(email, res) {
  const { ok, json } = await rest(
    `alert_subscribers?email=eq.${encodeURIComponent(email)}&select=domains`,
  )
  if (!ok) return res.status(502).json({ error: 'Could not read your settings' })

  const row = Array.isArray(json) ? json[0] : null
  return res.status(200).json({
    configured: true,
    subscribed: Boolean(row),
    domains: row?.domains || [],
  })
}

async function writeSettings(email, body, res) {
  const enabled = body?.enabled === true
  // Unknown keys are dropped rather than rejected, matching alerts-subscribe:
  // a stale client after a domain rename should still work, just narrower.
  const domains = Array.isArray(body?.domains)
    ? [...new Set(body.domains.filter((d) => DOMAIN_KEYS.has(d)))].slice(0, 6)
    : []

  if (!enabled) {
    const del = await rest(`alert_subscribers?email=eq.${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: { prefer: 'return=minimal' },
    })
    if (!del.ok) {
      console.error('alerts delete', del.status, del.text?.slice(0, 200))
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
    console.error('alerts upsert', up.status, up.text?.slice(0, 200))
    return res.status(502).json({ error: 'Could not turn alerts on' })
  }
  return res.status(200).json({ ok: true, subscribed: true, domains })
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Honest unconfigured state: Settings explains it rather than showing a
    // switch that silently does nothing.
    if (!alertsConfigured) {
      return res.status(200).json({ configured: false, subscribed: false, domains: [] })
    }
    const user = await getUserFromRequest(req)
    if (!user?.email) {
      return res.status(401).json({ error: 'Sign in to read your alert settings' })
    }
    return readSettings(user.email.toLowerCase(), res)
  }

  if (req.method === 'POST') {
    if (!alertsConfigured) {
      return res.status(503).json({ error: 'Alerts are not configured yet' })
    }
    const user = await getUserFromRequest(req)
    if (!user?.email) {
      return res.status(401).json({ error: 'Sign in to change your alert settings' })
    }
    return writeSettings(user.email.toLowerCase(), req.body, res)
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'GET or POST only' })
}
