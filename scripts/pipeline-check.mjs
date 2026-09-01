// End-to-end probe of the live payment pipeline.
//
// Every request here is one an attacker could make: no auth, no signature,
// forged signature. Each MUST be refused. Nothing below can create a charge or
// grant a plan — that is the point, and it is what is being proved.
const BASE = process.env.BASE || 'https://toolnaut.xyz'

const results = []
function check(name, pass, detail) {
  results.push({ name, pass, detail })
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${detail}`)
}

const post = (path, body, headers = {}) =>
  fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

console.log(`\nPAYMENT PIPELINE — ${BASE}\n`)

console.log('Kill switch')
{
  const r = await post('/api/create-order', { planId: 'guru' })
  const b = await r.json().catch(() => ({}))
  check('create-order refuses while payments are off', r.status === 503,
    `HTTP ${r.status} ${b.error || ''}`.trim())
}

console.log('\nWebhook')
{
  const r = await post('/api/razorpay-webhook', { event: 'payment.captured' })
  check('unsigned delivery is refused', r.status === 401 || r.status === 400 || r.status === 503,
    `HTTP ${r.status}`)
}
{
  const r = await post('/api/razorpay-webhook', { event: 'payment.captured' },
    { 'x-razorpay-signature': 'deadbeef'.repeat(8) })
  check('forged signature is refused', r.status === 401 || r.status === 400 || r.status === 503,
    `HTTP ${r.status}`)
}
{
  const r = await fetch(BASE + '/api/razorpay-webhook')
  check('GET is refused', r.status === 405, `HTTP ${r.status}`)
}

console.log('\nEntitlement')
{
  const r = await fetch(BASE + '/api/entitlement')
  const b = await r.json().catch(() => ({}))
  check('unauthenticated caller gets no plan', !b.active,
    `HTTP ${r.status} active=${b.active}`)
}
{
  const r = await fetch(BASE + '/api/entitlement', {
    headers: { authorization: 'Bearer not.a.real.token' },
  })
  const b = await r.json().catch(() => ({}))
  check('forged token grants nothing', !b.active, `HTTP ${r.status} active=${b.active}`)
}

console.log('\nDirect database access with the public key')
{
  const html = await (await fetch(BASE)).text()
  const js = (html.match(/\/assets\/index-[^"]+\.js/) || [])[0]
  const src = await (await fetch(BASE + js)).text()
  const anon = (src.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/) || [])[0]
  const SB = 'https://xhoyxbayukionqmbhdpj.supabase.co'
  const H = { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' }

  const w = await fetch(`${SB}/rest/v1/user_entitlements`, {
    method: 'POST', headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: '00000000-0000-0000-0000-000000000000', plan_code: 'guru' }),
  })
  check('cannot grant myself a plan', !w.ok, `HTTP ${w.status}`)

  const rd = await fetch(`${SB}/rest/v1/payment_transactions?select=*&limit=5`, { headers: H })
  const rows = await rd.json().catch(() => null)
  check('cannot read anyone\'s payments', !Array.isArray(rows) || rows.length === 0,
    `HTTP ${rd.status} rows=${Array.isArray(rows) ? rows.length : 'n/a'}`)
}

const failed = results.filter((r) => !r.pass)
console.log(failed.length
  ? `\n${failed.length} FAILURE(S) — do not enable payments.\n`
  : `\nAll ${results.length} checks passed.\n`)
process.exit(failed.length ? 1 : 0)
