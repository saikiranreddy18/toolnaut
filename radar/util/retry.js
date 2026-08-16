// Small retry-with-backoff. Each network call is wrapped so a transient blip
// doesn't fail the whole run.
export async function retry(fn, { attempts = 3, baseMs = 400 } = {}) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, baseMs * 2 ** i))
    }
  }
  throw lastErr
}
