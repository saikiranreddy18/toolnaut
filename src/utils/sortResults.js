// Discover's non-default sort orders. "Match" (score, then prominence) stays
// inline in Discover.jsx because it needs the per-render tieBreak closure;
// these two don't depend on quiz answers, so they live here and get tested
// on their own.
export function compareByNewest(a, b) {
  const aTime = a.discoveredAt ? new Date(a.discoveredAt).getTime() : NaN
  const bTime = b.discoveredAt ? new Date(b.discoveredAt).getTime() : NaN
  const aHas = !Number.isNaN(aTime)
  const bHas = !Number.isNaN(bTime)
  if (aHas && bHas) return bTime - aTime
  if (aHas !== bHas) return aHas ? -1 : 1
  return a.name.localeCompare(b.name)
}

export function compareByName(a, b) {
  return a.name.localeCompare(b.name)
}
