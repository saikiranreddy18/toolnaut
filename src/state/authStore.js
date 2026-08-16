// Fake-auth session store (APP-FLOW.md migration step 4): lets the AppShell,
// guards and ?next= redirects be built and tested before real auth lands.
// Swap the internals for Supabase/Firebase later — the API surface stays.
const KEY = 'exus_session_v1'

export function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    return s && s.user ? s : null
  } catch {
    return null
  }
}

export function signIn(provider, name = 'Explorer') {
  const session = {
    user: { name, provider },
    plan: 'shishya', // shishya | guru | pandava
    role: 'user',
    simulated: true,
    at: Date.now(),
  }
  try { localStorage.setItem(KEY, JSON.stringify(session)) } catch { /* storage blocked */ }
  return session
}

export function signOut() {
  try { localStorage.removeItem(KEY) } catch { /* storage blocked */ }
}
