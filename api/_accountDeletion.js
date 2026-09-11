// The one-time code that confirms an account deletion (underscore file =
// helper, not a route). Pure functions only, so every rule here is tested
// without a database or a mail provider.
//
// WHY A CODE BY EMAIL, AND NOT JUST "ARE YOU SURE?"
// Deletion is permanent and cannot be undone by support. A confirm button
// proves only that someone is holding an unlocked browser with a live session.
// A code sent to the account's address proves they also control that inbox —
// the same thing it took to create the account in the first place.
//
// THE CODE IS NEVER STORED
// Only an HMAC of it, bound to the user id and keyed with a server-only secret.
// A leaked row reveals nothing usable, and a code issued to one account can
// never confirm the deletion of another.
import crypto from 'node:crypto'

export const CODE_TTL_MS = 10 * 60_000        // ten minutes to type six digits
export const MAX_ATTEMPTS = 5                 // then the code is dead; ask for a new one
export const RESEND_COOLDOWN_MS = 60_000      // one email a minute, per account

// crypto.randomInt, not Math.random: a code guessable from the RNG state is a
// code that deletes somebody else's account.
export function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashCode(userId, code, pepper) {
  if (!pepper) throw new Error('hashCode needs a server secret')
  return crypto.createHmac('sha256', pepper).update(`${userId}:${code}`).digest('hex')
}

// People paste "123 456" from an email. Tolerate spaces; accept nothing else.
export function normalizeCode(input) {
  const s = String(input ?? '').replace(/\s+/g, '')
  return /^\d{6}$/.test(s) ? s : null
}

// record: { code_hash, expires_at, attempts, sent_at } as stored, or null.
// Order matters: an expired or locked code is refused BEFORE comparing, so a
// dead code cannot be probed for whether a guess would have been right.
export function checkCode(record, input, { userId, pepper, now = Date.now() }) {
  if (!record) return { ok: false, reason: 'none' }
  if (!(Date.parse(record.expires_at) > now)) return { ok: false, reason: 'expired' }
  if ((record.attempts ?? 0) >= MAX_ATTEMPTS) return { ok: false, reason: 'locked' }
  const code = normalizeCode(input)
  if (!code) return { ok: false, reason: 'wrong' }
  const expected = Buffer.from(hashCode(userId, code, pepper), 'hex')
  const stored = Buffer.from(String(record.code_hash || ''), 'hex')
  if (expected.length !== stored.length || !crypto.timingSafeEqual(expected, stored)) {
    return { ok: false, reason: 'wrong' }
  }
  return { ok: true }
}

// Milliseconds until another code may be sent. 0 means now.
export function cooldownLeft(record, now = Date.now()) {
  const sent = Date.parse(record?.sent_at)
  if (!Number.isFinite(sent)) return 0
  return Math.max(0, sent + RESEND_COOLDOWN_MS - now)
}

// What the person reads for each refusal. Written from their side of the
// screen: what happened, and what to do next.
export const REASON_MESSAGES = {
  none: 'No code has been sent for this account. Ask for a new one.',
  expired: 'That code has expired. Ask for a new one.',
  locked: 'Too many wrong codes. Ask for a new one.',
  wrong: 'That code is not right. Check the email and try again.',
}
