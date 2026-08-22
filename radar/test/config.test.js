import { test } from 'node:test'
import assert from 'node:assert/strict'
import { config, hasLLM } from '../config.js'

test('hasLLM is false when no provider is configured', () => {
  assert.equal(hasLLM(), false)
})

test('hasLLM is true once any single provider is configured', () => {
  const real = { ...config.llm }
  config.llm.openai = { key: 'k', model: 'm' }
  try {
    assert.equal(hasLLM(), true)
  } finally {
    Object.assign(config.llm, real)
  }
})

// config.js validates its thresholds at module-load time and throws if they're
// misconfigured (see the file's own top comment: silently wrong thresholds
// would reject every candidate, every run, with no visible error). That guard
// only runs once per module instance, so each case here re-imports the module
// fresh via a cache-busting query string, with RADAR_REVIEW_THRESHOLD /
// RADAR_PUBLISH_THRESHOLD set beforehand.
async function importWithThresholds(review, publish) {
  const prevReview = process.env.RADAR_REVIEW_THRESHOLD
  const prevPublish = process.env.RADAR_PUBLISH_THRESHOLD
  if (review === undefined) delete process.env.RADAR_REVIEW_THRESHOLD
  else process.env.RADAR_REVIEW_THRESHOLD = String(review)
  if (publish === undefined) delete process.env.RADAR_PUBLISH_THRESHOLD
  else process.env.RADAR_PUBLISH_THRESHOLD = String(publish)
  try {
    return await import(`../config.js?t=${Date.now()}-${Math.random()}`)
  } finally {
    if (prevReview === undefined) delete process.env.RADAR_REVIEW_THRESHOLD
    else process.env.RADAR_REVIEW_THRESHOLD = prevReview
    if (prevPublish === undefined) delete process.env.RADAR_PUBLISH_THRESHOLD
    else process.env.RADAR_PUBLISH_THRESHOLD = prevPublish
  }
}

test('valid custom thresholds load and are reflected in config.thresholds', async () => {
  const mod = await importWithThresholds(0.3, 0.6)
  assert.equal(mod.config.thresholds.review, 0.3)
  assert.equal(mod.config.thresholds.publish, 0.6)
})

test('rejects a review threshold that is not below the publish threshold', async () => {
  await assert.rejects(() => importWithThresholds(0.8, 0.75), /invalid thresholds/)
})

test('rejects thresholds expressed as percentages instead of fractions', async () => {
  await assert.rejects(() => importWithThresholds(40, 75), /invalid thresholds/)
})

test('rejects a negative review threshold', async () => {
  await assert.rejects(() => importWithThresholds(-0.1, 0.75), /invalid thresholds/)
})

test('rejects a publish threshold above 1', async () => {
  await assert.rejects(() => importWithThresholds(0.4, 1.5), /invalid thresholds/)
})

test('a review threshold equal to the publish threshold is rejected', async () => {
  await assert.rejects(() => importWithThresholds(0.5, 0.5), /invalid thresholds/)
})
