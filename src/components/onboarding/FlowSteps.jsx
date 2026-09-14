import { useLocation } from 'react-router-dom'
import { loadSession } from '../../state/authStore'

// Where am I, and what comes next?
//
// The journey from the landing page to the app is four screens — the intake
// chat, the result, sign-in, then the app — and nothing on any of them said
// so. Someone finishing the chat landed on a result with a button reading
// "enter your universe" and no way to tell that signing in was the step between
// them and their stack. This rail names all four and marks the current one.
//
// Shown only on the three onboarding screens. The app itself is the last step,
// so it has no rail to show.
const STEPS = [
  { key: 'quiz', label: 'Quiz', match: (p) => p.startsWith('/goal') || p === '/quiz' },
  { key: 'result', label: 'Your result', match: (p) => p.startsWith('/quiz/result') },
  { key: 'signin', label: 'Sign in', match: (p) => p.startsWith('/auth') },
  { key: 'app', label: 'Your app', match: () => false },
]

export default function FlowSteps() {
  const { pathname } = useLocation()
  const current = STEPS.findIndex((s) => s.match(pathname))
  if (current < 0) return null

  // Already signed in means the sign-in step is behind them, whatever screen
  // they are on — a returning user retaking the quiz should not be told they
  // still have to sign in.
  const signedIn = Boolean(loadSession())

  return (
    <nav aria-label="Getting started" className="mx-auto w-full max-w-md px-5">
      <ol className="flex items-center justify-between gap-1">
        {STEPS.map((s, i) => {
          const done = i < current || (s.key === 'signin' && signedIn && current !== i)
          const here = i === current
          return (
            <li key={s.key} className="flex flex-1 items-center gap-1 last:flex-none">
              <span
                className="flex items-center gap-1.5"
                aria-current={here ? 'step' : undefined}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 font-display text-[10px] font-black"
                  style={{
                    background: here ? 'var(--lime)' : done ? 'var(--cyan)' : '#1a1a26',
                    color: here || done ? '#000' : '#64748b',
                    boxShadow: here ? '0 10px 28px -14px rgba(0,0,0,0.7)' : 'none',
                  }}
                  aria-hidden="true"
                >
                  {done ? '✓' : i + 1}
                </span>
                <span
                  className={`whitespace-nowrap font-display text-[10px] font-black uppercase tracking-wider ${
 here ? 'text-white' : done ? 'text-cyan-300' : 'text-slate-500'
 } ${here ? '' : 'hidden sm:inline'}`}
                >
                  {s.label}
                  <span className="sr-only">{here ? ' (current step)' : done ? ' (done)' : ''}</span>
                </span>
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className="mx-1 h-0.5 min-w-3 flex-1 rounded-full"
                  style={{ background: i < current ? 'var(--cyan)' : 'rgba(255,255,255,0.12)' }}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
