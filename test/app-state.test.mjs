// First tests over src/ — the audit found 102 tests in the repo and zero
// covering the application itself. These start where the risk is: the
// open-redirect guard and the per-account storage scoping, both of which fail
// silently in a browser if they regress.
//
// The browser globals are shimmed BEFORE the modules under test are imported,
// which is why the imports are dynamic — a static import would evaluate the
// module against an empty global scope and crash.
import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}
globalThis.window = { location: { origin: 'https://toolnaut.xyz' } }

const { safeNextPath, postAuthDestination } = await import('../src/utils/postAuth.js')
const scoped = await import('../src/state/scopedStorage.js')

describe('safeNextPath — open-redirect guard', () => {
  test('keeps a plain internal path', () => {
    assert.equal(safeNextPath('/app/discover'), '/app/discover')
  })
  test('keeps query and hash', () => {
    assert.equal(safeNextPath('/app/compare?tools=a,b#top'), '/app/compare?tools=a,b#top')
  })
  test('rejects an absolute external URL', () => {
    assert.equal(safeNextPath('https://evil.example/phish'), '/app/stack')
  })
  test('rejects a protocol-relative URL — startsWith("/") would pass this', () => {
    assert.equal(safeNextPath('//evil.example/phish'), '/app/stack')
  })
  test('rejects backslash normalisation — /\\evil.example', () => {
    assert.equal(safeNextPath('/\\evil.example'), '/app/stack')
  })
  test('neutralises a slashless scheme — https:evil.example', () => {
    // The URL spec parses a special scheme MATCHING the base's scheme as a
    // relative reference (legacy quirk), so the browser itself would resolve
    // this to toolnaut.xyz/evil.example — same origin, no redirect. The guard
    // mirrors the browser exactly; the property to assert is "stays internal",
    // not any one literal fallback string.
    const out = safeNextPath('https:evil.example')
    assert.ok(out.startsWith('/') && !out.startsWith('//'), `stays an internal path, got ${out}`)
  })
  test('rejects javascript: URLs', () => {
    assert.equal(safeNextPath('javascript:alert(1)'), '/app/stack')
  })
  test('null and undefined fall back', () => {
    assert.equal(safeNextPath(null), '/app/stack')
    assert.equal(safeNextPath(undefined), '/app/stack')
  })
})

describe('postAuthDestination — routing after sign-in', () => {
  beforeEach(() => store.clear())

  test('no completed intake -> /goal regardless of request', () => {
    assert.equal(postAuthDestination('/app/favorites'), '/goal')
  })
  test('completed intake -> honours the (safe) request', () => {
    store.set('exus_quiz_v1', JSON.stringify({ completed: true, answers: {} }))
    assert.equal(postAuthDestination('/app/favorites'), '/app/favorites')
  })
  test('completed intake + malicious next -> falls back, never off-site', () => {
    store.set('exus_quiz_v1', JSON.stringify({ completed: true, answers: {} }))
    assert.equal(postAuthDestination('https://evil.example'), '/app/stack')
    assert.equal(postAuthDestination('//evil.example'), '/app/stack')
  })
})

describe('scopedStorage — per-account keys', () => {
  const signIn = (id) => store.set('exus_session_v1', JSON.stringify({ user: { id, name: 'T' } }))
  const signOut = () => store.delete('exus_session_v1')
  beforeEach(() => store.clear())

  test('guest reads/writes the bare key', () => {
    scoped.write('exus_stack_v1', ['cursor'])
    assert.equal(store.get('exus_stack_v1'), '["cursor"]')
    assert.deepEqual(scoped.read('exus_stack_v1'), ['cursor'])
  })

  test('signed-in reads/writes the uid-scoped key', () => {
    signIn('uid-A')
    scoped.write('exus_stack_v1', ['n8n'])
    assert.equal(store.get('exus_stack_v1::uid-A'), '["n8n"]')
    assert.equal(store.has('exus_stack_v1'), false)
  })

  test('a second account cannot see the first account\'s data', () => {
    signIn('uid-A')
    scoped.write('exus_stack_v1', ['n8n'])
    signIn('uid-B')
    assert.deepEqual(scoped.read('exus_stack_v1', []), [])
  })

  test('signing out hides account data without deleting it', () => {
    signIn('uid-A')
    scoped.write('exus_stack_v1', ['n8n'])
    signOut()
    assert.deepEqual(scoped.read('exus_stack_v1', []), [])
    assert.equal(store.get('exus_stack_v1::uid-A'), '["n8n"]')
  })

  test('corrupt JSON returns the fallback instead of throwing', () => {
    store.set('exus_stack_v1', '{not json')
    assert.deepEqual(scoped.read('exus_stack_v1', []), [])
  })
})

describe('scopedStorage — guest-to-account import', () => {
  const signIn = (id) => store.set('exus_session_v1', JSON.stringify({ user: { id } }))
  beforeEach(() => store.clear())

  test('no session -> nothing pending', () => {
    store.set('exus_stack_v1', '["cursor"]')
    assert.equal(scoped.pendingImport(), null)
  })

  test('guest data + fresh account -> pending, with honest counts', () => {
    store.set('exus_stack_v1', '["cursor","n8n"]')
    store.set('exus_favorites_v1', '["claude"]')
    store.set('exus_quiz_v1', JSON.stringify({ completed: true, answers: {} }))
    signIn('uid-A')
    const p = scoped.pendingImport()
    assert.deepEqual(p, { tools: 2, saved: 1, steps: 0, quiz: true })
  })

  test('telemetry alone (streak) does NOT trigger the prompt', () => {
    store.set('exus_streak_v1', JSON.stringify({ count: 1 }))
    signIn('uid-A')
    assert.equal(scoped.pendingImport(), null)
  })

  test('an account with its own data is never offered an overwrite', () => {
    store.set('exus_stack_v1', '["cursor"]')
    signIn('uid-A')
    store.set('exus_stack_v1::uid-A', '["already-mine"]')
    assert.equal(scoped.pendingImport(), null)
  })

  test('adopt copies guest data to the account and clears the guest copy', () => {
    store.set('exus_stack_v1', '["cursor"]')
    signIn('uid-A')
    assert.equal(scoped.adoptGuestData(), true)
    assert.equal(store.get('exus_stack_v1::uid-A'), '["cursor"]')
    assert.equal(store.has('exus_stack_v1'), false)
  })

  test('adopt is idempotent — retrying cannot duplicate or corrupt', () => {
    store.set('exus_stack_v1', '["cursor"]')
    signIn('uid-A')
    scoped.adoptGuestData()
    scoped.adoptGuestData()
    assert.equal(store.get('exus_stack_v1::uid-A'), '["cursor"]')
  })

  test('discard clears the guest data so the NEXT account cannot inherit it', () => {
    store.set('exus_stack_v1', '["cursor"]')
    store.set('exus_favorites_v1', '["claude"]')
    signIn('uid-A')
    scoped.discardGuestData()
    assert.equal(store.has('exus_stack_v1'), false)
    assert.equal(store.has('exus_favorites_v1'), false)
  })
})
