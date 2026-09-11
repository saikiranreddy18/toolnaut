// Shared substring predicate for both the session-gated Discover search box
// and the public /search page, extracted so the two implementations can't
// silently drift apart. Behaviour matches Discover.jsx's original inline
// filter exactly: tags are compared as-is (the catalog already lowercases
// them), everything else is lowercased before comparing.
export function matchesQuery(tool, q) {
  const needle = (q || '').trim().toLowerCase()
  if (!needle) return true
  return (
    tool.name.toLowerCase().includes(needle) ||
    tool.blurb.toLowerCase().includes(needle) ||
    tool.sourceCategory.toLowerCase().includes(needle) ||
    (tool.dev && tool.dev.toLowerCase().includes(needle)) ||
    tool.tags.some((tag) => tag.includes(needle))
  )
}
