import { EVENTS } from './analyticsEvents'

// Activation, and the return visits that follow it.
//
// THE DEFINITION IS THE POINT. The product review is explicit that account
// creation is not activation, and that measuring signups instead is how a
// funnel ends up looking healthy while nobody gets any value. An activated user
// here has done all three:
//
//   1. finished onboarding
//   2. seen a personalised stack
//   3. acted on it — saved a tool, started a learning path, or opened a template
//
// Step 3 is what separates "the page rendered" from "this was worth something",
// and it is the one a vanity metric always omits.
//
// Activation fires ONCE per user. Without the latch it would re-fire on every
// save, and the activation rate — activated ÷ signups — would climb past 100%
// and quietly stop meaning anything.

const KEY = 'exus_funnel_v1'

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function write(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* storage blocked */ }
}

export function funnelState() {
  return read()
}

// Records a step and returns true only the first time that step is reached, so
// callers can fire a one-shot event without tracking latches themselves.
export function markStep(step) {
  const s = read()
  if (s[step]) return false
  s[step] = Date.now()
  write(s)
  return true
}

// Call after each milestone. Emits `activated` exactly once, when all three
// conditions are true — which may be on the save, not on the stack.
export function checkActivation(track) {
  const s = read()
  const ready = s.onboarded && s.stackSeen && s.acted
  if (!ready || s.activated) return false
  s.activated = Date.now()
  write(s)
  track?.(EVENTS.ACTIVATED, {
    msToActivate: s.firstSeen ? s.activated - s.firstSeen : null,
    via: s.actedVia || 'unknown',
  })
  return true
}

export function markOnboarded(track) {
  if (markStep('onboarded')) track?.(EVENTS.ONBOARDING_COMPLETED)
  checkActivation(track)
}

export function markStackSeen(track, meta = {}) {
  if (markStep('stackSeen')) track?.(EVENTS.STACK_GENERATED, meta)
  checkActivation(track)
}

// `via` records WHICH action counted, so a low activation rate can be read as
// "nobody saves anything" rather than just "the number is low".
export function markActed(track, via, meta = {}) {
  const s = read()
  if (!s.acted) {
    s.acted = Date.now()
    s.actedVia = via
    write(s)
  }
  const evt = {
    save: EVENTS.TOOL_SAVED,
    compare: EVENTS.COMPARISON_VIEWED,
    path: EVENTS.PATH_STARTED,
  }[via]
  if (evt) track?.(evt, meta)
  checkActivation(track)
}

// Return visits. Fired on load, at most once each, from the first-seen stamp —
// the review asks for returned_7d and returned_30d specifically because they
// are what separates a tool people use from one they tried.
export function trackReturn(track) {
  const s = read()
  if (!s.firstSeen) {
    s.firstSeen = Date.now()
    write(s)
    return
  }
  const days = (Date.now() - s.firstSeen) / 86400e3
  if (days >= 7 && !s.r7) { s.r7 = Date.now(); write(s); track?.(EVENTS.RETURNED_7D, { days: Math.round(days) }) }
  if (days >= 30 && !s.r30) { s.r30 = Date.now(); write(s); track?.(EVENTS.RETURNED_30D, { days: Math.round(days) }) }
}

// The three rates the review defines. Exposed so they can be read in the app
// rather than only in an analytics dashboard.
export function funnelRates({ visitors, signups, activated, paid }) {
  const pct = (a, b) => (b > 0 ? +((a / b) * 100).toFixed(1) : null)
  return {
    visitorToSignup: pct(signups, visitors),
    signupToActivation: pct(activated, signups),
    activationToPaid: pct(paid, activated),
  }
}
