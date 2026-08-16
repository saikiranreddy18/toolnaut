import { test } from 'node:test'
import assert from 'node:assert/strict'
import { looksLikeTool } from '../filter.js'

test('keeps short, real tool names', () => {
  assert.equal(looksLikeTool({ name: 'CodePilot AI', source: 'hackernews' }).ok, true)
  assert.equal(looksLikeTool({ name: 'PixelForge', source: 'hackernews' }).ok, true)
  assert.equal(looksLikeTool({ name: 'n8n', source: 'github' }).ok, true)
})

test('drops article-shaped headlines', () => {
  const headline = "Substack's new tool tells you who's been writing their newsletters with AI"
  assert.equal(looksLikeTool({ name: headline, source: 'hackernews' }).ok, false)
})

test('drops how-to / guide headlines', () => {
  assert.equal(looksLikeTool({ name: 'How to build an AI agent in an afternoon', source: 'hackernews' }).ok, false)
})

test('gives curated sources more slack', () => {
  // A longer but product-like Product Hunt name with only one weak signal stays.
  assert.equal(looksLikeTool({ name: 'Acme Studio for Teams', source: 'producthunt' }).ok, true)
})

test('rejects empty names', () => {
  assert.equal(looksLikeTool({ name: '', source: 'rss' }).ok, false)
})
