import { supabase, isSupabaseConfigured } from '../utils/supabase'
import { loadSession } from './authStore'

// The behavioural log: what people DO with the tools we recommend.
//
// Toolnaut has always known what someone SAID they wanted — nine intake answers,
// captured once. It has never known what they did next. Saves and dismissals go
// to analytics for a human to read, and nothing about them reaches the ranking,
// so a tool that every user rejects keeps being recommended.
//
// THREE RULES THIS FILE OBEYS
//
// 1. It never blocks the UI. Every call is fire-and-forget. Saving a tool must
//    feel instant whether or not the network is there, so nothing here is
//    awaited by a caller and nothing here can reject.
//
// 2. It never breaks guest mode. Guests are most of the traffic and have no
//    user id to attach a row to, so for them this is a no-op. The product works
//    identically; there is simply nothing to record.
//
// 3. It writes through the ANON client, as the signed-in user. The insert
//    policy is `with check (auth.uid() = user_id)`, so the database itself
//    guarantees a row can only ever be filed under its true author — a
//    tampered user_id is rejected by Postgres, not by this code.
//
// Deliberately NOT scoring anything. Ranking off behaviour needs a volume of
// users this product does not have yet. Collect now, score later — the data
// only accrues if collection starts before it is needed.

// Must stay in step with the CHECK constraint in
// supabase/migrations/0007_user_tool_interactions.sql. A value outside this set
// is rejected by the database, so the two are tested against each other.
export const INTERACTIONS = {
  OPENED: 'opened',
  SAVED: 'saved',
  UNSAVED: 'unsaved',
  STACK_ADDED: 'stack_added',
  STACK_REMOVED: 'stack_removed',
  COMPARED: 'compared',
  DISMISSED: 'dismissed',
}

const VALID = new Set(Object.values(INTERACTIONS))

// Resolved per call rather than cached: a visitor can sign in without a reload,
// and a stale null here would silently drop every interaction for the rest of
// the session.
function currentUserId() {
  try {
    const s = loadSession()
    // A simulated dev session has no real user id and no row in auth.users, so
    // an insert would fail the foreign key. Skip it rather than log an error on
    // every click in local development.
    if (!s?.user?.id || s.simulated) return null
    return s.user.id
  } catch {
    return null
  }
}

/**
 * Record one interaction. Safe to call from anywhere, including guest mode.
 * Returns nothing and never throws — callers must not await it.
 */
export function logInteraction(toolSlug, action, context = null, metadata = undefined) {
  if (!isSupabaseConfigured) return
  if (typeof toolSlug !== 'string' || !toolSlug) return
  if (!VALID.has(action)) return

  const userId = currentUserId()
  if (!userId) return

  const row = {
    user_id: userId,
    tool_slug: toolSlug.slice(0, 120),
    action,
    context: typeof context === 'string' ? context.slice(0, 60) : null,
  }
  if (metadata && typeof metadata === 'object') row.metadata = metadata

  try {
    // No await, and the rejection is swallowed. A failed analytics write must
    // never surface to someone who was only trying to save a tool.
    supabase
      .from('user_tool_interactions')
      .insert(row)
      .then(({ error }) => {
        if (error && import.meta.env.DEV) console.debug('[interactions]', error.message)
      }, () => {})
  } catch { /* client unavailable — the product carries on without it */ }
}

/**
 * This user's own recent interactions, newest first. Reads through RLS, so it
 * can only ever return rows belonging to the caller. Returns [] on any failure
 * rather than throwing, matching how every other store in src/state behaves.
 */
export async function loadMyInteractions(limit = 50) {
  if (!isSupabaseConfigured || !currentUserId()) return []
  try {
    const { data, error } = await supabase
      .from('user_tool_interactions')
      .select('tool_slug, action, context, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    return error ? [] : data || []
  } catch {
    return []
  }
}
