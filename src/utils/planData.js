// Map a stored plan id (shishya|guru|pandava) to its current display name.
// Session/authStore still stores the legacy ids; the UI shows Student/Pro/Team.
//
// A GUEST HAS NO PLAN, and both call sites pass session?.plan straight in.
// With no session that is undefined, and returning it rendered a bare "Plan:"
// in the sidebar and a stray "· free public beta" in Settings — a label with
// nothing after it reads as data that failed to load. Everyone without a plan
// is on the free public beta, so say that. The raw-id passthrough stays ahead
// of it, so an unknown-but-present plan still shows itself.
export const planLabel = (id) => PLANS.find((p) => p.id === id)?.name || id || 'Free beta'

// Every feature is { text, status }. status: 'live' works today for anyone,
// no plan needed; 'planned' is the intended shape of a paid tier and must
// render with a qualifier — see capabilityMatrix.js's own honesty constraint,
// which this file now follows instead of contradicting.
const live = (text) => ({ text, status: 'live' })
const planned = (text) => ({ text, status: 'planned' })

export const PLANS = [
  {
    id: 'shishya',
    name: 'Student',
    icon: 'student',
    tier: 'Solo',
    price: 3,
    priceINR: 299,
    badge: null,
    glow: 'rgba(251, 113, 133, 0.28)',
    accent: '#fb7185',
    audience: 'Students, hobbyists, solo learners exploring AI',
    features: [
      live('Personalized AI tool discovery (up to 5 categories)'),
      live('Basic learning paths (beginner to intermediate)'),
      live('Community access (in-app forum)'),
      planned('Weekly discovery digest email'),
      live('Save up to 10 favorite tools'),
      planned('Basic chat support'),
      live('1 user profile'),
    ],
  },
  {
    id: 'guru',
    name: 'Pro',
    icon: 'pro',
    tier: 'Pro',
    price: 8,
    priceINR: 799,
    badge: 'Most Popular',
    glow: 'rgba(124, 58, 237, 0.5)',
    accent: '#7c3aed',
    featured: true,
    audience: 'Freelancers, professionals, serious learners',
    plus: 'Everything in Student, plus:',
    features: [
      live('Unlimited tool discovery (all categories)'),
      live('Advanced learning paths (beginner → senior)'),
      live('Custom tool stack builder with save & share'),
      planned('AI-powered chat assistant (Claude-powered Q&A)'),
      planned('Weekly trending tools + personalized alerts'),
      live('Unlimited favorite tools'),
      live('Progress tracking + skill badges'),
      planned('Priority email support'),
      planned('Export learning roadmaps as PDF'),
    ],
  },
  {
    id: 'pandava',
    name: 'Team',
    icon: 'team',
    tier: 'Team',
    price: 50,
    priceINR: 4999,
    badge: 'Up to 5 seats · $10/seat',
    // ₹999 follows the same ~×100 PPP ratio as the tiers ($50 -> ₹4,999);
    // adjust here if the seat price should differ.
    badgeINR: 'Up to 5 seats · ₹999/seat',
    glow: 'rgba(6, 182, 212, 0.4)',
    accent: '#06b6d4',
    audience: 'Startups, agencies, research teams, enterprise pods',
    plus: 'Everything in Pro, plus:',
    features: [
      planned('Up to 5 team members (5 seats included)'),
      planned('Team stack standardization'),
      planned('Role-based team onboarding'),
      planned('Team analytics dashboard'),
      planned('Collaborative tool-evaluation workspace'),
      planned('Admin controls + member management'),
      planned('Shared progress + team leaderboards'),
      planned('Dedicated support channel (48hr response)'),
      planned('Quarterly AI stack audit reports'),
      planned('API access for integrations'),
    ],
  },
]

// Rows for the "Compare All" table: [label, shishya, guru, pandava].
// Each cell is true (live, included), false (not included at this tier), or
// 'planned' (designed, not built — must never render as an included check).
export const COMPARISON = [
  ['Tool discovery', '5 categories', 'Unlimited', 'Unlimited'],
  ['Learning paths', 'Basic', 'Advanced', 'Advanced'],
  ['Saved favorites', '10', 'Unlimited', 'Unlimited'],
  ['AI chat assistant', false, 'planned', 'planned'],
  ['Stack builder + share', false, true, true],
  ['Progress tracking + badges', false, true, true],
  ['PDF roadmap export', false, 'planned', 'planned'],
  ['Seats', '1', '1', 'Up to 5'],
  ['Team analytics dashboard', false, false, 'planned'],
  ['Admin controls', false, false, 'planned'],
  ['Quarterly stack audits', false, false, 'planned'],
  ['API access', false, false, 'planned'],
  ['Support', 'Basic chat (planned)', 'Priority email (planned)', 'Dedicated 48hr (planned)'],
]
