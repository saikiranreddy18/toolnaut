// "Is this actually a tool?" pre-filter. Sources like Hacker News surface news
// HEADLINES about AI as often as real tool launches ("Substack's new tool tells
// you who's been writing their newsletters with AI"). This cheap, no-LLM check
// drops article-shaped candidates before they reach enrichment, so the review
// queue isn't flooded with non-tools.
const ARTICLE_PHRASES =
  /\b(tells you|how to|why |what |the rise of|is now|has been|announc|launches its|according to|report|study finds|the best|top \d|explained|guide to|tutorial|opinion|op-ed)\b/i

const MAX_TOOL_WORDS = 8
const MAX_TOOL_NAME_LEN = 55

export function looksLikeTool(candidate) {
  const name = String(candidate?.name || '').trim()
  if (!name) return { ok: false, reason: 'empty' }

  const words = name.split(/\s+/).length
  const signals = []
  if (words > MAX_TOOL_WORDS) signals.push('too-many-words')
  if (name.length > MAX_TOOL_NAME_LEN) signals.push('too-long')
  if (ARTICLE_PHRASES.test(name)) signals.push('article-phrase')
  if (/[.?!]$/.test(name) && words > 4) signals.push('sentence')

  // Product Hunt / GitHub are curated product listings — give them more slack;
  // HN / RSS headlines are the noisy ones, so a couple of signals is enough.
  const trusted = candidate.source === 'producthunt' || candidate.source === 'github'
  const threshold = trusted ? 3 : 2

  if (signals.length >= threshold) return { ok: false, reason: signals.join('+') }
  return { ok: true }
}
