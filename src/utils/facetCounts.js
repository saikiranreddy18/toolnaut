import { matchesQuery } from './search'

// Standard faceted-search semantics: each group's count applies every OTHER
// active filter (plus the text search) but clears that group's own filter —
// so a price pill answers "how many results if I picked this price, given my
// current category/level/search," not "how many results across the whole
// catalog." Shares the same predicate Discover.jsx's own `results` memo uses,
// so the two can't silently drift apart.
export function getFacetCounts(tools, { q, cat, price, level } = {}) {
  const categories = {}
  const prices = {}
  const levels = {}

  for (const tool of tools) {
    if (!matchesQuery(tool, q)) continue
    const matchesCat = !cat || tool.category === cat
    const matchesPrice = !price || tool.price === price
    const matchesLevel = !level || tool.level === level

    if (matchesPrice && matchesLevel) {
      categories[tool.category] = (categories[tool.category] || 0) + 1
    }
    if (matchesCat && matchesLevel) {
      prices[tool.price] = (prices[tool.price] || 0) + 1
    }
    if (matchesCat && matchesPrice) {
      levels[tool.level] = (levels[tool.level] || 0) + 1
    }
  }

  return { categories, prices, levels }
}
