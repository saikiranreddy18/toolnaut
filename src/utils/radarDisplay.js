// Display rules for the radar scorecard. Pure functions, no JSX, so the rules
// that keep the UI honest are unit-tested instead of living inside components
// where a refactor can quietly undo them.
//
// THE RULE THIS FILE EXISTS TO ENFORCE
// A sparse scorecard renormalises to a real, high-looking number: the radar's
// own `flowbridge` example scores Utility 100 from a single integration signal
// at 41% coverage. That number is arithmetically true and psychologically
// misleading — people anchor on "100" and never read the badge next to it. So
// numeric scores are shown ONLY when the pipeline was willing to label the
// tool. Below that, coverage leads and the partial analysis is available on the
// detail page under its own heading, where it reads as evidence rather than
// as a verdict.
//
// Nothing here computes or adjusts a score. Weighted scores and readiness are
// the pipeline's job (`radar/scorecard.js`), and the criteria rows arrive
// carrying their own weight and label so this file keeps no copy of the rubric.

export const RADAR_LABEL_TEXT = {
  'unrated': 'Unrated',
  'watchlist': 'Watchlist',
  'experiment': 'Experiment',
  'builder-ready': 'Builder-ready',
  'production-ready': 'Production-ready',
  'category-leader': 'Category leader',
}

// What each rung actually means, for a tooltip or a caption. Phrased as the
// decision it should drive, not as praise.
export const RADAR_LABEL_HELP = {
  'unrated': 'Not enough verified evidence yet to place this tool.',
  'watchlist': 'Interesting, but early or unproven — watch it, do not depend on it.',
  'experiment': 'Worth trying in a sandbox on a real task.',
  'builder-ready': 'Has the integration surface a builder needs: API, SDK or self-hosting.',
  'production-ready': 'Suitable for workflows that matter, with the usual review.',
  'category-leader': 'Best-in-class for this specific job.',
}

const BASIS_TEXT = { measured: 'Measured', estimated: 'Estimated', unscored: 'Not evaluated' }

export function radarOf(tool) {
  return tool?.scorecard || null
}

// The gate. Everything else in the UI hangs off this: if it is false, no
// Utility or Trust number may appear as a headline figure anywhere.
export function showsNumericScores(sc) {
  return !!sc && sc.label !== 'unrated' && typeof sc.coverage === 'number' && sc.coverage >= 0.5
    && typeof sc.utility === 'number' && typeof sc.trust === 'number'
}

export function coveragePercent(sc) {
  return typeof sc?.coverage === 'number' ? Math.round(sc.coverage * 100) : null
}

export function labelText(sc) {
  return RADAR_LABEL_TEXT[sc?.label] || 'Not yet assessed'
}

// Counts what the assessment actually rests on. A tool with no scorecard and a
// tool scored entirely by a model must not read the same way.
export function basisCounts(sc) {
  const counts = { measured: 0, estimated: 0, unscored: 0 }
  for (const c of Object.values(sc?.criteria || {})) {
    if (counts[c.basis] != null) counts[c.basis]++
  }
  return counts
}

export function basisSummary(sc) {
  if (!sc) return 'Not yet assessed'
  const { measured, estimated } = basisCounts(sc)
  if (!measured && !estimated) return 'No evidence gathered yet'
  const parts = []
  if (measured) parts.push(`${measured} measured signal${measured === 1 ? '' : 's'}`)
  if (estimated) parts.push(`${estimated} model estimate${estimated === 1 ? '' : 's'}`)
  return parts.join(', ')
}

export function scoreText(score) {
  // An em dash, never 0/5 — a zero claims we looked and found nothing good.
  return typeof score === 'number' ? `${score}/5` : '—'
}

export function basisText(basis) {
  return BASIS_TEXT[basis] || BASIS_TEXT.unscored
}

// One row per rubric criterion, in the order the pipeline sent them (weight
// descending). Unscored criteria are kept, not filtered out: the gaps in the
// evidence are the most useful thing on the table.
export function criteriaRows(sc) {
  return Object.entries(sc?.criteria || {}).map(([key, c]) => ({
    key,
    label: c.label,
    weight: c.weight,
    group: c.group,
    score: typeof c.score === 'number' ? c.score : null,
    scoreText: scoreText(c.score),
    basis: c.basis,
    basisText: basisText(c.basis),
    // A model estimate with no reasoning of its own says the same sentence on
    // every row it appears on. Repeating it ten times buries the rows that do
    // carry a real measured fact, so it is dropped here and stated once under
    // the table instead — the Basis column already says "Estimated".
    // The `&& c.evidence` guard matters: a row with NO evidence at all must
    // still say so. Collapsing it would turn a missing claim into a tidy dash.
    evidence: c.genericEvidence && c.evidence
      ? '—'
      : c.evidence || (c.basis === 'unscored' ? 'No evidence found' : 'Evidence unavailable'),
  }))
}

// True when at least one row's evidence was collapsed, so the caller knows to
// print the footnote that explains what those rows rest on.
export function hasEstimateFootnote(sc) {
  return Object.values(sc?.criteria || {}).some((c) => c.genericEvidence)
}

// A tool scored entirely by the model has nothing in the evidence column but
// dashes, which reads as a broken table rather than as a deliberate omission.
// In that case the column is dropped and the footnote carries the explanation.
export function showsEvidenceColumn(sc) {
  return criteriaRows(sc).some((r) => r.evidence !== '—')
}

export const ESTIMATE_FOOTNOTE =
  'Estimated scores are a model reading the tool’s own description. Nothing about them was measured or tested.'

// The trigger → input → AI step → action → outcome chain, in reading order.
// Returns null when the tool has no assessment at all, so the caller can say
// "not yet verified" rather than render five empty rows.
const AUTOMATION_STEPS = [
  ['trigger', 'Trigger'],
  ['input', 'Input'],
  ['aiStep', 'AI step'],
  ['action', 'Action'],
  ['humanControl', 'Human control'],
  ['outcome', 'Outcome'],
]

export function automationSteps(sc) {
  const fit = sc?.automationFit
  if (!fit) return null
  const steps = AUTOMATION_STEPS
    .map(([key, label]) => ({ key, label, text: (fit[key] || '').trim() }))
    .filter((s) => s.text)
  if (!steps.length) return null
  return { complete: !!fit.complete, steps }
}

// What the radar could NOT verify, stated plainly. This is where a reader
// learns to tell absence of evidence from evidence of weakness — without it,
// an unscored security criterion looks like a security problem.
const CAVEAT_TEXT = {
  workflowImpact: 'No documented workflow outcome was found.',
  outputReliability: 'No reproducible evaluation or benchmark evidence was found.',
  integrationReadiness: 'The integration surface (API, SDK, webhooks) was not verified.',
  usability: 'Time-to-value was not tested hands-on.',
  dataControl: 'Retention, model-training use and deletion behaviour were not verified.',
  costRoi: 'Cost at real usage volumes was not modelled.',
  maturity: 'Release cadence, support and documentation were not verified.',
  adoption: 'No independent evidence of production use was found.',
  differentiation: 'Not compared against its alternatives.',
  momentum: 'Development activity could not be measured.',
}

export function caveats(sc) {
  return criteriaRows(sc)
    .filter((r) => r.basis === 'unscored')
    .map((r) => CAVEAT_TEXT[r.key] || `${r.label} was not verified.`)
}
