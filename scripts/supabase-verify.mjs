// Checks the migration state and the two authorization rules that matter.
//
//   node scripts/supabase-verify.mjs
//
// Run it BEFORE applying (everything 404s) and AFTER (tables exist, anonymous
// reads are denied). It uses only the public anon key, which is the same key
// any visitor's browser holds — so this tests exactly what a stranger can do.
//
// It covers ladder steps 1 and 4 automatically. Steps 2 and 3 need two real
// signed-in accounts and are listed at the end as manual checks; creating users
// in a production auth system is not something a script should do behind your
// back.
import { readFileSync, existsSync } from 'node:fs'

const PROJECT = 'xhoyxbayukionqmbhdpj'
const URL = `https://${PROJECT}.supabase.co`

// The anon key is public by design and already ships in the browser bundle.
let ANON = process.env.VITE_SUPABASE_ANON_KEY || ''
if (!ANON && existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*VITE_SUPABASE_ANON_KEY\s*=\s*(.*)$/)
    if (m) ANON = m[1].trim()
  }
}
if (!ANON) {
  // Fall back to the deployed bundle, so this works on a fresh clone.
  const html = await fetch('https://toolnaut.xyz').then((r) => r.text())
  const js = (html.match(/\/assets\/index-[^"]+\.js/) || [])[0]
  if (js) {
    const src = await fetch('https://toolnaut.xyz' + js).then((r) => r.text())
    ANON = (src.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/) || [])[0] || ''
  }
}
if (!ANON) {
  console.error('Could not find the anon key. Set VITE_SUPABASE_ANON_KEY in .env.')
  process.exit(1)
}

const H = { apikey: ANON, Authorization: `Bearer ${ANON}` }
const get = (path) => fetch(`${URL}/rest/v1/${path}`, { headers: H })
const rpc = (fn) =>
  fetch(`${URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: '{}' })

const row = (label, status, verdict) =>
  console.log(`  ${label.padEnd(30)} ${String(status).padEnd(5)} ${verdict}`)

console.log(`\nSUPABASE MIGRATION CHECK  (project ${PROJECT})\n`)

// ── step 1: do the objects exist at all? ────────────────────────────────────
console.log('Step 1 — schema exists')
// Read from what the migrations ACTUALLY create, not from their file names.
// 0002 is called 0002_user_state.sql but creates profiles/tool_refs/
// roadmap_progress - there is no user_state table, and checking for one
// reported a false MISSING that would have looked like a failed migration.
const objects = [
  ['explorers', 'table'],
  ['profiles', 'table'],
  ['tool_refs', 'table'],
  ['roadmap_progress', 'table'],
  ['tool_claims', 'table'],
  ['payment_transactions', 'table'],
  ['user_entitlements', 'table'],
  ['webhook_events', 'table'],
]
let missing = 0
for (const [name] of objects) {
  const r = await get(`${name}?select=*&limit=1`)
  if (r.status === 404) { missing++; row(name, 404, 'MISSING — migration not applied') }
  else row(name, r.status, 'exists')
}
for (const fn of ['explorer_count', 'sync_available']) {
  const r = await rpc(fn)
  if (r.status === 404) { missing++; row(`rpc/${fn}`, 404, 'MISSING') }
  else row(`rpc/${fn}`, r.status, 'exists')
}

if (missing) {
  console.log(`\n  ${missing} object(s) missing. Apply the migrations in order:`)
  console.log('    0001_explorers.sql  ->  0002_user_state.sql  ->  0003_tool_claims.sql')
  console.log('\n  Nothing else below is meaningful until they exist.\n')
  process.exit(1)
}

// ── step 4: can a stranger read protected data? ─────────────────────────────
// This is the test that matters most. The anon key is public, so RLS is the
// ONLY thing standing between a stranger and your users' rows. An empty array
// is a pass; actual rows coming back is a critical failure.
console.log('\nStep 4 — anonymous cannot read protected state')
let failures = 0
for (const table of ['profiles', 'tool_refs', 'roadmap_progress', 'payment_transactions', 'user_entitlements', 'webhook_events']) {
  const r = await get(`${table}?select=*&limit=5`)
  const body = await r.json().catch(() => null)
  const leaked = Array.isArray(body) && body.length > 0
  if (r.status === 200 && leaked) {
    failures++
    row(table, r.status, `CRITICAL — ${body.length} row(s) readable by anyone`)
  } else if (r.status === 200) {
    row(table, r.status, 'denied (empty result — RLS holding)')
  } else {
    row(table, r.status, 'denied')
  }
}

// tool_claims is INTENDED to be publicly readable, so a 200 here is correct.
console.log('\nPublic-by-design surfaces')
const claims = await get('tool_claims?select=*&limit=3')
row('tool_claims (read)', claims.status, claims.ok ? 'readable — intended' : 'not readable — check 0003')

// ...but a browser must never be able to WRITE one.
const write = await fetch(`${URL}/rest/v1/tool_claims`, {
  method: 'POST',
  headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
  body: JSON.stringify({ tool_slug: '__rls_probe__', claim_key: '__rls_probe__', value: 'x' }),
})
if (write.ok) { failures++; row('tool_claims (write)', write.status, 'CRITICAL — browser can write claims') }
else row('tool_claims (write)', write.status, 'rejected — correct')

// ── the money tables must be unwritable from a browser ──────────────────────
// A user who can insert their own entitlement row simply grants themselves the
// paid plan, and one who can insert a payment_transactions row fabricates a
// purchase. This is the most important check on the page.
console.log('\nPayment tables reject browser writes')
const ZERO_UUID = '00000000-0000-0000-0000-000000000000'
const writes = [
  ['user_entitlements', { user_id: ZERO_UUID, plan_code: 'guru' }],
  ['payment_transactions', {
    user_id: ZERO_UUID, plan_code: 'guru', amount_paise: 100, razorpay_order_id: '__probe__',
  }],
  ['webhook_events', { razorpay_event_id: '__probe__', event_type: 'probe', payload: {} }],
]
for (const [table, body] of writes) {
  const w = await fetch(`${URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  if (w.ok) { failures++; row(`${table} (write)`, w.status, 'CRITICAL — a browser can write this') }
  else row(`${table} (write)`, w.status, 'rejected — correct')
}

console.log(failures ? `\nRESULT: ${failures} CRITICAL failure(s). Do not ship sync.\n`
                     : '\nRESULT: automated checks passed.\n')

console.log(`Still to do by hand (needs two real accounts):
  Step 2  User A can create/read/update/delete their own state.
  Step 3  User B cannot read User A's profile row, even given its exact id.
  Step 5  Guest builds a stack, signs in, imports it.
  Step 6  A second browser restores the same stack.
  Step 7  Clearing local storage does not lose it.
  Step 8  Importing twice does not duplicate anything.

Step 3 is the one that matters: sign in as B, then request
  ${URL}/rest/v1/profiles?id=eq.<A's user id>
with B's access token. It must return an empty array, not A's row.\n`)
process.exit(failures ? 1 : 0)
