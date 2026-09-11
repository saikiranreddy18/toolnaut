// How recognisable / approachable a tool is, independent of persona fit.
//
// WHY THIS MOVED OUT OF personaGenerator.js
// matchScore() is capped at 99 and built from a handful of coarse bonuses, so
// large numbers of tools tie at the top: for a mid-level developer on a small
// budget, SEVENTY-TWO tools score exactly 99. Discover broke those ties with
// `a.name.localeCompare(b.name)`, which meant the page's headline
// "recommended for you" picks were, in order: "Ablo, make your AI app
// multiplayer", "AgentSeed", "agenttrail", "ai-tools-list" and
// "awesome-thai-ai-projects" — mostly GitHub scrapes from the radar feed.
//
// The personalisation was working and looked broken, which is worse than being
// broken: a first-time user reads five names they have never heard of and
// concludes the recommendations are noise.
//
// generatePersona() already had the answer — a curated flagship list plus an
// accessibility nudge — but it was private to that file and only ever used for
// the three starter-stack tools. It is the tiebreak Discover needed, so it
// lives here now and both callers share it.

// Recognisable flagship tools per domain. The source data has no popularity
// signal, so this small curated list keeps a fresh user's picks full of names
// they'll actually recognise, with accessibility scoring as tiebreak.
export const FLAGSHIP = {
  code: ['Claude Code', 'Cursor', 'GitHub Copilot', 'Windsurf', 'Replit'],
  design: ['Midjourney', 'Canva', 'Figma', 'Adobe Firefly', 'Runway'],
  writing: ['ChatGPT', 'Claude', 'Grammarly', 'Notion AI', 'Jasper'],
  data: ['Perplexity', 'Julius', 'ChatGPT', 'Hex', 'Tableau'],
  automation: ['Zapier', 'n8n', 'Make', 'Gumloop', 'Lindy'],
  learning: ['NotebookLM', 'Khanmigo', 'Duolingo', 'Quizlet', 'Gamma'],
}

// Rank tools so a list leads with recognisable flagships, then favours
// approachable, active, low-cost picks. `flagships` is passed in so the caller
// decides which domain's list applies — the persona's home domain, not the
// tool's own category, which is what makes a flagship a flagship *for you*.
export function starterScore(t, flagships = []) {
  let s = 0
  const rank = flagships.indexOf(t.name)
  if (rank !== -1) s += 20 - rank // flagship order wins decisively
  if (t.price === 'freemium') s += 3
  else if (t.price === 'free') s += 2
  if (t.level === 'beginner') s += 2
  else if (t.level === 'intermediate') s += 1
  if (t.status === 'Active') s += 1
  if (t.year) s += Math.max(0, t.year - 2021) * 0.3 // gentle recency nudge
  return s
}

// Catalog entries that are not products.
//
// The radar pipeline discovers from GitHub and Hacker News, and a handful of
// its finds are a repository or a post rather than a tool: "ai-tools-list",
// "awesome-thai-ai-projects", "Launch HN: Vendo (YC S26)". Five of 751 today.
//
// Five is nothing until you notice WHERE they land. They are free, tagged
// beginner and dated this year, which is exactly the profile starterScore
// rewards, so they were placing 4th, 5th and 6th in "Recommended for you" —
// directly under Cursor and Copilot, and wearing a NEW badge. The first
// personalised list a new user ever sees was one third scraped repo names.
//
// This is a symptom. The real fix belongs in radar's enrichment step, which
// should not admit them in the first place; see the note in the UX audit. Until
// then the app declines to RECOMMEND them rather than hiding them — search and
// filters still reach them, because the entries are real, just mis-shelved.
const REPO_SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)+$/
const FORUM_POST = /^(launch|show|ask) hn:/i
const LINK_LIST = /^awesome[-_ ]/i

export function isCatalogNoise(t) {
  const name = t?.name || ''
  return REPO_SLUG.test(name) || FORUM_POST.test(name) || LINK_LIST.test(name)
}

// A tool with a real developer, website, date and description reads as a
// product. Breaks the remaining ties below starterScore.
function looksLikeAProduct(t) {
  let s = 0
  if (t.dev) s += 2
  if (t.website) s += 1
  if (t.year) s += 1
  if (t.blurb && t.blurb.length > 40) s += 1
  return s
}

// The comparator to use AFTER match score. Exported as a comparator rather than
// a score so callers can drop it straight into .sort().
export function byProminence(domain) {
  const flagships = FLAGSHIP[domain] || []
  return (a, b) =>
    // non-products sink below every real tool, whatever they scored
    (isCatalogNoise(a) ? 1 : 0) - (isCatalogNoise(b) ? 1 : 0) ||
    starterScore(b, flagships) - starterScore(a, flagships) ||
    looksLikeAProduct(b) - looksLikeAProduct(a) ||
    a.name.localeCompare(b.name)
}

// Starters for someone with no persona yet (the first-run STACK screen).
//
// byProminence(null) is wrong here: FLAGSHIP has no null key, so it ranks with
// an empty flagship list and the tiebreaks alone put whatever obscure entry
// radar found last week at the top. The source data carries no popularity
// signal, so "most popular" would be a claim we cannot make — FLAGSHIP is a
// curated list of RECOGNISABLE names, and that is all this promises.
//
// One per domain, in FLAGSHIP order, so the three cards span different kinds of
// work instead of three coding tools.
export function recognisableStarters(tools, limit = 3) {
  const byName = new Map(tools.map((t) => [t.name, t]))
  const picks = []
  for (const names of Object.values(FLAGSHIP)) {
    const hit = names.map((n) => byName.get(n)).find(Boolean)
    if (hit && !picks.includes(hit)) picks.push(hit)
    if (picks.length >= limit) break
  }
  return picks
}
