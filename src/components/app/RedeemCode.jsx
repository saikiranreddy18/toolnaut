import { useState } from 'react'
import { getAccessToken } from '../../utils/entitlement'
import { haptic } from '../../utils/haptics'

// Redeem a promo code for free access.
//
// The browser sends a string and nothing else. It never names a plan or a
// duration — /api/redeem-code looks both up from the code itself, server-side,
// with the service role. Anything this component could send would otherwise be
// a way to grant yourself a plan you did not earn, which is precisely what the
// RLS tests prove a user cannot do.
//
// Every failure shows the same sentence, because the server returns the same
// sentence. Telling someone "that code exists but has expired" turns the field
// into an oracle for discovering valid codes.
export default function RedeemCode({ onRedeemed }) {
  const [code, setCode] = useState('')
  const [state, setState] = useState('idle') // idle | sending | done | error
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    const value = code.trim()
    if (!value || state === 'sending') return
    setState('sending')
    setMsg('')
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/redeem-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setState('error')
        setMsg(data.error || 'That code could not be applied.')
        return
      }
      haptic.success()
      setState('done')
      setMsg(`Unlocked — ${data.days} days of access.`)
      // Let the parent re-check entitlement rather than guessing here; the
      // server is the authority on what is now active.
      onRedeemed?.(data)
    } catch {
      setState('error')
      setMsg('Could not reach the server. Nothing has changed.')
    }
  }

  if (state === 'done') {
    return (
      <p className="mt-5 font-display text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--lime)' }}>
        ✓ {msg}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="mt-6 w-full max-w-sm">
      <label htmlFor="promo-code" className="font-display text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        Have a code?
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id="promo-code"
          value={code}
          onChange={(e) => { setCode(e.target.value); if (state === 'error') setState('idle') }}
          placeholder="e.g. PRO26"
          autoComplete="off"
          spellCheck="false"
          className="min-h-11 w-full rounded-xl border border-[#2b2b3a] bg-[#0a0a10] px-4 text-sm uppercase tracking-widest text-white placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-500 focus:border-[var(--lime)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === 'sending' || !code.trim()}
          className="min-h-11 shrink-0 cursor-pointer rounded-xl border border-[var(--lime)]/60 bg-[var(--lime)]/10 px-4 font-display text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lime)] transition-colors hover:bg-[var(--lime)] hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === 'sending' ? 'Checking…' : 'Apply'}
        </button>
      </div>
      {state === 'error' && (
        <p className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--hot-pink)' }}>{msg}</p>
      )}
    </form>
  )
}
