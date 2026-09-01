import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Every status the code writes must be one the database will accept.
//
// This exists because it already went wrong in production: the refund path
// wrote 'revoked' to user_entitlements, which the check constraint rejects.
// Nothing caught it — the PATCH result was not inspected, so the webhook
// reported success while a refunded customer kept their paid access. A typo
// that costs money and reports fine is exactly what a test should be holding.
//
// Parsing SQL with a regex is normally a bad idea. Here the target is one
// well-known literal list in a file this repo controls, and the alternative is
// a live database connection in unit tests. If the migration is reshaped this
// will fail loudly rather than silently pass, which is the correct direction.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(join(root, 'supabase/migrations/0004_payments.sql'), 'utf8')

function allowedStatuses(table) {
  const block = sql.slice(sql.indexOf(`create table if not exists public.${table}`))
  const m = block.match(/status\s+text not null default '[a-z_]+' check \(status in \(([^)]+)\)/)
  assert.ok(m, `no status check constraint found for ${table}`)
  return m[1].split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean)
}

const ENTITLEMENT = allowedStatuses('user_entitlements')
const TRANSACTION = allowedStatuses('payment_transactions')

test('the schema still constrains both status columns', () => {
  assert.ok(ENTITLEMENT.includes('active'), 'entitlements must allow active')
  assert.ok(TRANSACTION.includes('captured'), 'transactions must allow captured')
})

test('every entitlement status the code writes is accepted by the database', () => {
  // The exact bug: 'revoked' is not in the constraint, so the refund silently
  // failed and access was never removed.
  for (const file of ['api/_supabase.js', 'api/razorpay-webhook.js', 'api/verify-payment.js']) {
    const src = readFileSync(join(root, file), 'utf8')
    // Only statuses written to user_entitlements — matched by proximity to the
    // table name in the same REST call.
    const calls = src.split(/rest\(|from\(/).filter((c) => c.includes('user_entitlements'))
    for (const call of calls) {
      for (const [, status] of call.matchAll(/status:\s*'([a-z_]+)'/g)) {
        assert.ok(
          ENTITLEMENT.includes(status),
          `${file} writes user_entitlements.status='${status}', which the check constraint rejects. Allowed: ${ENTITLEMENT.join(', ')}`,
        )
      }
    }
  }
})

test('every transaction status the code writes is accepted by the database', () => {
  for (const file of ['api/razorpay-webhook.js', 'api/verify-payment.js', 'api/create-order.js']) {
    const src = readFileSync(join(root, file), 'utf8')
    const calls = src.split(/rest\(|from\(/).filter((c) => c.includes('payment_transactions'))
    for (const call of calls) {
      for (const [, status] of call.matchAll(/status:\s*'([a-z_]+)'/g)) {
        assert.ok(
          TRANSACTION.includes(status),
          `${file} writes payment_transactions.status='${status}', which the check constraint rejects. Allowed: ${TRANSACTION.join(', ')}`,
        )
      }
    }
  }
})

test('the refund path removes access and does not swallow the failure', () => {
  const src = readFileSync(join(root, 'api/razorpay-webhook.js'), 'utf8')
  const refund = src.slice(src.indexOf('refund.processed'))
  assert.ok(
    /status:\s*'refunded'/.test(refund),
    'refund must set the entitlement to refunded',
  )
  assert.ok(
    /if \(!rev\.ok\)/.test(refund),
    'the refund write must be checked — an unchecked failure means a refunded customer keeps access',
  )
})

test('entitlement activation targets the active row, not an arbitrary one', () => {
  const src = readFileSync(join(root, 'api/_supabase.js'), 'utf8')
  const fn = src.slice(src.indexOf('export async function activateEntitlement'))
  assert.ok(
    /status=eq\.active/.test(fn),
    'activateEntitlement must filter to the active row; taking [0] of an unordered result can PATCH an expired row to active and collide with the partial unique index',
  )
})
