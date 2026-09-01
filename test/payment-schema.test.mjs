// The payment schema must have exactly one canonical source.
//
// It did not. `supabase/payments.sql` and `supabase/migrations/0004_payments.sql`
// both defined the same three tables with different constraints, production was
// built from both, and the difference was not cosmetic: the bootstrap file's
// user_entitlements CHECK rejects the 'refunded' status the webhook writes, so a
// database built from it keeps refunded customers on paid access forever.
//
// These tests make the migrations the single source of truth and keep the SQL
// and the API code in agreement. They are static — no database is required —
// which is what lets them run in CI on every PR. See
// docs/payment-schema-inventory.md for what they cannot prove.
import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = join(root, 'supabase/migrations')
const migrationFiles = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
const migrations = migrationFiles.map((f) => readFileSync(join(migrationsDir, f), 'utf8')).join('\n')

// Tables the payment API reads or writes. Each must be created by a migration,
// not only by a bootstrap script someone may or may not have run.
const PAYMENT_TABLES = ['plans', 'payment_transactions', 'user_entitlements', 'webhook_events']

describe('the migrations are the single source of the payment schema', () => {
  for (const table of PAYMENT_TABLES) {
    test(`${table} is created by a migration`, () => {
      assert.ok(
        new RegExp(`create table if not exists public\\.${table}\\b`).test(migrations),
        `public.${table} is not created anywhere in supabase/migrations/. If it only exists in supabase/payments.sql, a fresh database will come up without it.`,
      )
    })
  }

  test('migration filenames carry unique numeric prefixes', () => {
    const seen = new Map()
    for (const f of migrationFiles) {
      const n = f.slice(0, 4)
      assert.ok(/^\d{4}$/.test(n), `${f} does not start with a 4-digit prefix`)
      assert.ok(!seen.has(n), `two migrations share prefix ${n}: ${seen.get(n)} and ${f}`)
      seen.set(n, f)
    }
  })
})

// Reads the allowed values out of a `status text ... check (status in (...))`
// declaration for one table, across all migrations.
function allowedStatuses(table, column = 'status') {
  const block = migrations.slice(migrations.indexOf(`create table if not exists public.${table}`))
  const m = block.match(
    new RegExp(`${column}\\s+text not null default '[a-z_]+' check \\(${column} in \\(([^)]+)\\)`),
  )
  assert.ok(m, `no ${column} check constraint found for ${table}`)
  return m[1].split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean)
}

describe('every status the API writes is accepted by the database', () => {
  const API_FILES = [
    'api/_supabase.js',
    'api/razorpay-webhook.js',
    'api/verify-payment.js',
    'api/create-order.js',
  ]

  for (const [table, column] of [['user_entitlements', 'status'], ['payment_transactions', 'status']]) {
    test(`${table}.${column}`, () => {
      const allowed = allowedStatuses(table, column)
      for (const file of API_FILES) {
        let src
        try { src = readFileSync(join(root, file), 'utf8') } catch { continue }
        // Only look at rest()/from() calls that mention this table, so a status
        // literal meant for the other table is not mis-attributed.
        const calls = src.split(/rest\(|from\(/).filter((c) => c.includes(table))
        for (const call of calls) {
          for (const [, status] of call.matchAll(/status:\s*'([a-z_]+)'/g)) {
            assert.ok(
              allowed.includes(status),
              `${file} writes ${table}.${column}='${status}', which the CHECK rejects. Allowed: ${allowed.join(', ')}`,
            )
          }
        }
      }
    })
  }

  test('the refund path can actually revoke access', () => {
    // The specific bug this whole file exists to prevent.
    assert.ok(
      allowedStatuses('user_entitlements').includes('refunded'),
      'user_entitlements.status must permit refunded, or every refund throws and the customer keeps paid access',
    )
  })
})

describe('the retired bootstrap script cannot be mistaken for setup', () => {
  const bootstrapPath = join(root, 'supabase/payments.sql')
  let bootstrap = null
  try { bootstrap = readFileSync(bootstrapPath, 'utf8') } catch { /* already deleted — fine */ }

  test('it is marked obsolete while it still exists', () => {
    if (bootstrap === null) return // deleted, nothing to guard
    assert.ok(
      /OBSOLETE|DO NOT RUN|RETIRED/i.test(bootstrap.slice(0, 700)),
      'supabase/payments.sql still exists but is not marked obsolete at the top. Running it on a fresh database produces a schema where refunds cannot revoke access.',
    )
  })

  test('no doc instructs anyone to run it', () => {
    if (bootstrap === null) return
    const docs = join(root, 'docs')
    for (const f of readdirSync(docs).filter((d) => d.endsWith('.md'))) {
      const text = readFileSync(join(docs, f), 'utf8')
      for (const line of text.split('\n')) {
        if (!line.includes('payments.sql')) continue
        // Mentioning it as retired history is fine; telling someone to run it is not.
        assert.ok(
          !/^\s*\d*\.?\s*(run|apply|execute)\b/i.test(line),
          `docs/${f} still instructs running payments.sql: "${line.trim()}"`,
        )
      }
    }
  })
})
