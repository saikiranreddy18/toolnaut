// The daily alert run. Vercel cron hits this (see vercel.json "crons");
// it matches tools the radar discovered recently against each subscriber's
// chosen domains and emails the ones with something genuinely new.
//
// WHY THE SOURCE IS tools.json
// The radar pipeline already publishes its finds to /tools.json on the live
// site (liveCatalog.js reads the same file in the browser). Reading it here
// means the emails and the /new page can never disagree about what "new"
// means — one producer, two consumers.
//
// NO-DUPLICATE GUARANTEE
// Each subscriber row carries last_notified_at. A run only offers a
// subscriber tools discovered AFTER that stamp (never further back than 7
// days), and stamps the row after a successful send. Cron jitter, reruns and
// redeploys therefore cannot re-send the same tool to the same person.
//
// EMAIL PROVIDER
// Resend's REST API over plain fetch — free tier (100/day) and no SDK
// dependency. SEND_CAP stays under that ceiling so one oversized run
// degrades to "the rest go tomorrow" instead of hard 429s.
import { alertsConfigured, rest } from './_alerts.js'

const SITE = process.env.ALERTS_SITE_URL || 'https://toolnaut.xyz'
// Sent from the company address, not resend.dev.
//
// A radar digest arriving from "onboarding@resend.dev" looks like something
// forwarded by a stranger and lands in spam far more often. RESEND_FROM
// overrides this.
//
// ROOT DOMAIN, ON INSTRUCTION. toolnaut.xyz already carries Google Workspace
// MX (smtp.google.com, priority 1), so verifying the root in Resend means both
// live side by side. Resend needs DKIM and SPF TXT records to SEND; its MX
// record is only for bounce feedback, and if one is added it must stay at a
// HIGHER priority number than Google's — priority 1 wins, and inverting that
// would route real company mail away from Workspace. See docs/email-alerts.md.
const FROM = process.env.RESEND_FROM || 'Toolnaut <info@toolnaut.xyz>'
const SEND_CAP = 80
const WINDOW_DAYS = 7
const TOOLS_PER_EMAIL = 10

const DOMAIN_NAMES = {
  code: 'Code & Apps', design: 'Design & Media', writing: 'Words & Content',
  data: 'Data & Insights', automation: 'Automation & Workflows', learning: 'Learning & Teaching',
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

// Deliberately plain, light-background HTML: email clients mangle anything
// clever, and dark-mode inversion mangles it twice.
function buildEmail(tools, token) {
  const rows = tools.map((t) => `
    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
      <strong style="font-size:15px;">${esc(t.name)}</strong>
      <span style="color:#6b7280;font-size:12px;"> — ${esc(DOMAIN_NAMES[t.category] || t.sourceCategory || '')}</span><br>
      <span style="font-size:13px;color:#374151;">${esc(t.blurb || '')}</span><br>
      <a href="${SITE}/app/tools/${encodeURIComponent(t.slug)}" style="font-size:12px;color:#059669;">See it on Toolnaut →</a>
    </td></tr>`).join('')

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
    <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#059669;margin:0;">▸ Fresh from the radar</p>
    <h1 style="font-size:20px;margin:6px 0 2px;">${tools.length} new AI tool${tools.length === 1 ? '' : 's'} for you</h1>
    <p style="font-size:13px;color:#6b7280;margin:0 0 14px;">Discovered by Toolnaut's nightly radar — nothing sponsored, nothing hand-picked.</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p style="font-size:12px;color:#6b7280;margin-top:18px;">
      <a href="${SITE}/new" style="color:#059669;">All new tools</a> ·
      <a href="${SITE}/api/alerts-unsubscribe?token=${encodeURIComponent(token)}" style="color:#9ca3af;">Unsubscribe</a>
    </p>
  </div>`
}

async function sendEmail(key, to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    const body = (await res.text()).slice(0, 400)
    // 403 from Resend almost always means the FROM domain is not verified.
    // Saying so plainly beats leaving a bare status code for someone to
    // decode at 3am when the digest did not go out.
    if (res.status === 403 || /domain/i.test(body)) {
      console.error(
        `resend REJECTED the sender "${FROM}" (${res.status}). The domain is ` +
        `probably not verified in Resend, or RESEND_FROM does not match a ` +
        `verified domain. Nothing was sent. Response: ${body}`,
      )
    } else {
      console.error('resend', res.status, body)
    }
  }
  return res.ok
}

export default async function handler(req, res) {
  // Vercel sends "Authorization: Bearer <CRON_SECRET>" with cron invocations
  // when the env var exists. Without the secret configured the endpoint is
  // closed, not open — anyone finding the URL must not be able to drain the
  // day's email quota.
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!alertsConfigured || !resendKey) {
    return res.status(503).json({ error: 'Alerts are not configured' })
  }

  // 1) What did the radar find lately?
  let tools = []
  try {
    const r = await fetch(`${SITE}/tools.json`, { signal: AbortSignal.timeout(8000) })
    if (r.ok && (r.headers.get('content-type') || '').includes('json')) {
      const data = await r.json()
      tools = Array.isArray(data) ? data : data?.tools || []
    }
  } catch { /* fall through to the empty-run response */ }

  const cutoff = Date.now() - WINDOW_DAYS * 86_400_000
  const fresh = tools
    .filter((t) => t?.slug && t?.name && t?.discoveredAt && new Date(t.discoveredAt).getTime() > cutoff)
    .sort((a, b) => new Date(b.discoveredAt) - new Date(a.discoveredAt))
  if (fresh.length === 0) {
    return res.status(200).json({ ok: true, sent: 0, reason: 'nothing new this window' })
  }

  // 2) Who wants to hear about it?
  const subs = await rest('alert_subscribers?select=id,email,domains,unsubscribe_token,last_notified_at&limit=1000')
  if (!subs.ok || !Array.isArray(subs.json)) {
    console.error('alerts-send subscribers', subs.status, subs.text?.slice(0, 300))
    return res.status(502).json({ error: 'Could not load subscribers' })
  }

  let sent = 0
  let skippedByCap = 0
  for (const sub of subs.json) {
    // never re-send: only tools newer than this subscriber's last alert
    const since = Math.max(cutoff, sub.last_notified_at ? new Date(sub.last_notified_at).getTime() : 0)
    const wants = Array.isArray(sub.domains) && sub.domains.length > 0 ? new Set(sub.domains) : null
    const mine = fresh
      .filter((t) => new Date(t.discoveredAt).getTime() > since)
      .filter((t) => !wants || wants.has(t.category))
      .slice(0, TOOLS_PER_EMAIL)
    if (mine.length === 0) continue

    if (sent >= SEND_CAP) { skippedByCap++; continue }

    const okSend = await sendEmail(
      resendKey,
      sub.email,
      `${mine.length} new AI tool${mine.length === 1 ? '' : 's'} on your radar`,
      buildEmail(mine, sub.unsubscribe_token),
    )
    if (!okSend) continue
    sent++
    // Stamp AFTER the send succeeds — a failed send retries next run.
    await rest(`alert_subscribers?id=eq.${sub.id}`, {
      method: 'PATCH',
      headers: { prefer: 'return=minimal' },
      body: { last_notified_at: new Date().toISOString() },
    })
  }

  // A capped run is not a complete run — say so in the response Vercel logs.
  return res.status(200).json({ ok: true, sent, freshTools: fresh.length, skippedByCap })
}
