// Shared abuse protection and security logging for the API (underscore file =
// helper, not a route).
//
// This replaces three copy-pasted rate limiters (chat, payments, and the now
// removed alerts-subscribe) and adds what none of them had: a record of what
// was refused, so suspicious behaviour shows up in the Vercel logs.
//
// RATE LIMITS ARE PER WARM INSTANCE
// Vercel runs many instances and recycles them, so these limits bound one
// client hammering one instance — the cheap, common abuse case. A distributed
// attack across instances needs a shared store (Upstash, Vercel KV) or
// Vercel's platform firewall to stop. That is a deliberate free-tier trade-off,
// stated here so nobody mistakes this for a global guarantee.
//
// LOGS NEVER CONTAIN A RAW IP
// Client IPs are hashed with HMAC-SHA256 before they are written, so repeated
// events from one client can be correlated without the log itself holding
// personal data. Set LOG_HASH_SALT in Vercel for hashes that cannot be
// reversed by brute-forcing the IPv4 space.
import crypto from 'node:crypto'

// Vercel sets these at its edge and does not let a client override them.
// x-forwarded-for is the fallback: client-settable in general, but on Vercel
// the platform puts the real client address first.
export function clientIp(req) {
  const h = req?.headers || {}
  const raw = h['x-vercel-forwarded-for'] || h['x-real-ip'] || String(h['x-forwarded-for'] || '').split(',')[0]
  return String(raw || '').trim() || 'unknown'
}

function ipHash(ip) {
  return crypto
    .createHmac('sha256', process.env.LOG_HASH_SALT || 'toolnaut-log')
    .update(String(ip))
    .digest('hex')
    .slice(0, 16)
}

// One structured line per security event, easy to filter in Vercel's log view
// by searching "security". Never pass tokens, secrets, codes or emails in extra.
export function securityLog(event, req, extra = {}) {
  try {
    const line = {
      security: true,
      event,
      route: String(req?.url || '').split('?')[0] || undefined,
      method: req?.method,
      ip: ipHash(clientIp(req)),
      ua: String(req?.headers?.['user-agent'] || '').slice(0, 120) || undefined,
      at: new Date().toISOString(),
      ...extra,
    }
    console.warn(JSON.stringify(line))
  } catch { /* logging must never break a request */ }
}

// ── rate limiting ────────────────────────────────────────────────────────────
const buckets = new Map() // name -> Map(key -> timestamps[])
const MAX_KEYS_PER_BUCKET = 10_000

// Records one request for `key` in bucket `name` and returns true when it is
// over the limit. Exported separately so it can be tested without a request.
export function hit(name, key, { max, windowMs = 60_000, now = Date.now() }) {
  let bucket = buckets.get(name)
  if (!bucket) { bucket = new Map(); buckets.set(name, bucket) }
  const list = (bucket.get(key) || []).filter((t) => now - t < windowMs)
  if (list.length >= max) {
    bucket.set(key, list)
    return true
  }
  list.push(now)
  bucket.set(key, list)
  // An IP-rotating client must not be able to grow instance memory forever.
  if (bucket.size > MAX_KEYS_PER_BUCKET) {
    bucket.clear()
    bucket.set(key, [now])
  }
  return false
}

// For tests only.
export function _resetBuckets() {
  buckets.clear()
  loggedLimit.clear()
}

// Logging every refused request would let an attacker flood the logs, so a
// rate-limit event is logged once per client per bucket per window.
const loggedLimit = new Map()

// Convenience for handlers: limits by client IP, logs the first refusal in a
// window, and sets Retry-After. Returns true when the caller should stop and
// has already been answered with 429.
export function rateLimit(req, res, name, { max, windowMs = 60_000 }) {
  const ip = clientIp(req)
  if (!hit(name, ip, { max, windowMs })) return false

  const logKey = `${name}:${ip}`
  const last = loggedLimit.get(logKey) || 0
  if (Date.now() - last > windowMs) {
    loggedLimit.set(logKey, Date.now())
    if (loggedLimit.size > MAX_KEYS_PER_BUCKET) loggedLimit.clear()
    securityLog('rate_limited', req, { bucket: name, max, windowMs })
  }

  res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)))
  res.status(429).json({ error: 'Too many requests. Wait a minute and try again.' })
  return true
}

// Constant-time check of an "Authorization: Bearer <secret>" header. Hashing
// both sides first makes the comparison independent of length, so a wrong
// guess cannot learn the secret's length or prefix from response timing.
export function bearerMatches(authorization, secret) {
  if (!secret || typeof authorization !== 'string') return false
  const a = crypto.createHash('sha256').update(authorization).digest()
  const b = crypto.createHash('sha256').update(`Bearer ${secret}`).digest()
  return crypto.timingSafeEqual(a, b)
}
