import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import SpiralMark from '../ui/SpiralMark'
import { signIn, signInWithEmail, isSupabaseConfigured } from '../../state/authStore'
import { postAuthDestination } from '../../utils/postAuth'
import { armLaunch, clearLaunch } from '../../utils/launchFlag'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { haptic } from '../../utils/haptics'
import { TOOLS, CATEGORY_META } from '../../utils/toolsCatalog'
import { FLAGSHIP } from '../../utils/prominence'

// THE SIGN-IN SCREEN — a full page, not a dialog in front of one.
//
// It used to be an arcade cabinet in a modal: a second product's visual
// language, floating over a dimmed page, on the one screen every single user
// has to pass through. The replacement is a whole-viewport split — the galaxy
// on the left, the controls on the right — so signing in feels like arriving
// somewhere rather than being interrupted.
//
// THE ANIMATION IS CSS AND SVG, DELIBERATELY NOT WEBGL.
// The landing page already pays for a WebGL galaxy, and mounting a second one
// here would mean a compile and a second GPU context on a screen people reach
// in under a second — and on machines with flaky drivers, a black rectangle
// where the brand should be. Everything here is transforms and gradients: a
// drifting starfield, a slowly turning spiral, real tool names orbiting it, and
// a comet that crosses every twelve seconds.
//
// EVERY NAME IN THE ORBIT IS A REAL TOOL from the catalogue, picked from the
// flagship lists. Inventing plausible-looking names on the sign-in screen would
// be a lie told in the first ten seconds of the relationship.
//
// prefers-reduced-motion turns all of it off and leaves the same composition
// standing still — the page must never depend on movement to make sense.

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
    <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
  </svg>
)

// Deterministic per-render star field: positions are computed once so a
// re-render (typing an email) never reshuffles the sky.
function useStars(count) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = (n) => {
          const x = Math.sin((i + 1) * n) * 43758.5453
          return x - Math.floor(x)
        }
        return {
          left: `${r(12.9898) * 100}%`,
          top: `${r(78.233) * 100}%`,
          size: 1 + r(37.719) * 1.8,
          delay: `${r(11.13) * 6}s`,
          duration: `${4 + r(3.71) * 5}s`,
          opacity: 0.35 + r(5.91) * 0.5,
        }
      }),
    [count],
  )
}

export default function SignInPage({ next = '/app/stack' }) {
  const track = useAnalytics()
  const reduced = useReducedMotion()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [busy, setBusy] = useState(null)
  const emailRef = useRef(null)
  const stars = useStars(90)

  // Real names, from the curated flagship lists, that exist in the catalogue.
  const orbiting = useMemo(() => {
    const names = new Set(Object.values(FLAGSHIP).flat())
    const have = TOOLS.filter((t) => names.has(t.name))
    const seen = new Set()
    return have
      .filter((t) => (seen.has(t.name) ? false : seen.add(t.name)))
      .slice(0, 9)
      .map((t, i) => ({
        tool: t,
        color: CATEGORY_META[t.category]?.color || '#a1a1aa',
        angle: (i / 9) * 360,
      }))
  }, [])

  const domainCount = useMemo(() => Object.keys(CATEGORY_META).length, [])

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

  const rise = {
    hidden: { opacity: 0, y: 14 },
    show: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { delay: reduced ? 0 : 0.08 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    }),
  }

  return (
    <div className="signin-page relative min-h-screen w-full overflow-hidden bg-[#050509] text-white">
      {/* --- the sky: drifting stars, nebula wash, a comet every 12s --- */}
      <div className="signin-sky" aria-hidden="true">
        {stars.map((s, i) => (
          <span
            key={i}
            className="signin-star"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animationDelay: s.delay,
              animationDuration: s.duration,
            }}
          />
        ))}
        <span className="signin-comet" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        {/* ---------- left: the galaxy and what it is ---------- */}
        <section className="relative flex flex-1 flex-col justify-between px-6 pb-10 pt-8 sm:px-10 lg:pb-16 lg:pt-14">
          <Link to="/" className="inline-flex w-fit items-center gap-2.5 text-lg font-semibold tracking-[-0.02em]">
            <SpiralMark size={30} />
            Toolnaut
          </Link>

          <div className="relative my-10 flex flex-1 items-center justify-center lg:my-0">
            {/* the orbit: rings, a turning spiral, real tool names riding it */}
            <div className="signin-orbit" aria-hidden="true">
              <span className="signin-ring" style={{ inset: '4%' }} />
              <span className="signin-ring slow" style={{ inset: '18%' }} />
              <span className="signin-ring reverse" style={{ inset: '32%' }} />
              <div className="signin-core">
                <SpiralMark size={116} />
              </div>
              <div className="signin-carousel">
                {orbiting.map((o) => (
                  <span
                    key={o.tool.slug}
                    className="signin-chip"
                    style={{
                      transform: `rotate(${o.angle}deg) translate(var(--orbit-r)) rotate(${-o.angle}deg)`,
                    }}
                  >
                    <span className="signin-chip-in">
                      <span className="signin-dot" style={{ background: o.color }} />
                      {o.tool.name}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <motion.div initial="hidden" animate="show" variants={rise} custom={0} className="max-w-md">
            <h1 className="arcade-heading text-3xl sm:text-4xl">
              Your corner of the galaxy
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {TOOLS.length.toLocaleString()} AI tools across {domainCount} domains, mapped to what you
              actually do. Sign in to keep your stack, your saved tools and your roadmap on every device.
            </p>
          </motion.div>
        </section>

        {/* ---------- right: the controls ---------- */}
        <section className="relative flex w-full items-center justify-center px-6 pb-14 sm:px-10 lg:w-[460px] lg:px-0 lg:pr-10">
          <motion.div
            initial="hidden"
            animate="show"
            variants={rise}
            custom={1}
            className="signin-card w-full max-w-md p-7 sm:p-9"
          >
            <p className="text-[11px] uppercase tracking-[0.24em] cosmic-text">Welcome</p>
            <h2 className="arcade-heading mt-3 text-2xl sm:text-3xl">Sign in to Toolnaut</h2>
            <p className="mt-2 text-sm text-zinc-400">No password. One tap, or a link in your inbox.</p>

            <button
              type="button"
              onClick={() => useProvider('google')}
              disabled={Boolean(busy)}
              className="nb-btn press mt-7 flex min-h-12 w-full items-center justify-center gap-3 px-5 text-sm disabled:opacity-60"
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

            {error && <p role="alert" className="mt-3 text-xs font-medium text-rose-300">{error}</p>}

            <p className="mt-7 text-[11px] leading-relaxed text-zinc-500">
              By continuing you agree to our{' '}
              <Link to="/terms" className="text-zinc-300 underline underline-offset-2 hover:text-white">Terms</Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-zinc-300 underline underline-offset-2 hover:text-white">Privacy Policy</Link>.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              {isSupabaseConfigured
                ? 'We only use your email to sign you in.'
                : 'Dev preview — sign-in is simulated locally, no email is sent.'}
            </p>

            <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
              ← Back to the galaxy
            </Link>
          </motion.div>
        </section>
      </div>
    </div>
  )
}
