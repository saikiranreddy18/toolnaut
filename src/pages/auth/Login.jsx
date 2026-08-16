import { useState } from 'react'
import { motion } from 'framer-motion'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { loadSession, signIn } from '../../state/authStore'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'

const PROVIDERS = [
  {
    id: 'google',
    label: 'Continue with Google',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.35 11.1H12v2.9h5.3c-.5 2.5-2.6 3.9-5.3 3.9a5.9 5.9 0 1 1 0-11.8c1.5 0 2.8.5 3.9 1.5l2.2-2.2A9 9 0 1 0 12 21c5.2 0 8.9-3.7 8.9-8.9 0-.3 0-.7-.1-1z" />
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'Continue with GitHub',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.2-.4-1.2.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
      </svg>
    ),
  },
]

// Simulated auth (no backend yet): picking any provider creates a local
// session so the /app guards and redirects are fully testable.
export default function Login() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const track = useAnalytics()
  const [email, setEmail] = useState('')
  const [error, setError] = useState(false)

  const next = searchParams.get('next') || '/app/stack'

  // Already signed in? /auth/* bounces to the app (APP-FLOW.md §4).
  if (loadSession()) {
    return <Navigate to={next} replace />
  }

  function enter(provider, name) {
    signIn(provider, name)
    track(EVENTS.CTA_CLICK, { cta: 'sign_in', provider })
    navigate(next, { replace: true })
  }

  function magicLink(e) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(true)
      return
    }
    enter('magic_link', email.split('@')[0])
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticker w-full max-w-sm p-8"
        style={{ transform: 'none' }}
      >
        <div className="mb-5 flex justify-center">
          <span className="tape-label" style={{ fontSize: 10 }}>✦ player login ✦</span>
        </div>
        <h1 className="arcade-heading text-2xl">Enter your command center</h1>
        <p className="mt-3 text-sm text-slate-400">
          Your quiz persona and starter stack come with you.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => enter(p.id)}
              className="nb-btn dark flex min-h-12 items-center justify-center gap-3 px-5 py-3 text-sm"
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </div>

        <div className="my-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-white/10" />
          <span className="font-display text-xs font-black uppercase tracking-widest text-lime-400">or</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={magicLink} noValidate>
          <label htmlFor="login-email" className="mb-2 block font-display text-xs font-black uppercase tracking-widest text-slate-300">
            Magic link
          </label>
          <div className="flex gap-2">
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(false) }}
              placeholder="you@example.com"
              aria-invalid={error}
              className="w-full rounded-xl border-2 border-black bg-[#12121c]/90 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:outline-none"
              style={{ boxShadow: '3px 3px 0 #000' }}
            />
            <button type="submit" className="nb-btn shrink-0 px-4 py-3 text-sm">
              Send
            </button>
          </div>
          <p className={`mt-2 text-xs font-bold ${error ? 'text-exus-peach' : 'text-slate-500'}`}>
            {error
              ? 'Please enter a valid email address.'
              : 'Dev preview — sign-in is simulated locally, no email is sent.'}
          </p>
        </form>
      </motion.div>
    </div>
  )
}
