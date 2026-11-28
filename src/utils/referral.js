// Referral capture — see docs/research-backlog.md "No referral / invite-a-
// friend growth loop". The code is just the referrer's own auth id, captured
// off a `?ref=<uuid>` link and redeemed once the visitor signs in.
//
// Plain localStorage, not the per-account scoped stores in state/
// scopedStorage.js: at capture time nobody is signed in yet, so there is no
// account to scope the value to, and it has to survive the OAuth round trip
// unscoped. signInWithOAuth's redirectTo (authStore.js) comes back to a fixed
// destination that never carries `?ref=` itself, so stashRef() on app boot is
// the only point that ever sees the param.
const REF_KEY = 'exus_ref_v1'

export function stashRef() {
  try {
    const url = new URL(window.location.href)
    const ref = url.searchParams.get('ref')
    if (!ref) return
    url.searchParams.delete('ref')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    localStorage.setItem(REF_KEY, ref)
  } catch { /* storage blocked, or no window (SSR/prerender) */ }
}

// One-shot read: deletes on the way out, so a retried or polled entitlement
// fetch can never resend a code that already did its job.
export function consumeRef() {
  try {
    const ref = localStorage.getItem(REF_KEY)
    if (!ref) return null
    localStorage.removeItem(REF_KEY)
    return ref
  } catch {
    return null
  }
}
