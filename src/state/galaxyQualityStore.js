// How much galaxy the visitor wants.
//
// WHY THIS IS A SETTING AND NOT ANOTHER OPTIMISATION
// The landing page stutters for some people and not others, and every attempt
// to fix it by measurement failed to reproduce the cause: hiding the canvas
// changed nothing, forcing dpr to 1 changed nothing, and halving the point
// budget twice changed nothing the second time. Those are the three levers a
// renderer gives you, and none of them moved the number — which means the cost
// is in the driver, not in anything the app controls.
//
// At that point another round of guessing is worse than admitting the limit.
// "Off" removes the WebGL context entirely, which is the one change guaranteed
// to work on every machine — a page with no canvas measured 16.7ms against the
// galaxy's 133ms in the same harness. The visitor knows whether their machine
// is struggling far better than a heuristic does.
//
// Persisted, because someone who turns it off does not want to re-decide on
// every visit.

const KEY = 'exus_galaxy_q_v1'

export const GALAXY_LEVELS = [
  {
    id: 'full',
    name: 'Full',
    hint: 'Every star, live camera',
  },
  {
    id: 'light',
    name: 'Light',
    hint: 'Still, not drifting — much cheaper',
  },
  {
    id: 'off',
    name: 'Off',
    hint: 'No 3D at all — smoothest scrolling',
  },
]

export function loadGalaxyQuality() {
  try {
    const v = localStorage.getItem(KEY)
    return GALAXY_LEVELS.some((l) => l.id === v) ? v : 'full'
  } catch {
    return 'full'
  }
}

export function setGalaxyQuality(id) {
  const v = GALAXY_LEVELS.some((l) => l.id === id) ? id : 'full'
  try { localStorage.setItem(KEY, v) } catch { /* storage blocked */ }
  // Scene subscribes rather than polling; a plain event keeps this store free
  // of a framework dependency.
  try { window.dispatchEvent(new CustomEvent('galaxy-quality', { detail: v })) } catch { /* SSR */ }
  return v
}

export function watchGalaxyQuality(fn) {
  const h = (e) => fn(e.detail)
  window.addEventListener('galaxy-quality', h)
  return () => window.removeEventListener('galaxy-quality', h)
}
