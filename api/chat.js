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

  const key = process.env.FEATHERLESS_API_KEY
  // No key configured is not an error the visitor should see. The client has a
  // deterministic fallback; tell it to use that.
  if (!key) return res.status(200).json({ key: null, reply: null, source: 'unconfigured' })

  const { question, options, text, answered } = req.body || {}
  if (!question || !Array.isArray(options) || !options.length || !text) {
    return res.status(400).json({ error: 'question, options and text are required' })
  }

  const validKeys = new Set(options.map((o) => o.key))
  const prompt = buildPrompt({ question, options, answered, text })

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
