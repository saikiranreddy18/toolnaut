// The saved-tools limit, as a synchronous check the save buttons can call.
//
// AppShell reads the entitlement once and records the limit here. Discover,
// Saved and Tool detail call allowSave() before adding a tool, with no hook
// and no request of their own: they only ever render inside AppShell, so the
// limit is already known.
//
// null means no limit, which is also the answer before the entitlement has
// loaded. A slow check must never block a save; the database is the backstop
// (supabase/migrations/0010_saved_limit.sql).

export const SAVE_LIMIT_EVENT = 'toolnaut:save-limit'

let known = null

export function setSavedLimit(limit) {
  known = Number.isFinite(limit) ? limit : null
}

// True when another tool may be saved. When it may not, announces the limit so
// the upgrade notice can say what happened, and returns false.
export function allowSave(currentCount) {
  if (known == null || currentCount < known) return true
  window.dispatchEvent(new CustomEvent(SAVE_LIMIT_EVENT, { detail: { limit: known } }))
  return false
}
