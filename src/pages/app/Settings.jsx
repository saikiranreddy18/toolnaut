import { useNavigate } from 'react-router-dom'
import { loadSession, signOut } from '../../state/authStore'
import { resetQuiz } from '../../state/quizStore'
import { planLabel } from '../../utils/planData'

export default function Settings() {
  const navigate = useNavigate()
  const session = loadSession()

  function handleSignOut() {
    signOut()
    navigate('/', { replace: true })
  }

  function handleRetake() {
    resetQuiz()
    navigate('/quiz?step=1')
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 lg:py-10">
      <p className="font-display text-xs font-black uppercase tracking-[0.3em] text-lime-400">▸ Settings</p>
      <h1 className="arcade-heading mt-3 text-3xl">Your Console</h1>

      <div className="sticker mt-10 p-5">
        <span className="arcade-chip on" style={{ fontSize: 10 }}>Profile</span>
        <p className="mt-3 font-display text-base font-black uppercase italic text-white">{session?.user.name}</p>
        <p className="mt-1 text-sm text-slate-400">
          Signed in via {session?.user.provider} · Plan: <span className="font-bold text-cyan-300">{planLabel(session?.plan)}</span>
          {session?.simulated && ' · simulated session (dev preview)'}
        </p>
      </div>

      <div className="sticker pink mt-6 p-5">
        <span className="arcade-chip on" style={{ fontSize: 10 }}>Persona</span>
        <p className="mt-3 text-sm text-slate-400">
          Retaking the quiz rebuilds your persona and starter stack.
        </p>
        <button onClick={handleRetake} className="nb-btn cyan mt-4 px-4 py-2 text-xs">
          Retake the quiz
        </button>
      </div>

      {/* destructive action — visually separated per nav guidelines */}
      <div className="mt-10 border-t-2 border-white/10 pt-6">
        <button onClick={handleSignOut} className="nb-btn pink px-4 py-2 text-xs">
          Sign out
        </button>
      </div>
    </div>
  )
}
