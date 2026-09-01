// Can a brand-new environment reproduce the schema from version control alone?
//
// That is a different question from "do the migration files look right", and it
// is the one that actually mattered here: production had been built from a
// migration AND a bootstrap script, so neither source alone reproduced it. A
// static test cannot catch that class of problem — only applying the migrations
// to an empty database and looking at what comes out can.
//
// This runs real PostgreSQL (PGlite, Postgres compiled to WASM) in-process, so
// it needs no Docker, no local server and no credentials, and it runs the same
// way in CI as on a laptop. It is the closest thing to "a new developer clones
// the repo and provisions a database" that fits in a unit test.
//
// Supabase provides `auth.users`, `auth.uid()` and the anon/authenticated roles
// at the platform level, so those are stubbed first — exactly the prerequisites
// a fresh Supabase project would already have. Everything after that is ours.
import test, { describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = join(root, 'supabase/migrations')

let db = null
let applied = []

// What a fresh Supabase project already has before any of our SQL runs.
// Mirrors the columns of the real Supabase auth.users that our migrations
// actually touch. 0001 backfills explorers with `select id, created_at from
// auth.users`, so an id-only stub would fail the migration and blame the
// migration for the stub's own gap.
const SUPABASE_PRELUDE = `
  create schema if not exists auth;
  create table if not exists auth.users (
    id         uuid primary key,
    email      text,
    created_at timestamptz not null default now()
  );
  -- security-invoker policies call this; with no JWT it is simply null, which
  -- is the correct answer for "no one is signed in".
  create or replace function auth.uid() returns uuid
    language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
  end $$;
`

before(async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  db = await PGlite.create()
  await db.exec(SUPABASE_PRELUDE)

  // Apply every migration, in filename order, exactly as a fresh project would.
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    try {
      await db.exec(sql)
      applied.push(file)
    } catch (e) {
      assert.fail(`migration ${file} failed on a clean database: ${e.message}`)
    }
  }
})

after(async () => { if (db) await db.close() })

const one = async (sql, params = []) => (await db.query(sql, params)).rows[0]
const all = async (sql, params = []) => (await db.query(sql, params)).rows

describe('a clean database built from supabase/migrations alone', () => {
  test('every migration applies without error', () => {
    assert.ok(applied.length >= 5, `expected at least 5 migrations, applied ${applied.length}`)
  })

  test('the payment tables all exist', async () => {
    for (const t of ['plans', 'payment_transactions', 'user_entitlements', 'webhook_events']) {
      const r = await one(
        `select to_regclass('public.' || $1) is not null as present`, [t],
      )
      assert.ok(r.present, `public.${t} does not exist on a fresh database`)
    }
  })

  // The exact failure this whole reconciliation exists to prevent: migrations
  // alone used to produce a database with no plans table, because plans lived
  // only in the bootstrap script.
  test('plans exists with the columns production has', async () => {
    const cols = (await all(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'plans'`,
    )).map((r) => r.column_name).sort()
    for (const c of ['plan_code', 'name', 'amount_paise', 'currency', 'period_days', 'active', 'created_at']) {
      assert.ok(cols.includes(c), `plans.${c} missing on a fresh database (have: ${cols.join(', ')})`)
    }
  })

  test('user_entitlements carries the columns that prove 0004 built it', async () => {
    const cols = (await all(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'user_entitlements'`,
    )).map((r) => r.column_name)
    for (const c of ['features', 'ends_at', 'payment_transaction_id', 'source']) {
      assert.ok(cols.includes(c), `user_entitlements.${c} missing — the retired bootstrap schema was used`)
    }
  })

  test('the three plans are seeded with a 30-day period', async () => {
    const rows = await all('select plan_code, amount_paise, period_days, active from public.plans order by plan_code')
    assert.equal(rows.length, 3, `expected 3 seeded plans, got ${rows.length}`)
    for (const r of rows) {
      assert.equal(Number(r.period_days), 30, `${r.plan_code} should grant 30 days, not ${r.period_days}`)
      assert.equal(r.active, true, `${r.plan_code} should be active`)
      assert.ok(Number(r.amount_paise) > 0, `${r.plan_code} needs a price`)
    }
  })

  // period_days is the future single source of truth for grant length. Assert
  // it matches what the API actually grants so the two cannot drift.
  test('plans.period_days matches the entitlement period the API grants', async () => {
    const src = readFileSync(join(root, 'api/_supabase.js'), 'utf8')
    const m = src.match(/periodDays\s*=\s*(\d+)/)
    assert.ok(m, 'could not find the default periodDays in api/_supabase.js')
    const rows = await all('select plan_code, period_days from public.plans')
    for (const r of rows) {
      assert.equal(
        Number(r.period_days), Number(m[1]),
        `plans.${r.plan_code}.period_days=${r.period_days} but activateEntitlement grants ${m[1]} days`,
      )
    }
  })

  test('the refund path can revoke access', async () => {
    // Insert a user + entitlement, then do exactly what the webhook does.
    await db.exec(`insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111')`)
    await db.exec(`
      insert into public.user_entitlements (user_id, plan_code, status, ends_at)
      values ('11111111-1111-1111-1111-111111111111', 'guru', 'active', now() + interval '30 days')
    `)
    await db.exec(`
      update public.user_entitlements set status = 'refunded'
      where user_id = '11111111-1111-1111-1111-111111111111' and status = 'active'
    `)
    const r = await one(`select status from public.user_entitlements
      where user_id = '11111111-1111-1111-1111-111111111111'`)
    assert.equal(r.status, 'refunded', 'the refund status write was rejected — refunds cannot revoke access')
  })

  test('row level security is enabled on every user-facing payment table', async () => {
    for (const t of ['plans', 'payment_transactions', 'user_entitlements', 'webhook_events']) {
      const r = await one(
        `select relrowsecurity from pg_class where oid = ('public.' || $1)::regclass`, [t],
      )
      assert.equal(r.relrowsecurity, true, `RLS is not enabled on public.${t}`)
    }
  })

  test('webhook_events has no policies — service role only', async () => {
    const rows = await all(
      `select policyname from pg_policies where schemaname = 'public' and tablename = 'webhook_events'`,
    )
    assert.equal(
      rows.length, 0,
      `webhook_events must have no RLS policies so no ordinary user can read it; found: ${rows.map((r) => r.policyname).join(', ')}`,
    )
  })

  test('own-row select policies exist for user-owned tables', async () => {
    for (const t of ['payment_transactions', 'user_entitlements']) {
      const rows = await all(
        `select policyname, cmd from pg_policies where schemaname = 'public' and tablename = $1`, [t],
      )
      assert.ok(rows.length > 0, `public.${t} has RLS enabled but no policy — nobody can read their own rows`)
      assert.ok(rows.some((r) => r.cmd === 'SELECT'), `public.${t} has no SELECT policy`)
    }
  })

  test('plans is publicly readable — the pricing page needs it signed out', async () => {
    const rows = await all(
      `select policyname from pg_policies where schemaname = 'public' and tablename = 'plans' and cmd = 'SELECT'`,
    )
    assert.ok(rows.length > 0, 'plans has no SELECT policy, so the pricing page would render empty')
  })

  test('the entitlement helper function exists and is security invoker', async () => {
    const r = await one(`
      select p.prosecdef from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'current_entitlement'
    `)
    assert.ok(r, 'public.current_entitlement() is missing on a fresh database')
    assert.equal(r.prosecdef, false, 'current_entitlement must be security INVOKER so RLS still applies to the caller')
  })

  test('one active entitlement per user is enforced by the database', async () => {
    await db.exec(`insert into auth.users (id) values ('22222222-2222-2222-2222-222222222222')`)
    await db.exec(`
      insert into public.user_entitlements (user_id, plan_code, status)
      values ('22222222-2222-2222-2222-222222222222', 'guru', 'active')
    `)
    await assert.rejects(
      () => db.exec(`
        insert into public.user_entitlements (user_id, plan_code, status)
        values ('22222222-2222-2222-2222-222222222222', 'shishya', 'active')
      `),
      'a second ACTIVE entitlement for the same user must be rejected — otherwise double-granting goes unnoticed',
    )
  })

  test('a payment order id cannot be recorded twice', async () => {
    await db.exec(`insert into auth.users (id) values ('33333333-3333-3333-3333-333333333333')`)
    await db.exec(`
      insert into public.payment_transactions (user_id, plan_code, amount_paise, razorpay_order_id)
      values ('33333333-3333-3333-3333-333333333333', 'guru', 79900, 'order_DUPE')
    `)
    await assert.rejects(
      () => db.exec(`
        insert into public.payment_transactions (user_id, plan_code, amount_paise, razorpay_order_id)
        values ('33333333-3333-3333-3333-333333333333', 'guru', 79900, 'order_DUPE')
      `),
      'duplicate razorpay_order_id must be rejected',
    )
  })

  test('a webhook event id cannot be recorded twice — idempotency is in the database', async () => {
    await db.exec(`
      insert into public.webhook_events (razorpay_event_id, event_type, payload)
      values ('evt_DUPE', 'payment.captured', '{}'::jsonb)
    `)
    await assert.rejects(
      () => db.exec(`
        insert into public.webhook_events (razorpay_event_id, event_type, payload)
        values ('evt_DUPE', 'payment.captured', '{}'::jsonb)
      `),
      'duplicate razorpay_event_id must be rejected — this is what makes webhook retries safe',
    )
  })
})
