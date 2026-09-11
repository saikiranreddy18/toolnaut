import { useEffect, useRef, useState } from 'react'
import { getAccessToken, fetchEntitlement } from '../../utils/entitlement'
import { signOut } from '../../state/authStore'
import { haptic } from '../../utils/haptics'

// Permanent account deletion, confirmed by a code emailed to the account.
//
// Sits beside Sign out on purpose: it is the other way of leaving, and the one
// place someone looking for it will look.
//
// THREE STEPS, EACH SAYING EXACTLY WHAT HAPPENS NEXT
//   warn  what is erased, what is kept, and what a paid plan loses
//   code  the six digits from the email
//   done  confirmation, after the browser copy is cleared and the session ended
//
// The server is the authority (api/account-delete.js). This component never
// deletes anything itself beyond this browser's copy of the account's data,
// and only after the server says the account is gone.

// Everything this account wrote to this browser lives under "<key>::<uid>"
// (see state/scopedStorage.js). Device preferences — theme, sky, cursor — are
// unscoped and stay, because they belong to the browser, not the person.
function clearThisAccountFromBrowser(uid) {
  try {
    const doomed = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && uid && k.endsWith(`::${uid}`)) doomed.push(k)
    }
    doomed.forEach((k) => localStorage.removeItem(k))
    localStorage.removeItem('exus_session_v1')
  } catch { /* storage blocked: nothing to clear */ }
}

async function call(body) {
  const token = await getAccessToken()
  if (!token) return { ok: false, error: 'Sign in again to delete your account.' }
  try {
    const r = await fetch('/api/account-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const d = await r.json().catch(() => ({}))
    return r.ok ? { ok: true, ...d } : { ...d, ok: false, error: d.error || 'Something went wrong. Try again.' }
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' }
  }
}

export default function DeleteAccount({ session }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('warn')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [plan, setPlan] = useState(null)
  const firstRef = useRef(null)
  const uid = session?.user?.id

  function close() {
    setOpen(false); setStep('warn'); setError(''); setCode(''); setBusy(false)
  }

  useEffect(() => {
    if (!open) return
    let on = true
    fetchEntitlement().then((e) => { if (on && e?.active) setPlan(e) })
    return () => { on = false }
  }, [open])

  useEffect(() => {
    if (!open) return
    firstRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape' && !busy && step !== 'done') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, step, busy])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  async function requestCode() {
    haptic.tap()
    setBusy(true); setError('')
    const r = await call({ action: 'request' })
    setBusy(false)
    if (!r.ok) {
      if (r.retryAfter) setCooldown(r.retryAfter)
      setError(r.error)
      return
    }
    setSentTo(r.sentTo || 'your email')
    setCooldown(60)
    setStep('code')
  }

  async function confirm(e) {
    e?.preventDefault()
    haptic.tap()
    setBusy(true); setError('')
    const r = await call({ action: 'confirm', code })
    if (!r.ok) {
      setBusy(false)
      setError(r.error)
      if (r.reason === 'locked' || r.reason === 'expired' || r.reason === 'none') setCode('')
      return
    }
    clearThisAccountFromBrowser(uid)
    await signOut()
    setBusy(false)
    setStep('done')
  }

  if (!session?.user || session.simulated) return null

  const digits = code.replace(/\D/g, '')

  return (
    <>
      <button
        type="button"
        onClick={() => { haptic.tap(); setOpen(true) }}
        className="min-h-11 rounded-md border-2 border-rose-400/70 px-4 py-2.5 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300"
      >
        Delete account
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4"
          onClick={() => { if (!busy && step !== 'done') close() }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="sticker w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {step === 'warn' && (
              <>
                <h2 id="delete-account-title" className="arcade-heading text-xl" style={{ color: '#fda4af' }}>DELETE YOUR ACCOUNT?</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  This is permanent. It cannot be undone, and support cannot bring it back.
                </p>
                <div className="mt-4 grid gap-3 text-xs leading-relaxed">
                  <div>
                    <p className="font-bold uppercase tracking-wide text-rose-300">Erased</p>
                    <p className="mt-1 text-slate-400">Your profile and quiz answers, stack and saved tools, roadmap progress, alert emails, and your sign-in.</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wide text-slate-300">Kept, without your name</p>
                    <p className="mt-1 text-slate-400">Records of past payments — amount, plan and date only — because tax law requires them. Your email and phone are removed from them.</p>
                  </div>
                  {plan?.active && (
                    <p className="rounded-md border-2 border-amber-400/60 p-2.5 font-semibold text-amber-200">
                      Your {plan.plan ? `${plan.plan} ` : ''}access ends immediately and is not refunded.
                    </p>
                  )}
                </div>
                <p className="mt-4 text-xs text-slate-400">We will email a 6-digit code to confirm it is you.</p>
                {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-400">{error}</p>}
                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button ref={firstRef} type="button" onClick={close} disabled={busy} className="nb-btn min-h-11 px-4 py-2.5 text-xs disabled:opacity-50">
                    Keep my account
                  </button>
                  <button
                    type="button"
                    onClick={requestCode}
                    disabled={busy || cooldown > 0}
                    className="min-h-11 rounded-md border-2 border-black bg-rose-500 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                  >
                    {busy ? 'Sending…' : cooldown > 0 ? `Wait ${cooldown}s` : 'Email me a code'}
                  </button>
                </div>
              </>
            )}

            {step === 'code' && (
              <form onSubmit={confirm}>
                <h2 id="delete-account-title" className="arcade-heading text-xl" style={{ color: '#fda4af' }}>ENTER THE CODE</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  We sent a 6-digit code to <span className="font-bold text-white">{sentTo}</span>. It expires in 10 minutes.
                </p>
                <label htmlFor="delete-code" className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-400">Code</label>
                <input
                  id="delete-code"
                  ref={firstRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, '').slice(0, 7))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  disabled={busy}
                  className="mt-1.5 w-full rounded-md border-2 border-black bg-slate-900 px-3 py-3 text-center font-mono text-2xl tracking-[0.4em] text-white tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300"
                  placeholder="••••••"
                />
                {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-400">{error}</p>}
                <div className="mt-3 text-xs text-slate-400">
                  {cooldown > 0 ? (
                    <span>No email? You can ask for a new code in {cooldown}s.</span>
                  ) : (
                    <button type="button" onClick={requestCode} disabled={busy} className="font-bold text-cyan-300 underline underline-offset-2 disabled:opacity-50">
                      Send a new code
                    </button>
                  )}
                </div>
                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={close} disabled={busy} className="nb-btn min-h-11 px-4 py-2.5 text-xs disabled:opacity-50">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy || digits.length !== 6}
                    className="min-h-11 rounded-md border-2 border-black bg-rose-500 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                  >
                    {busy ? 'Deleting…' : 'Delete my account permanently'}
                  </button>
                </div>
              </form>
            )}

            {step === 'done' && (
              <>
                <h2 id="delete-account-title" className="arcade-heading text-xl">ACCOUNT DELETED</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Your account and everything in it are gone, and you are signed out. A confirmation is on its way to your email.
                </p>
                <div className="mt-5 flex justify-end">
                  <button ref={firstRef} type="button" onClick={() => window.location.replace('/')} className="nb-btn min-h-11 px-4 py-2.5 text-xs">
                    Back to Toolnaut
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
