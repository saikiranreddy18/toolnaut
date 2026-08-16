// Tools the user added from Discover (slugs), localStorage-backed until the
// backend owns the stack. Starter-stack tools come from the persona and are
// not stored here.
const KEY = 'exus_stack_v1'

export function loadStack() {
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
