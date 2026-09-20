// Consent for the one non-essential script this app loads: GA4. Same shape
// as moonStore.js — a single guarded localStorage read/write.
//
// null means "never asked" (shows the banner once); 'granted'/'denied' are
// both remembered forever so a decline is never re-asked on the next visit.

const KEY = 'exus_consent_v1'

export function loadConsent() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

export function setConsent(value) {
  try { localStorage.setItem(KEY, value) } catch { /* storage blocked */ }
  return value
}
