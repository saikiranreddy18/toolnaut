// What the user says they pay for each tool, per month, in their own currency.
//
// This is the only place those numbers live, and they never leave the browser
// unless the user is signed in and sync carries them. The catalogue does not
// know anyone's price: a plan changes, a discount applies, a team splits a
// seat, so the only honest source is the person.
import { read, write } from './scopedStorage'

const KEY = 'exus_spend_v1'

// { slug: monthlyAmount }
export function loadSpend() {
  try {
    const s = read(KEY)
    return s && typeof s === 'object' && !Array.isArray(s) ? s : {}
  } catch {
    return {}
  }
}

export function setSpend(slug, monthly) {
  const next = { ...loadSpend() }
  const n = Number(monthly)
  if (!slug) return next
  if (!Number.isFinite(n) || n <= 0) delete next[slug]
  else next[slug] = Math.round(n * 100) / 100
  try { write(KEY, next) } catch { /* storage blocked */ }
  return next
}

export function clearSpend() {
  try { write(KEY, {}) } catch { /* storage blocked */ }
  return {}
}
