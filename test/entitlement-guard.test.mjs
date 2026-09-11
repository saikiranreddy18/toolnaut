import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

// ── daysLeft ────────────────────────────────────────────────────────────────
// Pure date arithmetic, so it can be tested for real rather than by shape.
const DAY = 86_400_000
function daysLeft(endsAt) {
  if (!endsAt) return null
  const ms = new Date(endsAt).getTime() - Date.now()
  if (!Number.isFinite(ms)) return null
  return ms <= 0 ? 0 : Math.ceil(ms / DAY)
}

test('a lifetime entitlement never reports an expiry', () => {
  // null ends_at means it does not expire. Reporting 0 would make the banner
  // tell a founder-plan holder their access has run out.
  assert.equal(daysLeft(null), null)
  assert.equal(daysLeft(undefined), null)
})

test('an expired entitlement reports 0, not a negative number', () => {
  assert.equal(daysLeft(new Date(Date.now() - 5 * DAY).toISOString()), 0)
  assert.equal(daysLeft(new Date(Date.now() - 1000).toISOString()), 0)
})

test('a part-day remaining rounds UP', () => {
  // Eleven hours left is "1 day", not "0 days". Rounding down would tell
  // someone their access has ended while they are still using it.
  assert.equal(daysLeft(new Date(Date.now() + 11 * 3600_000).toISOString()), 1)
  assert.equal(daysLeft(new Date(Date.now() + 1000).toISOString()), 1)
})

test('a full trial reports its length', () => {
  const d = daysLeft(new Date(Date.now() + 7 * DAY - 1000).toISOString())
  assert.equal(d, 7)
})

test('a garbage date does not produce NaN days', () => {
  assert.equal(daysLeft('not-a-date'), null)
})

// ── the guard's fail-open contract ──────────────────────────────────────────
test('the paywall gate fails OPEN on an unknown check', () => {
  // A network hiccup must not brick the app. If this guard is ever removed,
  // one failed request redirects every signed-in user to /pay.
  const src = read('src/shells/AppShell.jsx')
  assert.match(src, /ent\.unknown/, 'the gate must bail out when the check failed')
  assert.match(
    src,
    /if\s*\(!on\s*\|\|\s*ent\.unknown\)\s*return/,
    'unknown must return BEFORE any redirect decision',
  )
})

test('the paywall gate never fires while payments are off', () => {
  // Locking someone in front of a gateway that cannot take money is the one
  // failure with no recovery: they can neither use the app nor pay to.
  const src = read('src/shells/AppShell.jsx')
  assert.match(src, /ent\.paymentsEnabled/, 'the gate must check the payments flag')
  assert.match(src, /ent\.configured/, 'the gate must check Supabase is configured')
})

test('guests are never redirected to the paywall', () => {
  const src = read('src/shells/AppShell.jsx')
  assert.match(
    src,
    /if\s*\(!session\?\.user\s*\|\|\s*session\.simulated\)\s*return/,
    'no session (or a simulated one) must exit before the entitlement check',
  )
})

// ── the trial grant ─────────────────────────────────────────────────────────
test('the trial is granted only when NO entitlement row exists', () => {
  // Keyed on absence, not on status. If it keyed on "no ACTIVE row", anyone
  // could restart a trial forever by letting the last one lapse.
  const src = read('api/entitlement.js')
  assert.match(src, /if\s*\(!row\s*&&/, 'the grant must be conditional on there being no row at all')
  assert.match(src, /source:\s*'trial'/, 'the granted row must be marked as a trial')
})

test('a failed trial grant does not hand out access it did not record', () => {
  const src = read('api/entitlement.js')
  assert.match(src, /again/, 'a failed insert must re-read rather than assume success')
  assert.doesNotMatch(
    src,
    /row\s*=\s*\{\s*status:\s*'active'/,
    'the endpoint must never fabricate an active row in memory',
  )
})

test('trial length is one constant, not scattered literals', () => {
  const src = read('api/entitlement.js')
  assert.match(src, /export const TRIAL_DAYS = \d+/)
  const body = src.slice(src.indexOf('export default'))
  assert.match(body, /TRIAL_DAYS \* 86_400_000/, 'the grant must compute from the constant')
})

// ── entitlement is decided server-side ──────────────────────────────────────
test('the client never decides entitlement from localStorage', () => {
  const src = read('src/utils/entitlement.js')
  assert.doesNotMatch(src, /localStorage/, 'entitlement must come from the server, not storage')
  assert.match(src, /\/api\/entitlement/, 'it must ask the server')
})

test('the entitlement endpoint is never edge-cached', () => {
  // A per-user answer behind a shared cache hands one account's plan to
  // everyone — the same shape of bug that made /api/geo serve one country
  // to the world.
  const src = read('api/entitlement.js')
  const m = src.match(/Cache-Control['"],\s*['"]([^'"]+)['"]/)
  assert.ok(m, 'the endpoint must set Cache-Control explicitly')
  assert.doesNotMatch(m[1], /public/, `Cache-Control is "${m[1]}" — must not be shared-cacheable`)
})

test('metrics are admin-guarded and closed when unconfigured', () => {
  const src = read('api/metrics.js')
  assert.match(src, /METRICS_SECRET/)
  assert.match(src, /if\s*\(!secret\s*\|\|/, 'an unset secret must close the endpoint, not open it')
})
