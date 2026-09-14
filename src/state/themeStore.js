// Sky themes: each swaps the accent trio (--lime/--hot-pink/--cyan)
// via a data-theme attribute on <html>, defined in index.css. Persisted so the
// choice survives reloads. 'nebula' is the default (no attribute = :root values).
const KEY = 'exus_theme_v1'

export const THEMES = [
  { id: 'nebula', name: 'Mono', swatch: ['#ffffff', '#d4d4d8', '#a1a1aa'] },
  // ids kept from earlier eras so saved choices still resolve
  { id: 'solar', name: 'Ivory', swatch: ['#f6f1e7', '#d9d2c5', '#a8a296'] },
  { id: 'toxic', name: 'Frost', swatch: ['#eef4fa', '#cad4de', '#98a5b3'] },
  { id: 'synth', name: 'Graphite', swatch: ['#e4e4e4', '#bababa', '#858585'] },
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
