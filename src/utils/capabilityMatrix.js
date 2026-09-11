// The Free / Pro / Team capability matrix from the product review (§7).
//
// TWO THINGS THIS FIXES
//
// 1. There was no Free tier. The cheapest plan was $3, which put the first
//    meaningful recommendation behind a paywall — the exact failure the review
//    names. Discovery is now explicitly free; what you pay for is continuous
//    optimisation, which is the only thing that justifies a RECURRING charge.
//    A directory you consult once cannot support a subscription.
//
// 2. The boundary is drawn in outcomes, not in artificial limits. "Unlimited
//    saved stacks" is a real difference in what you can do; "10 favourites" is
//    a meter on the same feature, and people resent meters.
//
// HONESTY CONSTRAINT
// Most Pro and Team rows do not exist yet, and Toolnaut takes no payment at
// all. `status` marks what is actually live so the page can say so plainly.
// Shipping a pricing table that implies working paid features would be a
// straightforward lie, and it is the fastest way to lose the trust the rest of
// this work is trying to build.

export const TIERS = [
  { id: 'free', name: 'Free', note: 'Live today' },
  { id: 'pro', name: 'Pro', note: 'Planned' },
  { id: 'team', name: 'Team', note: 'Planned' },
]

// status: 'live'    — works right now, for everyone
//         'planned' — designed, not built; must never read as available
export const CAPABILITIES = [
  {
    capability: 'Personalised stack',
    free: { text: 'One core stack', status: 'live' },
    pro: { text: 'Unlimited, saved, versioned stacks', status: 'planned' },
    team: { text: 'Shared team stacks', status: 'planned' },
  },
  {
    capability: 'Discovery',
    free: { text: 'Full search and categories', status: 'live' },
    pro: { text: 'Advanced filters and saved searches', status: 'planned' },
    team: { text: 'Team-specific discovery', status: 'planned' },
  },
  {
    capability: 'Comparison',
    free: { text: 'Side-by-side basics', status: 'live' },
    pro: { text: 'Deep comparison with your own weighting', status: 'planned' },
    team: { text: 'Procurement-ready comparisons', status: 'planned' },
  },
  {
    capability: 'Alerts',
    free: { text: 'General new-tool feed', status: 'live' },
    pro: { text: 'Price changes, better alternatives, stack drift', status: 'planned' },
    team: { text: 'Org-wide renewal and risk alerts', status: 'planned' },
  },
  {
    capability: 'Learning',
    free: { text: '4-week roadmap with progress', status: 'live' },
    pro: { text: 'Full paths, templates, projects', status: 'planned' },
    team: { text: 'Shared learning and admin visibility', status: 'planned' },
  },
  {
    capability: 'Workflow templates',
    free: { text: 'A few samples', status: 'planned' },
    pro: { text: 'Full library, customisable', status: 'planned' },
    team: { text: 'Team workflows and deployment guides', status: 'planned' },
  },
  {
    capability: 'Exports',
    free: { text: 'Share a stack by link', status: 'live' },
    pro: { text: 'Stack and decision reports', status: 'planned' },
    team: { text: 'Executive and procurement reports', status: 'planned' },
  },
  {
    capability: 'Collaboration',
    free: { text: 'Individual', status: 'live' },
    pro: { text: 'Limited sharing', status: 'planned' },
    team: { text: 'Shared stacks, comments, approvals, roles', status: 'planned' },
  },
]

// When to ASK. The review is specific that the ask has to land after value is
// felt, and that asking at signup — before the first result — is the single
// most reliable way to lose the user. Kept as data so the app can check where
// an upgrade prompt is about to render rather than relying on anyone's memory.
export const GOOD_UPGRADE_MOMENTS = [
  'stack_generated_and_saved',
  'second_stack_requested',
  'deep_comparison_opened',
  'export_requested',
  'alerts_requested',
  'teammate_invited',
]

export const BAD_UPGRADE_MOMENTS = [
  'immediately_after_signup',
  'before_first_result',
  'every_tool_click',
  'generic_popup',
]

export function isGoodUpgradeMoment(moment) {
  return GOOD_UPGRADE_MOMENTS.includes(moment)
}

export function liveCount() {
  return CAPABILITIES.filter((c) => c.free.status === 'live').length
}
