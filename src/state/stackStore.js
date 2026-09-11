// Tools the user added from Discover (slugs), localStorage-backed until the
// backend owns the stack. Starter-stack tools come from the persona and are
// not stored here.
import { read, write } from './scopedStorage'
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

export function addToStack(slug) {
  const s = loadStack()
  if (!s.includes(slug)) save([...s, slug])
  return loadStack()
}

export function removeFromStack(slug) {
  save(loadStack().filter((x) => x !== slug))
  return loadStack()
}

export function inStack(slug) {
  return loadStack().includes(slug)
}
