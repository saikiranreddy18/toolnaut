import { supabase, isSupabaseConfigured } from './supabase'

// The real number of paying subscribers.
//
// Replaces the hardcoded SUBSCRIBERS = 84 in communityStats.js, the same way
// explorerCount.js replaced the invented explorer count. Reads through
// public.subscriber_count() (supabase/migrations/0009_subscriber_count.sql), a
// security-definer aggregate: the landing page learns how many people have an
// active paid plan, never who.
//
// Same contract as explorerCount: null means NOT KNOWN — the migration has not
// been run, or the request failed — and callers show nothing. It must never
// render as "0 subscribers" on a failed fetch, and never fall back to a
// placeholder.

let cached
let inFlight

export async function subscriberCount() {
  if (!isSupabaseConfigured) return null
  if (cached !== undefined) return cached
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.rpc('subscriber_count')
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
  // Only cache a real answer, so one flaky request cannot hide the tile for
  // the rest of the tab.
  if (value !== null) cached = value
  return value
}

// Conversion as a real ratio of two counted numbers, or null when either is
// unknown. With no explorers there is no rate to state, rather than a
// divide-by-zero dressed up as 0%.
export function conversionPercent(subscribers, explorers) {
  if (subscribers == null || explorers == null || explorers <= 0) return null
  return (subscribers / explorers) * 100
}
