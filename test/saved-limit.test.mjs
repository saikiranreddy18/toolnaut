// The Student plan's 10-saved-tools limit, run against a real Postgres (PGlite)
// built from supabase/migrations alone.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PLANS, savedLimitFor } from '../src/utils/planData.js'

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

const STUDENT = '10000000-0000-4000-8000-000000000001'
const PRO = '10000000-0000-4000-8000-000000000002'
const TRIAL = '10000000-0000-4000-8000-000000000003'
const NONE = '10000000-0000-4000-8000-000000000004'
const LAPSED = '10000000-0000-4000-8000-000000000005'

let db
const one = async (sql, p = []) => (await db.query(sql, p)).rows[0]

async function save(user, n, kind = 'saved', offset = 0) {
  for (let i = 0; i < n; i++) {
    await db.query('insert into public.tool_refs (user_id, tool_slug, kind) values ($1, $2, $3)', [user, `tool-${offset + i}`, kind])
  }
}
const savedCount = async (user) => Number((await one(`select count(*) n from public.tool_refs where user_id = $1 and kind = 'saved'`, [user])).n)

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
  for (const id of [STUDENT, PRO, TRIAL, NONE, LAPSED]) {
    await db.query('insert into auth.users (id) values ($1)', [id])
  }
  const grant = (user, plan, extra = '') => db.query(
    `insert into public.user_entitlements (user_id, plan_code, status, source, ends_at)
     values ($1, $2, 'active', ${extra.includes('trial') ? "'trial'" : "'razorpay_payment'"}, ${extra.includes('past') ? "now() - interval '1 day'" : "now() + interval '20 days'"})`,
    [user, plan],
  )
  await grant(STUDENT, 'shishya')
  await grant(PRO, 'guru')
  await grant(TRIAL, 'trial', 'trial')
  await grant(LAPSED, 'shishya', 'past')
})

after(async () => { if (db) await db.close() })

test('the database limit matches the plan the pricing page describes', () => {
  const student = PLANS.find((p) => p.id === 'shishya')
  assert.equal(student.limits?.saved, 10)
  const sql = readFileSync(join(migrationsDir, '0010_saved_limit.sql'), 'utf8')
  assert.match(sql, new RegExp(`when 'shishya' then ${student.limits.saved}\\b`), 'SQL and planData disagree on the limit')
})

test('a Student can save 10 tools and is refused the 11th', async () => {
  await save(STUDENT, 10)
  assert.equal(await savedCount(STUDENT), 10)
  await assert.rejects(() => save(STUDENT, 1, 'saved', 10), /saved_limit_reached:10/)
  assert.equal(await savedCount(STUDENT), 10)
})

test('stack tools are never limited', async () => {
  await save(STUDENT, 15, 'stack', 100)
  assert.equal(Number((await one(`select count(*) n from public.tool_refs where user_id = $1 and kind = 'stack'`, [STUDENT])).n), 15)
})

test('a single bulk insert of eleven is refused as a whole', async () => {
  await db.query(`delete from public.tool_refs where user_id = $1 and kind = 'saved'`, [STUDENT])
  const values = Array.from({ length: 11 }, (_, i) => `('${STUDENT}', 'bulk-${i}', 'saved')`).join(',')
  await assert.rejects(() => db.query(`insert into public.tool_refs (user_id, tool_slug, kind) values ${values}`), /saved_limit_reached:10/)
  assert.equal(await savedCount(STUDENT), 0, 'nothing from the refused statement is kept')
  const ten = Array.from({ length: 10 }, (_, i) => `('${STUDENT}', 'bulk-${i}', 'saved')`).join(',')
  await db.query(`insert into public.tool_refs (user_id, tool_slug, kind) values ${ten}`)
  assert.equal(await savedCount(STUDENT), 10, 'retrying with the first ten succeeds')
})

test('Pro, trial, no plan, and a lapsed Student are not limited', async () => {
  for (const user of [PRO, TRIAL, NONE, LAPSED]) {
    await save(user, 25)
    assert.equal(await savedCount(user), 25, `${user} should save without a cap`)
  }
})

test('the app reads the same rule from an entitlement', () => {
  assert.equal(savedLimitFor({ active: true, trial: false, plan: 'shishya' }), 10)
  assert.equal(savedLimitFor({ active: true, trial: false, plan: 'guru' }), null)
  assert.equal(savedLimitFor({ active: true, trial: false, plan: 'founder' }), null)
  assert.equal(savedLimitFor({ active: true, trial: true, plan: 'trial' }), null)
  assert.equal(savedLimitFor({ active: false, plan: 'shishya' }), null)
  assert.equal(savedLimitFor({ loading: true }), null)
  assert.equal(savedLimitFor(null), null)
})
