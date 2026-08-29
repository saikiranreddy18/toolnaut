import { supabase, isSupabaseConfigured } from '../utils/supabase'
import { read, write, PORTABLE_KEYS, pendingImport } from './scopedStorage'

// Server-backed persistence for the handful of things that must survive a
// device change. localStorage stays the read path — every consumer calls
// loadStack() and expects an answer this tick — so this layer mirrors, it does
// not replace. Local is the cache; the server is the durable copy.
//
// FEATURE-DETECTED ON PURPOSE
// supabase/migrations/0002_user_state.sql may not have been run. Rather than
// letting every visitor eat three failed round trips and a console full of
// 42P01s, one cheap rpc decides once per tab whether sync exists at all. Until
// the tables are there this module does nothing, the app behaves exactly as it
// does today, and status() says so out loud instead of pretending.

const STACK_KEY = 'exus_stack_v1'
const SAVED_KEY = 'exus_favorites_v1'
const QUIZ_KEY = 'exus_quiz_v1'
const ROADMAP_KEY = 'exus_roadmap_v1'
const AVATAR_KEY = 'exus_avatar_v1'

// idle | checking | unavailable | syncing | synced | error
let state = 'idle'
let available // undefined = not yet checked
let detecting
const listeners = new Set()

function set(next) {
  state = next
  for (const fn of listeners) { try { fn(next) } catch { /* listener threw */ } }
}

export function subscribeSync(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function syncState() {
  return state
}

function uid() {
  try { return JSON.parse(localStorage.getItem('exus_session_v1'))?.user?.id || null } catch { return null }
}

// One probe per tab. A missing function and a missing table both mean "not set
// up", and both must land on `false` rather than throwing into a caller that
// only wanted to save a tool.
export async function syncAvailable() {
  if (!isSupabaseConfigured) return false
  if (available !== undefined) return available
  if (detecting) return detecting

  detecting = (async () => {
    try {
      const { error } = await supabase.rpc('sync_available')
      return !error
    } catch {
      return false
    } finally {
      detecting = undefined
    }
  })()

  available = await detecting
  if (!available) set('unavailable')
  return available
}

// ── push ───────────────────────────────────────────────────────────────────

// Mirrors local state up. Deletes then inserts for the tool lists, because the
// local arrays are the whole truth for that user and a removed tool has to
// disappear server-side too — a pure upsert would leave it there forever.
export async function pushAll() {
  const id = uid()
  if (!id || !(await syncAvailable())) return false

  set('syncing')
  try {
    const quiz = read(QUIZ_KEY, null)
    const stack = read(STACK_KEY, []) || []
    const saved = read(SAVED_KEY, []) || []
    const roadmap = read(ROADMAP_KEY, {}) || {}

    const profile = {
      id,
      quiz_answers: quiz?.answers ?? null,
      quiz_completed: !!quiz?.completed,
      avatar_id: (() => { try { return localStorage.getItem(`${AVATAR_KEY}::${id}`) } catch { return null } })(),
      updated_at: new Date().toISOString(),
    }
    const { error: pErr } = await supabase.from('profiles').upsert(profile)
    if (pErr) throw pErr

    const rows = [
      ...stack.map((s) => ({ user_id: id, tool_slug: s, kind: 'stack' })),
      ...saved.map((s) => ({ user_id: id, tool_slug: s, kind: 'saved' })),
    ]
    const { error: dErr } = await supabase.from('tool_refs').delete().eq('user_id', id)
    if (dErr) throw dErr
    if (rows.length) {
      const { error: iErr } = await supabase.from('tool_refs').insert(rows)
      if (iErr) throw iErr
    }

    // Progress is append-only by nature — a completed step does not un-complete
    // — so upsert and never delete. That also makes it the safe field to merge
    // across devices: furthest progress wins without a conflict prompt.
    const steps = Object.entries(roadmap)
      .filter(([, v]) => v)
      .map(([step_key]) => ({ user_id: id, step_key }))
    if (steps.length) {
      const { error: rErr } = await supabase.from('roadmap_progress').upsert(steps, { onConflict: 'user_id,step_key' })
      if (rErr) throw rErr
    }

    set('synced')
    return true
  } catch {
    set('error')
    return false
  }
}

// ── pull ───────────────────────────────────────────────────────────────────

// Server -> local, used when signing in on a device that has nothing. Returns
// false when there is nothing on the server, so the caller can tell "this
// account is new here" from "sync is broken".
export async function pullAll() {
  const id = uid()
  if (!id || !(await syncAvailable())) return false

  set('syncing')
  try {
    const [{ data: profile }, { data: refs }, { data: steps }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('tool_refs').select('tool_slug, kind').eq('user_id', id),
      supabase.from('roadmap_progress').select('step_key').eq('user_id', id),
    ])

    if (!profile && !(refs || []).length && !(steps || []).length) {
      set('synced')
      return false
    }

    if (profile) {
      if (profile.quiz_answers) {
        write(QUIZ_KEY, { completed: !!profile.quiz_completed, answers: profile.quiz_answers })
      }
      if (profile.avatar_id) {
        try { localStorage.setItem(`${AVATAR_KEY}::${id}`, profile.avatar_id) } catch { /* blocked */ }
      }
    }

    write(STACK_KEY, (refs || []).filter((r) => r.kind === 'stack').map((r) => r.tool_slug))
    write(SAVED_KEY, (refs || []).filter((r) => r.kind === 'saved').map((r) => r.tool_slug))

    // Merge rather than replace: a step done offline on THIS device must not be
    // erased by a server copy that predates it.
    const local = read(ROADMAP_KEY, {}) || {}
    for (const { step_key } of steps || []) local[step_key] = true
    write(ROADMAP_KEY, local)

    set('synced')
    return true
  } catch {
    set('error')
    return false
  }
}

// Called once after a session appears. Pull first so a second device inherits
// what the first one built; push after, so anything this device had that the
// server did not is carried up in the same pass.
export async function syncOnSignIn() {
  if (!(await syncAvailable())) return

  // DEFER TO THE GUEST-IMPORT DECISION.
  //
  // pullAll() writes the scoped keys. pendingImport() treats scoped keys as
  // "this account already has data" and suppresses its offer — so pulling here
  // would silently bury whatever the visitor built before signing in, with no
  // prompt and no way back to it.
  //
  // So when an import is pending, do nothing: the prompt owns this moment. It
  // reloads on either choice, and the next pass through here finds nothing
  // pending and syncs normally.
  if (pendingImport()) return

  const hadServerData = await pullAll()
  await pushAll()
  return hadServerData
}

export const SYNCED_KEYS = PORTABLE_KEYS
