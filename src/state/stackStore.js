// Tools the user added from Discover (slugs), localStorage-backed until the
// backend owns the stack. Starter-stack tools come from the persona and are
// not stored here.
import { read, write } from './scopedStorage'
import { logInteraction, INTERACTIONS } from './interactionsStore'
const KEY = 'exus_stack_v1'

export function loadStack() {
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

// Logged at the store, not the call sites — see the note in favoritesStore.
// Promoting a tool into the stack is the strongest positive signal the product
// has: stronger than a save, because the person is committing to use it.
export function addToStack(slug, context = null) {
  const s = loadStack()
  if (!s.includes(slug)) {
    save([...s, slug])
    logInteraction(slug, INTERACTIONS.STACK_ADDED, context)
  }
  return loadStack()
}

export function removeFromStack(slug, context = null) {
  const before = loadStack()
  if (before.includes(slug)) {
    save(before.filter((x) => x !== slug))
    logInteraction(slug, INTERACTIONS.STACK_REMOVED, context)
  }
  return loadStack()
}

export function inStack(slug) {
  return loadStack().includes(slug)
}
