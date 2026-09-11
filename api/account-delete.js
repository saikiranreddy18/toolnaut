// POST /api/account-delete — permanently delete the signed-in account.
//
// Two steps, both for the account in the Supabase token and nobody else:
//   { action: 'request' }         email a six-digit code to the account's address
//   { action: 'confirm', code }   check it, then erase the account
//
// IDENTITY COMES FROM THE TOKEN ONLY. Neither the user id nor the email address
// is ever read from the request body — otherwise anyone could post somebody
// else's address and delete them.
//
// ORDER OF THE ERASE
// 1. delete_account_data() — one database transaction: personal rows gone,
//    payments anonymised (see supabase/migrations/0008_account_deletion.sql).
// 2. The Auth admin API removes the sign-in record.
// Step 1 is idempotent, so if step 2 fails the person can simply run the whole
// flow again. The reverse order could leave personal data behind with no
// account left to delete it from.
import { originAllowed } from './_razorpay.js'
import { rest, getUserFromRequest, supabaseConfigured } from './_supabase.js'
import { sendEmail, mailConfigured } from './_mail.js'
import {
  generateCode, hashCode, checkCode, cooldownLeft,
  CODE_TTL_MS, MAX_ATTEMPTS, REASON_MESSAGES,
} from './_accountDeletion.js'

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPPORT = 'info@toolnaut.xyz'
const TTL_MIN = Math.round(CODE_TTL_MS / 60_000)

// A missing table or function means 0008 has not been applied. Say that,
// rather than a generic failure that sends someone hunting for a code bug.
const notMigrated = (r) =>
  r.status === 404 || /account_deletion_codes|delete_account_data|PGRST20[25]/.test(r.text || '')

function maskEmail(email) {
  const [name, domain] = String(email).split('@')
  if (!domain) return 'your email'
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`
}

function codeEmail(code) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827;">
    <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b91c1c;margin:0;">Account deletion</p>
    <h1 style="font-size:20px;margin:6px 0 12px;">Your code to delete your Toolnaut account</h1>
    <p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:0 0 12px;font-family:ui-monospace,Menlo,Consolas,monospace;">${code}</p>
    <p style="font-size:14px;color:#374151;margin:0 0 8px;">Enter it in Settings to permanently delete your account. It expires in ${TTL_MIN} minutes.</p>
    <p style="font-size:13px;color:#6b7280;margin:0;">If you did not ask for this, ignore this email — nothing happens without the code. You may want to sign out of Toolnaut on devices you do not recognise.</p>
  </div>`
}

function goneEmail() {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827;">
    <h1 style="font-size:20px;margin:0 0 12px;">Your Toolnaut account has been deleted</h1>
    <p style="font-size:14px;color:#374151;margin:0 0 8px;">Your profile, stack, saved tools, roadmap progress and alert settings are gone, and you have been signed out everywhere.</p>
    <p style="font-size:13px;color:#6b7280;margin:0;">Records of past payments are kept without your name, email or phone, because tax law requires it. Questions: ${SUPPORT}</p>
  </div>`
}

async function requestCode(user, res) {
  const existing = await rest(`account_deletion_codes?user_id=eq.${user.id}&select=sent_at`)
  if (!existing.ok) {
    console.error('account-delete read code', existing.status, existing.text?.slice(0, 200))
    return notMigrated(existing)
      ? res.status(503).json({ error: 'Account deletion is not set up on the server yet.' })
      : res.status(502).json({ error: 'Could not start the deletion. Try again in a minute.' })
  }

  const wait = cooldownLeft(Array.isArray(existing.json) ? existing.json[0] : null)
  if (wait > 0) {
    const secs = Math.ceil(wait / 1000)
    res.setHeader('Retry-After', String(secs))
    return res.status(429).json({ error: `A code was just sent. You can ask for another in ${secs} seconds.`, retryAfter: secs })
  }

  const code = generateCode()
  const now = Date.now()
  const saved = await rest('account_deletion_codes?on_conflict=user_id', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: [{
      user_id: user.id,
      code_hash: hashCode(user.id, code, SERVICE_KEY),
      expires_at: new Date(now + CODE_TTL_MS).toISOString(),
      attempts: 0,
      sent_at: new Date(now).toISOString(),
    }],
  })
  if (!saved.ok) {
    console.error('account-delete save code', saved.status, saved.text?.slice(0, 200))
    return res.status(502).json({ error: 'Could not start the deletion. Try again in a minute.' })
  }

  const sent = await sendEmail({
    to: user.email,
    subject: `${code} is your Toolnaut account deletion code`,
    html: codeEmail(code),
    text: `Your code to delete your Toolnaut account: ${code}\nIt expires in ${TTL_MIN} minutes. If you did not ask for this, ignore this email.`,
  })
  if (!sent) {
    // Clear the row so the cooldown does not block an immediate retry of a
    // send that never arrived.
    await rest(`account_deletion_codes?user_id=eq.${user.id}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
    return res.status(502).json({ error: 'We could not send the email. Try again in a minute.' })
  }

  return res.status(200).json({ ok: true, sentTo: maskEmail(user.email), expiresInMinutes: TTL_MIN })
}

async function confirmDeletion(user, input, res) {
  const got = await rest(`account_deletion_codes?user_id=eq.${user.id}&select=code_hash,expires_at,attempts,sent_at`)
  if (!got.ok) {
    console.error('account-delete read code', got.status, got.text?.slice(0, 200))
    return notMigrated(got)
      ? res.status(503).json({ error: 'Account deletion is not set up on the server yet.' })
      : res.status(502).json({ error: 'Could not check the code. Try again in a minute.' })
  }
  const record = Array.isArray(got.json) ? got.json[0] || null : null

  // Refuse dead codes before spending an attempt on them.
  const dead = checkCode(record, input, { userId: user.id, pepper: SERVICE_KEY })
  if (!dead.ok && dead.reason !== 'wrong') {
    return res.status(400).json({ error: REASON_MESSAGES[dead.reason], reason: dead.reason })
  }

  // Claim this attempt BEFORE comparing, conditional on the count we read. Two
  // guesses racing in parallel cannot both use the same attempt, so the total
  // number of guesses per code is bounded by MAX_ATTEMPTS however they arrive.
  const used = record.attempts || 0
  const claim = await rest(`account_deletion_codes?user_id=eq.${user.id}&attempts=eq.${used}`, {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: { attempts: used + 1 },
  })
  if (!claim.ok || !Array.isArray(claim.json) || claim.json.length === 0) {
    return res.status(409).json({ error: 'That did not go through. Try the code again.' })
  }

  const verdict = checkCode(record, input, { userId: user.id, pepper: SERVICE_KEY })
  if (!verdict.ok) {
    const left = Math.max(0, MAX_ATTEMPTS - used - 1)
    const error = left > 0
      ? `${REASON_MESSAGES.wrong} ${left} ${left === 1 ? 'try' : 'tries'} left.`
      : REASON_MESSAGES.locked
    return res.status(400).json({ error, reason: left > 0 ? 'wrong' : 'locked' })
  }

  const erased = await rest('rpc/delete_account_data', {
    method: 'POST',
    body: { p_user_id: user.id, p_email: user.email },
  })
  if (!erased.ok) {
    console.error('account-delete erase', erased.status, erased.text?.slice(0, 300))
    return notMigrated(erased)
      ? res.status(503).json({ error: 'Account deletion is not set up on the server yet. Nothing was deleted.' })
      : res.status(502).json({ error: 'Nothing was deleted — the server could not finish. Try again in a minute.' })
  }

  let authGone = false
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
      signal: AbortSignal.timeout(8000),
    })
    // 404: already gone, which is the outcome we wanted.
    authGone = r.ok || r.status === 404
    if (!authGone) console.error('account-delete auth admin', r.status, (await r.text()).slice(0, 200))
  } catch (e) {
    console.error('account-delete auth admin unreachable', e?.message || e)
  }
  if (!authGone) {
    return res.status(502).json({
      error: `Your data was erased, but your sign-in could not be removed. Ask for a new code and try again, or email ${SUPPORT}.`,
      partial: true,
    })
  }

  // A receipt matters here: it is the only proof they will have that it
  // happened. Its failure must not turn a completed deletion into an error.
  await sendEmail({
    to: user.email,
    subject: 'Your Toolnaut account has been deleted',
    html: goneEmail(),
    text: `Your Toolnaut account has been deleted. Records of past payments are kept without your name, email or phone, because tax law requires it. Questions: ${SUPPORT}`,
  })

  return res.status(200).json({ ok: true, deleted: true })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }
  if (!originAllowed(req.headers.origin)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (!supabaseConfigured || !mailConfigured()) {
    return res.status(503).json({ error: 'Account deletion is not available on this deployment yet.' })
  }

  const user = await getUserFromRequest(req)
  if (!user?.id) {
    return res.status(401).json({ error: 'Sign in again to delete your account.', code: 'auth_required' })
  }
  if (!user.email) {
    return res.status(400).json({ error: `This account has no email address to send a code to. Email ${SUPPORT} to delete it.` })
  }

  const action = req.body?.action
  if (action === 'request') return requestCode(user, res)
  if (action === 'confirm') return confirmDeletion(user, req.body?.code, res)
  return res.status(400).json({ error: 'Unknown action' })
}
