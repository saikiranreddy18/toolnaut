// Shared server-side pieces for the Razorpay endpoints.
//
// Underscore-prefixed, so Vercel does not turn this into its own endpoint.
//
// THE PRICE IS DECIDED HERE, NOT BY THE BROWSER
// The obvious shape for a create-order call is { amount, currency } straight
// from the client. That is exploitable: anyone can open devtools and post
// amount: 100 for the Team plan, and Razorpay will happily take ₹1 and report a
// perfectly valid, correctly signed payment. Signature verification does NOT
// save you — it proves the payment matches the order, not that the order was
// for the right amount.
//
// So the client sends a PLAN ID and nothing else about money. The amount is
// looked up here from the same PLANS table the pricing page renders, which also
// means the two can never drift.
import crypto from 'node:crypto'
import { PLANS } from '../src/utils/planData.js'

// Razorpay works in the smallest currency unit. INR -> paise.
const PAISE = 100
export const MIN_PAISE = 100 // Razorpay rejects anything under ₹1

export function planToAmount(planId) {
  const plan = PLANS.find((p) => p.id === planId)
  if (!plan) return null
  const paise = Math.round(Number(plan.priceINR) * PAISE)
  if (!Number.isFinite(paise) || paise < MIN_PAISE) return null
  return { paise, currency: 'INR', name: plan.name, planId: plan.id }
}

// ── origin allow-list ────────────────────────────────────────────────────────
// Same policy as api/chat.js. Duplicated deliberately rather than imported from
// it: importing would pull that handler's module-level state into the payment
// functions' bundle, and a payment endpoint should depend on as little as
// possible.
const ALLOWED_ORIGINS = new Set([
  'https://toolnaut.xyz',
  'https://www.toolnaut.xyz',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

export function originAllowed(origin) {
  if (!origin) return true // curl, server-to-server, same-origin without header
  if (origin === 'null') return false // file:// and sandboxed iframes
  if (ALLOWED_ORIGINS.has(origin)) return true
  try {
    const u = new URL(origin)
    if (u.protocol !== 'https:') return false
    const h = u.hostname
    return (
      h === 'toolnaut.vercel.app' ||
      /^toolnaut-[a-z0-9]+(-[a-z0-9]+)*\.vercel\.app$/i.test(h) ||
      /^[a-z0-9]+(-[a-z0-9]+)*-saikiranreddy18s-projects\.vercel\.app$/i.test(h)
    )
  } catch {
    return false
  }
}

// ── rate limit ───────────────────────────────────────────────────────────────
// Per-IP sliding window in instance memory, same honest caveat as chat.js: this
// bounds one warm instance, not the whole fleet. Tighter than chat's 20/min
// because a legitimate visitor opens checkout a handful of times at most.
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 10
const hits = new Map()

export function rateLimited(ip) {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  if (list.length >= MAX_PER_WINDOW) { hits.set(ip, list); return true }
  list.push(now)
  hits.set(ip, list)
  if (hits.size > 5000) hits.clear()
  return false
}

export function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
}

// ── signature ────────────────────────────────────────────────────────────────
// HMAC-SHA256 over "<order_id>|<payment_id>" keyed with the secret.
//
// timingSafeEqual, not ===. String comparison short-circuits on the first
// differing byte, so how long it takes leaks how much of a guess was correct.
// Lengths are checked first because timingSafeEqual throws on a length
// mismatch, and both sides are hex of a fixed width so that check leaks nothing.
export function verifyPaymentSignature({ orderId, paymentId, signature, secret }) {
  if (!orderId || !paymentId || !signature || !secret) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(String(signature), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// Bodies are tiny; anything larger is not a real checkout call.
export const MAX_BODY_BYTES = 2_000

export function bodyTooLarge(req) {
  const len = Number(req.headers['content-length'] || 0)
  return Number.isFinite(len) && len > MAX_BODY_BYTES
}

// Both endpoints need the same credential check, and neither should ever hint
// at whether the secret specifically is the missing one.
export function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) return null
  return { keyId, keySecret }
}
