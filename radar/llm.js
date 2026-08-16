import { config } from './config.js'

// Provider-agnostic LLM dispatch. Uses whichever provider is configured, in
// order (Anthropic → NVIDIA → OpenAI → OpenRouter). If none is set it throws
// NoLLMError, which callers catch to fall back to deterministic rules — the
// pipeline never hard-depends on an LLM being available.
export class NoLLMError extends Error {}

// NVIDIA's API (build.nvidia.com) is OpenAI-compatible, so it reuses the
// chat-completions path — but many NVIDIA-hosted models reject the
// `response_format: json_object` param, so we skip it there and lean on the
// prompt's "return only JSON" instruction instead.
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'

export async function callLLM(system, user, { json = false, maxTokens = 512 } = {}) {
  const { anthropic, nvidia, openai, openrouter } = config.llm
  if (anthropic) return anthropicCall(anthropic, system, user, json, maxTokens)
  if (nvidia) return chatCompletions(NVIDIA_URL, nvidia, system, user, json, maxTokens, false)
  if (openai) return chatCompletions('https://api.openai.com/v1/chat/completions', openai, system, user, json, maxTokens)
  if (openrouter) return chatCompletions('https://openrouter.ai/api/v1/chat/completions', openrouter, system, user, json, maxTokens)
  throw new NoLLMError('No LLM provider configured')
}

async function anthropicCall(cfg, system, user, json, maxTokens) {
  const content = json ? `${user}\n\nRespond with ONLY valid JSON, no prose.` : user
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// OpenAI + OpenRouter + NVIDIA share the chat-completions shape. Pass
// useResponseFormat=false for providers that don't support the json_object
// response_format param (NVIDIA); the prompt instruction still forces JSON.
async function chatCompletions(url, cfg, system, user, json, maxTokens, useResponseFormat = true) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: maxTokens,
      response_format: json && useResponseFormat ? { type: 'json_object' } : undefined,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: json ? `${user}\n\nReturn only a JSON object.` : user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}
