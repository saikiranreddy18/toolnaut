// P0-2 — cross-tenant isolation, proven rather than assumed.
//
// Every private table's RLS is written as "auth.uid() = user_id". That is only
// a CLAIM until two real accounts try to read each other's rows. This runs
// those attempts for real.
//
// WHY THIS NEEDS TOKENS AND CANNOT BE A UNIT TEST
// RLS is enforced by Postgres against the JWT on the request. Nothing short of
// two genuine sessions exercises it — a mock proves only that the mock works.
//
//   TOKEN_A=<user A access token> TOKEN_B=<user B access token> \
//     node scripts/rls-two-account-check.mjs
//
// Get a token from the browser console while signed in:
//   (await window.__sb.auth.getSession()).data.session.access_token
// or from localStorage: the sb-<project>-auth-token entry.
//
// Without tokens it still runs the anonymous half, which needs no accounts.
const URL = process.env.SUPABASE_URL || 'https://xhoyxbayukionqmbhdpj.supabase.co'
const ANON = process.env.SUPABASE_ANON_KEY || null
const A = process.env.TOKEN_A || null
const B = process.env.TOKEN_B || null

// Tables keyed to a user. Each must be invisible to any other account.
const PRIVATE_TABLES = [
  'profiles',
  'tool_refs',
  'roadmap_progress',
  'payment_transactions',
  'user_entitlements',
]

let failures = 0
const row = (name, ok, detail) => {
  if (!ok) failures++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(52)} ${detail}`)
}

async function anonKey() {
  if (ANON) return ANON
  const html = await (await fetch('https://toolnaut.xyz')).text()
  const js = (html.match(/\/assets\/index-[^"]+\.js/) || [])[0]
  const src = await (await fetch('https://toolnaut.xyz' + js)).text()
  return (src.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/) || [])[0]
}

const key = await anonKey()
const H = (token) => ({
  apikey: key,
  Authorization: `Bearer ${token || key}`,
  'Content-Type': 'application/json',
})

const get = (path, token) => fetch(`${URL}/rest/v1/${path}`, { headers: H(token) })

console.log('\nCROSS-TENANT ISOLATION\n')

// ── anonymous, no accounts needed ───────────────────────────────────────────
console.log('Anonymous (no session)')
for (const t of PRIVATE_TABLES) {
  const r = await get(`${t}?select=*&limit=5`, null)
  const rows = await r.json().catch(() => null)
  const leaked = Array.isArray(rows) && rows.length > 0
  row(`${t}: anonymous read returns nothing`, !leaked,
    `HTTP ${r.status} rows=${Array.isArray(rows) ? rows.length : 'n/a'}`)
}

if (!A || !B) {
  console.log(`
Two-account half SKIPPED — set TOKEN_A and TOKEN_B to run it.
This is the part that actually proves user B cannot read user A's rows;
the anonymous checks above do not, because RLS treats "no session" and
"a different session" as different cases.
`)
  process.exit(failures ? 1 : 0)
}

// ── the real test ───────────────────────────────────────────────────────────
console.log('\nTwo accounts')

// Who is who. Needed to build a targeted read: "B cannot list rows" is weaker
// than "B cannot read A's row given its exact id".
const whoami = async (token) => {
  const r = await fetch(`${URL}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } })
  const u = await r.json().catch(() => null)
  return u?.id || null
}
const idA = await whoami(A)
const idB = await whoami(B)
row('both tokens resolve to real, distinct users', Boolean(idA && idB && idA !== idB),
  `A=${idA ? idA.slice(0, 8) : 'null'} B=${idB ? idB.slice(0, 8) : 'null'}`)
if (!idA || !idB || idA === idB) {
  console.log('\nCannot continue without two distinct accounts.\n')
  process.exit(1)
}

for (const t of PRIVATE_TABLES) {
  // A sees only A's own rows.
  const own = await get(`${t}?select=user_id&limit=50`, A)
  const ownRows = await own.json().catch(() => null)
  const foreign = Array.isArray(ownRows) ? ownRows.filter((r) => r.user_id && r.user_id !== idA) : []
  row(`${t}: A's listing contains only A's rows`, foreign.length === 0,
    `${Array.isArray(ownRows) ? ownRows.length : 0} rows, ${foreign.length} foreign`)

  // B cannot read A's rows even asking for them by id.
  const targeted = await get(`${t}?user_id=eq.${idA}&select=*`, B)
  const got = await targeted.json().catch(() => null)
  row(`${t}: B cannot read A's rows by exact id`, !Array.isArray(got) || got.length === 0,
    `HTTP ${targeted.status} rows=${Array.isArray(got) ? got.length : 'n/a'}`)

  // B cannot WRITE a row belonging to A. Reading someone's data is bad;
  // writing to it is worse, and the policies are separate.
  const wrote = await fetch(`${URL}/rest/v1/${t}`, {
    method: 'POST',
    headers: { ...H(B), Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: idA }),
  })
  row(`${t}: B cannot insert a row owned by A`, !wrote.ok, `HTTP ${wrote.status}`)

  // And cannot delete A's rows.
  const del = await fetch(`${URL}/rest/v1/${t}?user_id=eq.${idA}`, {
    method: 'DELETE',
    headers: { ...H(B), Prefer: 'return=representation' },
  })
  const deleted = await del.json().catch(() => null)
  row(`${t}: B cannot delete A's rows`, !Array.isArray(deleted) || deleted.length === 0,
    `HTTP ${del.status} deleted=${Array.isArray(deleted) ? deleted.length : 0}`)
}

console.log(failures
  ? `\n${failures} FAILURE(S) — cross-tenant isolation is broken. Do not ship.\n`
  : '\nAll checks passed: no account can see or touch another account\'s rows.\n')
process.exit(failures ? 1 : 0)
