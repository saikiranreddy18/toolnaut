// getFacetCounts backs the per-pill counts on Discover's category/price/level
// filter rows — a regression here shows wrong numbers next to every chip.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

const { getFacetCounts } = await import('../src/utils/facetCounts.js')

const TOOLS = [
  { name: 'Claude', blurb: 'AI assistant', sourceCategory: 'LLMs', dev: 'Anthropic', tags: [], category: 'code', price: 'freemium', level: 'beginner' },
  { name: 'Midjourney', blurb: 'Image generation', sourceCategory: 'Image', dev: 'Midjourney', tags: [], category: 'design', price: 'paid', level: 'intermediate' },
  { name: 'GPT Engineer', blurb: 'Code generation', sourceCategory: 'Coding', dev: '', tags: [], category: 'code', price: 'free', level: 'advanced' },
  { name: 'Figma AI', blurb: 'Design assistant', sourceCategory: 'Design', dev: '', tags: [], category: 'design', price: 'freemium', level: 'beginner' },
]

describe('getFacetCounts', () => {
  test('with no filters, each group counts across the whole list', () => {
    const { categories, prices, levels } = getFacetCounts(TOOLS, {})
    assert.deepEqual(categories, { code: 2, design: 2 })
    assert.deepEqual(prices, { freemium: 2, paid: 1, free: 1 })
    assert.deepEqual(levels, { beginner: 2, intermediate: 1, advanced: 1 })
  })

  test("a group's own active filter does not shrink its own counts", () => {
    const { categories } = getFacetCounts(TOOLS, { cat: 'code' })
    // Picking "code" still shows what every category would yield, not just code's own count.
    assert.deepEqual(categories, { code: 2, design: 2 })
  })

  test('other active filters narrow a group before it counts', () => {
    const { prices } = getFacetCounts(TOOLS, { cat: 'design' })
    assert.deepEqual(prices, { paid: 1, freemium: 1 })
  })

  test('text search narrows every group', () => {
    const { categories } = getFacetCounts(TOOLS, { q: 'image' })
    assert.deepEqual(categories, { design: 1 })
  })

  test('a combination with zero matches yields an empty count object, not an error', () => {
    const { levels } = getFacetCounts(TOOLS, { cat: 'design', price: 'free' })
    assert.deepEqual(levels, {})
  })

  test('empty tool list returns all-empty groups', () => {
    assert.deepEqual(getFacetCounts([], {}), { categories: {}, prices: {}, levels: {} })
  })
})
