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

// Payments are ON now, so the kill switch is no longer the thing standing
// between a visitor and a charge — authentication is. This reports the flag
// honestly and only demands a refusal when the flag is actually off.
const ent = await (await fetch(BASE + '/api/entitlement')).json().catch(() => ({}))
console.log(`Payments flag: ${ent.payments_enabled ? 'ON' : 'off'}, configured: ${ent.configured ? 'yes' : 'no'}`)
if (!ent.payments_enabled) {
  const r = await post('/api/create-order', { planId: 'guru' })
  check('create-order refuses while payments are off', r.status === 503, `HTTP ${r.status}`)
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

// ── the money-loss hole ─────────────────────────────────────────────────────
// An order created without a signed-in user has no payment_transactions row
// and an empty notes.user_id, so the webhook has nothing to settle against:
// the payer is charged and gets nothing. This must refuse.
console.log('\nAnonymous checkout')
{
  const r = await post('/api/create-order', { planId: 'guru' })
  const b = await r.json().catch(() => ({}))
  check('no order without a signed-in user', r.status === 401 || r.status === 503,
    `HTTP ${r.status}${b.order_id ? ' CREATED ' + b.order_id : ''}`)
}
{
  const r = await post('/api/create-order', { planId: 'guru' },
    { authorization: 'Bearer not.a.real.token' })
  const b = await r.json().catch(() => ({}))
  check('no order on an expired/forged token', r.status === 401 || r.status === 503,
    `HTTP ${r.status}${b.order_id ? ' CREATED ' + b.order_id : ''}`)
}

const failed = results.filter((r) => !r.pass)
console.log(failed.length
  ? `
${failed.length} FAILURE(S) — do not take payments.
`
  : `
All ${results.length} checks passed.
`)
process.exit(failed.length ? 1 : 0)
