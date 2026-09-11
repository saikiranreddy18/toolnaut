// Email through Resend's REST API (underscore file = helper, not a route).
// Shared by the daily alert digest and the account-deletion code, so both go
// out from the same verified sender and both name a rejected sender the same
// way in the logs. Plain fetch, no SDK — same style as _alerts.js.
//
// SENT FROM THE COMPANY ADDRESS, NOT resend.dev
// Mail from "onboarding@resend.dev" looks forwarded by a stranger and lands in
// spam far more often. RESEND_FROM overrides this.
//
// ROOT DOMAIN, ON INSTRUCTION. toolnaut.xyz already carries Google Workspace
// MX (smtp.google.com, priority 1), so verifying the root in Resend means both
// live side by side. Resend needs DKIM and SPF TXT records to SEND; its MX
// record is only for bounce feedback, and if one is added it must stay at a
// HIGHER priority number than Google's — priority 1 wins, and inverting that
// would route real company mail away from Workspace. See docs/email-alerts.md.
const FROM = process.env.RESEND_FROM || 'Toolnaut <info@toolnaut.xyz>'

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY)
}

// Returns true only when Resend accepted the message. Never throws: a timeout
// used to escape the digest loop and abort the run for every subscriber after
// the one that hung.
export async function sendEmail({ to, subject, html, text, headers }) {
  const key = process.env.RESEND_API_KEY
  if (!key) return false

  let res
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject,
        html,
        ...(text ? { text } : {}),
        ...(headers ? { headers } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (e) {
    console.error('resend unreachable:', e?.name || '', e?.message || e)
    return false
  }

  if (!res.ok) {
    const body = (await res.text()).slice(0, 400)
    // 403 from Resend almost always means the FROM domain is not verified.
    // Saying so plainly beats leaving a bare status code for someone to decode
    // at 3am when the mail did not go out.
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
