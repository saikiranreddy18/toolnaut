// Small retry-with-backoff. Each network call is wrapped so a transient blip
// doesn't fail the whole run. Retrying is only useful for transient failures:
// a 4xx (except 429) means the request itself is wrong, so we fail fast instead
// of sending the same bad request three times.
export async function retry(fn, { attempts = 3, baseMs = 400, maxMs = 30000 } = {}) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const status = e?.status
      if (status >= 400 && status < 500 && status !== 429) throw e
      if (i < attempts - 1) {
        const backoff = Math.min(baseMs * 2 ** i, maxMs)
        // On a rate limit, the server told us how long to wait — obey it.
        const wait = status === 429 && e.retryAfterMs > 0 ? Math.min(e.retryAfterMs, maxMs) : backoff
        await new Promise((r) => setTimeout(r, wait))
      }
    }
  }
  throw lastErr
}

// Error factory for a non-OK HTTP response: carries the status (so retry() can
// fail fast on client errors) and any Retry-After hint the server sent.
export function httpError(res, message) {
  const e = new Error(message)
  e.status = res.status
  const ra = res.headers?.get?.('retry-after')
  if (ra) {
    const ms = /^\d+$/.test(String(ra).trim()) ? Number(ra) * 1000 : Date.parse(ra) - Date.now()
    if (Number.isFinite(ms) && ms > 0) e.retryAfterMs = ms
  }
  return e
}
