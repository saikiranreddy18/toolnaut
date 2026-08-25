// Lightweight "save for later" list, separate from stackStore's heavier
// add-to-stack action. localStorage-backed until the backend owns it.
const KEY = 'exus_favorites_v1'

export function loadFavorites() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(s) ? s : []
  } catch {
    return []
  }
}

function save(slugs) {
  try { localStorage.setItem(KEY, JSON.stringify(slugs)) } catch { /* storage blocked */ }
}

export function addFavorite(slug) {
  const s = loadFavorites()
  if (!s.includes(slug)) save([...s, slug])
  return loadFavorites()
}

export function removeFavorite(slug) {
  save(loadFavorites().filter((x) => x !== slug))
  return loadFavorites()
}

export function isFavorite(slug) {
  return loadFavorites().includes(slug)
}
