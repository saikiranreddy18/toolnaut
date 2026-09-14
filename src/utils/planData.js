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
    // The founder offer, and a REAL plan rather than a poster.
    //
    // It advertised "lifetime access, pay once" with a button that went to the
    // quiz, so nobody could buy it — and had anyone been able to, they would
    // have received the flat 30 days activateEntitlement grants everyone. An
    // offer the system cannot honour is worse than no offer.
    //
    // lifetime: true is what makes the promise true. It flows through to a null
    // ends_at, and current_entitlement() already treats null as never expiring
    // ("ends_at is null or ends_at > now()"), so this needed no schema change.
    //
    // ₹29,999, one price worldwide like every other plan. It looks steep beside
    // a ₹799 Pro plan until you notice this is lifetime against thirty days:
    // roughly thirty-one months of Pro, paid once and never again.
    //
    // Visitors outside India see this converted to their own currency for
    // readability, but INR is what is charged — see convertPrice below.
    // NOT IN THE PRICING GRID. The three standard plans are what the pricing
    // section shows and what ships; this one is reachable only through the
    // founder ribbon, which is the whole point of a limited offer. Still a real
    // purchasable plan — /pay honours the ribbon's link — just not on display
    // beside the regular tiers.
    hiddenFromPricing: true,
    id: 'founder',
    name: 'Founder',
    icon: 'pro',
    tier: 'Founder',
    price: 360,
    priceINR: 29999,
    lifetime: true,
    // Thirty days from the 2026-09-11 relaunch, closing at midnight India time
    // (18:30 UTC) — the audience's midnight, not London's. One fixed instant,
    // so every visitor counts down to the same moment. Move the sale here and
    // only here: the ribbon, the paywall and checkout all read it.
    limitedUntil: '2026-10-11T18:30:00Z',
    badge: 'FOUNDER',
    glow: 'rgba(228, 228, 231, 0.30)',
    accent: '#e4e4e7',
    audience: 'Early backers — one payment, kept for good',
    features: [
      live('Everything in Pro, permanently'),
      live('Never expires — no renewal, no second charge'),
      live('Personalized AI tool discovery (all categories)'),
      live('Save unlimited tools and stacks'),
      live('New tool alerts, by email'),
      live('Founder badge on your profile'),
    ],
  },
  {
    id: 'shishya',
    name: 'Student',
    icon: 'student',
    tier: 'Solo',
    price: 3,
    priceINR: 299,
    // "Save up to 10 favorite tools", enforced: the app refuses an 11th save and
    // the database refuses it too (supabase/migrations/0010_saved_limit.sql,
    // which must carry the same number; a test checks).
    limits: { saved: 10 },
    badge: null,
    glow: 'rgba(255, 255, 255, 0.28)',
    accent: '#ffffff',
    audience: 'Students, hobbyists, solo learners exploring AI',
    features: [
      live('Personalized AI tool discovery (all categories)'),
      live('Tool stack builder with save & share'),
      live('4-week learning roadmap with progress tracking'),
      live('Community access (in-app forum)'),
      live('New tool alerts, by email'),
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
    glow: 'rgba(212, 212, 216, 0.4)',
    accent: '#d4d4d8',
    featured: true,
    audience: 'Freelancers, professionals, serious learners',
    plus: 'Everything in Student, plus:',
    features: [
      // ONLY WHAT PRO ADDS. This list used to repeat discovery, learning paths,
      // the stack builder, alerts and progress tracking as Pro benefits, and the
      // comparison table marked them missing from Student. Student has every one
      // of them, so both were untrue. What Pro really adds today is the saved-tools
      // limit lifted (enforced in the app and in 0010_saved_limit.sql).
      live('Unlimited favorite tools'),
      planned('AI-powered chat assistant (Claude-powered Q&A)'),
      planned('Priority email support'),
      planned('Export learning roadmaps as PDF'),
    ],
  },
  {
    id: 'pandava',
    // OFF SALE. Every Team feature on this card is still planned, so selling it
    // for Rs 4,999 bought exactly what Student buys for Rs 299. isPlanOpen()
    // returns false, which stops checkout and hides it from /pay; the pricing
    // card stays, marked Coming soon. Existing Team purchases keep their access.
    onSale: false,
    name: 'Team',
    icon: 'team',
    tier: 'Team',
    price: 50,
    priceINR: 4999,
    // "$10/seat" alone reads as a recurring per-seat rate. Every plan here is
    // a single 30-day pass, so the badge states the division of the one-off
    // price rather than implying a monthly seat licence.
    badge: 'Up to 5 seats · $10 per seat for 30 days',
    // ₹999 follows the same ~×100 PPP ratio as the tiers ($50 -> ₹4,999);
    // adjust here if the seat price should differ.
    badgeINR: 'Up to 5 seats · ₹999 per seat for 30 days',
    glow: 'rgba(161, 161, 170, 0.4)',
    accent: '#a1a1aa',
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
  // Discovery, learning, the stack builder and progress are the same on every
  // plan. Saved tools is the one enforced difference.
  ['Tool discovery', 'All categories', 'All categories', 'All categories'],
  ['Learning paths', '4-week roadmap', '4-week roadmap', '4-week roadmap'],
  ['Saved favorites', '10', 'Unlimited', 'Unlimited'],
  ['AI chat assistant', false, 'planned', 'planned'],
  ['Stack builder + share', true, true, true],
  ['Progress tracking + badges', true, true, true],
  ['PDF roadmap export', false, 'planned', 'planned'],
  ['Seats', '1', '1', 'planned'],
  ['Team analytics dashboard', false, false, 'planned'],
  ['Admin controls', false, false, 'planned'],
  ['Quarterly stack audits', false, false, 'planned'],
  ['API access', false, false, 'planned'],
  ['Support', 'Basic chat (planned)', 'Priority email (planned)', 'Dedicated 48hr (planned)'],
]

// ONE PRICE, IN RUPEES. Everything is billed in INR — there is no second
// amount to keep in step and no plan that costs a different number depending on
// where it is opened. Visitors elsewhere are SHOWN a conversion for
// readability; see convertPrice in currency.js. What is charged is this.
export function priceFor(plan) {
  if (!plan) return null
  return { amount: plan.priceINR, currency: 'INR', symbol: '₹' }
}

export function formatPrice(plan) {
  const p = priceFor(plan)
  return p ? `₹${p.amount.toLocaleString('en-IN')}` : ''
}

// ── limited offers ───────────────────────────────────────────────────────────
// The founder offer's closing moment, read from the plan itself. The ribbon,
// the offer card, the paywall and /api/create-order all take it from here, so
// the countdown a visitor watches and the moment checkout closes are the same
// instant by construction. It used to be typed into three files and enforced
// in none: when the ribbon expired, /pay?plan=founder simply kept selling.
export const FOUNDER_DEADLINE = PLANS.find((p) => p.id === 'founder')?.limitedUntil ?? null

// Whether a plan can be bought at `now`. No limitedUntil means always open. A
// limitedUntil that does not parse fails CLOSED: a typo should stop the sale
// loudly, where the tests catch it, not keep selling a "limited" offer with no
// limit.
export function isPlanOpen(plan, now = Date.now()) {
  if (!plan) return false
  // A plan taken off sale is closed however long its offer would have run.
  if (plan.onSale === false) return false
  if (plan.limitedUntil == null) return true
  const end = Date.parse(plan.limitedUntil)
  return Number.isFinite(end) && now < end
}

// The saved-tools limit an entitlement carries, or null for no limit.
//
// Only an active, paid plan with a limit is capped. A trial is full access,
// a lapsed plan is sent to the paywall anyway, and an unknown or still-loading
// check must never block a save; the database enforces the rule regardless.
export function savedLimitFor(ent) {
  if (!ent || ent.loading || ent.unknown || !ent.active || ent.trial) return null
  return PLANS.find((p) => p.id === ent.plan)?.limits?.saved ?? null
}
