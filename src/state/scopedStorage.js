// Per-account storage scoping.
//
// THE BUG THIS FIXES
// Every store wrote to a fixed key — exus_stack_v1, exus_favorites_v1 and so
// on — with no user id anywhere, and signing out cleared only the session key.
// So on a shared browser: sign out, sign in with a different Google account,
// and that person inherits the previous one's stack, shortlist, quiz answers,
// roadmap progress, streak and avatar. It reads as their own, because nothing
// marks it as someone else's.
//
// THE MODEL
//   guest      ->  exus_stack_v1              (unchanged, so guest mode works)
//   signed in  ->  exus_stack_v1::<auth uid>
//
// Signing out therefore needs to clear nothing: the account's data sits under a
// key that is simply not read once the session is gone.
//
// This also gives guest-to-account import somewhere to import FROM. The guest
// keys are still sitting there after sign-in, which is exactly the data a new
// account should be offered — see pendingImport() below.

const SESSION_KEY = 'exus_session_v1'

// Read the uid straight from the session mirror rather than importing
// authStore, which imports supabase, which would drag the auth client into
// every store that only wants a string.
function uid() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY))
    return s?.user?.id || null
  } catch {
    return null
  }
}

// The simulated local session has no user.id, so it stays on the guest keys.
// That is correct: it is not a real account and must not create an island of
// data that the real account cannot see.
export function scopedKey(key) {
  const id = uid()
  return id ? `${key}::${id}` : key
}

export function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(scopedKey(key))
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(scopedKey(key), JSON.stringify(value))
  } catch { /* storage blocked or full */ }
  return value
}

export function remove(key) {
  try { localStorage.removeItem(scopedKey(key)) } catch { /* blocked */ }
}

// Raw string variants — avatarStore stores a bare id, not JSON.
export function readRaw(key) {
  try { return localStorage.getItem(scopedKey(key)) } catch { return null }
}
export function writeRaw(key, value) {
  try { localStorage.setItem(scopedKey(key), value) } catch { /* blocked */ }
}

// ── guest -> account import ─────────────────────────────────────────────────

// Everything that belongs to a person rather than to the browser. Deliberately
// excludes the session itself, and the UI preferences (theme, moon, chat-open),
// which are properties of the DEVICE and should not follow an account around or
// be wiped by "start fresh".
export const PORTABLE_KEYS = [
  'exus_stack_v1',
  'exus_favorites_v1',
  'exus_quiz_v1',
  'exus_goal_notes_v1',
  'exus_roadmap_v1',
  'exus_progress_v1',
  'exus_streak_v1',
  'exus_avatar_v1',
  'exus_threads_v1',
  'exus_replies_v1',
  'exus_upvotes_v1',
  'exus_funnel_v1',
]

// Keys that only exist because a PERSON did something. Deliberately excludes
// exus_streak_v1 and exus_funnel_v1, which the app writes by itself: Stack.jsx
// calls recordVisit() on mount, so by the time the prompt mounts the account
// already "has data" and the offer suppresses itself. Asking "does this account
// have anything yet" has to mean authored work, not telemetry that wrote itself
// half a second ago.
const AUTHORED_KEYS = [
  'exus_stack_v1',
  'exus_favorites_v1',
  'exus_quiz_v1',
  'exus_goal_notes_v1',
  'exus_roadmap_v1',
  'exus_progress_v1',
  'exus_avatar_v1',
  'exus_threads_v1',
  'exus_replies_v1',
  'exus_upvotes_v1',
]

function rawGuest(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

// What a freshly signed-in account could adopt: guest data that exists, where
// this account has nothing of its own yet. Returns null when there is nothing
// worth asking about — the prompt must never appear over an empty browser.
export function pendingImport() {
  const id = uid()
  if (!id) return null

  let hasGuest = false
  let hasOwn = false
  for (const k of AUTHORED_KEYS) {
    if (rawGuest(k) !== null) hasGuest = true
    try { if (localStorage.getItem(`${k}::${id}`) !== null) hasOwn = true } catch { /* blocked */ }
  }
  // Never offer to overwrite an account that already has its own data.
  if (!hasGuest || hasOwn) return null

  // Counts for the prompt, so it can say what it actually found rather than
  // "some data". Anything unreadable is simply not counted.
  const n = (key) => {
    try {
      const v = JSON.parse(localStorage.getItem(key))
      return Array.isArray(v) ? v.length : 0
    } catch { return 0 }
  }
  let steps = 0
  try {
    const p = JSON.parse(localStorage.getItem('exus_roadmap_v1')) || {}
    steps = Object.values(p).filter(Boolean).length
  } catch { /* none */ }

  let quiz = false
  try { quiz = !!JSON.parse(localStorage.getItem('exus_quiz_v1'))?.completed } catch { /* none */ }

  return {
    tools: n('exus_stack_v1'),
    saved: n('exus_favorites_v1'),
    steps,
    quiz,
  }
}

// Copy the guest keys onto this account, then clear the guest copies — leaving
// them behind is what let the NEXT account inherit them.
export function adoptGuestData() {
  const id = uid()
  if (!id) return false
  for (const k of PORTABLE_KEYS) {
    const v = rawGuest(k)
    if (v === null) continue
    try {
      localStorage.setItem(`${k}::${id}`, v)
      localStorage.removeItem(k)
    } catch { /* blocked */ }
  }
  return true
}

// Decline the import. The guest data is REMOVED rather than left in place:
// leaving it would hand it to whoever signs in next on this browser, which is
// the exact bug this module exists to close.
export function discardGuestData() {
  for (const k of PORTABLE_KEYS) {
    try { localStorage.removeItem(k) } catch { /* blocked */ }
  }
}
