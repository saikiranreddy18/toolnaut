// Seed per-tool reviews. Mirrors communityData.js's THREADS shape so
// toolReviewsStore.js can layer user reviews over these the same way
// communityStore.js layers user threads over THREADS.

const H = 3600000
const D = 86400000

const seed = (id, slug, author, rating, body, ago) => ({
  id, slug, author, rating, body, at: Date.now() - ago, seed: true,
})

export const REVIEWS = [
  seed('r1', 'chatgpt', 'maya_builds', 5,
    "Daily driver for a year now. Deep Research alone replaced an hour of manual searching most weeks.", 2 * D),
  seed('r2', 'chatgpt', 'budget_bea', 4,
    "Great on the free tier, but I hit the message cap right when I need it most.", 6 * D),
  seed('r3', 'claude', 'devsan', 5,
    "The one I trust for anything long-form or multi-file. Fewer confident-sounding wrong answers than the others.", 1 * D),
  seed('r4', 'claude', 'priya_k', 5,
    "Switched my whole team over for code review. Catches the kind of thing a quick skim misses.", 4 * D),
  seed('r5', 'notion-ai', 'content_cass', 3,
    "Useful for first drafts inside docs I already have open, but it's a paid add-on on top of Notion itself — adds up.", 9 * H),
  seed('r6', 'perplexity', 'always_learning', 5,
    "Citations are the whole point. I stopped opening ten tabs to fact-check a claim.", 3 * D),
  seed('r7', 'perplexity', 'numbers_nina', 4,
    "Deep Research is genuinely slower than I expected, but the depth is worth the wait for real reports.", 5 * D),
  seed('r8', 'cursor', 'maya_builds', 5,
    "Agent mode did a cross-file rename + migration in one go that would've eaten my whole afternoon.", 7 * H),
  seed('r9', 'cursor', 'ops_owl', 4,
    "Excellent, but it's easy to burn through fast requests on a big refactor before you notice.", 2 * D),
  seed('r10', 'midjourney', 'pixel_wren', 5,
    "Still the best for anything that needs to look like art rather than a render. Nothing else is close on style.", 1 * D),
  seed('r11', 'midjourney', 'brandi', 4,
    "Great output, but the Discord-first workflow still feels dated compared to a proper web app.", 4 * D),
  seed('r12', 'github-copilot', 'devsan', 4,
    "Solid autocomplete, though Cursor's agent mode has pulled ahead for anything bigger than a single function.", 3 * D),
  seed('r13', 'v0', 'freelance_fin', 4,
    "Turns a rough idea into a real component shell fast. I still rewrite the logic, but the scaffolding alone saves an hour.", 6 * D),
  seed('r14', 'runway', 'pixel_wren', 5,
    "Gen-4 is the first AI video tool I'd actually show a client without caveats.", 2 * D),
  seed('r15', 'grammarly', 'jasper_fan', 3,
    "Does its one job everywhere I type, but the AI rewrite suggestions are hit or miss compared to just asking Claude.", 8 * D),
  seed('r16', 'notebooklm', 'anki_andy', 5,
    "The Audio Overview feature is the sleeper hit here. Turned a 40-page spec into a commute I actually learned from.", 3 * D),
  seed('r17', 'figma-make', 'brandi', 4,
    "Prompt-to-prototype is genuinely fast for a first pass, hands off cleanly to real Figma for the polish.", 5 * D),
  seed('r18', 'gemini', 'stack_scout', 3,
    "Tight Workspace integration is the real selling point for me, the chat itself is a step behind the frontier models.", 4 * D),
  seed('r19', 'grok', 'devsan', 3,
    "Real-time X data is a genuinely different angle, but I don't reach for it outside that one use case.", 6 * D),
  seed('r20', 'deepseek', 'budget_bea', 5,
    "Free and the reasoning mode holds up. My go-to when I don't want to burn a paid quota on a quick question.", 2 * D),
]
