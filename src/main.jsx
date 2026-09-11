import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initAnalytics } from './utils/analyticsEvents'
import { loadLiveCatalog } from './utils/liveCatalog'
import { loadTheme, applyTheme } from './state/themeStore'
import { loadMoon, applyMoon } from './state/moonStore'
import { watchSession } from './state/authStore'

initAnalytics()
applyTheme(loadTheme()) // paint the saved play-mode before first render
applyMoon(loadMoon())   // and the saved sky, so there is no flash of the wrong night

// Mirror the Supabase session into localStorage for the life of the tab, so the
// synchronous loadSession() every guard calls stays accurate. No-op until the
// project is configured.
watchSession()

// Merge the radar pipeline's live catalog (/tools.json) over the bundled
// baseline before first paint. Resolves instantly to a no-op when the file
// isn't present, so the app renders the bundled catalog either way.
loadLiveCatalog().finally(() => {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})

// Service worker: production only. In dev, we actively UNREGISTER any
// existing SW so it can't serve a stale build from an earlier session.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  } else {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()))
    if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)))
  }
}
