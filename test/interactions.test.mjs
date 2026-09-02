// The behavioural log — schema, isolation, and the one drift risk.
//
// user_tool_interactions is the first table written from the BROWSER whose rows
// are meant to become ranking input later. That makes two things worth proving
// now rather than after a year of data has accumulated:
//
//   1. One user cannot read, forge or rewrite another's behaviour. A log that
//      can be tampered with is worse than no log, because it looks like
//      evidence.
//   2. The action vocabulary in the code matches the CHECK constraint in the
//      database. These live in two files and would drift silently — the insert
//      would fail at runtime, be swallowed by the fire-and-forget write, and
//      the events would just quietly stop arriving.
//
// Same PGlite harness as test/rls-isolation.test.mjs: real PostgreSQL built
// from supabase/migrations, no Supabase project required.
import test, { describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = join(root, 'supabase/migrations')

const A = '0a000000-0000-4000-8000-0000000000aa'
const B = '0b000000-0000-4000-8000-0000000000bb'

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

async function asUser(uid, sql) {
  await db.exec('begin')
  try {
    await db.exec('set local role authenticated')
    await db.exec(`set local request.jwt.claims = '${JSON.stringify({ sub: uid, role: 'authenticated' })}'`)
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
  await db.exec(`insert into auth.users (id) values ('${A}'), ('${B}')`)
  await db.exec(`
    insert into public.user_tool_interactions (user_id, tool_slug, action, context)
    values ('${A}', 'cursor', 'saved', 'discover'),
           ('${B}', 'claude', 'saved', 'discover')
  `)
})

after(async () => { if (db) await db.close() })

describe('the table exists and holds what the code writes', () => {
  test('every column the store writes is present', async () => {
    const cols = (await db.query(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'user_tool_interactions'
    `)).rows.map((r) => r.column_name)
    for (const c of ['user_id', 'tool_slug', 'action', 'context', 'metadata', 'created_at']) {
      assert.ok(cols.includes(c), `user_tool_interactions.${c} is missing`)
    }
  })

  test('metadata defaults to an empty object so inserts can omit it', async () => {
    await db.exec(`insert into public.user_tool_interactions (user_id, tool_slug, action)
                   values ('${A}', 'windsurf', 'opened')`)
    const r = await db.query(`select metadata from public.user_tool_interactions
                              where tool_slug = 'windsurf'`)
    assert.deepEqual(r.rows[0].metadata, {})
  })

  // The drift guard. INTERACTIONS in the store and the CHECK in the migration
  // live in different files; if they diverge, the insert fails at runtime, the
  // fire-and-forget write swallows it, and events silently stop arriving.
  test('the code vocabulary matches the database CHECK exactly', async () => {
    const src = readFileSync(join(root, 'src/state/interactionsStore.js'), 'utf8')
    const block = src.slice(src.indexOf('export const INTERACTIONS'), src.indexOf('const VALID'))
    const inCode = [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort()

    const def = (await db.query(`
      select pg_get_constraintdef(con.oid) as d
      from pg_constraint con join pg_class rel on rel.oid = con.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
      where n.nspname = 'public' and rel.relname = 'user_tool_interactions'
        and con.contype = 'c' and pg_get_constraintdef(con.oid) like '%action%'
    `)).rows[0]?.d
    assert.ok(def, 'no CHECK constraint found on action')
    const inDb = [...def.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort()

    assert.deepEqual(
      inCode, inDb,
      `INTERACTIONS in the store and the database CHECK have drifted.\n  code: ${inCode.join(', ')}\n  db:   ${inDb.join(', ')}`,
    )
  })

  test('an unknown action is rejected by the database', async () => {
    await assert.rejects(
      () => db.exec(`insert into public.user_tool_interactions (user_id, tool_slug, action)
                     values ('${A}', 'cursor', 'yolo')`),
      'the CHECK constraint should reject an action outside the vocabulary',
    )
  })
})

describe('one user cannot see or forge another user behaviour', () => {
  test('A reads own rows', async () => {
    const r = await asUser(A, `select * from public.user_tool_interactions`)
    assert.ok(r.rows.length >= 1)
    assert.ok(r.rows.every((x) => x.user_id === A), 'A received rows belonging to someone else')
  })

  test('B cannot read A rows, even asking for everything', async () => {
    const r = await asUser(B, `select * from public.user_tool_interactions`)
    assert.equal(r.rows.filter((x) => x.user_id === A).length, 0, 'LEAK: B read A behaviour')
  })

  test('B cannot file a row under A', async () => {
    await assert.rejects(
      () => asUser(B, `insert into public.user_tool_interactions (user_id, tool_slug, action)
                       values ('${A}', 'forged', 'saved')`),
      'CRITICAL: B forged an interaction as A — the log would be worthless as evidence',
    )
  })

  test('the log is append-only: nobody can rewrite history', async () => {
    // No UPDATE policy exists, so this must affect zero rows even for the owner.
    const r = await asUser(A, `update public.user_tool_interactions
                               set action = 'dismissed' where user_id = '${A}'`)
    assert.equal(r.affectedRows ?? 0, 0, 'history was rewritten — the log cannot be trusted')
  })

  test('a user may erase their own history', async () => {
    await db.exec(`insert into public.user_tool_interactions (user_id, tool_slug, action)
                   values ('${B}', 'temp-tool', 'opened')`)
    const r = await asUser(B, `delete from public.user_tool_interactions where tool_slug = 'temp-tool'`)
    assert.ok((r.affectedRows ?? 0) >= 1, 'a user must be able to delete their own behavioural record')
  })

  test('anonymous callers see nothing', async () => {
    await db.exec('begin')
    await db.exec('set local role anon')
    const r = await db.query(`select * from public.user_tool_interactions`)
    await db.exec('commit')
    assert.equal(r.rows.length, 0, 'LEAK: anonymous read the behavioural log')
  })
})

// context is intentionally NOT a database CHECK — a new surface should not need
// a migration before it can log, and a rejected insert would vanish inside the
// fire-and-forget write. The drift it invites is real though: one page writing
// 'discover' and another 'discover_page' makes the column uncountable. So the
// guard lives here instead, and it reads the actual call sites rather than a
// list someone remembered to update.
describe('every context used in the app is a known one', () => {
  const PAGES = join(root, 'src/pages')

  function jsxFiles(dir) {
    const out = []
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) out.push(...jsxFiles(join(dir, e.name)))
      else if (e.name.endsWith('.jsx')) out.push(join(dir, e.name))
    }
    return out
  }

  // Comments discuss these functions by name — SharedStack.jsx explains that
  // "addToStack() already no-ops with no session" — and a scanner that counts
  // prose as a call site reports a failure nobody can fix.
  const code = (file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n')

  test('no call site invents a context spelling', async () => {
    const { CONTEXTS } = await import('../src/state/interactionsStore.js')
    const known = new Set(Object.values(CONTEXTS))
    const offenders = []
    for (const file of jsxFiles(PAGES)) {
      const src = code(file)
      for (const [, , ctx] of src.matchAll(
        /\b(addFavorite|removeFavorite|addToStack|removeFromStack)\([^,)]+,\s*'([^']+)'\)/g,
      )) {
        if (!known.has(ctx)) offenders.push(`${file.split(/[\\/]/).pop()}: '${ctx}'`)
      }
    }
    assert.deepEqual(
      offenders, [],
      `these call sites pass a context not listed in CONTEXTS — add it there, or fix the spelling:\n  ${offenders.join('\n  ')}`,
    )
  })

  test('the interaction stores are actually given a context', async () => {
    // The failure this catches: adding the parameter but never wiring the call
    // sites, so every row lands with context null and the column carries no
    // signal at all. That is exactly what happened on the first attempt.
    let withCtx = 0
    let withoutCtx = 0
    for (const file of jsxFiles(PAGES)) {
      const src = code(file)
      for (const [full] of src.matchAll(
        /\b(?:addFavorite|removeFavorite|addToStack|removeFromStack)\([^)]*\)/g,
      )) {
        if (/,\s*'[a-z_]+'\s*\)$/.test(full)) withCtx++
        else withoutCtx++
      }
    }
    assert.ok(withCtx > 0, 'no call site passes a context — the column would always be null')
    assert.equal(
      withoutCtx, 0,
      `${withoutCtx} call site(s) still log without a context, so those events cannot be told apart later`,
    )
  })
})

describe('the store degrades safely', () => {
  test('logInteraction is a no-op without Supabase, and never throws', async () => {
    // Import with no Supabase env configured — the guest and preview path.
    const mod = await import('../src/state/interactionsStore.js')
    assert.equal(typeof mod.logInteraction, 'function')
    // Guests, unknown actions and empty slugs must all return quietly.
    assert.doesNotThrow(() => mod.logInteraction('cursor', 'saved', 'discover'))
    assert.doesNotThrow(() => mod.logInteraction('cursor', 'not_a_real_action'))
    assert.doesNotThrow(() => mod.logInteraction('', 'saved'))
    assert.doesNotThrow(() => mod.logInteraction(null, 'saved'))
  })
})
