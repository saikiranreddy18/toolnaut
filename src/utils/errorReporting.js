// Crash reporting. Same shape as initAnalytics: configured, it reports;
// unconfigured, it is inert, costs nothing and never throws.
//
// Why this exists: the app had no error handling of any kind. A render crash
// left a white page — the visitor saw nothing to act on, and no signal reached
// anyone. Payment and auth failures are the expensive version of that: the one
// path where a silent break costs money, and the one we could least see.
//
// The SDK is NOT statically imported. It is ~30KB gzipped and lands in the
// entry chunk, which every visitor downloads before first paint — including,
// until a DSN exists, in exchange for nothing at all. It is loaded on demand
// instead, the same trade this project already makes for three.js.

const DSN = import.meta.env.VITE_SENTRY_DSN

// Errors only by default. Performance tracing bills against a separate, much
// smaller free-tier allowance and would burn a month of it in days at real
// traffic — and it answers "what is slow", which is not the question this is
// here to answer. Set VITE_SENTRY_TRACES to a small fraction (0.05) when that
// becomes the question.
const TRACES = Number(import.meta.env.VITE_SENTRY_TRACES || 0)

// Session Replay is deliberately not enabled. It records the DOM of real
// sessions — a privacy commitment the privacy policy does not currently make —
// and would add roughly 50KB more to a bundle already being kept in check.

// Whether a crash will actually reach anyone. The visitor is shown a reference
// code only when there is something for it to reference — a code that leads
// nowhere is worse than no code, because it invites a support mail we cannot
// answer.
export const REPORTING_CONFIGURED = Boolean(DSN) && import.meta.env.PROD

let sentry = null

// Anything that breaks before the SDK finishes loading. Boot-order crashes are
// both the most severe kind and the most likely to fall in that window, so they
// are buffered and flushed rather than dropped.
let pending = []

function flush() {
  const queued = pending
  pending = []
  for (const { error, context } of queued) {
    sentry.captureException(error, context ? { extra: context } : undefined)
  }
}

export function initErrorReporting() {
  if (!DSN) return false

  // Dev crashes belong in the console, where they arrive with a real stack and
  // a component tree. Shipping them costs quota and buries the production
  // signal under errors from code that was mid-edit.
  if (!import.meta.env.PROD) return false

  // The prerender walks every public route in headless Chromium against a local
  // preview server, running the production bundle. Anything it trips over would
  // arrive tagged as production traffic that no real visitor ever saw.
  if (typeof navigator !== 'undefined' && navigator.webdriver) return false

  // Catch what happens during the load itself. Removed the moment Sentry's own
  // handlers are installed, so nothing is reported twice.
  const onError = (e) => pending.push({ error: e.error || e.message, context: { phase: 'boot' } })
  const onRejection = (e) => pending.push({ error: e.reason, context: { phase: 'boot' } })
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)

  import('./sentryClient')
    .then((Sentry) => {
      Sentry.init({
        dsn: DSN,
        release: __APP_RELEASE__,
        environment: 'production',
        tracesSampleRate: TRACES,

        // Never send PII by default. Sentry can attach IP addresses and user
        // identifiers automatically; doing so quietly would outrun what the
        // privacy policy tells visitors we collect.
        sendDefaultPii: false,

        ignoreErrors: [
          // Benign layout chatter every Chromium app emits. Not actionable.
          'ResizeObserver loop limit exceeded',
          'ResizeObserver loop completed with undelivered notifications',
          // Aborts we cause on purpose — loadLiveCatalog cancels its own fetch
          // at 1500ms by design, and that is a success path, not a fault.
          'AbortError',
          'The operation was aborted',
          // A tab navigating away mid-request.
          'Failed to fetch dynamically imported module',
        ],

        // Browser extensions execute in the page and throw inside it. Their
        // stacks point at code that is not ours and that we cannot fix.
        denyUrls: [/^chrome-extension:\/\//i, /^moz-extension:\/\//i, /^safari-web-extension:\/\//i],

        beforeSend(event) {
          const frames = event.exception?.values?.[0]?.stacktrace?.frames
          const top = frames?.[frames.length - 1]?.filename || ''
          if (/^(chrome|moz|safari-web)-extension:\/\//i.test(top)) return null
          return event
        },
      })

      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      sentry = Sentry
      flush()
    })
    .catch(() => {
      // Blocked by an ad blocker, offline, or the chunk 404s after a redeploy.
      // Reporting failing is never allowed to become a fault of its own.
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      pending = []
    })

  return true
}

// Manual reporting for paths that already catch their own errors — a caught
// exception is invisible to the global handler by definition, and the ones we
// catch (payment, auth) are the ones worth knowing about. Safe to call at any
// time: before the SDK loads it queues, and with no DSN it does nothing.
export function reportError(error, context) {
  if (!DSN) return
  if (sentry) sentry.captureException(error, context ? { extra: context } : undefined)
  else pending.push({ error, context })
}
