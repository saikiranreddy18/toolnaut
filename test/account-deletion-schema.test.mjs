// Account deletion, run against a real Postgres (PGlite) built from
// supabase/migrations alone — the same database fresh-schema.test.mjs builds.
//
// What must be true after a person deletes their account:
//   - nothing that identifies them is left in any table
//   - their payments still exist, with amounts intact, and no link to them
//   - the stored Razorpay payloads no longer carry their email or phone
//   - a different account is untouched
//   - the sign-in record can then actually be deleted (no foreign key blocks it)
//   - no browser role can call the erase function
import { describe, test, before, after } from 'node:test'
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

const GONE = '11111111-1111-4111-8111-111111111111'
const KEPT = '22222222-2222-4222-8222-222222222222'
const GONE_EMAIL = 'Leaving@Example.com'
const KEPT_EMAIL = 'staying@example.com'

let db
const one = async (sql, p = []) => (await db.query(sql, p)).rows[0]
const count = async (sql, p = []) => Number((await one(sql, p)).n)

function paymentEvent(orderId, userId, email, phone) {
  return JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: {
      id: `pay_${orderId}`, order_id: orderId, amount: 79900, currency: 'INR', status: 'captured',
      email, contact: phone, vpa: 'someone@okbank', card: { name: 'Card Holder', last4: '4242' },
      notes: { user_id: userId, plan: 'guru' },
    } } },
  })
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

  for (const [id, email, order] of [[GONE, GONE_EMAIL, 'order_GONE'], [KEPT, KEPT_EMAIL, 'order_KEPT']]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [id, email])
    await db.query('insert into public.explorers (id) values ($1) on conflict do nothing', [id])
    await db.query(`insert into public.profiles (id, quiz_answers) values ($1, '{"role":"designer"}')`, [id])
    await db.query(`insert into public.tool_refs (user_id, tool_slug, kind) values ($1, 'figma', 'stack')`, [id])
    await db.query(`insert into public.roadmap_progress (user_id, step_key) values ($1, 'w1-s1')`, [id])
    const tx = await one(
      `insert into public.payment_transactions (user_id, plan_code, amount_paise, status, razorpay_order_id)
       values ($1, 'guru', 79900, 'captured', $2) returning id`, [id, order])
    await db.query(
      `insert into public.user_entitlements (user_id, plan_code, payment_transaction_id) values ($1, 'guru', $2)`,
      [id, tx.id])
    await db.query(
      `insert into public.webhook_events (razorpay_event_id, event_type, payload) values ($1, 'payment.captured', $2::jsonb)`,
      [`evt_${order}`, paymentEvent(order, id, email, '+919999999999')])
    await db.query('insert into public.alert_subscribers (email) values ($1)', [email.toLowerCase()])
    await db.query(
      `insert into public.account_deletion_codes (user_id, code_hash, expires_at) values ($1, 'abc', now() + interval '10 minutes')`,
      [id])
  }
})

after(async () => { if (db) await db.close() })

describe('deleting an account', () => {
  test('the erase runs as one call and reports what it did', async () => {
    const result = (await one('select public.delete_account_data($1, $2) as r', [GONE, GONE_EMAIL])).r
    assert.equal(result.payments_anonymised, 1)
    assert.equal(result.webhook_events_scrubbed, 1)
    assert.equal(result.alert_subscriptions_removed, 1, 'email match must ignore case')
  })

  test('nothing personal is left for that person', async () => {
    assert.equal(await count('select count(*) n from public.profiles where id = $1', [GONE]), 0)
    assert.equal(await count('select count(*) n from public.explorers where id = $1', [GONE]), 0)
    assert.equal(await count('select count(*) n from public.tool_refs where user_id = $1', [GONE]), 0)
    assert.equal(await count('select count(*) n from public.roadmap_progress where user_id = $1', [GONE]), 0)
    assert.equal(await count('select count(*) n from public.user_entitlements where user_id = $1', [GONE]), 0)
    assert.equal(await count('select count(*) n from public.account_deletion_codes where user_id = $1', [GONE]), 0)
    assert.equal(await count('select count(*) n from public.alert_subscribers where lower(email) = lower($1)', [GONE_EMAIL]), 0)
    assert.equal(await count('select count(*) n from public.payment_transactions where user_id = $1', [GONE]), 0)
  })

  test('their payment is kept, amount intact, with no link back to them', async () => {
    const p = await one(`select user_id, amount_paise, status, plan_code from public.payment_transactions where razorpay_order_id = 'order_GONE'`)
    assert.ok(p, 'the payment record must survive')
    assert.equal(p.user_id, null)
    assert.equal(p.amount_paise, 79900)
    assert.equal(p.status, 'captured')
    assert.equal(p.plan_code, 'guru')
  })

  test('the stored Razorpay payload keeps the payment but loses who paid', async () => {
    const { payload } = await one(`select payload from public.webhook_events where razorpay_event_id = 'evt_order_GONE'`)
    const entity = payload.payload.payment.entity
    for (const k of ['email', 'contact', 'vpa', 'card']) assert.equal(entity[k], undefined, `${k} must be removed`)
    assert.equal(entity.notes.user_id, undefined)
    assert.equal(entity.id, 'pay_order_GONE')
    assert.equal(entity.amount, 79900)
    assert.equal(entity.notes.plan, 'guru', 'non-personal notes stay')
  })

  test('the other account is untouched', async () => {
    assert.equal(await count('select count(*) n from public.profiles where id = $1', [KEPT]), 1)
    assert.equal(await count('select count(*) n from public.tool_refs where user_id = $1', [KEPT]), 1)
    assert.equal(await count('select count(*) n from public.user_entitlements where user_id = $1', [KEPT]), 1)
    assert.equal(await count('select count(*) n from public.payment_transactions where user_id = $1', [KEPT]), 1)
    assert.equal(await count('select count(*) n from public.alert_subscribers where email = $1', [KEPT_EMAIL]), 1)
    const { payload } = await one(`select payload from public.webhook_events where razorpay_event_id = 'evt_order_KEPT'`)
    assert.equal(payload.payload.payment.entity.email, KEPT_EMAIL)
  })

  test('running it again is harmless, so a failed second step can be retried', async () => {
    const again = (await one('select public.delete_account_data($1, $2) as r', [GONE, GONE_EMAIL])).r
    assert.equal(again.payments_anonymised, 0)
    assert.equal(await count(`select count(*) n from public.payment_transactions where razorpay_order_id = 'order_GONE'`), 1)
  })

  test('the sign-in record can then be deleted, and payments still survive it', async () => {
    await db.query('delete from auth.users where id = $1', [GONE])
    assert.equal(await count(`select count(*) n from public.payment_transactions where razorpay_order_id = 'order_GONE'`), 1)
  })

  test("deleting a sign-in record directly still keeps that person's payments", async () => {
    // The foreign key itself must not cascade into payments — belt and braces
    // for any path that removes an auth user without calling the erase first.
    await db.query('delete from auth.users where id = $1', [KEPT])
    const p = await one(`select user_id from public.payment_transactions where razorpay_order_id = 'order_KEPT'`)
    assert.ok(p)
    assert.equal(p.user_id, null)
    assert.equal(await count('select count(*) n from public.user_entitlements where user_id = $1', [KEPT]), 0)
  })

  test('no browser role can call the erase function', async () => {
    for (const role of ['anon', 'authenticated']) {
      const { ok } = await one(
        `select has_function_privilege($1, 'public.delete_account_data(uuid,text)', 'execute') as ok`, [role])
      assert.equal(ok, false, `${role} must not be able to erase accounts`)
    }
    const { ok } = await one(
      `select has_function_privilege('service_role', 'public.delete_account_data(uuid,text)', 'execute') as ok`)
    assert.equal(ok, true)
  })
})
