import { TOOLS } from './toolsCatalog'
import { matchScore } from './matchScore'
import { isCatalogNoise, starterScore, FLAGSHIP } from './prominence'

// THE STACK AUDIT — what you pay for, what you can stop paying for.
//
// The problem this catches: people do not overspend on AI because any single
// tool is expensive. They overspend because they subscribe to three tools that
// do the same job, bought weeks apart, for different reasons, and never
// compared. Nothing in a directory tells you that — a directory only ever adds.
//
// This is the one thing here that subtracts. It reads the tools someone
// actually pays for, finds the overlaps, decides which one to keep for THEIR
// role, names a free tool that covers the rest, and puts a number on it.
//
// HOW IT WORKS (the part that is ours)
//
// 1. CAPABILITY FINGERPRINT. Every tool becomes a weighted set of capability
//    terms drawn from its domain, its source category and its tags. Tags are
//    the honest signal — they come from the catalogue, not from marketing copy.
//
// 2. OVERLAP SCORE. Two tools are compared with a weighted Jaccard: shared
//    terms over total terms, with the domain and the source category worth more
//    than a single tag. Two chat assistants score high; a chat assistant and a
//    video editor score near zero.
//
// 3. CLUSTERING. Tools whose overlap clears OVERLAP_MIN are grouped by union of
//    pairs, so "A overlaps B, B overlaps C" lands all three in one cluster —
//    which is exactly how duplicate subscriptions accumulate.
//
// 4. KEEPER, BY ROLE, NOT BY FAME. Inside a cluster the keeper is the tool with
//    the highest role fit (matchScore against the person's own quiz answers),
//    with price as the tiebreaker: same fit, cheaper wins. Without quiz answers
//    it falls back to price, then catalogue prominence. The rest are redundant
//    FOR THIS PERSON — a Figma-heavy designer keeps a different tool from a
//    data analyst with the same three subscriptions.
//
// 5. FREE COVER. For every cluster the catalogue is searched for a free or
//    freemium tool that fingerprints close to the keeper. If one exists, the
//    saving is real money against a tool that genuinely does the job.
//
// 6. STACK HEALTH, 0-100. Redundancy is the biggest penalty, then paying for
//    something a free tool covers, then gaps: domains the person's role needs
//    where they own nothing. The score is what makes this repeatable — it moves
//    when you act on it.
//
// EVERY RUPEE IN, EVERY RUPEE OUT IS THE USER'S OWN NUMBER. The catalogue knows
// whether a tool is free, freemium or paid; it does not know what YOU pay, and
// this file never invents a price. Savings are computed only from amounts the
// person typed in themselves.

// Two tools have to be genuinely interchangeable before we tell someone to
// cancel one. At 0.34 a grammar checker and a chat assistant clustered together
// on shared writing tags alone, and the audit said "drop ChatGPT, you have
// Grammarly" — advice that would lose the user more than the plan costs.
export const OVERLAP_MIN = 0.45
// A near-miss is worse than no answer: below this the "free tool covers it" claim
// stops being true, and a wrong cancel costs the user more than the plan saves.
const FREE_COVER_MIN = 0.55

// Only a tool from the curated flagship lists may be offered as a replacement.
//
// Without this the audit told an Indian freelancer to replace ChatGPT with
// Tencent Yuanbao, because the tags matched perfectly. Tag similarity cannot
// tell you whether a tool is one a person can actually adopt — support, region,
// language, who else uses it — so the answer is drawn from the short list of
// tools we already stand behind, or there is no answer at all.
const KNOWN_FREE = new Set(Object.values(FLAGSHIP).flat())

const W_DOMAIN = 3
const W_SOURCE = 2
const W_TAG = 1

function terms(tool) {
  const out = new Map()
  const add = (term, weight) => {
    if (!term) return
    const key = String(term).trim().toLowerCase()
    if (!key) return
    out.set(key, Math.max(out.get(key) || 0, weight))
  }
  add(`domain:${tool.category}`, W_DOMAIN)
  add(`source:${tool.sourceCategory}`, W_SOURCE)
  for (const tag of tool.tags || []) add(`tag:${tag}`, W_TAG)
  return out
}

// Weighted Jaccard over the two fingerprints: 0 = nothing in common, 1 = same
// capabilities. Exported so the UI can explain a pair, and so tests can pin it.
export function overlapScore(a, b) {
  if (!a || !b || a.slug === b.slug) return 0
  const ta = terms(a)
  const tb = terms(b)
  let shared = 0
  let total = 0
  const keys = new Set([...ta.keys(), ...tb.keys()])
  for (const k of keys) {
    const wa = ta.get(k) || 0
    const wb = tb.get(k) || 0
    shared += Math.min(wa, wb)
    total += Math.max(wa, wb)
  }
  return total ? shared / total : 0
}

// Union pairs that clear the threshold into clusters. Singles are dropped:
// a tool that overlaps nothing is simply a tool you use.
export function clusterByOverlap(tools, threshold = OVERLAP_MIN) {
  const parent = tools.map((_, i) => i)
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i] } return i }
  const union = (i, j) => { const a = find(i); const b = find(j); if (a !== b) parent[b] = a }

  const pairs = []
  for (let i = 0; i < tools.length; i++) {
    for (let j = i + 1; j < tools.length; j++) {
      const score = overlapScore(tools[i], tools[j])
      if (score >= threshold) { union(i, j); pairs.push({ a: tools[i].slug, b: tools[j].slug, score }) }
    }
  }

  const groups = new Map()
  tools.forEach((tool, i) => {
    const root = find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(tool)
  })
  return {
    clusters: [...groups.values()].filter((g) => g.length > 1),
    pairs,
  }
}

// The free or freemium tool that best covers what the keeper does.
export function freeCoverFor(keeper, { catalog = TOOLS, exclude = [] } = {}) {
  const skip = new Set(exclude)
  // A free tool is only worth naming if the person would recognise it and it is
  // still maintained. Ranked by capability overlap FIRST, then by how
  // established the tool is, so the answer is a name like Canva — never an
  // abandoned project that happens to share three tags.
  const flagships = FLAGSHIP[keeper.category] || []
  let best = null
  let bestRank = 0
  let bestScore = 0
  for (const candidate of catalog) {
    if (skip.has(candidate.slug) || candidate.slug === keeper.slug) continue
    if (candidate.price !== 'free' && candidate.price !== 'freemium') continue
    if (isCatalogNoise(candidate)) continue
    if (candidate.status && candidate.status !== 'Active') continue
    const score = overlapScore(keeper, candidate)
    if (score < FREE_COVER_MIN) continue
    // Obscure tools are not an answer to "what should I use instead?"
    if (!KNOWN_FREE.has(candidate.name)) continue
    // 70% capability match, 30% how well known it is (starterScore tops out
    // near 25, so it is scaled to 0-1 before weighting).
    const rank = score * 0.7 + Math.min(1, starterScore(candidate, flagships) / 25) * 0.3
    if (rank > bestRank) { best = candidate; bestRank = rank; bestScore = score }
  }
  return best ? { tool: best, score: bestScore } : null
}

function fitOf(tool, answers) {
  const score = answers ? matchScore(tool, answers) : null
  return typeof score === 'number' ? score : null
}

// Which tool in a cluster earns its place: role fit first, then how established
// the tool is, then the cheaper one.
//
// Prominence before price on purpose. Without quiz answers, price alone told a
// user to keep a niche tool and cancel the one everyone in their team uses,
// because it happened to be two hundred rupees cheaper.
function pickKeeper(cluster, answers, spendOf) {
  const flagships = FLAGSHIP[cluster[0]?.category] || []
  return [...cluster].sort((a, b) => {
    const fa = fitOf(a, answers)
    const fb = fitOf(b, answers)
    if (fa !== null && fb !== null && fb !== fa) return fb - fa
    const ka = starterScore(a, flagships)
    const kb = starterScore(b, flagships)
    if (kb !== ka) return kb - ka
    const sa = spendOf(a.slug)
    const sb = spendOf(b.slug)
    if (sa !== sb) return sa - sb
    return (b.year || 0) - (a.year || 0)
  })[0]
}

/**
 * Audit a paid stack.
 *
 * entries: [{ slug, monthly }] — monthly is what the PERSON says they pay, in
 * their own currency. Missing or zero means "I do not pay for this".
 * answers:  quiz answers, optional. With them the keeper is chosen by role fit.
 */
export function auditStack(entries = [], { answers = null, catalog = TOOLS } = {}) {
  const bySlug = new Map(catalog.map((t) => [t.slug, t]))
  const clean = entries
    .map((e) => ({ tool: bySlug.get(e.slug), monthly: Number(e.monthly) > 0 ? Number(e.monthly) : 0 }))
    .filter((e) => e.tool)
  const spend = new Map(clean.map((e) => [e.tool.slug, e.monthly]))
  const spendOf = (slug) => spend.get(slug) || 0
  const tools = clean.map((e) => e.tool)
  const owned = tools.map((t) => t.slug)

  const monthlyTotal = clean.reduce((sum, e) => sum + e.monthly, 0)

  // 1. Duplicate subscriptions.
  const { clusters } = clusterByOverlap(tools)
  const duplicates = clusters.map((cluster) => {
    const keeper = pickKeeper(cluster, answers, spendOf)
    const drop = cluster
      .filter((t) => t.slug !== keeper.slug)
      .map((t) => ({
        tool: t,
        monthly: spendOf(t.slug),
        overlap: Math.round(overlapScore(keeper, t) * 100),
      }))
      .sort((a, b) => b.monthly - a.monthly)
    return {
      keeper,
      keeperFit: fitOf(keeper, answers),
      drop,
      monthlySaving: drop.reduce((sum, d) => sum + d.monthly, 0),
    }
  }).filter((d) => d.drop.length)

  // 2. Paying for something a free tool covers. Only for tools that survive
  //    step 1, so nothing is counted twice.
  const dropped = new Set(duplicates.flatMap((d) => d.drop.map((x) => x.tool.slug)))
  const freeSwaps = tools
    .filter((t) => !dropped.has(t.slug) && spendOf(t.slug) > 0)
    .map((t) => {
      const cover = freeCoverFor(t, { catalog, exclude: owned })
      if (!cover) return null
      return {
        tool: t,
        monthly: spendOf(t.slug),
        alternative: cover.tool,
        overlap: Math.round(cover.score * 100),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.monthly - a.monthly)

  // 3. Gaps: domains this role leans on where the person owns nothing.
  const ownedDomains = new Set(tools.map((t) => t.category))
  const gaps = answers?.domain && !ownedDomains.has(answers.domain) ? [answers.domain] : []

  const duplicateSaving = duplicates.reduce((sum, d) => sum + d.monthlySaving, 0)
  // Free swaps are advice, not an instruction: count them at half weight so the
  // headline number stays the one we are confident about.
  const swapSaving = freeSwaps.reduce((sum, s) => sum + s.monthly, 0)

  const paidCount = clean.filter((e) => e.monthly > 0).length
  const redundantCount = duplicates.reduce((sum, d) => sum + d.drop.length, 0)
  const health = Math.max(0, Math.min(100, Math.round(
    100
    - (tools.length ? (redundantCount / tools.length) * 55 : 0)
    - (paidCount ? (freeSwaps.length / paidCount) * 25 : 0)
    - gaps.length * 10,
  )))

  return {
    toolCount: tools.length,
    paidCount,
    monthlyTotal,
    duplicates,
    freeSwaps,
    gaps,
    redundantCount,
    monthlySaving: duplicateSaving,
    annualSaving: duplicateSaving * 12,
    potentialMonthlySaving: duplicateSaving + swapSaving,
    health,
  }
}
