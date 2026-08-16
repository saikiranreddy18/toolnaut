// Play-mode themes: each swaps the arcade accent trio (--lime/--hot-pink/--cyan)
// via a data-theme attribute on <html>, defined in index.css. Persisted so the
// choice survives reloads. 'nebula' is the default (no attribute = :root values).
const KEY = 'exus_theme_v1'

export const THEMES = [
  { id: 'nebula', name: 'Nebula', swatch: ['#a3ff2e', '#ff2ea3', '#22d3ee'] },
  { id: 'solar', name: 'Solar', swatch: ['#ffc42e', '#ff5d5d', '#ff8f1f'] },
  { id: 'toxic', name: 'Toxic', swatch: ['#7fff2a', '#2affea', '#b6ff3a'] },
  { id: 'synth', name: 'Synth', swatch: ['#45e0ff', '#ff5cc8', '#b388ff'] },
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
