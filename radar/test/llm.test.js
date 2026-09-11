import { test } from 'node:test'
import assert from 'node:assert/strict'
import { callLLM, NoLLMError } from '../llm.js'
import { config } from '../config.js'

// config.llm is a plain mutable object (see config.js) — no provider is set
// in this environment, so tests toggle individual providers on config.llm
// directly and restore the original values afterward, the same
// mock-and-restore shape every other radar test uses for globalThis.fetch.
function withLLMConfig(overrides, fn) {
  const real = { ...config.llm }
  Object.assign(config.llm, { featherless: null, anthropic: null, nvidia: null, openai: null, openrouter: null, ...overrides })
  return fn().finally(() => Object.assign(config.llm, real))
}

function withFetch(handler, fn) {
  const real = globalThis.fetch
  globalThis.fetch = handler
  return fn().finally(() => { globalThis.fetch = real })
}

test('throws NoLLMError when no provider is configured', async () => {
  await assert.rejects(() => callLLM('sys', 'user'), NoLLMError)
})

test('featherless is preferred over every other configured provider', async () => {
  let calledUrl
  await withLLMConfig(
    { featherless: { key: 'f', model: 'm' }, anthropic: { key: 'a', model: 'm' }, openai: { key: 'o', model: 'm' } },
    () =>
      withFetch(
        async (url) => {
          calledUrl = String(url)
          return { ok: true, status: 200, headers: new Headers(), json: async () => ({ choices: [{ message: { content: 'hi' } }] }) }
        },
        async () => {
          const out = await callLLM('sys', 'user')
          assert.equal(out, 'hi')
        },
      ),
  )
  assert.match(calledUrl, /featherless\.ai/)
})

test('featherless floors maxTokens at 1024 so a reasoning pass never empties the response', async () => {
  let sentBody
  await withLLMConfig({ featherless: { key: 'f', model: 'm' } }, () =>
    withFetch(
      async (url, opts) => {
        sentBody = JSON.parse(opts.body)
        return { ok: true, status: 200, headers: new Headers(), json: async () => ({ choices: [{ message: { content: '' } }] }) }
      },
      () => callLLM('sys', 'user', { maxTokens: 100 }),
    ),
  )
  assert.equal(sentBody.max_tokens, 1024)
})

test('a maxTokens above the featherless floor is passed through unchanged', async () => {
  let sentBody
  await withLLMConfig({ featherless: { key: 'f', model: 'm' } }, () =>
    withFetch(
      async (url, opts) => {
        sentBody = JSON.parse(opts.body)
        return { ok: true, status: 200, headers: new Headers(), json: async () => ({ choices: [{ message: { content: '' } }] }) }
      },
      () => callLLM('sys', 'user', { maxTokens: 2000 }),
    ),
  )
  assert.equal(sentBody.max_tokens, 2000)
})

test('anthropic is called with its own request shape when it is the only provider set', async () => {
  let sentUrl, sentHeaders, sentBody
  await withLLMConfig({ anthropic: { key: 'anthro-key', model: 'claude-x' } }, () =>
    withFetch(
      async (url, opts) => {
        sentUrl = String(url)
        sentHeaders = opts.headers
        sentBody = JSON.parse(opts.body)
        return { ok: true, status: 200, headers: new Headers(), json: async () => ({ content: [{ text: 'anthropic reply' }] }) }
      },
      async () => {
        const out = await callLLM('be helpful', 'user prompt')
        assert.equal(out, 'anthropic reply')
      },
    ),
  )
  assert.match(sentUrl, /api\.anthropic\.com/)
  assert.equal(sentHeaders['x-api-key'], 'anthro-key')
  assert.equal(sentBody.system, 'be helpful')
  assert.equal(sentBody.messages[0].content, 'user prompt')
})

test('nvidia omits response_format even when json is requested', async () => {
  let sentBody
  await withLLMConfig({ nvidia: { key: 'n', model: 'm' } }, () =>
    withFetch(
      async (url, opts) => {
        sentBody = JSON.parse(opts.body)
        return { ok: true, status: 200, headers: new Headers(), json: async () => ({ choices: [{ message: { content: '{}' } }] }) }
      },
      () => callLLM('sys', 'user', { json: true }),
    ),
  )
  assert.equal(sentBody.response_format, undefined)
  assert.match(sentBody.messages[1].content, /Return only a JSON object/)
})

test('openai includes response_format when json is requested', async () => {
  let sentBody
  await withLLMConfig({ openai: { key: 'o', model: 'gpt' } }, () =>
    withFetch(
      async (url, opts) => {
        sentBody = JSON.parse(opts.body)
        return { ok: true, status: 200, headers: new Headers(), json: async () => ({ choices: [{ message: { content: '{}' } }] }) }
      },
      () => callLLM('sys', 'user', { json: true }),
    ),
  )
  assert.deepEqual(sentBody.response_format, { type: 'json_object' })
})
