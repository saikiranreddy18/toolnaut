// Moonlight — the second half of the sky settings, independent of the colour
// theme in themeStore. Play modes change the arcade accent trio; this changes
// how much light is in the sky behind everything.
//
// Two modes, and they are not just a brightness slider. Under a full moon the
// sky glows and the faint stars wash out; on a moonless night the sky goes deep
// and the field fills in. That is how it actually works looking up, and it makes
// the two settings read as different places rather than the same place dimmed.
//
// Persisted, and reflected as data-moon on <html> so it is pure CSS from there —
// no re-render, no JS in the paint path, works on every surface that mounts
// .starfield (the app shell, onboarding, About, Pricing).

const KEY = 'exus_moon_v1'

export const MOONS = [
  {
    id: 'full',
    name: 'Full moon',
    hint: 'Lit sky, softer stars',
    icon: '●',
  },
  {
    id: 'none',
    name: 'No moon',
    hint: 'Deep dark, more stars',
    icon: '○',
  },
  // Daylight is the same sky at sunrise rather than a third brightness: the sun
  // is up, the stars are gone and the horizon is warm. It stops short of a true
  // white sky because every surface above it draws its text in white.
  {
    id: 'day',
    name: 'Daylight',
    hint: 'Sun up, stars out',
    icon: '☀',
  },
]

export function loadMoon() {
  try {
    const id = localStorage.getItem(KEY)
    return MOONS.some((m) => m.id === id) ? id : 'none'
  } catch {
    return 'none'
  }
}

export function applyMoon(id) {
  const root = document.documentElement
  root.setAttribute('data-moon', MOONS.some((m) => m.id === id) ? id : 'none')
}

export function setMoon(id) {
  try { localStorage.setItem(KEY, id) } catch { /* storage blocked */ }
  applyMoon(id)
  window.dispatchEvent(new CustomEvent('moon', { detail: id }))
  return id
}

// The landing galaxy is WebGL, not CSS, so it cannot follow data-moon on its
// own and has to be told.
export function watchMoon(fn) {
  const h = (e) => fn(e.detail)
  window.addEventListener('moon', h)
  return () => window.removeEventListener('moon', h)
}
