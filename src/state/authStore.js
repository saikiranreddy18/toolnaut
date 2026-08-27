import { supabase, isSupabaseConfigured } from '../utils/supabase'

// Session state, with two backends behind one unchanged surface.
//
// When Supabase is configured, Google is the real thing and Supabase owns the
// session. When it is not, this falls back to the simulated local session the
// app has always used, so the product still runs with no credentials at all —
// local dev, preview deploys, and anyone who clones the repo.
//
// THE SYNCHRONOUS PROBLEM, AND WHY THE MIRROR EXISTS
// Every consumer — AppShell, the route guards, Settings, the ?next= redirect —
// calls loadSession() and expects an answer immediately. Supabase's
// getSession() is async. Rewriting all of them to await would spread loading
// states through the entire authed half of the app for no user benefit.
//
// So Supabase stays the source of truth and its session is MIRRORED into the
// same localStorage key the app already reads. onAuthStateChange keeps the
// mirror current, so loadSession() stays synchronous and every caller is
// untouched. The mirror is a cache and never the authority: signing out clears
// it, and Supabase clears its own.

const KEY = 'exus_session_v1'

function write(session) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session))
    else localStorage.removeItem(KEY)
  } catch { /* storage blocked */ }
  return session
}

// Supabase's user object -> the shape this app already renders.
function toSession(user) {
  if (!user) return null
  const meta = user.user_metadata || {}
  return {
    user: {
      id: user.id,
      email: user.email || null,
      name: meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'Explorer'),
      avatar: meta.avatar_url || meta.picture || null,
      provider: user.app_metadata?.provider || 'google',
    },
    plan: 'shishya', // until billing exists, everyone is on the free tier
    role: 'user',
    simulated: false,
    at: Date.now(),
  }
}

export function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    return s && s.user ? s : null
  } catch {
    return null
  }
}

// Keeps the mirror in step with Supabase for the life of the tab: sign-in,
// sign-out, token refresh, and the redirect back from Google. Called once from
// main.jsx. Returns an unsubscribe, and a no-op when unconfigured.
export function watchSession(onChange) {
  if (!isSupabaseConfigured) return () => {}

  supabase.auth.getSession().then(({ data }) => {
    onChange?.(write(toSession(data?.session?.user)))
  })

  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange?.(write(toSession(session?.user)))
  })

  return () => sub?.subscription?.unsubscribe()
}

// Real OAuth when configured; the old simulated session otherwise.
//
// Async in both cases so callers never have to know which backend is live. The
// real path does not resolve to a session — the browser leaves for Google and
// comes back through watchSession.
export async function signIn(provider = 'google', name = 'Explorer') {
  if (!isSupabaseConfigured) {
    return write({
      user: { name, provider },
      plan: 'shishya', // shishya | guru | pandava
      role: 'user',
      simulated: true,
      at: Date.now(),
    })
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      // Come back where they left off rather than always at the root.
      redirectTo: `${window.location.origin}${window.location.pathname}`,
      queryParams: { prompt: 'select_account' },
    },
  })
  if (error) throw error
  return null
}

// Email magic link. A separate function because it needs the ADDRESS, and the
// old simulated flow threw that away — it passed only the local part as a
// display name, which is useless to anything that has to send mail.
// Resolves { sent: true } when a real link is on its way, so the caller can say
// "check your inbox" instead of pretending the person is signed in.
export async function signInWithEmail(email) {
  if (!isSupabaseConfigured) {
    write({
      user: { name: String(email).split('@')[0], email, provider: 'magic_link' },
      plan: 'shishya',
      role: 'user',
      simulated: true,
      at: Date.now(),
    })
    return { sent: false, simulated: true }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/app/stack` },
  })
  if (error) throw error
  return { sent: true, simulated: false }
}

export async function signOut() {
  write(null)
  if (isSupabaseConfigured) {
    try { await supabase.auth.signOut() } catch { /* already gone */ }
  }
}

export { isSupabaseConfigured }
