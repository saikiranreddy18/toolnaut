// Promo codes hand out paid access for free, which makes them the one feature
// where a bug is directly a revenue leak. Three things have to hold, and none
// of them can rest on the endpoint remembering to check:
//
//   1. Nobody can READ the codes. Listing promo_codes is handing them out.
//   2. Nobody can grant themselves a redemption. The insert is server-only.
//   3. The same person cannot redeem the same code twice — enforced by a unique
//      constraint, not by a handler that a retry or a double-click could race.
//
// Real PostgreSQL via PGlite, built from supabase/migrations.
import test, { describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = join(root, 'supabase/migrations')

const A = '0a000000-0000-4000-8000-00000000ff01'
const B = '0b000000-0000-4000-8000-00000000ff02'

let db = null

const PRELUDE = `
  create schema if not exists auth;
  create table if not exists auth.users (
    id uuid primary key, email text, created_at timestamptz not null default now()
  );
  create or replace function auth.uid() returns uuid language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  end $$;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public
    grant select, insert, update, delete on tables to anon, authenticated;
`

async function asRole(role, uid, sql) {
  await db.exec('begin')
  try {
    await db.exec(`set local role ${role}`)
    if (uid) await db.exec(`set local request.jwt.claims = '${JSON.stringify({ sub: uid, role })}'`)
    const res = await db.query(sql)
    await db.exec('commit')
    return res
  } catch (e) {
    await db.exec('rollback')
    throw e
  }
}
const asUser = (uid, sql) => asRole('authenticated', uid, sql)
const asAnon = (sql) => asRole('anon', null, sql)

before(async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  db = await PGlite.create()
  await db.exec(PRELUDE)
  for (const f of readdirSync(migrationsDir).filter((x) => x.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrationsDir, f), 'utf8'))
  }
  await db.exec(`insert into auth.users (id) values ('${A}'), ('${B}')`)
})

after(async () => { if (db) await db.close() })

describe('the launch codes are seeded as promised', () => {
  test('pro26 grants one month of Pro', async () => {
    const r = await db.query(`select plan_code, period_days, active, max_redemptions, expires_at
                              from public.promo_codes where code = 'pro26'`)
    assert.equal(r.rows.length, 1, 'pro26 is missing')
    assert.equal(r.rows[0].plan_code, 'guru', 'pro26 must unlock the Pro plan')
    assert.equal(Number(r.rows[0].period_days), 30, 'pro26 must grant 30 days')
    assert.equal(r.rows[0].active, true)
  })

  test('stu26 grants one month of Student', async () => {
    const r = await db.query(`select plan_code, period_days, active
                              from public.promo_codes where code = 'stu26'`)
    assert.equal(r.rows.length, 1, 'stu26 is missing')
    assert.equal(r.rows[0].plan_code, 'shishya', 'stu26 must unlock the Student plan')
    assert.equal(Number(r.rows[0].period_days), 30, 'stu26 must grant 30 days')
  })

  test('both codes point at a plan that actually exists', async () => {
    const r = await db.query(`
      select p.code from public.promo_codes p
      left join public.plans pl on pl.plan_code = p.plan_code
      where pl.plan_code is null
    `)
    assert.deepEqual(
      r.rows.map((x) => x.code), [],
      'a code unlocks a plan with no row in plans — redemption would grant an unknown plan',
    )
  })

  test('every code is capped and dated', async () => {
    const r = await db.query(`select code, max_redemptions, expires_at from public.promo_codes`)
    for (const c of r.rows) {
      assert.ok(c.max_redemptions > 0, `${c.code} is uncapped — a leak would grant unlimited free access`)
      assert.ok(c.expires_at, `${c.code} never expires — a leaked code would work forever`)
    }
  })
})

describe('codes cannot be discovered or self-granted', () => {
  test('an anonymous visitor cannot list the codes', async () => {
    const r = await asAnon(`select code from public.promo_codes`)
    assert.equal(r.rows.length, 0, 'LEAK: the promo codes are readable without signing in')
  })

  test('a signed-in user cannot list the codes', async () => {
    const r = await asUser(A, `select code from public.promo_codes`)
    assert.equal(r.rows.length, 0, 'LEAK: any signed-in user can read every valid promo code')
  })

  test('a user cannot invent a code for themselves', async () => {
    await assert.rejects(
      () => asUser(A, `insert into public.promo_codes (code, plan_code, period_days)
                       values ('freepro', 'guru', 3650)`),
      'CRITICAL: a user can mint their own promo code',
    )
  })

  test('a user cannot record a redemption for themselves', async () => {
    await assert.rejects(
      () => asUser(A, `insert into public.promo_redemptions (code, user_id)
                       values ('pro26', '${A}')`),
      'CRITICAL: a user can grant themselves a redemption without the server',
    )
  })
})

describe('one redemption per person, enforced by the database', () => {
  test('the same user cannot redeem the same code twice', async () => {
    await db.exec(`insert into public.promo_redemptions (code, user_id) values ('pro26', '${A}')`)
    await assert.rejects(
      () => db.exec(`insert into public.promo_redemptions (code, user_id) values ('pro26', '${A}')`),
      'a second redemption of the same code by the same user must be rejected',
    )
  })

  test('a different user may still redeem it', async () => {
    await db.exec(`insert into public.promo_redemptions (code, user_id) values ('pro26', '${B}')`)
    const r = await db.query(`select count(*)::int as n from public.promo_redemptions where code = 'pro26'`)
    assert.equal(r.rows[0].n, 2)
  })

  test('the same user may redeem a DIFFERENT code', async () => {
    await db.exec(`insert into public.promo_redemptions (code, user_id) values ('stu26', '${A}')`)
    const r = await db.query(`select count(*)::int as n from public.promo_redemptions where user_id = '${A}'`)
    assert.equal(r.rows[0].n, 2)
  })

  test('a user can see their own redemptions and nobody else’s', async () => {
    const mine = await asUser(A, `select code from public.promo_redemptions`)
    assert.ok(mine.rows.length >= 1, 'a user should be able to see what they redeemed')
    const theirs = await asUser(B, `select user_id from public.promo_redemptions`)
    assert.equal(
      theirs.rows.filter((x) => x.user_id === A).length, 0,
      'LEAK: one user can see another user redemptions',
    )
  })

  test('a redemption cannot reference a code that does not exist', async () => {
    await assert.rejects(
      () => db.exec(`insert into public.promo_redemptions (code, user_id) values ('nosuchcode', '${B}')`),
      'the foreign key should reject a redemption of an unknown code',
    )
  })
})

describe('the endpoint never leaks which part of a code was wrong', () => {
  test('every rejection returns the identical message', () => {
    const src = readFileSync(join(root, 'api/redeem-code.js'), 'utf8')
    // Count how many distinct strings are returned as `error` for a 400.
    const four00 = [...src.matchAll(/status\(400\)\.json\(\{\s*error:\s*([A-Za-z_]+|'[^']*')/g)]
      .map((m) => m[1])
    assert.ok(four00.length >= 4, `expected several 400 paths, found ${four00.length}`)
    const distinct = new Set(four00)
    assert.equal(
      distinct.size, 1,
      `400 responses use ${distinct.size} different messages (${[...distinct].join(', ')}). Differing messages let someone probe which codes exist.`,
    )
  })
})
