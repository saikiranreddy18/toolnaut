import { fileURLToPath } from 'node:url'

// All config comes from env with safe defaults. The pipeline runs with NO env
// set at all: public no-key sources + deterministic fallback enrichment. Keys
// only unlock richer sources and LLM enrichment.
const num = (v, d) => (v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d)
const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean)

export const config = {
  thresholds: {
    publish: num(process.env.RADAR_PUBLISH_THRESHOLD, 0.75),
    review: num(process.env.RADAR_REVIEW_THRESHOLD, 0.4),
  },
  maxCandidates: num(process.env.RADAR_MAX_CANDIDATES, 100),
  dataDir: process.env.RADAR_DATA_DIR || fileURLToPath(new URL('./data', import.meta.url)),
  sources: {
    github: { enabled: true, token: process.env.GITHUB_TOKEN || null },
    hackernews: { enabled: true },
    producthunt: { enabled: !!process.env.PRODUCTHUNT_TOKEN, token: process.env.PRODUCTHUNT_TOKEN || null },
    rss: { enabled: !!process.env.RSS_FEEDS, feeds: list(process.env.RSS_FEEDS) },
  },
  llm: {
    // provider-agnostic; the first configured one (in this order) is used, and
    // enrich/course-gen fall back to deterministic rules if none is set.
    featherless: process.env.FEATHERLESS_API_KEY
      ? { key: process.env.FEATHERLESS_API_KEY, model: process.env.FEATHERLESS_MODEL || 'moonshotai/Kimi-K3' }
      : null,
    anthropic: process.env.ANTHROPIC_API_KEY
      ? { key: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8' }
      : null,
    nvidia: process.env.NVIDIA_API_KEY
      ? { key: process.env.NVIDIA_API_KEY, model: process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct' }
      : null,
    openai: process.env.OPENAI_API_KEY
      ? { key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4o' }
      : null,
    openrouter: process.env.OPENROUTER_API_KEY
      ? { key: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet' }
      : null,
  },
}

// Fail loudly on a misconfigured threshold pair (e.g. percents instead of
// fractions) — left unchecked it silently rejects every candidate, every run.
const { publish, review } = config.thresholds
if (!(review >= 0 && review < publish && publish <= 1)) {
  throw new Error(
    `radar config: invalid thresholds (review=${review}, publish=${publish}) — expected 0 <= review < publish <= 1, as fractions not percentages`,
  )
}

export function hasLLM() {
  const { anthropic, nvidia, openai, openrouter } = config.llm
  return !!(anthropic || nvidia || openai || openrouter)
}
