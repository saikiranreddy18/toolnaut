// Client side of the entitlement check. The server (/api/entitlement, reading
// user_entitlements) is the authority; this just asks it with the current
// Supabase access token and hands back one small, honest object.
import { supabase, isSupabaseConfigured } from './supabase'

export async function getAccessToken() {
  if (!isSupabaseConfigured) return null
  try {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  } catch {
    return null
  }
}

// { active, plan, endsAt, paymentsEnabled, configured, unknown }
// `unknown: true` means the check itself failed (network, local dev without
// /api) — callers must fail OPEN on unknown: blocking the whole app on a
// hiccup is worse than letting one visit through.
export async function fetchEntitlement() {
  const token = await getAccessToken()
  if (!token) return { active: false, unknown: false, paymentsEnabled: false, configured: false }
  try {
    const res = await fetch('/api/entitlement', {
      headers: { authorization: `Bearer ${token}` },
    })
    if (!res.ok && res.status !== 401) return { active: false, unknown: true }
    const data = await res.json().catch(() => null)
    if (!data) return { active: false, unknown: true }
    return {
      active: Boolean(data.active),
      plan: data.plan || null,
      endsAt: data.ends_at || null,
      // Whole days remaining, computed once here so no caller re-derives it
      // and gets a different answer. Null when access does not expire.
      daysLeft: data.ends_at
        ? Math.max(0, Math.ceil((new Date(data.ends_at).getTime() - Date.now()) / 86400000))
        : null,
      paymentsEnabled: Boolean(data.payments_enabled),
      configured: Boolean(data.configured),
      unknown: false,
    }
  } catch {
    return { active: false, unknown: true }
  }
}
