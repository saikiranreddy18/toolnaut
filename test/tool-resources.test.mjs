// The researched integration facts and training links must stay trustworthy:
// every entry is a real catalogue tool, every link points at that tool's own
// official domain over https, and nothing is duplicated or undated.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TOOL_RESOURCES, VERIFIED, REVIEW_DUE } from '../src/data/toolResources.js'
import { getTool } from '../src/utils/toolsCatalog.js'

const KINDS = new Set(['course', 'docs', 'help'])
const SOURCE_TYPES = new Set(['official_docs', 'official_pricing', 'official_announcement'])

function onOfficialDomain(url, domains) {
  const u = new URL(url)
  if (u.protocol !== 'https:') return false
  return domains.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`))
}

test('dates are real and the review is scheduled after verification', () => {
  assert.ok(Number.isFinite(Date.parse(VERIFIED)))
  assert.ok(Date.parse(REVIEW_DUE) > Date.parse(VERIFIED))
})

test('every entry is a tool that exists in the catalogue', () => {
  for (const slug of Object.keys(TOOL_RESOURCES)) {
    assert.ok(getTool(slug), `${slug} is not in the catalogue`)
  }
})

test('every source and learning link is https on the tool\'s own official domain', () => {
  for (const [slug, r] of Object.entries(TOOL_RESOURCES)) {
    assert.ok(Array.isArray(r.domains) && r.domains.length, `${slug} needs official domains`)
    if (r.integrations) {
      assert.ok(onOfficialDomain(r.integrations.source.url, r.domains), `${slug} source ${r.integrations.source.url} is not official`)
    }
    for (const l of r.learn || []) {
      assert.ok(onOfficialDomain(l.url, r.domains), `${slug} learning link ${l.url} is not official`)
    }
  }
})

test('integration entries are sourced, non-empty and free of duplicates', () => {
  for (const [slug, r] of Object.entries(TOOL_RESOURCES)) {
    if (!r.integrations) continue
    const i = r.integrations
    assert.ok(['connects', 'works_in'].includes(i.kind), `${slug} kind`)
    assert.ok(i.names.length > 0, `${slug} has no names`)
    assert.equal(new Set(i.names.map((n) => n.toLowerCase())).size, i.names.length, `${slug} lists a name twice`)
    assert.ok(i.source?.title && SOURCE_TYPES.has(i.source.type), `${slug} source is incomplete`)
  }
})

test('learning resources have a title and a known kind, and every entry offers something', () => {
  for (const [slug, r] of Object.entries(TOOL_RESOURCES)) {
    assert.ok(r.integrations || (r.learn && r.learn.length), `${slug} has neither integrations nor learning links`)
    for (const l of r.learn || []) {
      assert.ok(l.title, `${slug} learning link without a title`)
      assert.ok(KINDS.has(l.kind), `${slug} learning kind ${l.kind}`)
    }
  }
})
