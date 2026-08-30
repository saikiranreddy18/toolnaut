// THE SCORECARD — the radar's editorial method, as code.
//
// The pipeline's `confidence` answers "did enrichment produce a clean record?".
// It says nothing about whether the tool is worth a builder's afternoon. This
// module answers that second question, and answers it the same way for every
// tool: one weighted rubric, two scores that must never be averaged into one,
// and a readiness label that says which workflows the tool is allowed near.
//
// Two rules govern everything below.
//
//  1. NEVER INVENT A SCORE. A criterion is scored only from a MEASURED signal
//     (a real number that came back from a source API) or from an EXPLICIT
//     model estimate. Anything else stays unscored and is excluded from the
//     weighted sum — the weights renormalise over what was actually judged and
//     `coverage` reports how much of the rubric that was. A tool nobody has
//     evidence about scores nothing, not 50%.
//  2. EVERY SCORE CARRIES ITS BASIS. 'measured' or 'estimated' travels with
//     each criterion along with the evidence behind it, so a reader can tell a
//     fetched fact from a model's guess without having to trust the pipeline.
//
// Pure and synchronous — no I/O, no clock of its own — so it is tested offline
// and can re-score the whole store from signals captured at discovery time.

// The rubric. Weights sum to 100: utility 62, trust 38.
export const CRITERIA = [
  { key: 'workflowImpact', weight: 20, group: 'utility', label: 'Real workflow impact' },
  { key: 'outputReliability', weight: 15, group: 'trust', label: 'Output quality and reliability' },
  { key: 'integrationReadiness', weight: 15, group: 'utility', label: 'Integration and automation readiness' },
  { key: 'usability', weight: 10, group: 'utility', label: 'Usability and time-to-value' },
  { key: 'dataControl', weight: 10, group: 'trust', label: 'Security, privacy and data control' },
  { key: 'costRoi', weight: 10, group: 'utility', label: 'Cost and ROI' },
  { key: 'maturity', weight: 8, group: 'trust', label: 'Product maturity and support' },
  { key: 'adoption', weight: 5, group: 'trust', label: 'Ecosystem and adoption signals' },
  { key: 'differentiation', weight: 4, group: 'utility', label: 'Differentiation' },
  { key: 'momentum', weight: 3, group: 'utility', label: 'Momentum and future potential' },
]

export const CRITERION_KEYS = CRITERIA.map((c) => c.key)

// The readiness ladder, weakest first. A tool is placed on it by evidence, not
// by how new or how loud it is — an unproven launch belongs on 'watchlist' no
// matter how good the demo was.
export const RADAR_LABELS = ['unrated', 'watchlist', 'experiment', 'builder-ready', 'production-ready', 'category-leader']

// The automation test: if you cannot describe a tool's workflow in these terms
// it is interesting, not radar-worthy. `humanControl` is deliberately NOT
// required — "none, it is a read-only step" is a legitimate answer, whereas a
// missing trigger or action means nobody worked out what the tool does.
export const AUTOMATION_FIELDS = ['trigger', 'input', 'aiStep', 'action', 'humanControl', 'outcome']
const AUTOMATION_REQUIRED = ['trigger', 'input', 'aiStep', 'action', 'outcome']

// Builder-fit capabilities. Absence is not evidence of absence — only an
// explicit `true` is ever recorded, so `false` here means "not asserted".
export const INTEGRATION_FLAGS = [
  'api', 'webhooks', 'sdk', 'mcp', 'cli', 'selfHost',
  'structuredOutput', 'humanApproval', 'dataExport',
]

const HIGH = 65 // the utility/trust line between "recommend" and "test it first"
const MIN_COVERAGE = 0.5 // below this, half the rubric is blank — refuse to label
const ESTIMATED_EVIDENCE = 'model estimate from the listing text — not measured'

// --- measured signals ---------------------------------------------------------

// What a source actually told us, kept on the record so a re-score never has to
// re-fetch. Only GitHub currently returns verifiable repo health; Product Hunt
// and HN give a headline and a vote count, which is awareness, not quality.
export function measureSignals(candidate, now = new Date().toISOString()) {
  const raw = candidate?.raw || {}
  if (candidate?.source !== 'github' || !raw.pushedAt) return null
  const days = (iso) => {
    const t = Date.parse(iso)
    return Number.isFinite(t) ? Math.max(0, Math.floor((Date.parse(now) - t) / 864e5)) : null
  }
  return {
    source: 'github',
    stars: Number(raw.stars) || 0,
    forks: Number(raw.forks) || 0,
    openIssues: Number(raw.openIssues) || 0,
    license: raw.license || null,
    archived: !!raw.archived,
    topics: Array.isArray(raw.topics) ? raw.topics.slice(0, 20) : [],
    daysSincePush: days(raw.pushedAt),
    ageDays: raw.createdAt ? days(raw.createdAt) : null,
    measuredAt: now,
  }
}

// Topic groups that are a positive, checkable claim about integration surface.
// Two or more distinct groups is strong enough to score; one is noise.
const TOPIC_MARKERS = {
  api: ['api', 'rest-api', 'restapi', 'graphql', 'openapi'],
  sdk: ['sdk', 'client-library', 'library'],
  cli: ['cli', 'command-line', 'terminal'],
  mcp: ['mcp', 'model-context-protocol'],
  webhooks: ['webhook', 'webhooks', 'events'],
  selfHost: ['docker', 'self-hosted', 'selfhosted', 'kubernetes', 'helm', 'docker-compose'],
}

// Turns signals into criterion scores. Each one is a fact with a number behind
// it; anything needing judgement is left to the model rather than faked here.
export function measuredScores(signals) {
  if (!signals) return {}
  const out = {}
  const { stars, forks, license, archived, topics, daysSincePush, ageDays } = signals

  if (daysSincePush != null) {
    const score = archived
      ? 0
      : daysSincePush <= 7 ? 5
      : daysSincePush <= 30 ? 4
      : daysSincePush <= 90 ? 3
      : daysSincePush <= 180 ? 2
      : daysSincePush <= 365 ? 1
      : 0
    out.momentum = {
      score,
      evidence: archived ? 'repository is archived' : `last push ${daysSincePush}d ago`,
    }
  }

  // Maturity counts things that are true rather than forming an impression. A
  // repo created last week cannot score above 2 here, which is the point: the
  // radar must never confuse new with proven.
  if (ageDays != null) {
    let score = 0
    const notes = []
    if (archived) notes.push('archived')
    else {
      score += 1
      notes.push('active')
    }
    if (ageDays >= 30) score += 1
    if (ageDays >= 180) score += 1
    notes.push(`${ageDays}d old`)
    if (license) {
      score += 1
      notes.push(license)
    } else notes.push('no license')
    if (daysSincePush != null && daysSincePush <= 90) {
      score += 1
      notes.push('pushed within 90d')
    }
    out.maturity = { score, evidence: notes.join(', ') }
  }

  // Stars are awareness, not quality — which is why adoption carries the
  // smallest weight of any measured criterion (5 of 100), and why nothing else
  // in this file reads them.
  out.adoption = {
    score: stars >= 5000 ? 5 : stars >= 1000 ? 4 : stars >= 250 ? 3 : stars >= 50 ? 2 : stars >= 10 ? 1 : 0,
    evidence: `${stars} stars, ${forks} forks`,
  }

  // A license is the difference between "you may host and commercialise this"
  // and "you legally may not" — a data-control fact, not an opinion.
  //
  // But it is only the DATA-CONTROL third of this criterion. A permissive
  // license proves you can self-host and read the code; it proves nothing about
  // retention defaults, telemetry, secret handling or vulnerability response.
  // So license-only evidence is capped at 3 — the ceiling for "you could
  // control the data if you hosted it" — and the evidence string names what it
  // does not cover, right where the score is read.
  out.dataControl = license && !archived
    ? { score: 3, evidence: `${license}, public source — self-hostable and inspectable; retention, telemetry and security posture unverified` }
    : { score: 1, evidence: archived ? 'archived repository' : 'no license file — not safe to host or commercialise' }

  const hit = Object.entries(TOPIC_MARKERS)
    .filter(([, words]) => words.some((w) => topics.includes(w)))
    .map(([group]) => group)
  if (hit.length >= 2) {
    out.integrationReadiness = {
      score: Math.min(5, 2 + hit.length),
      evidence: `declares ${hit.join(' + ')} (repo topics)`,
    }
  }
  return out
}

// --- the model's half ---------------------------------------------------------

// Coerces an LLM assessment onto the contract. Every field is optional: a model
// that answers only half the rubric leaves the other half unscored, rather than
// a malformed reply inventing numbers.
export function normalizeAssessment(p) {
  if (!p || typeof p !== 'object') return null
  const scores = {}
  for (const key of CRITERION_KEYS) {
    const v = p.scores?.[key]
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 5) scores[key] = Math.round(v)
  }
  const automation = {}
  for (const f of AUTOMATION_FIELDS) {
    const v = p.automation?.[f]
    automation[f] = typeof v === 'string' ? v.trim().slice(0, 240) : ''
  }
  const integration = {}
  for (const f of INTEGRATION_FLAGS) integration[f] = p.integration?.[f] === true
  const str = (v, n = 200) => (typeof v === 'string' ? v.trim().slice(0, n) : '')
  return {
    scores,
    automation,
    integration,
    bestFor: str(p.bestFor),
    chooseWhen: str(p.chooseWhen),
    avoidWhen: str(p.avoidWhen),
    alternatives: Array.isArray(p.alternatives)
      ? p.alternatives.filter((x) => typeof x === 'string' && x.trim()).slice(0, 4).map((x) => x.trim().slice(0, 60))
      : [],
  }
}

// Rebuilds the model's half from a record that was already scored, so the whole
// store can be re-scored offline. Only ESTIMATED criteria come back: measured
// ones are re-derived from `signals` against the new clock, which is the point
// of re-scoring — an abandoned repo loses its momentum and maturity on its own.
export function assessmentFrom(record) {
  if (!record?.assessedBy) return null
  const scores = {}
  for (const [key, c] of Object.entries(record.scorecard?.criteria || {})) {
    if (c?.basis === 'estimated' && typeof c.score === 'number') scores[key] = c.score
  }
  return {
    scores,
    automation: record.automation || {},
    integration: record.integration || {},
    bestFor: record.verdict?.bestFor || '',
    chooseWhen: record.verdict?.chooseWhen || '',
    avoidWhen: record.verdict?.avoidWhen || '',
    alternatives: record.verdict?.alternatives || [],
  }
}

// Persistence policy for an offline re-score, kept here rather than in the
// script so it is a tested rule instead of an `if` nobody reads.
//
// A record nobody ever assessed re-scores to a structurally valid but EMPTY
// scorecard: label 'unrated', every score null, basis 'none'. Writing that is
// worse than writing nothing. The app renders radar UI on the mere PRESENCE of
// `tool.scorecard`, so persisting it would stamp every unassessed card in the
// catalogue with "Unrated - 0% evidence", turning a deliberately quiet legacy
// record into noise. That is the one thing the card-level design avoids.
//
// The reverse case is deliberately NOT symmetrical. If a record already carries
// a scorecard and a re-score can no longer find the evidence behind it, the
// empty result is the honest one and must be written: keeping the old numbers
// would present a stale score as a current one, which is precisely the failure
// this module exists to prevent. Absence of evidence gets reported; it never
// silently falls back to the last good answer.
export function shouldPersistRescore(before, after) {
  if (after?.basis !== 'none') return true
  return !!before
}

export function automationTestComplete(automation) {
  return AUTOMATION_REQUIRED.every((f) => typeof automation?.[f] === 'string' && automation[f].trim().length >= 3)
}

// --- scoring ------------------------------------------------------------------

// Measured beats estimated for the same criterion, always. A fetched number is
// not improved by asking a model to second-guess it.
export function scoreTool({ signals = null, assessment = null, now = new Date().toISOString() } = {}) {
  const measured = measuredScores(signals)
  const criteria = {}
  const unscored = []

  for (const c of CRITERIA) {
    const m = measured[c.key]
    const e = assessment?.scores?.[c.key]
    if (m) criteria[c.key] = { score: m.score, weight: c.weight, group: c.group, basis: 'measured', evidence: m.evidence }
    else if (e != null) criteria[c.key] = { score: e, weight: c.weight, group: c.group, basis: 'estimated', evidence: ESTIMATED_EVIDENCE }
    else unscored.push(c.key)
  }

  const sum = (pred) => {
    let points = 0
    let weight = 0
    for (const c of Object.values(criteria)) {
      if (!pred(c)) continue
      points += (c.score / 5) * c.weight
      weight += c.weight
    }
    // Renormalise over what was judged. Dividing by the full 100 would quietly
    // punish a tool for the rubric's blind spots instead of reporting them.
    return weight ? Math.round((points / weight) * 100) : null
  }

  const scoredWeight = Object.values(criteria).reduce((n, c) => n + c.weight, 0)
  const coverage = Number((scoredWeight / 100).toFixed(2))
  const utility = sum((c) => c.group === 'utility')
  const trust = sum((c) => c.group === 'trust')
  const radar = sum(() => true)
  const bases = new Set(Object.values(criteria).map((c) => c.basis))
  const label = labelFor({ utility, trust, coverage, criteria, assessment })

  return {
    utility,
    trust,
    radar,
    coverage,
    label,
    recommendation: recommendationFor({ utility, trust, label }),
    criteria,
    unscored,
    basis: bases.size === 0 ? 'none' : bases.size === 2 ? 'mixed' : [...bases][0],
    scoredAt: now,
  }
}

export function labelFor({ utility, trust, coverage, criteria = {}, assessment = null }) {
  if (coverage < MIN_COVERAGE || utility == null || trust == null) return 'unrated'

  const integration = criteria.integrationReadiness?.score ?? 0
  const adoption = criteria.adoption?.score ?? 0
  const maturity = criteria.maturity?.score ?? 0

  const ladder =
    utility >= 85 && trust >= 75 && coverage >= 0.8 && adoption >= 4 && maturity >= 4 ? 'category-leader'
    : utility >= HIGH && trust >= 70 && integration >= 3 ? 'production-ready'
    : utility >= 60 && integration >= 4 ? 'builder-ready'
    : utility >= 50 ? 'experiment'
    : 'watchlist'

  // The automation test is a gate, not a tiebreak: a tool whose trigger → input
  // → AI step → action → outcome nobody can state has not earned a
  // recommendation, whatever its scores say.
  if (ladder !== 'watchlist' && !automationTestComplete(assessment?.automation)) return 'watchlist'
  return ladder
}

export function recommendationFor({ utility, trust, label }) {
  if (label === 'unrated' || utility == null || trust == null) {
    return 'Not enough evidence to recommend either way — needs a hands-on test.'
  }
  if (utility >= HIGH && trust >= HIGH) return 'Strong recommendation.'
  if (utility >= HIGH) return 'Worth testing, but keep it out of critical workflows.'
  if (trust >= HIGH) return 'Mature, but not compelling for this job.'
  return 'Skip, or keep on the watchlist.'
}

// The app-facing form, and the whole contract the UI is allowed to depend on.
//
// EVERY criterion ships, scored or not, each carrying its own weight and label,
// so the app never keeps a second copy of the rubric that can drift out of step
// with this file. An unscored one ships `score: null` and `basis: 'unscored'`:
// a zero would read as a negative finding, which is the opposite of what "no
// evidence" means, and it is the single easiest way for a UI to quietly undo
// the honesty this module enforces.
//
// `basis` and `evidence` are not optional extras — a score shown without the
// reason behind it is exactly the unaccountable ranking this exists to replace.
export function publicScorecard(sc, { automation = null } = {}) {
  if (!sc) return undefined
  const criteria = {}
  for (const c of CRITERIA) {
    const scored = sc.criteria?.[c.key]
    criteria[c.key] = {
      label: c.label,
      weight: c.weight,
      group: c.group,
      score: scored ? scored.score : null,
      basis: scored ? scored.basis : 'unscored',
      evidence: scored ? scored.evidence : '',
      // True when the evidence is this module's stock line for a model estimate
      // that carries no reasoning of its own. Every row stays self-describing
      // for anything reading tools.json directly, while a UI can collapse ten
      // identical sentences into one footnote instead of printing a wall of
      // boilerplate where the evidence column should carry signal.
      genericEvidence: scored ? scored.evidence === ESTIMATED_EVIDENCE : false,
    }
  }
  // Completeness is a backend rule (it is what caps the label at watchlist), so
  // it travels pre-computed rather than being re-derived in a component.
  const automationFit = automation
    ? { complete: automationTestComplete(automation), ...automation }
    : null
  const { utility, trust, radar, coverage, label, recommendation, unscored, basis, scoredAt } = sc
  return { utility, trust, radar, coverage, label, recommendation, unscored, basis, scoredAt, automationFit, criteria }
}

// Shape check for the validate gate. Structural only — the gate's job is to
// catch a corrupt scorecard, not to re-litigate the scores inside it.
export function isValidScorecard(sc) {
  if (!sc || typeof sc !== 'object') return false
  if (!RADAR_LABELS.includes(sc.label)) return false
  for (const k of ['utility', 'trust', 'radar']) {
    const v = sc[k]
    if (v !== null && !(typeof v === 'number' && v >= 0 && v <= 100)) return false
  }
  if (!(typeof sc.coverage === 'number' && sc.coverage >= 0 && sc.coverage <= 1)) return false
  if (!sc.criteria || typeof sc.criteria !== 'object') return false
  for (const [key, c] of Object.entries(sc.criteria)) {
    if (!CRITERION_KEYS.includes(key)) return false
    if (!(typeof c?.score === 'number' && c.score >= 0 && c.score <= 5)) return false
    if (c.basis !== 'measured' && c.basis !== 'estimated') return false
  }
  return true
}
