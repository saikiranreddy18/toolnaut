import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DOMAINS, SOURCE_CATEGORIES, SOURCE_CATEGORY_IDS, DOMAIN_FOR_SOURCE_CATEGORY,
  HASHED_FIELDS, REQUIRED_TOOL_FIELDS,
  makeToolRecord, makeCourseRecord, makeSkillRecord,
} from '../schema.js'

test('makeToolRecord fills in every field with a default', () => {
  const rec = makeToolRecord()
  assert.equal(rec.slug, '')
  assert.equal(rec.lifecycle, 'staged')
  assert.equal(rec.version, 1)
  assert.deepEqual(rec.tags, [])
})

test('makeToolRecord overrides only the fields given, keeping the rest at default', () => {
  const rec = makeToolRecord({ name: 'Acme', confidence: 0.8 })
  assert.equal(rec.name, 'Acme')
  assert.equal(rec.confidence, 0.8)
  assert.equal(rec.lifecycle, 'staged')
  assert.equal(rec.slug, '')
})

test('makeCourseRecord and makeSkillRecord apply the same default+override contract', () => {
  const course = makeCourseRecord({ title: 'Get started' })
  assert.equal(course.title, 'Get started')
  assert.equal(course.version, 1)
  assert.deepEqual(course.modules, [])

  const skill = makeSkillRecord({ name: 'Prompting' })
  assert.equal(skill.name, 'Prompting')
  assert.deepEqual(skill.toolsTeaching, [])
})

// validate.js's REQUIRED_TOOL_FIELDS gate and hash.js's HASHED_FIELDS basis both
// index into a tool record by these names. If either list drifts from the
// record shape (a rename in one place, not the other), the gate would check a
// field that never exists — silently rejecting nothing, or hashing nothing —
// with no test failing anywhere else.
test('every REQUIRED_TOOL_FIELDS name is a real key on makeToolRecord()', () => {
  const rec = makeToolRecord()
  for (const f of REQUIRED_TOOL_FIELDS) {
    assert.ok(f in rec, `missing key: ${f}`)
  }
})

test('every HASHED_FIELDS name is a real key on makeToolRecord()', () => {
  const rec = makeToolRecord()
  for (const f of HASHED_FIELDS) {
    assert.ok(f in rec, `missing key: ${f}`)
  }
})

test('SOURCE_CATEGORY_IDS contains exactly the SOURCE_CATEGORIES ids, with no duplicates', () => {
  assert.equal(SOURCE_CATEGORY_IDS.size, SOURCE_CATEGORIES.length)
  for (const c of SOURCE_CATEGORIES) {
    assert.ok(SOURCE_CATEGORY_IDS.has(c.id), `missing id: ${c.id}`)
  }
})

test('DOMAIN_FOR_SOURCE_CATEGORY maps every category to a valid domain', () => {
  for (const c of SOURCE_CATEGORIES) {
    assert.equal(DOMAIN_FOR_SOURCE_CATEGORY[c.id], c.domain)
    assert.ok(DOMAINS.includes(c.domain), `${c.id} maps to unknown domain: ${c.domain}`)
  }
})
