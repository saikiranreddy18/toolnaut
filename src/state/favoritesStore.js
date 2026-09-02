// Lightweight "save for later" list, separate from stackStore's heavier
// add-to-stack action. localStorage-backed until the backend owns it.
import { read, write } from './scopedStorage'
import { logInteraction, INTERACTIONS } from './interactionsStore'
const KEY = 'exus_favorites_v1'

export function loadFavorites() {
  try {
    const s = read(KEY)
    return Array.isArray(s) ? s : []
  } catch {
    return []
  }
}

function save(slugs) {
  try { write(KEY, slugs) } catch { /* storage blocked */ }
}

// The behavioural log lives HERE rather than at the call sites. Three pages
// already save tools and a fourth will exist eventually; logging at the store
// means a new call site cannot forget to do it. logInteraction is
// fire-and-forget and a no-op for guests, so neither of these gets slower.
export function addFavorite(slug, context = null) {
  const s = loadFavorites()
  if (!s.includes(slug)) {
    save([...s, slug])
    // Only on an actual change — re-saving an already-saved tool is not a
    // second signal, and counting it as one would inflate popular tools.
    logInteraction(slug, INTERACTIONS.SAVED, context)
  }
  return loadFavorites()
}

export function removeFavorite(slug, context = null) {
  const before = loadFavorites()
  if (before.includes(slug)) {
    save(before.filter((x) => x !== slug))
    logInteraction(slug, INTERACTIONS.UNSAVED, context)
  }
  return loadFavorites()
}

export function isFavorite(slug) {
  return loadFavorites().includes(slug)
}
