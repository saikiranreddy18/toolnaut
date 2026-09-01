import { supabase, isSupabaseConfigured } from './supabase'

// What this account may actually do — asked of the server, every time.
//
// NOT profiles.plan, AND NOT localStorage.
// profiles.plan exists and is fine to render ("Current plan: Pro"), but it is a
// LABEL. Gating a feature on it would mean the browser deciding what the
// browser is allowed to do, and anyone can edit that in devtools. The only
// answer that counts comes from user_entitlements, which no browser can write:
// the table has SELECT-only policies and every insert goes through the service
// role in the webhook.
//
// current_entitlement() is security invoker, so RLS still applies and it can
// only ever return the caller's own row. There is no way to ask it about
// somebody else.

const FREE = Object.freeze({ plan: null, active: false, features: {}, endsAt: null })

export async function fetchEntitlement() {
  if (!isSupabaseConfigured || !supabase) return FREE
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData?.session) return FREE

    const { data, error } = await supabase.rpc('current_entitlement')
    if (error || !data?.length) return FREE

    const row = data[0]
    return {
      plan: row.plan_code,
      active: row.status === 'active',
      endsAt: row.ends_at || null,
      features: {},
    }
  } catch {
    // Falling back to FREE is the safe direction: a network failure must not
    // hand out a paid plan.
    return FREE
  }
}

// Convenience for gating UI. The UI is a courtesy — anything that actually
// costs money or exposes data must be checked again on the server, because a
// determined user can always make the client believe whatever they like.
export async function hasActivePlan() {
  const e = await fetchEntitlement()
  return e.active
}

export { FREE as FREE_ENTITLEMENT }
