// Regional pricing detection. India sees INR (₹299/₹799/₹4,999); everyone
// else sees USD ($3/$8/$50).
//
// NOT GPS. A browser geolocation prompt for a price tag is the worst possible
// trade: a scary permission dialog, a precision (metres) the question does not
// need, and a "block" that leaves us guessing anyway. Three quieter signals,
// in order of authority:
//
//   1. The person's own choice — a ₹/$ switch, persisted. Detection can be
//      wrong (VPNs, NRIs paying from abroad, travellers); the person never is.
//   2. /api/geo — Vercel stamps x-vercel-ip-country on every request, so one
//      tiny function returns the country with no external service and no
//      permission. Cached for the session.
//   3. Timezone — Intl gives Asia/Kolkata synchronously and offline; instant
//      first paint while (2) is in flight, and the answer when it fails.
//
// The prerendered page ships USD (crawlers and link unfurlers have no
// country); the client swaps to INR when India resolves.

const CHOICE_KEY = 'exus_currency_v1' // 'INR' | 'USD', set only by the person

export function savedCurrency() {
  try {
    const v = localStorage.getItem(CHOICE_KEY)
    return v === 'INR' || v === 'USD' ? v : null
  } catch {
    return null
  }
}

export function saveCurrency(cur) {
  try { localStorage.setItem(CHOICE_KEY, cur) } catch { /* blocked */ }
}

export function timezoneSaysIndia() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta'
  } catch {
    return false
  }
}

// Country from the edge, cached per tab. Resolves null on any failure — the
// caller already has the timezone answer in hand, so a miss costs nothing.
let geoPromise
export function fetchCountry() {
  if (!geoPromise) {
    geoPromise = fetch('/api/geo', { signal: AbortSignal.timeout(3000) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (typeof d?.country === 'string' ? d.country : null))
      .catch(() => null)
  }
  return geoPromise
}

// Synchronous best answer for first paint: choice, else timezone.
export function initialCurrency() {
  return savedCurrency() || (timezoneSaysIndia() ? 'INR' : 'USD')
}
