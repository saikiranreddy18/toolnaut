// Tells you exactly why Razorpay is rejecting your keys.
//
//   node scripts/razorpay-doctor.mjs
//
// Reads .env, checks the credentials for the problems that produce an
// identical-looking 401, then makes one real call to Razorpay to see whether
// they are actually accepted.
//
// It never prints either credential. The key id is masked; the secret is only
// ever reported as present/absent and by length.
import { readFileSync, existsSync } from 'node:fs'
import { keyMode, credentialShapeProblem } from '../api/_razorpay.js'

if (!existsSync('.env')) {
  console.error('No .env file here. Run this from the project root.')
  process.exit(1)
}

// Deliberately NOT trimmed on read: trailing whitespace is one of the faults
// being looked for, so it has to survive long enough to be detected.
const env = {}
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2]
}

const rawId = env.RAZORPAY_KEY_ID ?? ''
const rawSecret = env.RAZORPAY_KEY_SECRET ?? ''
const id = rawId.trim()
const secret = rawSecret.trim()

const mask = (v) => (v.length <= 12 ? v : `${v.slice(0, 12)}${'.'.repeat(6)}`)
const line = (label, value) => console.log(`  ${label.padEnd(26)} ${value}`)

console.log('\nRAZORPAY CREDENTIAL CHECK\n')
line('key id', id ? mask(id) : 'MISSING')
line('key secret', secret ? `present (${secret.length} chars)` : 'MISSING')
line('mode', keyMode(id) || 'UNRECOGNISED FORMAT')

const problems = []
if (!id || !secret) problems.push('One of the two values is missing from .env.')
if (rawId !== id || rawSecret !== secret) {
  problems.push('Trailing/leading WHITESPACE. This is invisible in a dashboard and breaks Basic auth.')
}
const shape = credentialShapeProblem(rawId, rawSecret)
if (shape && shape !== 'whitespace' && shape !== 'missing') problems.push(`Shape: ${shape}.`)

console.log('')
if (problems.length) {
  console.log('PROBLEMS FOUND BEFORE CONTACTING RAZORPAY:')
  for (const p of problems) console.log('  - ' + p)
  console.log('')
}

if (!id || !secret) process.exit(1)

// The real test. /v1/orders with a 100-paise order is the cheapest call that
// actually exercises authentication; nothing is charged by creating an order.
console.log('Calling Razorpay...\n')
const auth = Buffer.from(`${id}:${secret}`).toString('base64')
let res, body
try {
  res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 100, currency: 'INR', receipt: 'doctor_check' }),
  })
  body = await res.json()
} catch (e) {
  console.log(`  Could not reach Razorpay: ${e.message}`)
  process.exit(1)
}

if (res.ok) {
  line('RESULT', 'CREDENTIALS WORK')
  line('test order created', body.id)
  console.log(`\nThese keys are valid in ${keyMode(id)} mode.`)
  if (keyMode(id) === 'test') {
    console.log('Note: these are TEST keys. Real payments need live keys and an activated account.')
  }
  process.exit(0)
}

line('RESULT', `REJECTED (HTTP ${res.status})`)
line('razorpay says', body?.error?.description || JSON.stringify(body).slice(0, 160))

if (res.status === 401) {
  console.log(`
A 401 means Razorpay did not accept the id/secret pair. In order of likelihood:

  1. THE ACCOUNT IS NOT ACTIVATED FOR LIVE MODE.
     Live keys are issued before KYC completes, but they do not work until
     Razorpay activates the account. Check Dashboard -> Account & Settings.
     This is by far the most common cause right after switching to live.

  2. THE ID AND SECRET ARE FROM DIFFERENT PAIRS.
     Generating a new key pair invalidates the old secret. The secret is shown
     ONCE at generation - if you no longer have it, generate a fresh pair and
     replace BOTH values together.

  3. MODE MISMATCH. A live id with a test secret (or the reverse) is a 401.
     This key id is ${keyMode(id) || 'an unrecognised format'}.

  4. WHITESPACE, already reported above if present.

Fix locally first, re-run this, and only then update Vercel - so you are not
debugging a deploy loop.`)
}
process.exit(1)
