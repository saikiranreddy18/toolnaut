import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSuggestToolUrl, buildReportIssueUrl } from '../src/utils/suggestTool.js'
import { GITHUB_REPO_URL } from '../src/config.js'

test('buildSuggestToolUrl points at a new GitHub issue with the tool-submission label', () => {
  const url = buildSuggestToolUrl({ name: 'Notion AI', url: 'https://notion.so', note: 'great for docs' })
  assert.ok(url.startsWith(`${GITHUB_REPO_URL}/issues/new?`))
  const params = new URL(url).searchParams
  assert.equal(params.get('labels'), 'tool-submission')
  assert.match(params.get('title'), /Notion AI/)
  assert.match(params.get('body'), /notion\.so/)
  assert.match(params.get('body'), /great for docs/)
})

test('buildSuggestToolUrl never breaks on missing optional fields', () => {
  const url = buildSuggestToolUrl({ name: 'Some Tool' })
  const params = new URL(url).searchParams
  assert.match(params.get('body'), /not given/)
})

test('buildReportIssueUrl points at a new GitHub issue with the tool-report label', () => {
  const url = buildReportIssueUrl({ slug: 'notion-ai', name: 'Notion AI', note: 'pricing link is dead' })
  const params = new URL(url).searchParams
  assert.equal(params.get('labels'), 'tool-report')
  assert.match(params.get('title'), /Notion AI/)
  assert.match(params.get('body'), /notion-ai/)
  assert.match(params.get('body'), /pricing link is dead/)
})

test('buildReportIssueUrl works with just a slug and name, no note', () => {
  const url = buildReportIssueUrl({ slug: 'notion-ai', name: 'Notion AI' })
  const params = new URL(url).searchParams
  assert.match(params.get('body'), /none given/)
})
