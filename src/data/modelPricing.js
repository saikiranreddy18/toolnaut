// Hand-maintained reference prices for the frontier model families Toolnaut's
// catalog actually lists (chatgpt, claude, gemini tool slugs). Provider API
// pricing changes without notice and isn't something the radar pipeline would
// ever discover or enrich, so this is a short dated table re-verified like any
// other fact in this app, not a live feed — same honesty pattern as
// PRICE_LABELS and the status-note gap: carry asOf + sourceUrl, show both.
//
// `toolSlug` matches a catalog entry's own slug (see toolsCatalog.js) so a
// result can link back via getTool(toolSlug). One flagship + one budget tier
// per family — not every model a provider sells, just enough to answer "what
// would calling this provider's API cost me a month".

export const MODEL_PRICING = [
  {
    slug: 'gpt-5-6-sol',
    toolSlug: 'chatgpt',
    provider: 'OpenAI',
    model: 'GPT-5.6 Sol',
    inputPer1M: 5,
    outputPer1M: 30,
    asOf: '2026-10-01',
    sourceUrl: 'https://openai.com/api/pricing/',
  },
  {
    slug: 'gpt-5-6-luna',
    toolSlug: 'chatgpt',
    provider: 'OpenAI',
    model: 'GPT-5.6 Luna',
    inputPer1M: 1,
    outputPer1M: 6,
    asOf: '2026-10-01',
    sourceUrl: 'https://openai.com/api/pricing/',
  },
  {
    slug: 'claude-opus-5-5',
    toolSlug: 'claude',
    provider: 'Anthropic',
    model: 'Claude Opus 5.5',
    inputPer1M: 4,
    outputPer1M: 20,
    asOf: '2026-10-01',
    sourceUrl: 'https://docs.anthropic.com/en/docs/about-claude/pricing',
  },
  {
    slug: 'claude-haiku-4-5',
    toolSlug: 'claude',
    provider: 'Anthropic',
    model: 'Claude Haiku 4.5',
    inputPer1M: 1,
    outputPer1M: 5,
    asOf: '2026-10-01',
    sourceUrl: 'https://docs.anthropic.com/en/docs/about-claude/pricing',
  },
  {
    slug: 'gemini-3-1-pro',
    toolSlug: 'gemini',
    provider: 'Google',
    model: 'Gemini 3.1 Pro',
    inputPer1M: 2,
    outputPer1M: 12,
    asOf: '2026-10-01',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
  },
  {
    slug: 'gemini-3-8-flash',
    toolSlug: 'gemini',
    provider: 'Google',
    model: 'Gemini 3.8 Flash',
    inputPer1M: 0.75,
    outputPer1M: 3.75,
    asOf: '2026-10-01',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
  },
]

export function modelsForTool(toolSlug) {
  return MODEL_PRICING.filter((m) => m.toolSlug === toolSlug)
}
