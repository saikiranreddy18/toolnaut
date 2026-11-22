// Shared predicate for both the session-gated Discover search box and the
// public /search page, extracted so the two implementations can't silently
// drift apart. Every word in the query must appear somewhere in the tool's
// searchable text (order-independent), not the whole query as one literal
// phrase — "video editor" must match a tool whose blurb has "video" and
// "editor" in either order, since that's the query shape SearchTools.jsx's
// own copy invites ("the problem you're trying to solve") but a single-
// phrase substring check silently failed on.
//
// A literal substring check alone still misses the same copy's own promise on
// word *form*: "transcribe meetings" against a catalog tagged "transcription"
// and "meeting" returns nothing, because neither query word is a substring of
// the tag that answers it. A shared 5-character leading stem (long enough
// that short words like "app" can't match everything) catches the common
// suffix drift (-e/-ing/-ion/-s) without a stemming dependency.
const STEM_LEN = 5

export function matchesQuery(tool, q) {
  const words = (q || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = [tool.name, tool.blurb, tool.sourceCategory, tool.dev || '', ...tool.tags]
    .join(' ')
    .toLowerCase()
  const haystackStems = haystack
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length >= STEM_LEN)
    .map((w) => w.slice(0, STEM_LEN))
  return words.every((word) => {
    if (haystack.includes(word)) return true
    if (word.length < STEM_LEN) return false
    return haystackStems.includes(word.slice(0, STEM_LEN))
  })
}
