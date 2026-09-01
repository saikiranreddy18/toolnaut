import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadSession, signOut } from '../../state/authStore'
import { loadQuiz, resetQuiz } from '../../state/quizStore'
import { loadStack } from '../../state/stackStore'
import { loadFavorites } from '../../state/favoritesStore'
import { loadProgress } from '../../state/progressStore'
import { loadStreak } from '../../state/streakStore'
import { loadRoadmapProgress, milestoneComplete } from '../../state/roadmapStore'
import { loadTheme, setTheme, THEMES } from '../../state/themeStore'
import { loadMoon, setMoon, MOONS } from '../../state/moonStore'
import { CURSOR_CHOICES, CURSOR_SIZES, loadCursor, setCursor } from '../../state/cursorStore'
import { generatePersona } from '../../utils/personaGenerator'
import { generateRoadmap } from '../../utils/roadmapGenerator'
import { getTool } from '../../utils/toolsCatalog'
import { QUESTIONS } from '../../utils/quizLogic'
import { myStanding } from '../../utils/communityStats'
import { SEEDED } from '../../utils/communityStats'
import { haptic } from '../../utils/haptics'
import SkillGraph from '../../components/app/SkillGraph'
import Avatar from '../../components/app/Avatar'
import AvatarPicker from '../../components/app/AvatarPicker'
import BillingCard from '../../components/app/BillingCard'
import { loadAvatar } from '../../state/avatarStore'

// ME — the control centre.
//
// This page used to be four lines: a name, a plan, retake-quiz, sign-out. It
// was the only screen in the product that knew nothing about the person using
// it, which is backwards for the one page named after them.
//
// It now answers "what does Toolnaut know about me, and what of that can I
// change?" — because every recommendation on every other screen is derived from
// the nine answers shown here, and that link was invisible.
//
// Everything on this page is read from state the app really keeps. There are no
// invented achievements and no fabricated activity: where there is no data yet,
// the card says so and points at the action that creates it.

function StatTile({ label, value, sub, to }) {
  const inner = (
    <>
      <p className="font-display text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="arcade-heading mt-1 text-3xl" style={{ color: 'var(--lime)' }}>{value}</p>
      {sub && <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{sub}</p>}
    </>
  )
  if (!to) return <div className="sticker p-4">{inner}</div>
  return (
    <Link to={to} className="sticker block p-4">
      {inner}
    </Link>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const session = loadSession()
  const quiz = loadQuiz()
  const persona = quiz.completed ? generatePersona(quiz.answers) : null

  const [theme, setThemeState] = useState(loadTheme)
  const [moon, setMoonState] = useState(loadMoon)
  const [avatarId, setAvatarId] = useState(loadAvatar)

  const stats = useMemo(() => {
    const stackSlugs = loadStack()
    const saved = loadFavorites()
    const progress = loadProgress()
    const streak = loadStreak()
    const roadmapProgress = loadRoadmapProgress()
    const roadmap = generateRoadmap()
    const milestones = roadmap?.milestones || []

    const addedTools = stackSlugs.map(getTool).filter(Boolean)
    const starter = persona?.stack || []
    const starterNames = new Set(starter.map((t) => t.name))
    const allTools = [...starter, ...addedTools.filter((t) => !starterNames.has(t.name))]

    const totalSteps = milestones.reduce((n, m) => n + m.steps.length, 0)
    const doneSteps = Object.keys(roadmapProgress).filter(
      (k) => !k.endsWith(':quiz') && milestones.some((m) => m.steps.some((_, i) => `${m.id}:${i}` === k)),
    ).length
    const weeksCleared = milestones.filter((m) => milestoneComplete(roadmapProgress, m)).length

    return {
      allTools,
      progress,
      savedCount: saved.length,
      streakDays: streak.count,
      daysLogged: streak.days.length,
      doneSteps,
      totalSteps,
      weeksCleared,
      totalWeeks: milestones.length,
      mastered: allTools.filter((t) => progress[t.name] === 3).length,
    }
  }, [persona])

  const standing = useMemo(() => myStanding(), [])

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  function handleRetake() {
    resetQuiz()
    navigate('/goal')
  }

  const [cursor, setCursorState] = useState(loadCursor)
  function pickCursor(next) {
    haptic.tap()
    setCursorState(setCursor(next))
  }

  function pickTheme(id) {
    haptic.tap()
    setThemeState(setTheme(id))
  }

  function pickMoon(id) {
    haptic.tap()
    setMoonState(setMoon(id))
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:py-10 xl:max-w-6xl">
      <p className="font-display text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--lime)' }}>▸ ME</p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">YOUR CONTROL CENTER</h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300">
        Everything Toolnaut knows about you, and every dial that changes what it
        recommends.
      </p>

      {/* ── WHO YOU ARE ─────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="arcade-heading section text-xl sm:text-2xl">WHO YOU ARE</h2>
        {persona ? (
          <div className="sticker mt-4 flex flex-wrap items-start gap-5 p-5">
            <div className="shrink-0">
              {avatarId ? (
                <Avatar id={avatarId} size={84} />
              ) : (
                <div
                  className="grid h-[84px] w-[84px] place-items-center rounded-full font-display text-3xl font-black text-black"
                  style={{ background: 'var(--lime)', border: '5px solid #12131b' }}
                  aria-hidden="true"
                >
                  {(session?.user.name || 'E').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
            <span className="arcade-chip on" style={{ fontSize: 10 }}>Persona</span>
            <p className="arcade-heading lime mt-3 text-2xl">{persona.name.toUpperCase()}</p>
            <p className="mt-2 font-display text-sm font-bold italic text-white">{persona.tagline}</p>
            {persona.career && (
              <p className="mt-2 text-sm text-slate-400">
                {persona.career} · home category{' '}
                <Link
                  to={`/app/discover?cat=${persona.category.id}`}
                  className="font-bold underline underline-offset-2"
                  style={{ color: 'var(--lime)' }}
                >
                  {persona.category.name}
                </Link>
              </p>
            )}
            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              This persona is what ranks all your tools, picks your starter stack
              and writes your 4-week path. Change the answers below and all three
              change with it.
            </p>
            </div>
          </div>
        ) : (
          <div className="sticker cyan mt-4 p-5">
            <p className="arcade-heading lime compact text-lg">◆ NO PERSONA YET</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Without one, tools are listed but not scored, and there is no
              roadmap to follow. Nine questions fixes that.
            </p>
            <Link to="/goal" className="nb-btn cyan mt-4 inline-block min-h-11 px-4 py-2.5 text-xs">
              TAKE THE 60-SECOND QUIZ
            </Link>
          </div>
        )}
      </section>

      {/* Self-contained cards below the persona: one column until xl, then
          two, so a wide screen stops running a 768px ribbon down its middle.
          break-inside-avoid keeps a card from splitting across the columns. */}
      <div className="xl:mt-10 xl:columns-2 xl:gap-8">

      {/* ── WHAT YOU HAVE DONE ──────────────────────────────────────── */}
      {/* Explorer avatar — the profile had no face at all, so the sidebar and
          this page both fell back to a name string. */}
      <section className="mt-10 xl:mt-0 xl:mb-8 xl:break-inside-avoid">
        <h2 className="arcade-heading section text-xl sm:text-2xl">YOUR EXPLORER</h2>
        <p className="mt-2 max-w-lg text-sm text-slate-400">
          Sixteen of the crew. Your pick shows here and in the sidebar — tap the
          one you have chosen again to go back to your initial.
        </p>
        <div className="sticker mt-4 p-5">
          <AvatarPicker onChange={setAvatarId} />
        </div>
      </section>

      <section className="mt-10 xl:mt-0 xl:mb-8 xl:break-inside-avoid">
        <h2 className="arcade-heading section text-xl sm:text-2xl">WHAT YOU HAVE DONE</h2>
        <p className="mt-2 text-sm text-slate-400">
          Counted from this browser. Tap any tile to go where it changes.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile
            label="In stack"
            value={stats.allTools.length}
            sub={stats.mastered > 0 ? `${stats.mastered} mastered` : 'tools'}
            to="/app/stack"
          />
          <StatTile label="Saved" value={stats.savedCount} sub="shortlist" to="/app/favorites" />
          <StatTile
            label="Roadmap"
            value={stats.totalSteps > 0 ? `${stats.doneSteps}/${stats.totalSteps}` : '—'}
            sub={stats.totalWeeks > 0 ? `${stats.weeksCleared} of ${stats.totalWeeks} weeks` : 'no path yet'}
            to="/app/learning"
          />
          <StatTile
            label="Streak"
            value={stats.streakDays}
            sub={`${stats.daysLogged} day${stats.daysLogged === 1 ? '' : 's'} logged`}
          />
        </div>

        {persona && stats.allTools.length > 0 && (
          <div className="mt-4">
            <SkillGraph tools={stats.allTools} progress={stats.progress} />
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Rank <span className="font-black text-slate-300">#{standing.rank.toLocaleString()}</span> ·
          score <span className="font-black text-slate-300">{standing.score.toLocaleString()}</span>.
          Your score is computed from the numbers above.
          {SEEDED && ' The explorers you are ranked against are placeholders until accounts land.'}{' '}
          <Link to="/app/community" className="font-bold underline underline-offset-2" style={{ color: 'var(--lime)' }}>
            See the board
          </Link>
        </p>
      </section>

      {/* ── WHAT TOOLNAUT KNOWS ─────────────────────────────────────── */}
      {persona && (
        <section className="mt-10 xl:mt-0 xl:mb-8 xl:break-inside-avoid">
          <h2 className="arcade-heading section text-xl sm:text-2xl">WHAT TOOLNAUT KNOWS</h2>
          <p className="mt-2 max-w-lg text-sm text-slate-400">
            Your nine answers. Each one feeds a specific part of the product —
            this is the whole input, there is nothing hidden behind it.
          </p>
          <dl className="sticker mt-4 divide-y divide-white/10 p-5">
            {QUESTIONS.map((question) => {
              const answerKey = quiz.answers[question.id]
              const option = question.options.find((o) => o.key === answerKey)
              return (
                <div key={question.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                  {/* min-w-0 + a max on the value: without both, a long label
                      ("Break it to learn it", "Too many tools to pick from")
                      overflowed the card instead of wrapping, and the answer
                      was clipped at the edge in the two-column layout. */}
                  <dt className="min-w-0 flex-1 text-xs text-slate-400">{question.text}</dt>
                  <dd className="min-w-0 max-w-[60%] text-right font-display text-xs font-black uppercase tracking-wide" style={{ color: option ? 'var(--lime)' : '#6b6690' }}>
                    {option ? option.label : 'Not answered'}
                  </dd>
                </div>
              )
            })}
          </dl>
          <button onClick={handleRetake} className="nb-btn cyan mt-4 min-h-11 px-4 py-2.5 text-xs">
            UPDATE MY ANSWERS
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Retaking rebuilds your persona, starter stack and roadmap. Saved tools
            and tools you added yourself are kept; roadmap ticks are cleared,
            because the new path has different steps.
          </p>
        </section>
      )}

      {/* ── SKY SETTINGS ────────────────────────────────────────────── */}
      <section className="mt-10 xl:mt-0 xl:mb-8 xl:break-inside-avoid">
        <h2 className="arcade-heading section text-xl sm:text-2xl">SKY SETTINGS</h2>
        <p className="mt-2 text-sm text-slate-400">
          Applies everywhere, saved to this browser.
        </p>

        <div className="sticker pink mt-4 p-5">
          <fieldset>
            <legend className="font-display text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Play mode
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pickTheme(t.id)}
                  aria-pressed={theme === t.id}
                  className={`arcade-chip press min-h-11 cursor-pointer ${theme === t.id ? 'on' : ''}`}
                >
                  <span className="mr-1.5 inline-flex gap-0.5 align-middle" aria-hidden="true">
                    {t.swatch.map((c) => (
                      <span key={c} className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c, border: '1px solid #000' }} />
                    ))}
                  </span>
                  {t.name}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="font-display text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Moonlight
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {MOONS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => pickMoon(m.id)}
                  aria-pressed={moon === m.id}
                  className={`arcade-chip press min-h-11 cursor-pointer ${moon === m.id ? 'on' : ''}`}
                >
                  <span className="mr-1.5" aria-hidden="true">{m.icon}</span>
                  {m.name} — {m.hint}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Applies the moment it's clicked — CursorStars listens for the
              store's change event, so this section IS the live preview: pick
              one and move the mouse. Desktop-pointer only; on touch devices
              the harness never mounts a canvas, so the setting is honest about
              being a desktop thing rather than silently doing nothing. */}
          <fieldset className="mt-5">
            <legend className="font-display text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Cursor effect — move your mouse to preview
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {CURSOR_CHOICES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pickCursor({ effect: c.id })}
                  aria-pressed={cursor.effect === c.id}
                  className={`arcade-chip press min-h-11 cursor-pointer ${cursor.effect === c.id ? 'on' : ''}`}
                >
                  <span className="mr-1.5" aria-hidden="true">{c.icon}</span>
                  {c.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Shown on devices with a mouse or trackpad. Turned off automatically
              when your system asks for reduced motion.
            </p>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="font-display text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Effect size
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {CURSOR_SIZES.map((sz) => (
                <button
                  key={sz.id}
                  onClick={() => pickCursor({ size: sz.id })}
                  aria-pressed={cursor.size === sz.id}
                  disabled={cursor.effect === 'off'}
                  className={`arcade-chip press min-h-11 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${cursor.size === sz.id ? 'on' : ''}`}
                >
                  {sz.name}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      {/* ── ACCOUNT ─────────────────────────────────────────────────── */}
      <section className="mt-10 xl:mt-0 xl:mb-8 xl:break-inside-avoid">
        <h2 className="arcade-heading section text-xl sm:text-2xl">ACCOUNT</h2>
        {/* /app is open to guests, so this card has to answer "am I signed in?"
            rather than assume it. The guest copy names the real trade-off —
            one browser, no server copy — instead of nagging. */}
        {!session ? (
          <div className="sticker mt-4 p-5">
            <p className="text-sm leading-relaxed text-slate-300">
              You are browsing as a guest. Everything you build — your stack,
              shortlist, roadmap progress and streak — is saved to this browser
              and nowhere else.
            </p>
            <Link to="/auth/login?next=/app/settings" className="nb-btn mt-4 inline-block min-h-11 px-5 py-2.5 text-xs">
              SIGN IN →
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Signing in does not sync anything yet — there is no server copy of
              your stack. It reserves your account for when there is.
            </p>
          </div>
        ) : (
        <div className="sticker mt-4 p-5">
          <dl className="divide-y divide-white/10">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5 first:pt-0">
              <dt className="text-xs text-slate-400">Signed in as</dt>
              <dd className="font-display text-xs font-black uppercase tracking-wide text-white">
                {session?.user.name}
              </dd>
            </div>
            {session?.user.email && (
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5">
                <dt className="text-xs text-slate-400">Email</dt>
                <dd className="text-xs font-bold text-white">{session.user.email}</dd>
              </div>
            )}
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5">
              <dt className="text-xs text-slate-400">Method</dt>
              <dd className="font-display text-xs font-black uppercase tracking-wide text-white">
                {session?.user.provider}
                {session?.simulated && ' · simulated (dev preview)'}
              </dd>
            </div>
            {/* The plan row moved to BILLING below — user_entitlements is the
                authority now, and a static "free public beta" here would lie
                to the first person who actually pays. */}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Your stack, shortlist and progress live in this browser only — there
            is no server copy yet, so clearing site data clears them.
          </p>
        </div>
        )}
      </section>

      {/* Billing — spec step 7 of the payment pipeline: current plan and
          payment history, shown only to signed-in accounts (guests have
          nothing to bill and the ACCOUNT card already explains their state). */}
      {session && (
        <section className="mt-10 xl:mt-0 xl:mb-8 xl:break-inside-avoid">
          <h2 className="arcade-heading section text-xl sm:text-2xl">BILLING</h2>
          <BillingCard session={session} />
        </section>
      )}

      {/* destructive action — visually separated per nav guidelines */}
      </div>

      {session && (
        <div className="mt-10 border-t-2 border-white/10 pt-6">
          <button onClick={handleSignOut} className="nb-btn pink min-h-11 px-4 py-2.5 text-xs">
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
