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
]

export function loadMoon() {
  try {
    const id = localStorage.getItem(KEY)
    return MOONS.some((m) => m.id === id) ? id : 'full'
  } catch {
    return 'full'
  }
}

export function applyMoon(id) {
  const root = document.documentElement
  root.setAttribute('data-moon', MOONS.some((m) => m.id === id) ? id : 'full')
}

export function setMoon(id) {
  try { localStorage.setItem(KEY, id) } catch { /* storage blocked */ }
  applyMoon(id)
  return id
}
