import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import SpiralMark from '../ui/SpiralMark'
import { BrandLogo, LOGO } from '../ui/Mascot'
import { signIn, signInWithEmail, isSupabaseConfigured } from '../../state/authStore'
import { postAuthDestination } from '../../utils/postAuth'
import { armLaunch, clearLaunch } from '../../utils/launchFlag'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { haptic } from '../../utils/haptics'
import { TOOLS } from '../../utils/toolsCatalog'

// THE SIGN-IN SCREEN — one card, floating in deep space.
//
// It owns the whole viewport. Not a dialog over a dimmed page, and not a step
// inside the onboarding flow, so no progress bar sits above it.
//
// WHY LAYERS AND NOT A PICTURE
// Depth is the whole effect: three star fields and three nebula clouds move at
// different speeds and the entire stack shifts against the pointer. A single
// background image cannot do that, and concentric rings with name pills — what
// this screen had before — read as a diagram rather than as space.
//
// CSS AND SVG, DELIBERATELY NOT WEBGL. The landing page already spends a GL
// context on the real galaxy. A second one on the screen every user has to
// pass through means another shader compile and, on machines with the driver
// problems this project keeps hitting, a black rectangle where the brand should
// be. Everything here is transforms, gradients and filters.
//
// The pointer parallax writes CSS custom properties directly rather than going
// through React state: it fires on every pointermove, and re-rendering the tree
// at pointer frequency costs far more than moving a layer does.

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
    <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
  </svg>
)

export default function SignInPage({ next = '/app/stack' }) {
  const track = useAnalytics()
  const reduced = useReducedMotion()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [busy, setBusy] = useState(null)
  const emailRef = useRef(null)
  const rootRef = useRef(null)

  // Pointer parallax. Straight to custom properties, never to state.
  const onMove = useCallback((e) => {
    const el = rootRef.current
    if (!el || reduced) return
    const x = (e.clientX / window.innerWidth) * 2 - 1
    const y = (e.clientY / window.innerHeight) * 2 - 1
    el.style.setProperty('--px', x.toFixed(3))
    el.style.setProperty('--py', y.toFixed(3))
  }, [reduced])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') window.history.back() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function useProvider(id) {
    haptic.tap()
    setError('')
    setBusy(id)
    track(EVENTS.CTA_CLICK, { cta: 'sign_in', provider: id })
    try {
      // Pass the destination through, so the provider returns them INTO the
      // app rather than back to the sign-in screen they started on.
      const dest = postAuthDestination(next)
      // Arm the launch only for a first arrival. postAuthDestination returns
      // /goal exactly when there is no completed intake — that IS the signal
      // for "signed up" as opposed to "signed back in".
      if (dest === '/goal') armLaunch()
      const session = await signIn(id, { redirectTo: dest })
      // Only the simulated path returns a session; the real one has already
      // sent the browser to the provider by now.
      if (session) window.location.assign(dest)
    } catch {
      clearLaunch()
      setError('Sign-in is unavailable right now. Try the email link below.')
      setBusy(null)
    }
  }

  async function sendLink(e) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      emailRef.current?.focus()
      return
    }
    haptic.tap()
    setError('')
    setBusy('email')
    track(EVENTS.CTA_CLICK, { cta: 'sign_in', provider: 'magic_link' })
    try {
      const dest = postAuthDestination(next)
      if (dest === '/goal') armLaunch()
      const { sent } = await signInWithEmail(email, { redirectTo: dest })
      if (sent) setLinkSent(true)
      else window.location.assign(dest)
    } catch {
      clearLaunch()
      setError('Could not send the link. Try again in a moment.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      ref={rootRef}
      onPointerMove={onMove}
      className="auth-deep relative flex min-h-screen w-full flex-col overflow-hidden text-white"
    >
      {/* ---------------- the sky, back to front ---------------- */}
      <div className="auth-layer" aria-hidden="true">
        <span className="auth-neb violet" />
        <span className="auth-neb pink" />
        <span className="auth-neb cyan" />
        <span className="auth-vignette" />
        <span className="auth-stars far" />
        <span className="auth-stars mid" />
        <span className="auth-stars near" />
        <span className="auth-meteor" />
        <span className="auth-meteor second" />
        <span className="auth-horizon" />
      </div>

      {/* ---------------- brand ---------------- */}
      <header className="relative z-10 px-6 pt-7 sm:px-10">
        <Link to="/" aria-label="Toolnaut home">
          <BrandLogo {...LOGO.nav} beta={false} />
        </Link>
      </header>

      {/* ---------------- the card ---------------- */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:px-6">
        <div className="relative w-full max-w-[420px]">
          <span className="auth-halo" aria-hidden="true" />

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="auth-card relative px-7 py-9 sm:px-9"
          >
            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.8, rotate: -25 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex justify-center"
              style={{ filter: 'drop-shadow(0 0 26px rgba(168,85,247,0.55))' }}
            >
              <SpiralMark size={52} />
            </motion.div>

            <h1 className="arcade-heading mt-6 text-center text-[1.75rem] leading-tight sm:text-3xl">
              Welcome back, explorer
            </h1>
            <p className="mt-2.5 text-center text-sm leading-relaxed text-zinc-400">
              Your stack, your saved tools and your roadmap — waiting where you left them.
            </p>

            <button
              type="button"
              onClick={() => useProvider('google')}
              disabled={Boolean(busy)}
              className="nb-btn press mt-8 flex min-h-12 w-full items-center justify-center gap-3 px-5 text-sm disabled:opacity-60"
            >
              {busy === 'google' ? 'Opening…' : (<>{GOOGLE_ICON}Continue with Google</>)}
            </button>

            <div className="my-6 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">or</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            {linkSent ? (
              <div role="status" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-center">
                <p className="font-display text-sm font-semibold text-white">Check your inbox</p>
                <p className="mt-1 text-xs text-zinc-400">We sent a sign-in link to {email}.</p>
                <button
                  type="button"
                  onClick={() => { setLinkSent(false); setEmail('') }}
                  className="mt-3 text-xs text-zinc-300 underline underline-offset-4 hover:text-white"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={sendLink} noValidate>
                <label htmlFor="signin-email" className="sr-only">Email address</label>
                <div className="flex min-h-12 items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 transition focus-within:border-violet-400/60">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input
                    id="signin-email"
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    placeholder="you@work.com"
                    autoComplete="email"
                    aria-invalid={Boolean(error)}
                    className="w-full border-0 bg-transparent py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={Boolean(busy)}
                  className="nb-btn dark press mt-3 min-h-12 w-full px-5 text-sm disabled:opacity-60"
                >
                  {busy === 'email' ? 'Sending…' : 'Email me a sign-in link'}
                </button>
              </form>
            )}

            {error && <p role="alert" className="mt-3 text-center text-xs font-medium text-rose-300">{error}</p>}

            <p className="mt-7 text-center text-[11px] leading-relaxed text-zinc-500">
              By continuing you agree to our{' '}
              <Link to="/terms" className="text-zinc-300 underline underline-offset-2 hover:text-white">Terms</Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-zinc-300 underline underline-offset-2 hover:text-white">Privacy Policy</Link>.
            </p>
          </motion.div>

          <motion.p
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-6 text-center text-xs text-zinc-500"
          >
            {TOOLS.length.toLocaleString()} AI tools mapped to real jobs ·{' '}
            {isSupabaseConfigured ? 'no password, ever' : 'dev preview — sign-in is simulated'}
          </motion.p>

          <p className="mt-2 text-center text-xs">
            <Link to="/" className="text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline">
              ← Back to the galaxy
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
