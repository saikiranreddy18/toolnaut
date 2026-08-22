// A shared stack is just its tool slugs — no persona, quiz answers, or
// progress — so an old link keeps working even after generatePersona() or
// the quiz questions change later.
export function encodeStackSlugs(slugs) {
  const clean = [...new Set((slugs || []).filter(Boolean))]
  return clean.map(encodeURIComponent).join(',')
}

export function decodeStackSlugs(param) {
  if (!param) return []
  return param
    .split(',')
    .map((s) => { try { return decodeURIComponent(s.trim()) } catch { return '' } })
    .filter(Boolean)
}
