// Seed community threads. Categories align with tool categories + 'general'.
// type: question | showcase | discussion. Timestamps are offsets from load so
// "time ago" stays believable in a demo. Replaced by a backend later.

const H = 3600000
const D = 86400000

const seed = (id, category, type, title, author, body, upvotes, ago, replies) => ({
  id, category, type, title, author, body, upvotes, at: Date.now() - ago, replies, seed: true,
})

const reply = (author, body, ago) => ({
  id: `${author}-${ago}`, author, body, at: Date.now() - ago,
})

export const THREADS = [
  seed('t1', 'code', 'question', 'Claude Code vs Cursor for a solo side project?', 'maya_builds',
    "I ship nights and weekends. Is the terminal agent worth it over staying in an editor, or do they overlap too much?", 34, 5 * H, [
    reply('devsan', 'I run both — Cursor for tight edit loops, Claude Code when I want a whole feature done while I make coffee.', 4 * H),
    reply('priya_k', 'For a solo project the agent saved me most on refactors. Editor autocomplete never touched multi-file changes as cleanly.', 2 * H),
  ]),
  seed('t2', 'automation', 'showcase', 'Automated my invoice chase with n8n + a Claude node', 'freelance_fin',
    "Client is 3 days late → n8n drafts a polite nudge, I approve in Telegram, it sends. Cut my admin time in half.", 58, 1 * D, [
    reply('ops_owl', 'The approval-in-Telegram step is the detail everyone skips. Nice.', 20 * H),
    reply('maya_builds', 'Would love the workflow JSON if you ever share it.', 18 * H),
  ]),
  seed('t3', 'design', 'discussion', 'Ideogram finally does readable text in images — anyone switching?', 'pixel_wren',
    "Midjourney is still my go-to for concepts, but for posters with actual words Ideogram is a different league now.", 41, 2 * D, [
    reply('brandi', 'Switched for social assets. Still bounce to Recraft when I need vectors.', 1 * D),
  ]),
  seed('t4', 'writing', 'question', 'How are you keeping brand voice consistent across tools?', 'content_cass',
    "Claude for long-form, Copy.ai for ads — but the tone drifts between them. Style guide in the prompt, or something smarter?", 27, 8 * H, [
    reply('jasper_fan', 'I keep a single voice doc and paste the same 6-line system prompt into everything. Boring but it holds.', 6 * H),
  ]),
  seed('t5', 'learning', 'showcase', 'Turned a 40-page spec into a NotebookLM audio overview for my commute', 'always_learning',
    "Uploaded the sources, got a surprisingly good 12-minute rundown. Passive review on the train actually stuck.", 49, 3 * D, [
    reply('anki_andy', 'Pair it with an Anki deck of the key terms and it really locks in.', 2 * D),
  ]),
  seed('t6', 'data', 'question', 'Julius vs Claude for Sheets for quick client dashboards?', 'numbers_nina',
    "Non-technical clients want charts fast. Chatting with a CSV in Julius feels faster than formulas — anyone regret it at scale?", 19, 12 * H, []),
  seed('t7', 'general', 'discussion', 'What is actually in your daily-driver AI stack right now?', 'stack_scout',
    "Not the hype list — the 3 tools you open every single day. Mine: Claude, Cursor, Perplexity.", 72, 4 * D, [
    reply('devsan', 'Claude Code, Raycast AI, NotebookLM.', 3 * D),
    reply('pixel_wren', 'Figma AI, Midjourney, Claude.', 3 * D),
    reply('freelance_fin', 'n8n, Claude, Grammarly. The unglamorous ones win.', 2 * D),
  ]),
  seed('t8', 'general', 'question', 'Free tier only — what punches way above its price?', 'budget_bea',
    "Student, $0 budget. NotebookLM and Codeium have been unreal. What else is genuinely free-usable?", 63, 6 * H, [
    reply('always_learning', 'Perplexity free tier for research, n8n self-hosted if you can run it.', 5 * H),
  ]),
]

export function timeAgo(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export const TYPE_META = {
  question: { label: 'Question', color: 'var(--cyan)' },
  showcase: { label: 'Showcase', color: '#ec4899' },
  discussion: { label: 'Discussion', color: '#a78bfa' },
}

export const FORUM_CATEGORIES = [
  { id: 'general', name: 'General' },
  { id: 'code', name: 'Code' },
  { id: 'design', name: 'Design' },
  { id: 'writing', name: 'Writing' },
  { id: 'data', name: 'Data' },
  { id: 'automation', name: 'Automation' },
  { id: 'learning', name: 'Learning' },
]
