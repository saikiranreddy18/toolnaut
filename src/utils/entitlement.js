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
      // A trial and a purchase are both "active" but read completely
      // differently: one needs "3 days left, pick a plan", the other needs
      // silence. Conflating them nags paying customers.
      trial: Boolean(data.trial),
      trialDays: Number(data.trial_days) || 0,
      paymentsEnabled: Boolean(data.payments_enabled),
      configured: Boolean(data.configured),
      unknown: false,
    }
  } catch {
    return { active: false, unknown: true }
  }
}

// Whole days until an entitlement lapses. null when it never expires (a
// lifetime plan) or there is no date at all.
//
// Rounds UP: with eleven hours left, "1 day" is honest and "0 days" is both
// wrong and alarming. Zero means it has already gone.
export function daysLeft(endsAt) {
  if (!endsAt) return null
  const ms = new Date(endsAt).getTime() - Date.now()
  if (!Number.isFinite(ms)) return null
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}
