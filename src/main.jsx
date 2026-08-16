import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initAnalytics } from './utils/analyticsEvents'
import { loadLiveCatalog } from './utils/liveCatalog'
import { loadTheme, applyTheme } from './state/themeStore'

initAnalytics()
applyTheme(loadTheme()) // paint the saved play-mode before first render

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
