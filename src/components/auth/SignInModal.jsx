import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ArcadeCabinet from './ArcadeCabinet'
import CabinetContours from './CabinetContours'
import { signIn, signInWithEmail, isSupabaseConfigured } from '../../state/authStore'
import { postAuthDestination } from '../../utils/postAuth'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { haptic } from '../../utils/haptics'
import { TOOLS } from '../../utils/toolsCatalog'

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
      // Pass the destination through, so the provider returns them INTO the
      // app rather than back to the sign-in screen they started on.
      const session = await signIn(id, { redirectTo: postAuthDestination(next) })
      // Only the simulated path returns a session; the real one has already
      // sent the browser to the provider by now.
      if (session) window.location.assign(postAuthDestination(next))
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
      const { sent } = await signInWithEmail(email, { redirectTo: postAuthDestination(next) })
      if (sent) setLinkSent(true)
      else window.location.assign(postAuthDestination(next))
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
            className="relative my-auto xl:aspect-[1360/810]"
            style={{ width: 'min(1340px, 88vw)', background: 'transparent' }}
          >
            {/* The contours stretch (preserveAspectRatio="none"), so the shell
                carries the frame's own 1360:810 — without it every inset in the
                SVG distorts and the marquee crosses the top rule. Only from md
                up: below that the layout stacks into one column, and forcing a
                landscape box there squashed the frame to a strip while the
                cabinet spilled out the bottom of it. */}
            <CabinetContours />

            {/* The rail furniture belongs to the FRAME. The contour draws the
                rail at x=112/1360, so these are placed at that same fraction of
                the shell and stay on it at any width — parented to the cabinet
                they were offset from its left edge and fell outside the frame. */}
            <div
              className="absolute z-[6] hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[7px] lg:flex"
              style={{
                left: '8.24%', top: '34%', width: 72, height: 72,
                borderColor: '#050506',
                background: '#151518',
                boxShadow: 'inset 0 0 0 4px var(--hot-pink), 4px 4px 0 #050506',
              }}
              aria-hidden="true"
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--hot-pink)" strokeWidth="2.4">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
              </svg>
            </div>

            {/* the real catalogue size, read at render */}
            <div
              className="absolute z-[6] hidden -translate-x-1/2 rotate-[-8deg] rounded-lg border-[3px] border-black bg-white px-2.5 py-1.5 lg:block"
              style={{ left: '8.24%', top: '62%', boxShadow: '3px 3px 0 #000' }}
            >
              <p className="font-display text-xs font-black uppercase leading-none text-black">
                {TOOLS.length}+
              </p>
              <p className="font-display text-[9px] font-black uppercase leading-none text-black">AI tools</p>
            </div>

            {/* The frame does not box the content in — it OVERLAYS it. The
                cabinet runs under the contours (z-1 vs z-4) and the panel over
                them (z-5), so the padding here is a thin 38/34/33 gutter, not
                the deep percentage inset earlier passes used to try to fit the
                content inside the outline. That inset is what kept leaving a
                dead margin no amount of stretching could close.

                isolate keeps this z-stack from competing with the modal's. */}
            <div
              className="relative grid isolate h-full items-stretch gap-0 xl:grid-cols-[54.7%_45.3%]"
              style={{ padding: '38px 34px 33px' }}
            >
              {/* left: the machine */}
              <div className="h-full min-w-0">
                <ArcadeCabinet
                  framed={false}
                  onButtonA={() => useProvider('google')}
                  onButtonB={() => document.getElementById('signin-email')?.focus()}
                />
              </div>

              {/* right: the controls */}
              <div
                className="signin-panel relative z-[5] flex min-w-0 flex-col overflow-hidden p-6 pb-5 md:py-10 md:pb-6 md:pl-[50px] md:pr-[50px]"
                style={{
                  background: '#f5f1e8',
                  border: '8px solid #09090a',
                  borderLeft: 0,
                  // the notched corners: square top-left where it meets the
                  // separator, clipped top-right and bottom-right to sit inside
                  // the frame's cut corner instead of crossing it
                  clipPath: 'polygon(0 0, 97% 0, 100% 3%, 100% 93%, 93% 100%, 0 100%)',
                  // the panel carries its own pink rule rather than borrowing
                  // the contour's, which is why it can sit above the frame
                  boxShadow:
                    'inset 0 0 0 5px var(--hot-pink), inset 0 0 0 10px #09090a, inset 0 0 0 14px #f5f1e8',
                }}
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

                <span className="absolute left-6 top-6 text-lg" style={{ color: "var(--cyan)" }} aria-hidden="true">✦</span>
                <span className="absolute right-16 top-14 text-sm" style={{ color: "var(--hot-pink)" }} aria-hidden="true">✦</span>

                <h2
                  id="signin-title"
                  className="enter-heading mt-3 text-[clamp(2.4rem,4.4vw,3.6rem)]"
                >
                  <span style={{ color: 'var(--lime)' }}>Enter</span>
                  <strong style={{ color: 'var(--hot-pink)' }}>our world</strong>
                </h2>

                {/* speed lines — the reference has them trailing the headline */}
                <div className="mt-1 flex gap-1" aria-hidden="true">
                  {[10, 16, 22, 14, 9].map((w, i) => (
                    <span key={i} className="h-1 -skew-x-[30deg] bg-black" style={{ width: w }} />
                  ))}
                </div>

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
                      className="cab-btn flex min-h-[3.25rem] items-center gap-3 rounded-lg border-[3px] border-black px-4 py-3 font-bold disabled:opacity-60"
                      style={{
                        background: p.dark ? '#0d0d0f' : 'var(--lime)',
                        color: p.dark ? '#f8f7f1' : '#0a0a0c',
                        boxShadow: p.dark
                          ? '5px 5px 0 #36363b, inset 0 2px rgba(255,255,255,0.1)'
                          : '5px 5px 0 #171719, inset 0 2px rgba(255,255,255,0.38)',
                      }}
                    >
                      {busy === p.id ? (
                        <span className="flex-1 text-center">Opening…</span>
                      ) : (
                        <>
                          <span className="shrink-0">{p.icon}</span>
                          <span className="flex-1 text-center">{p.label}</span>
                          <svg
                            width="19" height="19" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
                            strokeLinejoin="round" className="shrink-0" aria-hidden="true"
                          >
                            <path d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
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
                    <label
                      htmlFor="signin-email"
                      className="flex min-h-[3.25rem] items-center gap-3 rounded-lg border-[3px] border-black px-3 focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-[3px]"
                      style={{ background: '#f8f4eb', boxShadow: '4px 4px 0 #1b1b1d', outlineColor: 'var(--cyan)' }}
                    >
                      <svg
                        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a0a0b"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="shrink-0" aria-hidden="true"
                      >
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      <span className="sr-only">Email address</span>
                      <input
                        id="signin-email"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError('') }}
                        placeholder="Enter your email"
                        autoComplete="email"
                        aria-invalid={Boolean(error)}
                        className="w-full border-0 bg-transparent text-base text-[#0a0a0b] outline-none placeholder:text-[#5f5c59]"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={Boolean(busy)}
                      className="cab-btn mt-3.5 min-h-[3.25rem] w-full rounded-lg border-[3px] border-black px-5 font-display font-black uppercase tracking-wide text-[#10110b] disabled:opacity-60"
                      style={{
                        background: 'var(--lime)',
                        boxShadow: '5px 5px 0 #171719, inset 0 2px rgba(255,255,255,0.42)',
                      }}
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

                <p className="mt-4 text-[11px] leading-relaxed text-neutral-500">
                  By continuing you agree to our{' '}
                  <a href="/terms" className="font-bold underline underline-offset-2 text-neutral-700">Terms</a>{' '}
                  and{' '}
                  <a href="/privacy" className="font-bold underline underline-offset-2 text-neutral-700">Privacy Policy</a>.
                </p>

                <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
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
