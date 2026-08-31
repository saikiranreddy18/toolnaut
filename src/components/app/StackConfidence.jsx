import { useState } from 'react'
import { Link } from 'react-router-dom'
import { saveAnswer } from '../../state/quizStore'
import { stackConfidence } from '../../utils/stackConfidence'

// What Toolnaut knows about this Stack, said in words.
//
// The rule this component enforces at the surface: LOW CERTAINTY BUYS A BETTER
// EXPLANATION AND ONE USEFUL ACTION, never a warning. "Low confidence, we may
// be wrong" tells someone their Stack is bad and gives them nothing to do about
// it. "Starter recommendations — add one detail" says the same thing about the
// system's knowledge without indicting the recommendations, and hands over a
// button.
//
// There is deliberately no percentage anywhere below. The score behind this is
// uncalibrated, and rendering it as "72%" claims a precision we have not
// earned — people either over-trust it or dismiss the Stack entirely.

// What each answered field contributed, in the visitor's words rather than
// ours. Only answered fields appear: this is "what we matched on", so an
// invented entry would be a lie about the basis of the recommendation.
const MATCHED_ON = {
  goal: { time: 'saving time at work', ship: 'shipping a side project', job: 'landing a better job', freelance: 'starting freelancing', lead: 'leading a team' },
  role: { student: 'your student/learner role', developer: 'your developer role', designer: 'your design role', creator: 'your writing/marketing role', founder: 'your founder role', manager: 'your manager role', analyst: 'your analyst role' },
  experience: { beginner: 'starting from scratch with AI', dabbler: 'having tried ChatGPT', regular: 'using a few tools already', builder: 'building with AI', teacher: 'teaching others' },
  domain: { code: 'code and apps', design: 'design and media', writing: 'words and content', data: 'data and insights', automation: 'automation and workflows', learning: 'learning and teaching' },
  budget: { free: 'a $0 budget', low: 'a small budget', mid: 'a mid-range budget', high: 'room to spend', company: 'company-paid tools' },
  blocker: { notime: 'not having enough time', toomany: 'too many tools to choose from', skills: 'a skills gap', cost: 'cost', noplan: 'not having a plan' },
}

const MISSING_LABEL = {
  goal: 'what you want in three months',
  role: 'what you do',
  experience: 'how technical you want it',
  blocker: "what's slowing you down",
  domain: 'the work you do most',
  budget: 'your budget',
}

// The one question worth interrupting for — and only when the answer changes
// which tools are right. Phrased about the people who will USE the workflow,
// not company headcount: a solo founder at a 200-person client is still solo.
const TEAM_SIZES = [
  { key: 'solo', label: 'Just me' },
  { key: 'small', label: '2–10 people' },
  { key: 'mid', label: '11–50 people' },
  { key: 'large', label: '50+ people' },
  { key: 'exploring', label: 'Just exploring' },
]

export default function StackConfidence({ answers, candidateCount, scores, onAnswered }) {
  // Holds its own copy so answering the team question re-labels the card in
  // place. The Stack page reads the quiz once per render and is not stateful
  // about it; making it so just to refresh this card would be a bigger change
  // than the card is worth.
  const [local, setLocal] = useState(answers || {})

  function answerTeam(key) {
    saveAnswer('team_context', key)
    setLocal((a) => ({ ...a, team_context: key }))
    onAnswered?.()
  }

  const c = stackConfidence({ answers: local, candidateCount, scores })

  const matched = Object.entries(MATCHED_ON)
    .map(([field, map]) => map[local?.[field]])
    .filter(Boolean)
    .slice(0, 4)

  return (
    <section aria-labelledby="stack-confidence" className="sticker mt-6 p-4" style={{ transform: 'rotate(0)' }}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="stack-confidence" className="arcade-heading lime compact text-base">
          {c.label}
        </h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{c.copy}</p>

      {matched.length > 0 && (
        <div className="mt-3">
          <p className="font-display text-[10px] font-black uppercase tracking-widest text-slate-400">Built around</p>
          <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-slate-300">
            {matched.map((m) => (
              <li key={m}>· {m}</li>
            ))}
          </ul>
        </div>
      )}

      {c.conflicts.length > 0 && (
        <div className="mt-3">
          <p className="font-display text-[10px] font-black uppercase tracking-widest text-slate-400">Pulling against each other</p>
          <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-slate-300">
            {c.conflicts.map((x) => (
              <li key={x}>· {x}</li>
            ))}
          </ul>
        </div>
      )}

      {/* The team question, asked inline. A refinement the visitor can answer
          where they are beats a link to a form they have to go and find. */}
      {c.key === 'team' && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-xs font-bold text-white">Who will use this workflow?</p>
          <p className="mt-1 text-[11px] text-slate-400">
            This changes pricing, sharing and admin controls — not much else.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {TEAM_SIZES.map((t) => (
              <button
                key={t.key}
                onClick={() => answerTeam(t.key)}
                className="min-h-11 cursor-pointer rounded-full border border-white/[0.12] bg-white/[0.04] px-4 text-xs font-semibold text-slate-200 transition-colors hover:border-[var(--lime)] hover:bg-[var(--lime)] hover:text-black"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Everything we still do not know, named plainly. Someone can only
          calibrate their trust in a Stack if they can see its blind spots. */}
      {c.key !== 'team' && c.missing.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="font-display text-[10px] font-black uppercase tracking-widest text-slate-400">
            Not known yet
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            {c.missing.map((m) => MISSING_LABEL[m]).filter(Boolean).join(' · ')}
          </p>
          <Link to="/goal" className="nb-btn mt-3 inline-flex min-h-11 items-center px-4 text-xs">
            {c.cta.toUpperCase()} →
          </Link>
        </div>
      )}
    </section>
  )
}
