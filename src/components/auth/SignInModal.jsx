import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ArcadeCabinet from './ArcadeCabinet'
import { signIn, signInWithEmail, isSupabaseConfigured } from '../../state/authStore'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { haptic } from '../../utils/haptics'

// The sign-in modal: arcade cabinet on the left, controls on the right.
//
// A dialog rather than a page, so signing in never loses the context someone
// was in. /auth/login renders this too, so the old route still works and
// bookmarks survive.
//
// Wired to the real Supabase auth that is already live. Google and GitHub send
// the browser away and back; the email path sends a magic link and says so.
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
    dark: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'Continue with GitHub',
    dark: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.2-.4-1.2.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
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
  const panelRef = useRef(null)
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
      const session = await signIn(id)
      // Only the simulated path returns a session; the real one has already
      // sent the browser to the provider by now.
      if (session) window.location.assign(next)
    } catch {
      setError('Could not reach the sign-in provider. Try again.')
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
      const { sent } = await signInWithEmail(email)
      if (sent) setLinkSent(true)
      else window.location.assign(next)
    } catch {
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
          transition={{ duration: 0.2 }}
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="signin-title"
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative my-auto w-full max-w-5xl rounded-[28px] border-[3px] p-3 md:p-4"
            style={{ borderColor: 'var(--hot-pink)', background: '#0a0a0f', boxShadow: '9px 9px 0 #000' }}
          >
            <div className="grid gap-4 md:grid-cols-[1.05fr_1fr]">
              {/* left: the machine */}
              <ArcadeCabinet />

              {/* right: the controls */}
              <div
                className="relative rounded-[20px] border-[3px] border-black p-6 md:p-8"
                style={{ background: '#f5f1e8', boxShadow: '5px 5px 0 #000' }}
              >
                <button
                  ref={closeRef}
                  onClick={onClose}
                  aria-label="Close sign in"
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg border-[3px] border-black bg-[#15151c] text-white transition-transform hover:scale-105"
                  style={{ boxShadow: '3px 3px 0 #000' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>

                <h2 id="signin-title" className="font-display text-4xl font-black italic leading-[0.95] md:text-5xl">
                  <span className="block" style={{ color: '#84cc16', WebkitTextStroke: '2px #000' }}>ENTER</span>
                  <span className="block" style={{ color: 'var(--hot-pink)', WebkitTextStroke: '2px #000' }}>OUR WORLD</span>
                </h2>

                <p className="mt-4 text-sm leading-relaxed text-neutral-700">
                  Chart your stack. Answer nine questions and get the AI tools built
                  for who you actually are.
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => useProvider(p.id)}
                      disabled={Boolean(busy)}
                      className="cab-btn flex min-h-12 items-center justify-center gap-3 rounded-xl border-[3px] border-black px-5 py-3 font-bold disabled:opacity-60"
                      style={{
                        background: p.dark ? '#15151c' : 'var(--lime)',
                        color: p.dark ? '#fff' : '#000',
                        boxShadow: '4px 4px 0 #000',
                      }}
                    >
                      {busy === p.id ? 'Opening…' : <>{p.icon}{p.label}</>}
                    </button>
                  ))}
                </div>

                <div className="my-5 flex items-center gap-3" aria-hidden="true">
                  <span className="h-0.5 flex-1 bg-black/25" />
                  <span className="font-display text-xs font-black uppercase text-neutral-600">or</span>
                  <span className="h-0.5 flex-1 bg-black/25" />
                </div>

                {linkSent ? (
                  <div
                    role="status"
                    className="rounded-xl border-[3px] border-black px-4 py-4 text-center"
                    style={{ background: 'var(--lime)', boxShadow: '4px 4px 0 #000' }}
                  >
                    <p className="font-display text-sm font-black uppercase text-black">Check your inbox</p>
                    <p className="mt-1 text-xs text-black/75">
                      We sent a sign-in link to {email}.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={sendLink} noValidate>
                    <label htmlFor="signin-email" className="sr-only">Email address</label>
                    <input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError('') }}
                      placeholder="Enter your email"
                      aria-invalid={Boolean(error)}
                      className="min-h-12 w-full rounded-xl border-[3px] border-black bg-white px-4 text-base text-black placeholder:text-neutral-400 focus:outline-none focus:ring-4"
                      style={{ boxShadow: '4px 4px 0 #000' }}
                    />
                    <button
                      type="submit"
                      disabled={Boolean(busy)}
                      className="cab-btn mt-3 min-h-12 w-full rounded-xl border-[3px] border-black px-5 font-display font-black uppercase tracking-wide text-black disabled:opacity-60"
                      style={{ background: 'var(--lime)', boxShadow: '4px 4px 0 #000' }}
                    >
                      {busy === 'email' ? 'Sending…' : 'Send magic link'}
                    </button>
                  </form>
                )}

                {error && (
                  <p role="alert" className="mt-3 text-xs font-bold" style={{ color: '#c01f7b' }}>
                    {error}
                  </p>
                )}

                <p className="mt-5 text-[11px] leading-relaxed text-neutral-500">
                  {isSupabaseConfigured
                    ? 'No password, ever. We only use your email to sign you in.'
                    : 'Dev preview — sign-in is simulated locally, no email is sent.'}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
