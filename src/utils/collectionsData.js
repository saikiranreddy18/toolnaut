// Hand-curated tool bundles — the "here are N tools that work well together
// for X" middle step between the 6 broad /tools/:domain pages (too wide) and
// the 9-question quiz (too much commitment for a first visit). Editorial
// rationale only, no invented per-tool scores. Every toolSlug below is
// cross-checked against toolsCatalog.js's real catalog, same discipline as
// communityData.js's seed authors.

export const COLLECTIONS = [
  {
    slug: 'solo-founder-stack',
    title: "The Solo Founder's Stack",
    blurb: 'Build, automate, write and pitch without hiring anyone.',
    rationale:
      "A solo founder doesn't need the best tool in each category — they need five that don't fight each other. Claude drafts and reasons through decisions, Cursor ships the product, n8n automates the busywork no one else is around to do, Notion AI keeps the one source of truth, and Gamma turns all of it into a deck the moment someone asks for one.",
    toolSlugs: ['claude', 'cursor', 'n8n', 'notion-ai', 'gamma'],
  },
  {
    slug: 'content-creator-starter-kit',
    title: 'Content Creator Starter Kit',
    blurb: 'Script, voice, clip and visual — one short pipeline per post.',
    rationale:
      'Every one of these does one step of the same pipeline: Descript cuts the long-form by editing a transcript, ElevenLabs covers voiceover and dubbing, Opus Clip turns the long cut into shorts automatically, Midjourney makes the thumbnail or cover art, and Suno scores it when stock music would sound generic.',
    toolSlugs: ['descript', 'elevenlabs', 'opus-clip', 'midjourney', 'suno'],
  },
  {
    slug: 'ai-coding-crew',
    title: 'AI Coding Crew',
    blurb: 'An editor, a pair programmer, a terminal agent and a prototyper.',
    rationale:
      'These overlap on paper and complement in practice: Cursor for the main agentic edit loop, GitHub Copilot where you stay in a plainer IDE, Claude Code for terminal-driven multi-file work while you do something else, Windsurf as a second agentic IDE worth comparing against Cursor, and v0 for throwing up a UI prototype before any of the others touch real code.',
    toolSlugs: ['cursor', 'github-copilot', 'claude-code', 'windsurf', 'v0'],
  },
  {
    slug: 'research-writing-desk',
    title: 'Research & Writing Desk',
    blurb: 'Find a source, read it, write about it, send it anywhere.',
    rationale:
      "Perplexity answers with citations instead of a flat summary, NotebookLM keeps the research grounded to the sources you actually uploaded, Claude turns notes into a finished draft, Grammarly catches what's left once the draft exists, and DeepL carries the result into a language you don't write in yourself.",
    toolSlugs: ['perplexity', 'notebooklm', 'claude', 'grammarly', 'deepl'],
  },
  {
    slug: 'no-code-automation-crew',
    title: 'No-Code Automation Crew',
    blurb: 'Three automation builders and a task layer to run them from.',
    rationale:
      "n8n, Zapier and Make solve the same problem — trigger, action, done — with real differences in pricing and how visual the builder is; most teams eventually settle on one after trying more than one. Taskade sits on top as the task and agent layer that actually tracks what the automations are supposed to be doing.",
    toolSlugs: ['n8n', 'zapier', 'make', 'taskade'],
  },
  {
    slug: 'ai-video-production-studio',
    title: 'AI Video Production Studio',
    blurb: 'Avatars, voice, generative footage and motion effects in one shoot.',
    rationale:
      "HeyGen and Synthesia both make AI-avatar video but target different budgets and team sizes, worth comparing directly. Runway and Pika both generate footage from text or an image, with different strengths on realism versus playful effects. ElevenLabs closes the loop with voice that doesn't sound like text-to-speech.",
    toolSlugs: ['heygen', 'synthesia', 'runway', 'pika', 'elevenlabs'],
  },
  {
    slug: 'design-without-a-designer',
    title: 'Design Without a Designer',
    blurb: 'Four image generators with genuinely different strengths.',
    rationale:
      'Midjourney still leads on artistic quality, Recraft is built around brand-consistent vector and mockup work Midjourney doesn\'t do, Leonardo AI leans toward game and concept art with more fine control, and Stable Diffusion plus Adobe Firefly cover the open-weight and commercially-safe-license ends most teams eventually need to check.',
    toolSlugs: ['midjourney', 'recraft', 'leonardo-ai', 'stable-diffusion', 'adobe-firefly'],
  },
]

export function getCollection(slug) {
  return COLLECTIONS.find((c) => c.slug === slug) || null
}
