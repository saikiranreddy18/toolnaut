import {
  makeToolRecord, DOMAINS, PRICES, LEVELS, PRICE_LABELS,
  SOURCE_CATEGORIES, SOURCE_CATEGORY_IDS,
} from './schema.js'
import { contentHash } from './util/hash.js'
import { callLLM, NoLLMError } from './llm.js'
import { log } from './util/logger.js'
import { CRITERIA, INTEGRATION_FLAGS, measureSignals, normalizeAssessment, scoreTool } from './scorecard.js'

// Turns a raw candidate into a full tool record matching the catalog schema.
// Tries the LLM first; on ANY failure (no key, API error, bad JSON) it falls
// back to a deterministic rule-based classifier so the pipeline keeps moving.
//
// The same LLM call also returns the radar assessment (workflow shape,
// integration surface, rubric scores) — one call, because the model is already
// reading the tool's description and a second round trip doubles the slowest
// step in the run. Everything about the assessment is optional: no LLM, or a
// model that answers only the classification half, still yields a valid record
// whose scorecard simply reports lower coverage.
export async function enrich(candidate, slug, { now }) {
  let base
  let assessment = null
  try {
    const parsed = await enrichWithLLM(candidate)
    base = normalizeEnriched(parsed, candidate)
    assessment = normalizeAssessment(parsed)
    base.enrichedBy = 'llm'
  } catch (e) {
    if (!(e instanceof NoLLMError)) log.warn(`LLM enrich failed for ${slug}, using fallback`, e.message)
    base = enrichFallback(candidate)
    base.enrichedBy = 'fallback:rules'
  }

  const signals = measureSignals(candidate, now)
  const record = makeToolRecord({
    ...base,
    slug,
    name: candidate.name,
    website: candidate.url,
    source: candidate.source,
    sourceUrl: candidate.sourceUrl,
    discoveredAt: now,
    updatedAt: now,
    lifecycle: 'staged',
    signals,
    automation: assessment?.automation || null,
    integration: assessment?.integration || null,
    verdict: assessment
      ? {
          bestFor: assessment.bestFor,
          chooseWhen: assessment.chooseWhen,
          avoidWhen: assessment.avoidWhen,
          alternatives: assessment.alternatives,
        }
      : null,
    assessedBy: assessment ? 'llm' : '',
    scorecard: scoreTool({ signals, assessment, now }),
  })
  record.contentHash = contentHash(record)
  return record
}

async function enrichWithLLM(candidate) {
  const system =
    `You classify AI tools into a fixed catalog schema, then assess them for builders who wire tools into automated workflows.\n` +
    `Domains: ${DOMAINS.join(', ')}.\n` +
    `Prices: ${PRICES.join(', ')}.\n` +
    `Levels: ${LEVELS.join(', ')}.\n` +
    `Source categories: ${SOURCE_CATEGORIES.map((c) => c.id).join('; ')}.\n` +
    `Rubric, each scored 0-5: ${CRITERIA.map((c) => `${c.key} (${c.label})`).join('; ')}.\n` +
    `OMIT any score you cannot justify from the text you are given. A missing score is correct; a guessed one is not.`
  const user =
    `Tool: ${candidate.name}\nURL: ${candidate.url}\nDescription: ${candidate.description}\n\n` +
    `Return JSON with keys: category (a domain), sourceCategory (a source category), ` +
    `price (a price), pricing (short label), level (a level), blurb (one sentence under 100 chars), ` +
    `audience (short phrase), dev (maker name or ""), tags (array of 2-5 lowercase keywords), ` +
    `automation (object: trigger, input, aiStep, action, humanControl, outcome — one short phrase each ` +
    `describing the workflow this tool sits in; "" for any you cannot state), ` +
    `integration (object of booleans: ${INTEGRATION_FLAGS.join(', ')} — true ONLY where the description says or clearly implies it), ` +
    `scores (object mapping rubric keys to 0-5, omitting the ones you cannot judge), ` +
    `bestFor, chooseWhen, avoidWhen (one short sentence each), alternatives (array of up to 4 competing tool names).`
  const text = await callLLM(system, user, { json: true, maxTokens: 1100 })
  return JSON.parse(extractJSON(text))
}

// --- deterministic fallback classifier ---------------------------------------

const DOMAIN_KEYWORDS = {
  code: ['code', 'coding', 'developer', 'ide', 'sdk', 'devops', 'programming', 'repo', 'debug', 'api'],
  design: ['image', 'video', 'design', 'logo', 'photo', 'art', '3d', 'avatar', 'music', 'audio', 'voice', 'ui'],
  writing: ['write', 'writing', 'content', 'copy', 'blog', 'chat', 'chatbot', 'llm', 'translate', 'seo', 'marketing'],
  data: ['data', 'analytics', 'research', 'search', 'finance', 'health', 'science', 'dashboard', 'insight'],
  automation: ['automation', 'agent', 'workflow', 'integrate', 'zapier', 'productivity', 'meeting', 'recruit', 'support'],
  learning: ['learn', 'course', 'education', 'tutor', 'study', 'training', 'teach'],
}

function classifyDomain(text) {
  const t = text.toLowerCase()
  let best = 'automation'
  let bestScore = 0
  for (const [d, kws] of Object.entries(DOMAIN_KEYWORDS)) {
    const score = kws.reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0)
    if (score > bestScore) {
      best = d
      bestScore = score
    }
  }
  return best
}

function defaultSourceCategory(domain) {
  return (SOURCE_CATEGORIES.find((c) => c.domain === domain) || SOURCE_CATEGORIES[0]).id
}

function guessPrice(text) {
  const t = text.toLowerCase()
  if (/\bopen[- ]?source\b|\bfree\b|\bmit\b|\bapache\b/.test(t)) return 'free'
  return 'freemium'
}

function firstSentence(desc, name) {
  const s = String(desc || name).split(/(?<=[.!?])\s/)[0].trim()
  if (!s) return name
  return s.length > 100 ? `${s.slice(0, 97)}…` : s
}

function extractTags(text, domain) {
  const t = text.toLowerCase()
  const tags = new Set([domain])
  for (const kw of ['agent', 'chat', 'image', 'video', 'voice', 'code', 'api', 'data', 'automation', 'writing', 'search']) {
    if (t.includes(kw)) tags.add(kw)
  }
  return [...tags].slice(0, 5)
}

function enrichFallback(candidate) {
  const text = `${candidate.name} ${candidate.description}`
  const category = classifyDomain(text)
  const price = guessPrice(text)
  return {
    category,
    sourceCategory: defaultSourceCategory(category),
    price,
    pricing: PRICE_LABELS[price],
    level: 'intermediate',
    blurb: firstSentence(candidate.description, candidate.name),
    audience: '',
    dev: candidate.raw?.owner || '',
    tags: extractTags(text, category),
    year: new Date().getFullYear(),
  }
}

// Coerce LLM output onto the schema; any off-menu field falls back per-field so
// a partly-wrong LLM answer still yields a valid record (or fails the gate cleanly).
function normalizeEnriched(p, candidate) {
  const text = `${candidate.name} ${candidate.description}`
  const category = DOMAINS.includes(p.category) ? p.category : classifyDomain(text)
  const sourceCategory = SOURCE_CATEGORY_IDS.has(p.sourceCategory) ? p.sourceCategory : defaultSourceCategory(category)
  const price = PRICES.includes(p.price) ? p.price : guessPrice(text)
  const level = LEVELS.includes(p.level) ? p.level : 'intermediate'
  const blurb = typeof p.blurb === 'string' && p.blurb.trim() ? p.blurb.trim().slice(0, 120) : firstSentence(candidate.description, candidate.name)
  const tags = Array.isArray(p.tags) ? p.tags.filter((x) => typeof x === 'string').slice(0, 5) : extractTags(text, category)
  return {
    category,
    sourceCategory,
    price,
    pricing: p.pricing || PRICE_LABELS[price],
    level,
    blurb,
    audience: typeof p.audience === 'string' ? p.audience : '',
    dev: p.dev || candidate.raw?.owner || '',
    tags,
    year: new Date().getFullYear(),
  }
}

function extractJSON(text) {
  const m = text.match(/\{[\s\S]*\}/)
  return m ? m[0] : text
}
