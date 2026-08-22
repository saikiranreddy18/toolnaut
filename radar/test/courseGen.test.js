import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateCourse } from '../courseGen.js'
import { skillIdsFor } from '../skills.js'

// No LLM key is set in this environment, so generateCourse() always falls
// through to courseFallback — the deterministic template this repo relies on
// when no LLM is configured (see courseGen.js's own top comment).

test('falls back to the deterministic template and tags it as such', async () => {
  const tool = { slug: 'zorvane', name: 'Zorvane', category: 'automation', level: 'intermediate', blurb: 'Does things.', tags: [] }
  const course = await generateCourse(tool, { now: '2026-01-01T00:00:00Z' })
  assert.equal(course.generatedBy, 'fallback:template')
  assert.equal(course.id, 'course-zorvane')
  assert.equal(course.toolSlug, 'zorvane')
  assert.equal(course.title, 'Master Zorvane')
  assert.equal(course.level, 'intermediate')
  assert.equal(course.updatedAt, '2026-01-01T00:00:00Z')
})

test('template modules follow the fixed set-up / use-it / make-it-stick arc', async () => {
  const tool = { slug: 'tool-a', name: 'ToolA', category: 'code', level: 'advanced', blurb: '', tags: [] }
  const course = await generateCourse(tool, { now: '2026-01-01T00:00:00Z' })
  assert.deepEqual(course.modules.map((m) => m.title), ['Set up', 'Use it for real', 'Make it stick'])
})

test('beginner tools get onboarding-flavored steps, others get real-workflow steps', async () => {
  const beginnerTool = { slug: 'begin', name: 'Begin', category: 'code', level: 'beginner', blurb: '', tags: [] }
  const advancedTool = { slug: 'adv', name: 'Adv', category: 'code', level: 'advanced', blurb: '', tags: [] }

  const beginnerCourse = await generateCourse(beginnerTool, { now: '2026-01-01T00:00:00Z' })
  const advancedCourse = await generateCourse(advancedTool, { now: '2026-01-01T00:00:00Z' })

  assert.match(beginnerCourse.modules[0].steps[0], /official getting-started flow/)
  assert.match(advancedCourse.modules[0].steps[0], /Configure Adv for your real workflow/)
})

test('skills mirror skillIdsFor(tool), including per-tag skills', async () => {
  const tool = { slug: 'tagged', name: 'Tagged', category: 'design', level: 'beginner', blurb: '', tags: ['video', 'voice'] }
  const course = await generateCourse(tool, { now: '2026-01-01T00:00:00Z' })
  assert.deepEqual(course.skills, skillIdsFor(tool))
  assert.ok(course.skills.includes('skill-video'))
})
