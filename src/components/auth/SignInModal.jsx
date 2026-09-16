import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SpiralMark from '../ui/SpiralMark'
import { signIn, signInWithEmail, isSupabaseConfigured } from '../../state/authStore'
import { postAuthDestination } from '../../utils/postAuth'
import { armLaunch, clearLaunch } from '../../utils/launchFlag'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { haptic } from '../../utils/haptics'
import { TOOLS } from '../../utils/toolsCatalog'

// The sign-in dialog.
//
// A dialog rather than a page, so signing in never loses the context someone
// was in. /auth/login renders this too, so the old route still works and
// bookmarks survive.
//
// THE DESIGN IS THE SITE'S DESIGN. This used to be an arcade cabinet with a
// cream panel, chunky offset shadows and a joystick — a different product's
// visual language on the one screen every user has to pass through. It is now
// the same dark, cosmic card the rest of the app uses: one column, the spiral
// mark, Google, then the email link.
//
// Wired to the real Supabase auth that is already live. Google sends the
// browser away and back; the email path sends a magic link and says so.
//
// ONLY OFFER PROVIDERS THAT ARE ACTUALLY ENABLED.
// A "Continue with GitHub" button shipped here while GitHub was false in the
// Supabase project's auth settings. Supabase rejects a disabled provider, the
// catch below reported "Could not reach the sign-in provider. Try again.", and
// retrying could never work — a dead CTA on the one screen every user must get
// through. Check /auth/v1/settings before adding a provider back.
//
// ON THE LAUNCH SEQUENCE
// The rocket cannot play between the click and Google — the browser leaves the
// site, so there is no page left to animate on. It plays on ARRIVAL instead,
// mounted by whatever receives the user when they come back. This component
// exposes the beats; ArrivalLaunch consumes them.

const PROVIDERS = [
  {
    id: 'google',
    label: 'Continue with Google',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
      </svg>
    ),
  },
]

export default function SignInModal({ open = true, onClose, next = '/app/stack' }) {
  const track = useAnalytics()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [busy, setBusy] = useState(null)
  const closeRef = useRef(null)

  // Escape closes, and focus starts inside the dialog rather than wherever it
  // happened to be on the page behind.
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

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
      // for "signed up" as opposed to "signed back in", and a returning user
      // asked for the app, not a rocket in front of it.
      if (dest === '/goal') armLaunch()
      const session = await signIn(id, { redirectTo: dest })
      // Only the simulated path returns a session; the real one has already
      // sent the browser to the provider by now.
      if (session) window.location.assign(dest)
    } catch {
      // nothing is going to arrive, so leave no armed flag behind to fire on
      // an unrelated navigation later in this tab
      clearLaunch()
      setError('Sign-in is unavailable right now. Try the email link below.')
      setBusy(null)
    }
  }

  async function sendLink(e) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
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
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Sign in to Toolnaut"
        >
          <motion.div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="sticker relative my-auto w-full max-w-md overflow-hidden p-7 sm:p-9"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* nebula wash inside the card, same palette as the galaxy */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(70% 50% at 15% 0%, rgba(124,58,237,0.22), transparent 70%),'
                  + 'radial-gradient(60% 50% at 100% 20%, rgba(14,165,233,0.14), transparent 70%)',
              }}
            />

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className="relative">
              <SpiralMark size={40} />
              <h2 className="arcade-heading mt-5 text-2xl sm:text-3xl">Sign in to Toolnaut</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Your stack, your saved tools and your roadmap, kept across devices.
                {' '}{TOOLS.length.toLocaleString()} tools, mapped to your role.
              </p>

              <div className="mt-7 flex flex-col gap-3">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => useProvider(p.id)}
                    disabled={Boolean(busy)}
                    className="nb-btn flex min-h-12 w-full items-center justify-center gap-3 px-5 text-sm disabled:opacity-60"
                  >
                    {busy === p.id ? 'Opening…' : (<><span className="shrink-0">{p.icon}</span>{p.label}</>)}
                  </button>
                ))}
              </div>

              <div className="my-6 flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">or</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              {linkSent ? (
                <div role="status" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-center">
                  <p className="font-display text-sm font-semibold text-white">Check your inbox</p>
                  <p className="mt-1 text-xs text-zinc-400">We sent a sign-in link to {email}.</p>
                </div>
              ) : (
                <form onSubmit={sendLink} noValidate>
                  <label htmlFor="signin-email" className="sr-only">Email address</label>
                  <div className="flex min-h-12 items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 transition focus-within:border-violet-400/50">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <input
                      id="signin-email"
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
                    className="nb-btn dark mt-3 min-h-12 w-full px-5 text-sm disabled:opacity-60"
                  >
                    {busy === 'email' ? 'Sending…' : 'Email me a sign-in link'}
                  </button>
                </form>
              )}

              {error && (
                <p role="alert" className="mt-3 text-xs font-medium text-rose-300">{error}</p>
              )}

              <p className="mt-6 text-[11px] leading-relaxed text-zinc-500">
                By continuing you agree to our{' '}
                <a href="/terms" className="text-zinc-300 underline underline-offset-2 hover:text-white">Terms</a>{' '}
                and{' '}
                <a href="/privacy" className="text-zinc-300 underline underline-offset-2 hover:text-white">Privacy Policy</a>.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                {isSupabaseConfigured
                  ? 'No password, ever. We only use your email to sign you in.'
                  : 'Dev preview — sign-in is simulated locally, no email is sent.'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
