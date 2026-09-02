// Can User B reach User A's data? Proven, not assumed.
//
// This was the single most important unverified property in the product: every
// audit could say "RLS policies exist", and none could say "isolation works".
// Policies existing is not the same claim — a policy with the wrong column, a
// table with RLS enabled but no policy, or a table with RLS forgotten entirely
// all look fine in a migration diff.
//
// The test runs against real PostgreSQL (PGlite) built from supabase/migrations,
// and exercises the ACTUAL security boundary the database enforces, using the
// same mechanism Supabase uses in production:
//
//     set local role authenticated;
//     set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';
//
// It needs no Supabase project and no throwaway accounts, because the boundary
// being tested is in Postgres, not in the auth service.
//
// WHAT THIS PROVES: the policies as defined in supabase/migrations isolate
// tenants correctly, for select, insert, update and delete, for a second signed-in
// user and for an anonymous caller.
// WHAT IT DOES NOT PROVE: that the LIVE production database still carries those
// exact policies. Schema drift is a separate question — see
// docs/payment-schema-inventory.md.
import test, { describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = join(root, 'supabase/migrations')

const A = '0a000000-0000-4000-8000-00000000000a'
const B = '0b000000-0000-4000-8000-00000000000b'

let db = null

// Reproduces the parts of a real Supabase project our policies depend on.
//
// The GRANTs matter and are not a shortcut: in Supabase the anon and
// authenticated roles genuinely CAN reach every table in public — RLS is the
// only thing that stops them. A test without grants would "pass" because of a
// missing privilege rather than because of a working policy, which is exactly
// the false confidence this file exists to avoid.
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
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role bypassrls; end if;
  end $$;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public
    grant select, insert, update, delete on tables to anon, authenticated, service_role;
`

// Run a statement as a signed-in user, exactly as PostgREST does per request.
async function asUser(uid, sql) {
  await db.exec('begin')
  try {
    await db.exec(`set local role authenticated`)
    await db.exec(`set local request.jwt.claims = '${JSON.stringify({ sub: uid, role: 'authenticated' })}'`)
    const res = await db.query(sql)
    await db.exec('commit')
    return res
  } catch (e) {
    await db.exec('rollback')
    throw e
  }
}

async function asAnon(sql) {
  await db.exec('begin')
  try {
    await db.exec(`set local role anon`)
    const res = await db.query(sql)
    await db.exec('commit')
    return res
  } catch (e) {
    await db.exec('rollback')
    throw e
  }
}

before(async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  db = await PGlite.create()
  await db.exec(PRELUDE)
  for (const f of readdirSync(migrationsDir).filter((x) => x.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrationsDir, f), 'utf8'))
  }

  // Seed as the owner (RLS does not apply) — this is the service-role path.
  await db.exec(`insert into auth.users (id) values ('${A}'), ('${B}')`)
  await db.exec(`
    insert into public.profiles (id, avatar_id) values ('${A}', 'RLS_TEST_A'), ('${B}', 'RLS_TEST_B');
    insert into public.tool_refs (user_id, tool_slug, kind)
      values ('${A}', 'RLS_TEST_STACK_A', 'stack'), ('${B}', 'RLS_TEST_STACK_B', 'stack');
    insert into public.roadmap_progress (user_id, step_key)
      values ('${A}', 'RLS_TEST_STEP_A'), ('${B}', 'RLS_TEST_STEP_B');
    insert into public.payment_transactions (user_id, plan_code, amount_paise, razorpay_order_id)
      values ('${A}', 'guru', 79900, 'order_RLS_TEST_A'), ('${B}', 'guru', 79900, 'order_RLS_TEST_B');
    insert into public.user_entitlements (user_id, plan_code, status, ends_at)
      values ('${A}', 'guru', 'active', now() + interval '30 days'),
             ('${B}', 'guru', 'active', now() + interval '30 days');
    insert into public.webhook_events (razorpay_event_id, event_type, payload)
      values ('evt_RLS_TEST', 'payment.captured', '{}'::jsonb);
  `)
})

after(async () => { if (db) await db.close() })

const OWNED = [
  { table: 'profiles', owner: 'id', aRow: `id = '${A}'` },
  { table: 'tool_refs', owner: 'user_id', aRow: `user_id = '${A}'` },
  { table: 'roadmap_progress', owner: 'user_id', aRow: `user_id = '${A}'` },
  { table: 'payment_transactions', owner: 'user_id', aRow: `user_id = '${A}'` },
  { table: 'user_entitlements', owner: 'user_id', aRow: `user_id = '${A}'` },
]

describe('user A can reach their own data', () => {
  for (const { table, aRow } of OWNED) {
    test(`${table}: A selects own row`, async () => {
      const r = await asUser(A, `select * from public.${table} where ${aRow}`)
      assert.equal(r.rows.length, 1, `A cannot read their own ${table} row — the policy is too strict`)
    })
  }
})

describe('user B cannot READ user A data', () => {
  for (const { table, aRow } of OWNED) {
    test(`${table}: B selects A row by known id -> 0 rows`, async () => {
      const r = await asUser(B, `select * from public.${table} where ${aRow}`)
      assert.equal(r.rows.length, 0, `LEAK: user B read user A's ${table} row`)
    })
    test(`${table}: B unfiltered select never returns A rows`, async () => {
      // The bulk-query attack: no where clause at all.
      const r = await asUser(B, `select * from public.${table}`)
      const leaked = r.rows.filter((row) => (row.user_id ?? row.id) === A)
      assert.equal(leaked.length, 0, `LEAK: unfiltered select on ${table} exposed ${leaked.length} of user A's rows`)
    })
  }
})

describe('user B cannot WRITE to user A data', () => {
  test('tool_refs: B updates A row -> 0 rows affected', async () => {
    const r = await asUser(B, `update public.tool_refs set kind = 'RLS_ATTACK' where user_id = '${A}'`)
    assert.equal(r.affectedRows ?? 0, 0, 'LEAK: user B modified user A tool_refs')
    const after = await db.query(`select kind from public.tool_refs where user_id = '${A}'`)
    assert.equal(after.rows[0].kind, 'stack', 'LEAK: user A data was mutated by user B')
  })

  test('tool_refs: B deletes A row -> 0 rows affected', async () => {
    const r = await asUser(B, `delete from public.tool_refs where user_id = '${A}'`)
    assert.equal(r.affectedRows ?? 0, 0, 'LEAK: user B deleted user A tool_refs')
    const after = await db.query(`select count(*)::int as n from public.tool_refs where user_id = '${A}'`)
    assert.equal(after.rows[0].n, 1, 'LEAK: user A row disappeared')
  })

  test('tool_refs: B inserts a row owned by A -> rejected', async () => {
    await assert.rejects(
      () => asUser(B, `insert into public.tool_refs (user_id, tool_slug, kind)
                       values ('${A}', 'FORGED_BY_B', 'stack')`),
      'LEAK: user B inserted a row owned by user A',
    )
  })

  test('profiles: B updates A profile -> 0 rows affected', async () => {
    const r = await asUser(B, `update public.profiles set avatar_id = 'RLS_ATTACK' where id = '${A}'`)
    assert.equal(r.affectedRows ?? 0, 0, 'LEAK: user B modified user A profile')
  })
})

// The money tables. A user may READ their own; only the server may write any.
describe('no signed-in user can write payment or entitlement state', () => {
  test('payment_transactions: A cannot insert their own payment', async () => {
    await assert.rejects(
      () => asUser(A, `insert into public.payment_transactions (user_id, plan_code, amount_paise, razorpay_order_id)
                       values ('${A}', 'pandava', 1, 'order_SELF_GRANTED')`),
      'CRITICAL: a user can fabricate their own payment record',
    )
  })

  test('user_entitlements: A cannot grant themselves access', async () => {
    await assert.rejects(
      () => asUser(A, `insert into public.user_entitlements (user_id, plan_code, status)
                       values ('${A}', 'pandava', 'active')`),
      'CRITICAL: a user can grant themselves a paid plan',
    )
  })

  test('user_entitlements: A cannot extend their own expiry', async () => {
    const r = await asUser(A, `update public.user_entitlements
                               set ends_at = now() + interval '3650 days' where user_id = '${A}'`)
    assert.equal(r.affectedRows ?? 0, 0, 'CRITICAL: a user extended their own paid access')
  })

  test('payment_transactions: A cannot mark a payment captured', async () => {
    const r = await asUser(A, `update public.payment_transactions
                               set status = 'captured' where user_id = '${A}'`)
    assert.equal(r.affectedRows ?? 0, 0, 'CRITICAL: a user marked their own payment captured')
  })
})

describe('webhook_events is invisible to everyone but the server', () => {
  test('signed-in user reads zero rows', async () => {
    const r = await asUser(A, `select * from public.webhook_events`)
    assert.equal(r.rows.length, 0, 'LEAK: a signed-in user can read raw payment provider events')
  })
  test('anonymous reads zero rows', async () => {
    const r = await asAnon(`select * from public.webhook_events`)
    assert.equal(r.rows.length, 0, 'LEAK: anonymous can read raw payment provider events')
  })
  test('signed-in user cannot insert a forged event', async () => {
    await assert.rejects(
      () => asUser(A, `insert into public.webhook_events (razorpay_event_id, event_type, payload)
                       values ('evt_FORGED', 'payment.captured', '{}'::jsonb)`),
      'CRITICAL: a user can forge a payment webhook event',
    )
  })
})

describe('anonymous callers', () => {
  for (const { table } of OWNED) {
    test(`${table}: anonymous reads zero rows`, async () => {
      const r = await asAnon(`select * from public.${table}`)
      assert.equal(r.rows.length, 0, `LEAK: anonymous read ${table}`)
    })
  }

  test('plans stays publicly readable — the pricing page needs it signed out', async () => {
    // Count-agnostic on purpose. This asserts the POLICY works, not how many
    // plans exist; pinning the number meant adding the founder plan broke a
    // security test for a reason that had nothing to do with security.
    const r = await asAnon(`select plan_code from public.plans`)
    const seeded = await db.query(`select count(*)::int as n from public.plans`)
    assert.ok(r.rows.length > 0, 'the pricing page would render empty for signed-out visitors')
    assert.equal(
      r.rows.length, seeded.rows[0].n,
      'an anonymous visitor sees fewer plans than exist — some would be invisible on the pricing page',
    )
  })

  test('anonymous cannot rewrite a plan price', async () => {
    const r = await asAnon(`update public.plans set amount_paise = 1 where plan_code = 'guru'`)
    assert.equal(r.affectedRows ?? 0, 0, 'CRITICAL: anonymous changed a plan price')
  })
})
