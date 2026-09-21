// Cookie management for preferences, analytics, and session tracking
// Cookies are sent with every request (useful for server-side analytics)
// and survive across browser sessions (unlike sessionStorage)

export const COOKIE_NAMES = {
  // Preferences (1 year)
  theme: 'tn_theme',
  language: 'tn_lang',
  uiPreferences: 'tn_ui_prefs',

  // Analytics (90 days)
  sessionId: 'tn_session_id',
  userId: 'tn_user_id',
  trackingId: 'tn_tracking',

  // Session (7 days or until logout)
  authToken: 'tn_auth',
  sessionToken: 'tn_session',
}

const COOKIE_EXPIRY = {
  preferences: 365, // 1 year
  analytics: 90, // 90 days
  session: 7, // 7 days
}

function setCookie(name, value, days = 7) {
  try {
    const date = new Date()
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
    const expires = `expires=${date.toUTCString()}`
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    const sameSite = '; SameSite=Lax'
    document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}${secure}${sameSite}; path=/`
  } catch (e) {
    console.error(`Failed to set cookie ${name}:`, e)
  }
}

function getCookie(name) {
  try {
    const nameEQ = `${name}=`
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const trimmed = cookie.trim()
      if (trimmed.startsWith(nameEQ)) {
        return decodeURIComponent(trimmed.substring(nameEQ.length))
      }
    }
  } catch (e) {
    console.error(`Failed to get cookie ${name}:`, e)
  }
  return null
}

function deleteCookie(name) {
  try {
    setCookie(name, '', -1)
  } catch (e) {
    console.error(`Failed to delete cookie ${name}:`, e)
  }
}

// Preferences (theme, language, UI settings)
export const preferences = {
  setTheme(theme) {
    setCookie(COOKIE_NAMES.theme, theme, COOKIE_EXPIRY.preferences)
  },
  getTheme() {
    return getCookie(COOKIE_NAMES.theme)
  },
  setLanguage(lang) {
    setCookie(COOKIE_NAMES.language, lang, COOKIE_EXPIRY.preferences)
  },
  getLanguage() {
    return getCookie(COOKIE_NAMES.language)
  },
  setUIPreferences(prefs) {
    setCookie(COOKIE_NAMES.uiPreferences, JSON.stringify(prefs), COOKIE_EXPIRY.preferences)
  },
  getUIPreferences() {
    const prefs = getCookie(COOKIE_NAMES.uiPreferences)
    try {
      return prefs ? JSON.parse(prefs) : null
    } catch {
      return null
    }
  },
}

// Analytics & Tracking
export const analytics = {
  setSessionId(id) {
    setCookie(COOKIE_NAMES.sessionId, id, COOKIE_EXPIRY.analytics)
  },
  getSessionId() {
    return getCookie(COOKIE_NAMES.sessionId)
  },
  setUserId(id) {
    setCookie(COOKIE_NAMES.userId, id, COOKIE_EXPIRY.analytics)
  },
  getUserId() {
    return getCookie(COOKIE_NAMES.userId)
  },
  setTrackingId(id) {
    setCookie(COOKIE_NAMES.trackingId, id, COOKIE_EXPIRY.analytics)
  },
  getTrackingId() {
    return getCookie(COOKIE_NAMES.trackingId)
  },
  trackPageView(page) {
    const sessionId = this.getSessionId()
    // Send to analytics service
    console.log(`[Analytics] Page view: ${page} (session: ${sessionId})`)
  },
}

// Session & Authentication
export const session = {
  setAuthToken(token) {
    setCookie(COOKIE_NAMES.authToken, token, COOKIE_EXPIRY.session)
  },
  getAuthToken() {
    return getCookie(COOKIE_NAMES.authToken)
  },
  setSessionToken(token) {
    setCookie(COOKIE_NAMES.sessionToken, token, COOKIE_EXPIRY.session)
  },
  getSessionToken() {
    return getCookie(COOKIE_NAMES.sessionToken)
  },
  clearSession() {
    deleteCookie(COOKIE_NAMES.authToken)
    deleteCookie(COOKIE_NAMES.sessionToken)
  },
  isAuthenticated() {
    return !!(this.getAuthToken() || this.getSessionToken())
  },
}

// Initialize tracking on page load
export function initializeTracking() {
  if (typeof window === 'undefined') return

  // Generate or get session ID
  let sessionId = analytics.getSessionId()
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    analytics.setSessionId(sessionId)
  }

  // Track page view
  analytics.trackPageView(window.location.pathname)

  // Track user journey
  window.addEventListener('beforeunload', () => {
    const duration = performance.now()
    console.log(`[Analytics] Session duration: ${duration}ms`)
  })
}
