// Does the LIVE database match the schema the tests prove?
//
// CI proves two things about the code: a fresh database built from
// supabase/migrations produces the expected schema (test/fresh-schema.test.mjs),
// and the policies in those migrations isolate tenants (test/rls-isolation.test.mjs).
// Neither can prove the production project actually received them. This closes
// that gap.
//
// READ-ONLY BY CONSTRUCTION. It uses the public anon key — the same one already
// in the browser bundle — and issues nothing but SELECTs with limit 1. It reads
// no user rows: under RLS an unauthenticated caller gets an empty array, which
// is exactly the signal being checked. No service-role key, no credentials, no
// writes, safe to run against production at any time.
//
//   node scripts/verify-live-schema.mjs
//   node scripts/verify-live-schema.mjs --url https://x.supabase.co --key eyJ...
//
// With no arguments it extracts the public Supabase URL and anon key from the
// deployed bundle, so it needs no local configuration.
//
// WHAT IT CANNOT SEE: pg_policies, pg_indexes and the migration history are not
// exposed to the anon role. Those need a privileged session — the script prints
// a SQL block to paste into the Supabase SQL Editor for exactly that.

const args = process.argv.slice(2)
const argOf = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}
const SITE = argOf('--site') || 'https://toolnaut.xyz'

let URL_ = argOf('--url')
let KEY = argOf('--key')

if (!URL_ || !KEY) {
  process.stdout.write('resolving public credentials from the deployed bundle... ')
  const html = await fetch(SITE).then((r) => r.text())
  const entry = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0]
  if (!entry) { console.error('could not find the entry bundle'); process.exit(2) }
  const js = await fetch(SITE + entry).then((r) => r.text())
  URL_ = URL_ || js.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0]
  KEY = KEY || js.match(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0]
  if (!URL_ || !KEY) { console.error('could not resolve url/key'); process.exit(2) }
  console.log('ok')
}
console.log(`project: ${URL_}\n`)

const H = { apikey: KEY, authorization: `Bearer ${KEY}` }
let pass = 0, fail = 0, unknown = 0

const line = (mark, text, note) =>
  console.log(`  ${mark} ${text}${note ? `  — ${note}` : ''}`)
const ok = (t, n) => { pass++; line('PASS', t, n) }
const bad = (t, n) => { fail++; line('FAIL', t, n) }
const meh = (t, n) => { unknown++; line('????', t, n) }

// A column that does not exist returns PostgREST error 42703 naming it.
// A column that exists but is hidden by RLS returns []. That difference is what
// makes column presence checkable without reading anyone's data.
async function probe(table, select = '*', extra = '') {
  const res = await fetch(`${URL_}/rest/v1/${table}?select=${select}&limit=1${extra}`, { headers: H })
  const body = await res.text()
  let json = null
  try { json = JSON.parse(body) } catch { /* not json */ }
  return {
    rows: Array.isArray(json) ? json : null,
    code: json && !Array.isArray(json) ? json.code : null,
    message: json && !Array.isArray(json) ? json.message : body.slice(0, 120),
    status: res.status,
  }
}

const has = async (table, column) => {
  const r = await probe(table, column)
  if (r.rows) return true
  if (r.code === '42703') return false
  return null // table missing, or some other error
}

console.log('TABLES')
const TABLES = [
  'plans', 'payment_transactions', 'user_entitlements', 'webhook_events',
  'profiles', 'tool_refs', 'roadmap_progress', 'explorers', 'tool_claims',
]
for (const t of TABLES) {
  const r = await probe(t, '*')
  if (r.rows) ok(`${t} exists`)
  else if (r.code === '42P01' || /does not exist|find the table/i.test(r.message || '')) bad(`${t} MISSING`, r.message)
  else meh(`${t} unclear`, `status ${r.status}: ${r.message}`)
}

console.log('\nMIGRATION 0005 — plans')
for (const c of ['plan_code', 'name', 'amount_paise', 'currency', 'period_days', 'active', 'created_at']) {
  const h = await has('plans', c)
  h === true ? ok(`plans.${c}`) : h === false ? bad(`plans.${c} MISSING`, 'apply 0005') : meh(`plans.${c} unclear`)
}
{
  const r = await probe('plans', 'plan_code,period_days,active,amount_paise', '&limit=10')
  if (!r.rows) meh('plans seed unreadable', r.message)
  else if (r.rows.length < 3) bad(`plans seeded with ${r.rows.length} rows`, 'expected 3 — apply 0005')
  else {
    const bad30 = r.rows.filter((p) => Number(p.period_days) !== 30)
    bad30.length
      ? bad('plans period_days', `${bad30.map((p) => `${p.plan_code}=${p.period_days}`).join(', ')} — expected 30`)
      : ok('all plans seeded at period_days = 30')
  }
}

console.log('\nMIGRATION 0004 — payment tables carry the canonical columns')
const CANON = {
  payment_transactions: ['user_id', 'plan_code', 'amount_paise', 'currency', 'status', 'razorpay_order_id', 'razorpay_payment_id', 'metadata', 'paid_at'],
  // features proves 0004 built this table rather than the retired payments.sql
  user_entitlements: ['user_id', 'plan_code', 'status', 'source', 'starts_at', 'ends_at', 'payment_transaction_id', 'features'],
  webhook_events: ['razorpay_event_id', 'event_type', 'payload', 'signature_valid', 'processing_status', 'processed_at'],
}
for (const [table, cols] of Object.entries(CANON)) {
  for (const c of cols) {
    const h = await has(table, c)
    if (h === true) ok(`${table}.${c}`)
    else if (h === false) {
      bad(`${table}.${c} MISSING`,
        c === 'features' ? 'this database was built from the RETIRED supabase/payments.sql' : 'schema drift')
    } else meh(`${table}.${c} unclear`)
  }
}

console.log('\nRLS BEHAVIOUR (as an anonymous caller)')
// Under correct RLS an anonymous caller sees zero rows from owned tables. An
// empty array here is the PASS. Rows coming back would be a live data leak.
for (const t of ['profiles', 'tool_refs', 'roadmap_progress', 'payment_transactions', 'user_entitlements', 'webhook_events']) {
  const r = await probe(t, '*')
  if (!r.rows) meh(`${t} anon read unclear`, r.message)
  else if (r.rows.length === 0) ok(`${t}: anonymous sees 0 rows`)
  else bad(`${t}: LEAK — anonymous read ${r.rows.length} row(s)`, 'RLS is not protecting this table')
}
{
  const r = await probe('plans', 'plan_code', '&limit=10')
  r.rows && r.rows.length >= 3
    ? ok('plans: publicly readable', `${r.rows.length} rows — the pricing page works signed out`)
    : bad('plans: not publicly readable', 'the pricing page would render empty')
}

console.log('\nMIGRATION 0006 — entitlement history index')
meh('user_entitlements_user_idx', 'indexes are invisible to the anon role — see the SQL block below')

// ── 0007 — the behavioural log ──────────────────────────────────────────────
// Reported separately, and a MISSING table here is not treated as a failure of
// the rest: 0007 may simply not be applied yet. The distinction matters because
// the write path is fire-and-forget — if the table is absent the app carries on
// silently, so this probe is the only thing that will ever tell you.
console.log('\nMIGRATION 0007 — user_tool_interactions (behavioural log)')
{
  const r = await probe('user_tool_interactions', '*')
  if (r.rows) {
    ok('user_tool_interactions exists')
    for (const c of ['user_id', 'tool_slug', 'action', 'context', 'metadata', 'created_at']) {
      const h = await has('user_tool_interactions', c)
      h === true ? ok(`user_tool_interactions.${c}`)
        : h === false ? bad(`user_tool_interactions.${c} MISSING`, 'schema drift')
        : meh(`user_tool_interactions.${c} unclear`)
    }
    // Behaviour is personal data. An anonymous caller must see none of it.
    if (r.rows.length === 0) ok('user_tool_interactions: anonymous sees 0 rows')
    else bad(`user_tool_interactions: LEAK — anonymous read ${r.rows.length} row(s)`,
      'RLS is not protecting the behavioural log')
  } else if (r.code === '42P01' || /does not exist|find the table/i.test(r.message || '')) {
    meh('user_tool_interactions NOT PRESENT',
      'apply 0007. Until then every interaction write fails silently — the app is unaffected, but nothing is recorded.')
  } else {
    meh('user_tool_interactions unclear', `status ${r.status}: ${r.message}`)
  }
}

console.log(`\n${'='.repeat(62)}`)
console.log(`RESULT   pass ${pass}   fail ${fail}   needs-sql ${unknown}`)
console.log('='.repeat(62))

console.log(`
Paste this into Supabase -> SQL Editor for what the anon role cannot see
(RLS flags, policies, indexes). Read-only.

-- 1. RLS must be enabled on every user-owned table
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- 2. Policies. Expect own-row policies on profiles/tool_refs/roadmap_progress,
--    SELECT-only on payment_transactions and user_entitlements,
--    a public SELECT on plans, and ZERO rows for webhook_events.
--    After 0007, user_tool_interactions must have SELECT/INSERT/DELETE
--    own-row policies and NO update policy (the log is append-only).
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;

-- 3. Indexes. Expect user_entitlements_user_idx (0006),
--    user_entitlements_one_active_idx (0004), and after 0007
--    user_tool_interactions_user_idx + user_tool_interactions_tool_idx.
select tablename, indexname, indexdef
from pg_indexes where schemaname = 'public' order by tablename, indexname;

-- 4. The status constraints the API writes against
select rel.relname as table_name, con.conname, pg_get_constraintdef(con.oid) as definition
from pg_constraint con join pg_class rel on rel.oid = con.conrelid
join pg_namespace n on n.oid = rel.relnamespace
where n.nspname = 'public' and con.contype = 'c'
  and rel.relname in ('payment_transactions','user_entitlements','plans')
order by rel.relname, con.conname;
`)

process.exit(fail > 0 ? 1 : 0)
