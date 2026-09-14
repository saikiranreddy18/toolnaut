// Sky themes: each swaps the accent trio (--lime/--hot-pink/--cyan)
// via a data-theme attribute on <html>, defined in index.css. Persisted so the
// choice survives reloads. 'nebula' is the default (no attribute = :root values).
const KEY = 'exus_theme_v1'

export const THEMES = [
  { id: 'nebula', name: 'Nebula', swatch: ['#7cf5ff', '#b388ff', '#8ab4ff'] },
  { id: 'solar', name: 'Solar', swatch: ['#ffd66b', '#ff9e7a', '#ffb86b'] },
  // ids kept from the arcade era so saved choices still resolve
  { id: 'toxic', name: 'Aurora', swatch: ['#8ff5c5', '#6ee7f9', '#5eead4'] },
  { id: 'synth', name: 'Pulsar', swatch: ['#d6a8ff', '#ff8ad8', '#8ab4ff'] },
]

export function loadTheme() {
  try {
    const id = localStorage.getItem(KEY)
    return THEMES.some((t) => t.id === id) ? id : 'nebula'
  } catch {
    return 'nebula'
  }
}

// Reflect the theme onto <html>. 'nebula' clears the attribute so :root wins.
export function applyTheme(id) {
  const root = document.documentElement
  if (id && id !== 'nebula') root.setAttribute('data-theme', id)
  else root.removeAttribute('data-theme')
}

export function setTheme(id) {
  try { localStorage.setItem(KEY, id) } catch { /* storage blocked */ }
  applyTheme(id)
  return id
}
