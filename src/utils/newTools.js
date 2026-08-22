import { TOOLS } from './toolsCatalog'

const DAY_MS = 24 * 60 * 60 * 1000

// discoveredAt only exists on tools hydrated from the live radar feed
// (see liveCatalog.js's FIELDS list) — the bundled catalog baseline never
// has it, so those tools correctly never qualify as "new".
export function isNewTool(tool, days = 7) {
  if (!tool?.discoveredAt) return false
  const discovered = new Date(tool.discoveredAt).getTime()
  if (Number.isNaN(discovered)) return false
  return Date.now() - discovered <= days * DAY_MS
}

export function getNewTools(days = 7) {
  return TOOLS
    .filter((tool) => isNewTool(tool, days))
    .sort((a, b) => new Date(b.discoveredAt) - new Date(a.discoveredAt))
}
