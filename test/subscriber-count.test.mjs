// public.subscriber_count(), run against a real Postgres (PGlite) built from
// supabase/migrations alone.
//
// This number goes on the landing page, so it has to count exactly one thing:
// people with a PAID plan that is active right now. Trials, expired plans and
// cancelled or refunded plans must not count, a lifetime plan must, and a
// person with two paid rows is still one subscriber.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = join(root, 'supabase/migrations')

const SUPABASE_PRELUDE = `
  create schema if not exists auth;
  create table if not exists auth.users (
    id         uuid primary key,
    email      text,
    created_at timestamptz not null default now()
  );
  create or replace function auth.uid() returns uuid
    language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
  end $$;
`

let db
const one = async (sql, p = []) => (await db.query(sql, p)).rows[0]
const u = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

async function entitlement(userId, { status = 'active', source = 'razorpay_payment', endsAt = 'future' } = {}) {
  const ends = endsAt === 'future' ? "now() + interval '20 days'"
    : endsAt === 'past' ? "now() - interval '1 day'"
      : 'null'
  await db.query(
    `insert into public.user_entitlements (user_id, plan_code, status, source, ends_at)
     values ($1, 'guru', $2, $3, ${ends})`,
    [userId, status, source],
  )
}

before(async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  db = await PGlite.create()
  await db.exec(SUPABASE_PRELUDE)
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await db.exec(readFileSync(join(migrationsDir, file), 'utf8'))
    } catch (e) {
      assert.fail(`migration ${file} failed on a clean database: ${e.message}`)
    }
  }
  for (let i = 1; i <= 8; i++) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [u(i), `user${i}@example.com`])
  }
})

after(async () => { if (db) await db.close() })

test('an empty database has zero subscribers', async () => {
  assert.equal(Number((await one('select public.subscriber_count() as n')).n), 0)
})

test('only active, paid, unexpired plans count — and each person once', async () => {
  await entitlement(u(1))                                   // active paid        -> counts
  await entitlement(u(2), { endsAt: 'lifetime' })           // lifetime founder   -> counts
  await entitlement(u(3), { source: 'trial' })              // free trial         -> no
  await entitlement(u(4), { endsAt: 'past' })               // expired paid       -> no
  await entitlement(u(5), { status: 'cancelled' })          // cancelled          -> no
  await entitlement(u(6), { status: 'refunded' })           // refunded           -> no
  // one person, two paid rows (an old expired pass and a current one) -> one
  await entitlement(u(7), { endsAt: 'past', status: 'expired' })
  await entitlement(u(7))

  assert.equal(Number((await one('select public.subscriber_count() as n')).n), 3)
})

test('the landing page can call it signed out, but still cannot read who', async () => {
  for (const role of ['anon', 'authenticated']) {
    const { ok } = await one(`select has_function_privilege($1, 'public.subscriber_count()', 'execute') as ok`, [role])
    assert.equal(ok, true, `${role} must be able to read the count`)
  }
  const { rls } = await one(`select relrowsecurity as rls from pg_class where oid = 'public.user_entitlements'::regclass`)
  assert.equal(rls, true, 'the rows themselves stay behind row level security')
})
