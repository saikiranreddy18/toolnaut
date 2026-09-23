// Event names — keep in sync with the analytics dashboard funnels.
export const EVENTS = {
  PAGE_VIEW: 'page_view',
  SECTION_VIEW: 'section_view',
  CTA_CLICK: 'cta_click',
  QUIZ_START: 'quiz_start',
  QUIZ_ANSWER: 'quiz_answer',
  QUIZ_COMPLETE: 'quiz_complete',
  PLAN_HOVER: 'plan_hover',
  PLAN_SELECT: 'plan_select',
  GALAXY_EXPLORE: 'galaxy_explore',
  SOUND_TOGGLE: 'sound_toggle',
  TIME_ON_PAGE: 'time_on_page',
  ROADMAP_STEP_COMPLETE: 'roadmap_step_complete',
  ROADMAP_CHECKPOINT_PASS: 'roadmap_checkpoint_pass',
  ROADMAP_COMPLETE: 'roadmap_complete',
  STACK_FEEDBACK: 'stack_feedback',

  // ── Funnel events from the product review's measurement plan (§10).
  //
  // The set above measured the landing page and the quiz and then stopped, so
  // there was no way to answer the questions that actually matter: did the user
  // reach a personalised stack, did they act on it, and did they come back.
  //
  // ACTIVATION is deliberately NOT account creation. An activated user has
  // completed onboarding, seen a stack, AND done something with it — saved a
  // tool, started a path, or opened a template. Counting signups instead
  // flatters the number and hides the drop-off that matters.
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  STACK_GENERATED: 'stack_generated',
  ACTIVATED: 'activated',

  // deep value — engagement past browsing
  TOOL_SAVED: 'tool_saved',
  COMPARISON_VIEWED: 'comparison_viewed',
  PATH_STARTED: 'path_started',
  STACK_UPDATED: 'stack_updated',
  EXAMPLE_STACK_VIEWED: 'example_stack_viewed',

  // Purchase intent and revenue. The payment path is live now, so these are
  // emitted rather than aspirational.
  //
  // CHECKOUT_FAILED matters more than the successes: a funnel with no failure
  // arm reads as "nobody abandoned", when in truth abandonment is invisible.
  // Started-minus-completed is the only way to see a broken gateway.
  // Account lifecycle. Without these the funnel starts at "someone was already
  // signed in", which hides the step where most people actually drop.
  ACCOUNT_CREATED: 'account_created',
  SIGNED_IN: 'signed_in',
  GUEST_STACK_IMPORTED: 'guest_stack_imported',

  PRICING_VIEWED: 'pricing_viewed',
  UPGRADE_CLICKED: 'upgrade_clicked',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_FAILED: 'checkout_failed',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  TRIAL_STARTED: 'trial_started',
  TRIAL_EXPIRED: 'trial_expired',

  // First-run tour of /app. Skipped-vs-completed is the useful pair: a tour
  // everyone escapes on step one is worse than no tour.
  TOUR_STARTED: 'tour_started',
  TOUR_STEP: 'tour_step',
  TOUR_COMPLETED: 'tour_completed',
  TOUR_SKIPPED: 'tour_skipped',

  // Discoverability: do people actually find and use what is already built?
  FILTER_USED: 'filter_used',
  SEARCH_USED: 'search_used',
  COMPARE_OPENED: 'compare_opened',
  LEARN_RESOURCE_CLICKED: 'learn_resource_clicked',
  INTEGRATION_SOURCE_CLICKED: 'integration_source_clicked',
  // The one-question survey after the stack page. Fixed choices only.
  SURVEY_SHOWN: 'survey_shown',
  SURVEY_ANSWERED: 'survey_answered',
  SURVEY_DISMISSED: 'survey_dismissed',

  // retention
  RETURNED_7D: 'returned_7d',
  RETURNED_30D: 'returned_30d',
}

const GA_ID = import.meta.env.VITE_GA4_ID

// Whether there is a GA4 property to gate consent for at all — false in dev
// and in any deploy without VITE_GA4_ID set, in which case no banner is shown
// and loadAnalytics() below is simply never worth calling.
export function canInitAnalytics() {
  return !!GA_ID
}

// The one non-essential, cookie-setting script in the app. Call this only
// once the visitor has actively accepted analytics — never at boot.
export function loadAnalytics() {
  if (!GA_ID) return
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
  window.gtag = function () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID)
}

// Always safe to call at boot, consent or not: it only sets up the in-memory
// event queue and first-party page_view/time_on_page bookkeeping that every
// track() call site in the app depends on existing. It never talks to a
// third party by itself — track() only reaches GA4 once loadAnalytics() has
// run and window.gtag exists.
export function initAnalytics() {
  window.dataLayer = window.dataLayer || []

  track(EVENTS.PAGE_VIEW, { path: location.pathname })

  let start = Date.now()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      track(EVENTS.TIME_ON_PAGE, { seconds: Math.round((Date.now() - start) / 1000) })
    } else {
      start = Date.now()
    }
  })
}

export function track(name, props = {}) {
  if (window.gtag) window.gtag('event', name, props)
  else window.dataLayer.push({ event: name, ...props })
  if (import.meta.env.DEV) console.debug('[analytics]', name, props)
}
