import { supabase, isSupabaseConfigured } from './supabase'

// The real number of signed-up explorers.
//
// Replaces the hardcoded EXPLORERS = 1300 in communityStats.js. Two halves:
// registerExplorer() adds a row when someone signs in, explorerCount() reads
// the aggregate back. Both need supabase/migrations/0001_explorers.sql to have
// been run; until then every call resolves to null and callers hide the figure.
//
// null is the important part of this contract. It means "not known", and it is
// NOT the same as 0 — a fetch failure must never render as "0 explorers", and
// it must never fall back to the invented number either. Callers show nothing.

let cached
let inFlight

// Insert-only, and idempotent: the primary key is the auth id, so signing in
// again conflicts with the existing row rather than counting the person twice.
export async function registerExplorer(userId) {
  if (!isSupabaseConfigured || !userId) return
  try {
    // Ignore a duplicate — a returning explorer is not an error, and there is
    // no select policy, so we cannot check first without an extra round trip
    // that would fail anyway.
    const { error } = await supabase
      .from('explorers')
      .insert({ id: userId })
    if (error && error.code !== '23505') {
      // 42P01 = table missing: the migration has not been run yet. Everything
      // else is worth seeing, but none of it should break a sign-in.
      if (error.code !== '42P01') console.warn('registerExplorer:', error.message)
    } else if (!error) {
      cached = undefined // a new explorer joined; let the next read re-fetch
    }
  } catch { /* offline — the count is not worth failing a sign-in over */ }
}

// Reads through public.explorer_count(), a security-definer aggregate, so the
// rows themselves stay unreadable. Resolves to a number, or null when the count
// genuinely cannot be known.
export async function explorerCount() {
  if (!isSupabaseConfigured) return null
  if (cached !== undefined) return cached
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.rpc('explorer_count')
      if (error) return null
      const n = Number(data)
      return Number.isFinite(n) ? n : null
    } catch {
      return null
    } finally {
      inFlight = undefined
    }
  })()

  const value = await inFlight
  // Only cache a real answer. Caching null would pin the tile to hidden for the
  // rest of the tab over one flaky request.
  if (value !== null) cached = value
  return value
}
