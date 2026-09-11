// Shared predicate for both the session-gated Discover search box and the
// public /search page, extracted so the two implementations can't silently
// drift apart. Every word in the query must appear somewhere in the tool's
// searchable text (order-independent), not the whole query as one literal
// phrase — "video editor" must match a tool whose blurb has "video" and
// "editor" in either order, since that's the query shape SearchTools.jsx's
// own copy invites ("the problem you're trying to solve") but a single-
// phrase substring check silently failed on.
export function matchesQuery(tool, q) {
  const words = (q || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = [tool.name, tool.blurb, tool.sourceCategory, tool.dev || '', ...tool.tags]
    .join(' ')
    .toLowerCase()
  return words.every((word) => haystack.includes(word))
}
