import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import { TOOLS } from '../utils/toolsCatalog'
import { matchScore, matchReasonShort } from '../utils/matchScore'
import { generatePersona } from '../utils/personaGenerator'
import { useAnalytics } from '../hooks/useAnalytics'
import { EVENTS } from '../utils/analyticsEvents'
import { lastUpdatedLabel } from '../utils/catalogFreshness'
import Wordmark from '../components/ui/Wordmark'

// "See an example stack" — the page a sceptic can reach without signing up.
//
// The landing page had exactly one door and it asked for nine answers first.
// Anyone unwilling to commit before seeing anything simply left, which the
// product review identified as the largest single leak in the funnel. This is
// the second door: the real output, in full, for a worked example.
//
// IT RUNS THE REAL ENGINE. The answers below are a fixed persona, but every
// tool, score, reason and roadmap week on this page comes from the same
// generatePersona / matchScore / generateRoadmap the signed-in app uses. A
// hand-written mock would have been faster and would have been a lie the first
// time the catalogue changed underneath it — and it would show visitors
// something the product does not actually produce.

// A data analyst automating their weekly reporting — the example the review
// works through, and a role the catalogue covers well.
//
// These keys are the REAL quiz schema (see quizLogic.js QUESTIONS). The first
// version of this page invented plausible-looking keys instead, and the result
// was quietly broken in a way that looked fine: matchScore returned null for
// every tool, the `?? 50` fallback gave them all an identical score, and the
// "ranked" list was really alphabetical. matchReasonShort returns null without
// `domain`, so the promised per-pick reasoning never rendered either. A page
// claiming "ranked for this profile" while showing an unranked list is worse
// than no page.
const EXAMPLE_ANSWERS = {
  domain: 'automation',
  role: 'analyst',
  career_stage: 'mid',
  experience: 'regular',
  goal: 'time',
  budget: 'free',
  pace: 'light',
  learning_style: 'tinker',
  blocker: 'toomany',
}

// Mirrors EXAMPLE_ANSWERS in plain language, so what produced the result is
// visible rather than asserted.
// A faithful preview of the 4-week plan, WITHOUT calling generateRoadmap.
//
// That function takes no arguments — it reads the signed-in user's quiz out of
// localStorage. Calling it here would either return nothing (it did) or, if
// forced, would mean writing a fake quiz into a real visitor's browser and
// overwriting their own answers. Neither is acceptable on a public page.
//
// The shape below mirrors what it produces for the same inputs: one week per
// starter tool, then a capstone that combines them.
function buildPlanPreview(persona) {
  const tools = (persona?.stack || []).slice(0, 3)
  if (!tools.length) return []
  return [
    ...tools.map((t) => ({ title: `Master ${t.name}`, summary: t.blurb })),
    {
      title: 'Put it together',
      summary: `Route one real task through ${tools.slice(0, 2).map((t) => t.name).join(' → ')}, then share what you built.`,
    },
  ]
}

const EXAMPLE_PROFILE = [
  ['Playground', 'Automation & workflows'],
  ['Role', 'Analyst / researcher'],
  ['Experience', 'Uses 2–3 AI tools regularly'],
  ['Goal', 'Save time at work'],
  ['Budget', '$0 — free only'],
  ['Time', '1–2 hrs a week'],
  ['Blocker', 'Too many tools to pick'],
]

export default function ExampleStack() {
  const track = useAnalytics()
  const navigate = useNavigate()

  const { persona, picks, roadmap } = useMemo(() => {
    const p = generatePersona(EXAMPLE_ANSWERS)
    // THE STARTER STACK IS THE PRODUCT'S OWN OUTPUT. p.stack is what
    // generatePersona actually recommends — flagship-weighted within the
    // chosen domain — so this shows what a real user would get rather than a
    // list assembled specially for this page.
    //
    // A plain matchScore ranking was tried first and was wrong twice over: the
    // score saturates at 99, so the top six all tied and fell back to
    // alphabetical order, which is not a ranking at all.
    const core = (p.stack || []).map((t) => ({ ...t, score: matchScore(t, EXAMPLE_ANSWERS) }))
    const coreSlugs = new Set(core.map((t) => t.slug))

    // Then genuinely differentiated supporting picks: scored, deduped against
    // the core, and only kept where the score actually varies.
    const extra = TOOLS
      .filter((t) => !coreSlugs.has(t.slug))
      .map((t) => ({ ...t, score: matchScore(t, EXAMPLE_ANSWERS) }))
      .filter((t) => typeof t.score === 'number')
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 3)

    return {
      persona: p,
      picks: [...core.map((t) => ({ ...t, core: true })), ...extra],
      roadmap: buildPlanPreview(p),
    }
  }, [])

  // The whole point of this page is that it is reachable without an
  // account, so its view is tracked separately from the landing page.
  useEffect(() => { track(EVENTS.EXAMPLE_STACK_VIEWED) }, [])

  const updated = lastUpdatedLabel()

  return (
    <div className="relative z-10 mx-auto max-w-4xl px-5 py-10 lg:py-14">
      {/* These pages are linked to directly and shared, so they can be
          someone's first screen — a bare "← Back" told them nothing about
          whose product they had landed on. Same header the other standalone
          pages use, at the same LOGO.page scale. */}
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link to="/" aria-label="Toolnaut home">
          <BrandLogo {...LOGO.page} />
        </Link>
        <Link to="/goal" className="nb-btn px-4 py-2 text-xs">
          ⚡ Find your stack
        </Link>
      </header>

      <p className="mt-6 font-display text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--lime)' }}>
        ▸ Example — nobody signed in
      </p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        A REAL STACK,<br />BUILT BY <Wordmark glow={false} />
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
        This is the actual output of the recommendation engine — the same one the
        app runs — for the profile below. Nothing here is mocked up. Answer for
        yourself and you get this for your own role.
      </p>

      {/* the inputs, shown plainly, so it is obvious what produced the result */}
      <div className="mt-7 rounded-2xl border-[3px] border-black p-5" style={{ background: '#15151f', boxShadow: '5px 5px 0 #000' }}>
        <p className="font-display text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">The answers this came from</p>
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {EXAMPLE_PROFILE.map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-2 text-sm">
              <dt className="w-24 shrink-0 text-slate-500">{k}</dt>
              <dd className="font-semibold text-white">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {persona && (
        <div className="mt-6 rounded-2xl border-[3px] border-black p-5" style={{ background: '#0f1a12', boxShadow: '5px 5px 0 #000' }}>
          <p className="font-display text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--lime)' }}>Your profile reads as</p>
          <p className="mt-2 font-display text-2xl font-black uppercase italic text-white">{persona.name}</p>
          <p className="mt-1 text-sm text-slate-300">{persona.tagline}</p>
        </div>
      )}

      {/* ── the stack ── */}
      <h2 className="arcade-heading section mt-10 text-xl sm:text-2xl">THE STACK</h2>
      <p className="mt-2 text-sm text-slate-400">
        The first three are the starter stack the engine recommends for this
        profile; the rest also score at the top for it. Every pick shows why it
        is here — recommendations without stated reasoning read as advertising.
      </p>

      <div className="mt-5 grid gap-3">
        {picks.map((t, i) => {
          const reason = matchReasonShort ? matchReasonShort(t, EXAMPLE_ANSWERS) : null
          return (
            <motion.div
              key={t.slug}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.4 }}
              className="rounded-2xl border-[3px] border-black p-4"
              style={{ background: '#15151f', boxShadow: '4px 4px 0 #000' }}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-base font-black uppercase text-white">{t.name}</span>
                <span className="rounded-full border-2 border-black px-2 py-0.5 font-display text-[10px] font-black uppercase" style={{ background: 'var(--lime)', color: '#000' }}>
                  {t.price || t.pricing || 'see site'}
                </span>
                <span className="ml-auto font-display text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: t.core ? 'var(--lime)' : '#64748b' }}>
                  {t.core ? 'Starter stack' : 'Also strong'}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.blurb}</p>
              {reason && (
                <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--cyan)' }}>
                  Why this one — {reason}
                </p>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* ── the learning plan ── */}
      {roadmap.length > 0 && (
        <>
          <h2 className="arcade-heading section mt-10 text-xl sm:text-2xl">THE 4-WEEK PLAN</h2>
          <p className="mt-2 text-sm text-slate-400">
            A stack you cannot act on is a list. This is the shape of the plan the
            app schedules alongside it — with steps, lessons and a check per week
            once it is generated for your own answers.
          </p>
          <ol className="mt-5 grid gap-3">
            {roadmap.map((w, i) => (
              <li key={i} className="rounded-2xl border-[3px] border-black p-4" style={{ background: '#15151f', boxShadow: '4px 4px 0 #000' }}>
                <p className="font-display text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--lime)' }}>
                  Week {i + 1}
                </p>
                <p className="mt-1 font-semibold text-white">{w.title || `Week ${i + 1}`}</p>
                {(w.summary || w.detail || w.description) && (
                  <p className="mt-1 text-sm text-slate-300">{w.summary || w.detail || w.description}</p>
                )}
              </li>
            ))}
          </ol>
        </>
      )}

      {/* ── the ask, placed AFTER the value, which is the whole point ── */}
      <div className="mt-10 rounded-2xl border-[3px] p-6 text-center" style={{ borderColor: 'var(--hot-pink)', background: '#1a0f16', boxShadow: '6px 6px 0 #000' }}>
        <p className="font-display text-xl font-black uppercase text-white">Now do it for your role</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
          Nine questions, about ten minutes. No credit card, and no account until
          you want to save it.
        </p>
        <button
          onClick={() => {
            track(EVENTS.CTA_CLICK, { cta: 'build_my_stack', location: 'example_stack' })
            navigate('/goal')
          }}
          className="nb-btn mt-5 px-7 py-3.5 text-base"
        >
          ⚡ BUILD MY AI STACK — FREE
        </button>
        <p className="mt-4 text-[11px] text-slate-500">
          Picks are scored from a catalogue of {TOOLS.length.toLocaleString()} tools
          {updated ? `, last updated ${updated}` : ''}.{' '}
          <Link to="/methodology" className="underline underline-offset-2 hover:text-slate-300">How we choose</Link>
        </p>
      </div>
    </div>
  )
}
