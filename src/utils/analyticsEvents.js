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
  WAITLIST_JOIN: 'waitlist_join',
  GALAXY_EXPLORE: 'galaxy_explore',
  SOUND_TOGGLE: 'sound_toggle',
  TIME_ON_PAGE: 'time_on_page',
}

const GA_ID = import.meta.env.VITE_GA4_ID

export function initAnalytics() {
  window.dataLayer = window.dataLayer || []

  if (GA_ID) {
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
    document.head.appendChild(s)
    window.gtag = function () { window.dataLayer.push(arguments) }
    window.gtag('js', new Date())
    window.gtag('config', GA_ID)
  }

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
