// A one-shot "play the launch when they get back" flag.
//
// The rocket cannot play between the click and Google: the browser leaves the
// site, so there is no page left to animate on. And it cannot be a route,
// because signIn() sends people STRAIGHT to their destination — Supabase's
// redirectTo is already postAuthDestination(next), so nobody passes back
// through /auth/login where a launch screen could live.
//
// So the click arms a flag and the arrival consumes it, wherever that arrival
// lands. sessionStorage rather than localStorage on purpose: it dies with the
// tab, so an armed flag can never survive to ambush an unrelated visit later.

const KEY = 'exus_launch_v1'

export function armLaunch() {
  try { sessionStorage.setItem(KEY, '1') } catch { /* storage blocked */ }
}

// Reads AND clears in one step, so a re-render or a second mount cannot play
// the sequence twice.
export function consumeLaunch() {
  try {
    const armed = sessionStorage.getItem(KEY) === '1'
    if (armed) sessionStorage.removeItem(KEY)
    return armed
  } catch {
    return false
  }
}

export function clearLaunch() {
  try { sessionStorage.removeItem(KEY) } catch { /* storage blocked */ }
}
