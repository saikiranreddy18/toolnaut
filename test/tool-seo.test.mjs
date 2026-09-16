import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toolPath, toolTitle, toolDescription, toolJsonLd, relatedTools, toolStaticHtml } from '../src/utils/toolSeo.js'

const A = { slug: 'alpha', name: 'Alpha', category: 'writing', sourceCategory: 'LLMs & Chatbots', price: 'free', level: 'beginner', blurb: 'Writes things', dev: 'Acme', year: 2024, website: 'https://alpha.example', status: 'Active', tags: ['chat'] }
const B = { slug: 'claude', name: 'Claude', category: 'writing', sourceCategory: 'LLMs & Chatbots', price: 'freemium', status: 'Active' }
const NEWS = { slug: 'news', name: 'Big Co launches a new AI feature today', category: 'writing', sourceCategory: 'LLMs & Chatbots', price: 'free', discoveredAt: 1 }
const OTHER = { slug: 'vid', name: 'Vid', category: 'design', sourceCategory: 'Video', price: 'paid' }

test('every tool gets a public path, a name-first title and a bounded description', () => {
  assert.equal(toolPath('alpha'), '/ai-tools/alpha')
  assert.match(toolTitle(A), /^Alpha — /)
  assert.ok(toolDescription({ ...A, blurb: 'x'.repeat(400) }).length <= 160)
})

test('structured data never invents a price for a tool that is not free', () => {
  const [app] = toolJsonLd(B)
  assert.equal(app.offers, undefined)
  const [freeApp] = toolJsonLd(A)
  assert.equal(freeApp.offers.price, '0')
  assert.equal(JSON.stringify(toolJsonLd(A)).includes('aggregateRating'), false)
})

test('alternatives prefer recognisable tools and drop headline-shaped entries', () => {
  const rel = relatedTools(A, [A, B, NEWS, OTHER])
  assert.equal(rel[0].slug, 'claude')
  assert.ok(!rel.some((t) => t.slug === 'news'))
  assert.ok(!rel.some((t) => t.slug === 'alpha'))
  assert.ok(!rel.some((t) => t.slug === 'vid'), 'unrelated domain is not an alternative')
})

test('static html escapes catalogue text', () => {
  const html = toolStaticHtml({ ...A, name: '<script>x</script>' })
  assert.ok(!html.includes('<script>x'))
  assert.ok(html.includes('&lt;script&gt;'))
})
