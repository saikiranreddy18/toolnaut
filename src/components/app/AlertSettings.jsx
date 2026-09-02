import { useCallback, useEffect, useState } from 'react'
import { getAccessToken } from '../../utils/entitlement'

// Tool alerts — the on/off switch for "email me when the radar finds something
// that fits me".
//
// SHOWS THE SERVER'S ANSWER, NOT A LOCAL GUESS. The switch reads
// /api/alerts-status on mount, so it reflects what is actually in the
// subscriber table. A toggle that remembers its own position in localStorage
// would cheerfully claim someone is subscribed when they are not, which for an
// email preference is the worst kind of wrong.
//
// UNCONFIGURED SAYS SO. If the alerts backend has no credentials the section
// explains that instead of offering a switch that silently does nothing.

const DOMAINS = [
  { key: 'code', label: 'Code & dev' },
  { key: 'design', label: 'Design' },
  { key: 'writing', label: 'Writing' },
  { key: 'data', label: 'Data' },
  { key: 'automation', label: 'Automation' },
  { key: 'learning', label: 'Learning' },
]

export default function AlertSettings() {
  const [state, setState] = useState({ loading: true, configured: false, subscribed: false, domains: [] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const token = await getAccessToken()
      if (!token) { if (alive) setState((s) => ({ ...s, loading: false })); return }
      try {
        const r = await fetch('/api/alerts-status', { headers: { authorization: `Bearer ${token}` } })
        const d = await r.json().catch(() => null)
        if (alive && d) setState({ loading: false, configured: Boolean(d.configured), subscribed: Boolean(d.subscribed), domains: d.domains || [] })
        else if (alive) setState((s) => ({ ...s, loading: false }))
      } catch {
        if (alive) setState((s) => ({ ...s, loading: false }))
      }
    })()
    return () => { alive = false }
  }, [])

  const save = useCallback(async (enabled, domains) => {
    setBusy(true); setError(null)
    const token = await getAccessToken()
    if (!token) { setError('Sign in first.'); setBusy(false); return }
    try {
      const r = await fetch('/api/alerts-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled, domains }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok) { setError(d?.error || 'Could not save that.'); return }
      // Trust the server's echo rather than what was asked for — if it dropped
      // an unknown domain key, the switch should show what was actually stored.
      setState((s) => ({ ...s, subscribed: Boolean(d.subscribed), domains: d.domains || [] }))
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(false)
    }
  }, [])

  if (state.loading) {
    return <p className="text-sm text-slate-400">Loading your alert settings…</p>
  }

  if (!state.configured) {
    return (
      <p className="text-sm leading-relaxed text-slate-400">
        Tool alerts are not switched on for this deployment yet. When they are,
        this is where you will turn them on and choose what counts as relevant.
      </p>
    )
  }

  const toggleDomain = (key) => {
    const next = state.domains.includes(key)
      ? state.domains.filter((d) => d !== key)
      : [...state.domains, key]
    setState((s) => ({ ...s, domains: next }))
    if (state.subscribed) save(true, next)
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-sm font-black uppercase tracking-wide text-white">
            New tool alerts
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            An email when the radar finds a tool that fits what you do. Never
            more than one a day, and only when there is something new.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={state.subscribed}
          aria-label="New tool alerts"
          disabled={busy}
          onClick={() => save(!state.subscribed, state.domains)}
          className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full border-2 border-black transition-colors disabled:opacity-50"
          style={{ background: state.subscribed ? 'var(--lime)' : '#334155' }}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full border-2 border-black bg-white transition-all"
            style={{ left: state.subscribed ? '1.5rem' : '0.125rem' }}
          />
        </button>
      </div>

      {state.subscribed && (
        <div className="mt-4">
          <p className="font-display text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            What to tell you about
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DOMAINS.map((d) => {
              const on = state.domains.includes(d.key)
              return (
                <button
                  key={d.key}
                  type="button"
                  aria-pressed={on}
                  disabled={busy}
                  onClick={() => toggleDomain(d.key)}
                  className="rounded-full border-2 border-black px-3 py-1 text-xs font-bold transition-colors disabled:opacity-50"
                  style={{
                    background: on ? 'var(--lime)' : 'transparent',
                    color: on ? '#000' : '#cbd5e1',
                  }}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {state.domains.length === 0
              ? 'Nothing selected means everything — you will hear about any new tool.'
              : `Only these ${state.domains.length === 1 ? 'alerts' : 'areas'}.`}
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-xs font-semibold text-rose-400">{error}</p>}
    </div>
  )
}
