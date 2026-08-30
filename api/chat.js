// Serverless endpoint that lets Naut actually understand a typed reply.
//
// WHY THIS EXISTS ON THE SERVER
// The app has no backend and the browser bundle is public, so calling Featherless
// from the client would ship the API key to every visitor. This function is the
// only place the key exists. Vercel runs it; the browser never sees it.
//
// WHAT IT DOES
// The client sends one free-text reply plus the question it answers. The model is
// grounded with that question's exact option keys and everything the person has
// already said, and must return one of those keys — it classifies, it does not
// invent. Scoring downstream (personaGenerator, roadmapGenerator) reads those keys
// and is unchanged, so the model can never produce a persona the app cannot build.
//
// MODEL CHOICE
// Featherless, but NOT Kimi-K3. Measured: K3 ~49s per call, Kimi-K2-Instruct ~10s,
// Qwen2.5-7B-Instruct ~2.6s for this exact classification. K3 is a reasoning model
// and reasons before answering, which is right for nightly enrichment and wrong for
// a conversation someone is waiting on. K3 also costs 4 concurrency units against a
// plan limit of 4, meaning one visitor at a time.

const FEATHERLESS_URL = 'https://api.featherless.ai/v1/chat/completions'
const MODEL = process.env.FEATHERLESS_CHAT_MODEL || 'Qwen/Qwen2.5-7B-Instruct'

// ── abuse limits ─────────────────────────────────────────────────────────────
// This is a public endpoint that spends money per call, so every client-supplied
// field is capped. The caps are sized from the real intake (9 questions, ≤6
// options each, short labels) with slack — a legitimate request never hits
// them, and a crafted one cannot inflate the prompt to run up token cost.
const LIMITS = {
  bodyBytes: 10_000,   // whole JSON payload; the real one is ~1KB
  question: 300,
  options: 12,         // real max is 6
  optionField: 80,     // key or label
  answered: 12,        // real max is 9 entries
  answeredField: 120,
  text: 500,           // already the historical cap
}

// Origins allowed to call this from a browser. A cross-origin JSON POST is
// stopped by the preflight anyway (no CORS headers are served), so this is
// defence in depth for the browser path; non-browser clients send no Origin
// and fall through to the rate limit, which is the control that actually
// binds them.
const ALLOWED_ORIGINS = new Set([
  'https://toolnaut.xyz',
  'https://www.toolnaut.xyz',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])
// Exported for the test suite.
export function originAllowed(origin) {
  if (!origin) return true // curl, server-to-server, same-origin without header
  if (origin === 'null') return false // file:// and sandboxed iframes send the literal string
  if (ALLOWED_ORIGINS.has(origin)) return true
  // Only THIS project's Vercel preview deployments — not all of vercel.app,
  // which is anyone's hosting: endsWith('.vercel.app') alone would let any
  // Vercel user's page call this endpoint from a browser. Preview hostnames
  // here are toolnaut-<hash>.vercel.app or <branch>-saikiranreddy18s-projects
  // .vercel.app; exact-parse the origin and match the whole hostname shape.
  try {
    const u = new URL(origin)
    if (u.protocol !== 'https:') return false
    const h = u.hostname
    // Anchored regexes over the PARSED hostname, not prefix/suffix string
    // checks: startsWith('toolnaut-') accepted the degenerate
    // "toolnaut-.vercel.app", and only a full-host match is immune to the
    // "toolnaut.vercel.app.evil.example" family by construction.
    return (
      h === 'toolnaut.vercel.app' ||
      /^toolnaut-[a-z0-9]+(-[a-z0-9]+)*\.vercel\.app$/i.test(h) ||
      /^[a-z0-9]+(-[a-z0-9]+)*-saikiranreddy18s-projects\.vercel\.app$/i.test(h)
    )
  } catch {
    return false
  }
}

// Per-IP sliding window, in instance memory. HONEST LIMITS: a serverless
// platform runs many instances and recycles them, so this bounds abuse per
// warm instance rather than globally — a determined attacker across cold
// starts needs a shared store (Upstash/KV) to stop. What it does reliably
// stop is the cheap case: one client hammering one warm instance in a loop,
// which is also the case that actually burns tokens fastest.
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20
const hits = new Map() // ip -> number[] of timestamps
function rateLimited(ip) {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  if (list.length >= MAX_PER_WINDOW) { hits.set(ip, list); return true }
  list.push(now)
  hits.set(ip, list)
  // cap the map so an IP-rotating attacker cannot grow instance memory forever
  if (hits.size > 5000) hits.clear()
  return false
}

// Validates and NORMALISES the payload — the handler uses only what this
// returns, so a field that skipped validation cannot reach the prompt.
// Exported for the test suite.
export function validateChatPayload(body) {
  if (!body || typeof body !== 'object') return { ok: false }
  const { question, options, text, answered } = body

  if (typeof question !== 'string' || !question.trim() || question.length > LIMITS.question) return { ok: false }
  if (typeof text !== 'string' || !text.trim()) return { ok: false }
  if (!Array.isArray(options) || options.length === 0 || options.length > LIMITS.options) return { ok: false }

  const safeOptions = []
  for (const o of options) {
    if (!o || typeof o.key !== 'string' || typeof o.label !== 'string') return { ok: false }
    if (o.key.length > LIMITS.optionField || o.label.length > LIMITS.optionField) return { ok: false }
    safeOptions.push({ key: o.key, label: o.label })
  }

  const safeAnswered = {}
  if (answered && typeof answered === 'object' && !Array.isArray(answered)) {
    const entries = Object.entries(answered)
    if (entries.length > LIMITS.answered) return { ok: false }
    for (const [k, v] of entries) {
      if (k.length > LIMITS.answeredField) return { ok: false }
      if (typeof v !== 'string' && typeof v !== 'number') return { ok: false }
      if (String(v).length > LIMITS.answeredField) return { ok: false }
      safeAnswered[k] = String(v)
    }
  }

  return {
    ok: true,
    question: question.trim(),
    options: safeOptions,
    answered: safeAnswered,
    text: text.slice(0, LIMITS.text),
  }
}

// Hard ceiling. If the model is slow the visitor must not sit staring at a typing
// indicator — the client falls back to keyword matching, which always answers.
const TIMEOUT_MS = Number(process.env.FEATHERLESS_CHAT_TIMEOUT_MS) || 9000

// Trimmed context so the model knows what the product is choosing between. This is
// the "retrieval" half: it is given the live option set for the question at hand
// rather than a memorised copy, so editing quizLogic.js changes the prompt too.
function buildPrompt({ question, options, answered, text }) {
  const optionList = options.map((o) => `  ${o.key} = ${o.label}`).join('\n')
  const context = Object.keys(answered || {}).length
    ? `\nWhat they have already told you:\n${Object.entries(answered).map(([k, v]) => `  ${k}: ${v}`).join('\n')}`
    : ''

  return {
    system: [
      'You are Naut, the intake assistant for Toolnaut, which recommends AI tools.',
      'Your job is to read one reply and decide which option it means.',
      '',
      'Rules:',
      '- You MUST pick one key from the list. Never invent a key.',
      '- If the reply genuinely fits none of them, use "key": null.',
      '- Write one short sentence back, addressed TO them as "you".',
      '  Never describe them in the third person. Not "they work in data" but',
      '  "Data it is" or "So your day is mostly SQL".',
      '- React to the specific thing they said, not to the option you picked.',
      '- No emoji. No exclamation marks. Do not repeat their words back verbatim.',
      '- Never promise a specific tool by name; you are not choosing tools, only understanding the person.',
      '',
      'Reply with JSON only, no markdown fence: {"key": "<key or null>", "reply": "<one sentence>"}',
    ].join('\n'),
    user: `Question asked: ${question}\n\nValid keys:\n${optionList}${context}\n\nTheir reply: ${JSON.stringify(String(text).slice(0, 500))}`,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  // Reject oversize bodies before doing anything else with them. The client's
  // askServer treats any non-OK status as "use the keyword fallback", so none
  // of these rejections ever strands a visitor mid-conversation.
  const contentLength = Number(req.headers['content-length'])
  if (Number.isFinite(contentLength) && contentLength > LIMITS.bodyBytes) {
    return res.status(413).json({ error: 'Request too large' })
  }

  if (!originAllowed(req.headers.origin)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // x-forwarded-for is client-settable in general, but on Vercel the platform
  // prepends the real client IP; the first entry is the trustworthy one there.
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (rateLimited(ip)) {
    // Standard header so well-behaved clients know when to come back; the
    // window is 60s, so the worst-case wait is one minute.
    res.setHeader('Retry-After', '60')
    return res.status(429).json({ error: 'Too many requests' })
  }

  const key = process.env.FEATHERLESS_API_KEY
  // No key configured is not an error the visitor should see. The client has a
  // deterministic fallback; tell it to use that.
  if (!key) return res.status(200).json({ key: null, reply: null, source: 'unconfigured' })

  const payload = validateChatPayload(req.body)
  if (!payload.ok) {
    return res.status(400).json({ error: 'Invalid request' })
  }

  const validKeys = new Set(payload.options.map((o) => o.key))
  const prompt = buildPrompt(payload)

  try {
    const upstream = await fetch(FEATHERLESS_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 160,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 300)
      console.error('featherless', upstream.status, detail)
      return res.status(200).json({ key: null, reply: null, source: 'upstream_error' })
    }

    const data = await upstream.json()
    const raw = data?.choices?.[0]?.message?.content ?? ''

    // Some models wrap JSON in a markdown fence despite being told not to.
    // Kimi-K2-Instruct did exactly that in testing.
    const cleaned = raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('unparseable model output:', cleaned.slice(0, 200))
      return res.status(200).json({ key: null, reply: null, source: 'unparseable' })
    }

    // The model is not trusted to stay inside the option set. Anything outside it
    // is discarded rather than passed downstream, where it would produce a persona
    // the app has no rules for.
    const chosen = validKeys.has(parsed?.key) ? parsed.key : null
    const reply = typeof parsed?.reply === 'string' ? parsed.reply.slice(0, 240) : null

    return res.status(200).json({ key: chosen, reply, source: 'llm' })
  } catch (e) {
    console.error('chat handler', e?.name || e)
    return res.status(200).json({ key: null, reply: null, source: 'timeout' })
  }
}
