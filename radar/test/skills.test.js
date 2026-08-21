import { test } from 'node:test'
import assert from 'node:assert/strict'
import { skillIdsFor, skillsFor } from '../skills.js'

const tool = { slug: 'acme', category: 'writing', level: 'beginner', tags: ['ai', 'seo'] }

test('domain skill plus one per tag', () => {
  assert.deepEqual(skillIdsFor(tool), ['skill-writing', 'skill-ai', 'skill-seo'])
})

test('duplicate tags collapse to one id', () => {
  assert.deepEqual(
    skillIdsFor({ ...tool, tags: ['ai', 'ai', 'seo'] }),
    ['skill-writing', 'skill-ai', 'skill-seo'],
  )
})

test('a tag matching the category collapses with it', () => {
  assert.deepEqual(
    skillIdsFor({ ...tool, tags: ['writing', 'ai'] }),
    ['skill-writing', 'skill-ai'],
  )
})

test('caps at 6 ids — domain plus at most 5 tags', () => {
  const many = { ...tool, tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }
  const ids = skillIdsFor(many)
  assert.equal(ids.length, 6)
  assert.deepEqual(ids, ['skill-writing', 'skill-a', 'skill-b', 'skill-c', 'skill-d', 'skill-e'])
})

test('missing tags produces just the domain skill', () => {
  assert.deepEqual(skillIdsFor({ ...tool, tags: undefined }), ['skill-writing'])
})

test('skillsFor shapes one record per id, with hyphens turned to spaces in the name', () => {
  const records = skillsFor(tool, { now: '2026-01-01T00:00:00Z' })
  assert.equal(records.length, 3)
  const [domainSkill, aiSkill] = records
  assert.equal(domainSkill.id, 'skill-writing')
  assert.equal(domainSkill.name, 'writing')
  assert.equal(aiSkill.name, 'ai')
})

test('skillsFor threads tool identity into every record', () => {
  const [record] = skillsFor(tool, { now: '2026-01-01T00:00:00Z' })
  assert.equal(record.domain, tool.category)
  assert.equal(record.level, tool.level)
  assert.deepEqual(record.toolsTeaching, [tool.slug])
  assert.deepEqual(record.courses, [`course-${tool.slug}`])
  assert.equal(record.updatedAt, '2026-01-01T00:00:00Z')
})

test('a multi-word tag keeps its hyphen turned into a space in the name', () => {
  const records = skillsFor({ ...tool, tags: ['machine-learning'] }, { now: null })
  const mlSkill = records.find((r) => r.id === 'skill-machine-learning')
  assert.equal(mlSkill.name, 'machine learning')
})
