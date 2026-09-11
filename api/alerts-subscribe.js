// POST { email, domains?: string[] } — opt a visitor into new-tool email
// alerts. Public endpoint, so it gets the same defences as chat.js: origin
// allowlist, per-IP rate limit, size caps, and it validates everything before
// it touches storage.
//
// Upsert on email: re-subscribing with a different domain selection replaces
// the old one, and re-subscribing while unsubscribed simply re-creates the
// row. No confirmation-email dance for the MVP — the unsubscribe link in
// every alert is the safety valve.
import { originAllowed } from './chat.js'
import { alertsConfigured, DOMAIN_KEYS, validEmail, rest } from './_alerts.js'

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5 // nobody legitimately subscribes 6 times a minute
const hits = new Map()
function rateLimited(ip) {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  if (list.length >= MAX_PER_WINDOW) { hits.set(ip, list); return true }
  list.push(now)
  hits.set(ip, list)
  if (hits.size > 5000) hits.clear()
  return false
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!originAllowed(req.headers.origin)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (rateLimited(ip)) {
    res.setHeader('Retry-After', '60')
    return res.status(429).json({ error: 'Too many requests' })
  }

  // Honest unconfigured state, mirroring supabase.js: without env vars the
  // feature is off and the UI says so — it never fakes a subscription.
  if (!alertsConfigured) {
    return res.status(503).json({ error: 'Alerts are not configured yet' })
  }

  const { email, domains } = req.body || {}
  if (!validEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email' })
  }
  // Unknown keys are dropped rather than rejected — a stale client after a
  // domain rename should still subscribe, just with narrower interests.
  const cleanDomains = Array.isArray(domains)
    ? [...new Set(domains.filter((d) => DOMAIN_KEYS.has(d)))].slice(0, 6)
    : []

  const { ok, status, text } = await rest('alert_subscribers?on_conflict=email', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: [{ email: email.trim().toLowerCase(), domains: cleanDomains }],
  })

  if (!ok) {
    console.error('alerts-subscribe upsert', status, text?.slice(0, 300))
    return res.status(502).json({ error: 'Could not save your subscription' })
  }
  return res.status(200).json({ ok: true })
}
