// Passive "you looked at this" history, separate from Favorites (an explicit
// save) and Stack (an explicit add). Recorded on every tool-detail view.
import { read, write } from './scopedStorage'
const KEY = 'exus_recently_viewed_v1'
const CAP = 12

export function loadRecentlyViewed() {
  try {
    const s = read(KEY)
    return Array.isArray(s) ? s : []
  } catch {
    return []
  }
}

// Moves an already-seen slug back to the front rather than duplicating it —
// seeing a tool again just re-surfaces it, it doesn't get a second entry.
export function recordView(slug) {
  const s = loadRecentlyViewed().filter((x) => x !== slug)
  try { write(KEY, [slug, ...s].slice(0, CAP)) } catch { /* storage blocked */ }
}
