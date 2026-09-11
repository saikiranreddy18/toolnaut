// Hard constraints: what a tool must satisfy to be RECOMMENDED at all.
//
// WHY THIS EXISTS
// Scoring in matchScore is additive, so a strong category match could out-earn
// a budget penalty and put a paid tool in front of someone who answered
// "$0 — free only". Measured, for a data/free/beginner profile:
//
//   99  free tool, bullseye domain
//   87  PAID tool, bullseye domain      <-- ties the free adjacent pick
//   87  free tool, adjacent domain
//
// And the starter stack was worse: generatePersona never called matchScore at
// all, so budget was not even a penalty there — three of six domains handed a
// free-only user a paid tool, with Midjourney the TOP pick for design.
//
// A declared budget is not a preference to be outweighed. It is a statement
// about what the person can actually use. Preferences belong in ranking; this
// decides eligibility, and it runs BEFORE scoring.
//
// FREEMIUM STAYS
// "Free only" means "costs me nothing", not "has no paid tier". A freemium tool
// has a usable free tier, so it qualifies. This matters enormously: excluding
// freemium would cut the design pool from 129 tools to 17 and make the product
// useless for the exact users it is trying to protect.
//
// ONLY BUDGET IS ENFORCED, AND THAT IS A DATA LIMIT
// Self-hosting, data-training exclusions, retention, required integrations and
// API availability are all legitimate hard constraints, and none of them can be
// enforced today: the catalogue carries slug, name, category, sourceCategory,
// price, pricing, level, blurb, audience, dev, year, website, status, note and
// tags — and nothing else. There is no selfHosted, integrations or hasApi
// field on any of the ~800 tools.
//
// Asking someone a privacy question and then ranking identically would be worse
// than not asking, so those constraints are deliberately absent here rather
// than stubbed in and quietly ignored. They arrive when the catalogue does.

// A budget answer of 'free' is the only one that states an absolute limit; the
// others ('low', 'mid', 'high', 'company') describe headroom, and matchScore's
// price bonuses already express them well as soft preferences.
const FREE_ONLY = 'free'

export function passesHardConstraints(tool, answers) {
  if (!tool || !answers) return true
  if (answers.budget === FREE_ONLY && tool.price === 'paid') return false
  return true
}

// Returns both halves rather than just the survivors, so callers can SHOW what
// was set aside and why. Silently dropping tools and silently re-adding them
// are the same failure: the person cannot tell what the system did with the
// constraint they stated.
export function partitionByEligibility(tools, answers) {
  const eligible = []
  const excluded = []
  for (const tool of tools || []) {
    (passesHardConstraints(tool, answers) ? eligible : excluded).push(tool)
  }
  return { eligible, excluded }
}

// Why a tool was set aside — for the UI, in the user's own terms.
export function exclusionReason(tool, answers) {
  if (!tool || !answers) return null
  if (answers.budget === FREE_ONLY && tool.price === 'paid') {
    return 'Paid only — you asked for free tools'
  }
  return null
}

// True when a real constraint is in force, so callers can label a section
// ("Paid alternatives") instead of showing an unexplained empty space.
export function hasHardConstraints(answers) {
  return !!answers && answers.budget === FREE_ONLY
}
