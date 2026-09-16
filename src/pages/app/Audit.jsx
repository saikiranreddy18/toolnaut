import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TOOLS, getTool, CATEGORY_META } from '../../utils/toolsCatalog'
import { loadStack } from '../../state/stackStore'
import { loadFavorites } from '../../state/favoritesStore'
import { loadQuiz } from '../../state/quizStore'
import { generatePersona } from '../../utils/personaGenerator'
import { loadSpend, setSpend } from '../../state/auditStore'
import { auditStack } from '../../utils/stackAudit'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { useEntitlement } from '../../hooks/useEntitlement'

// THE SPEND AUDIT — the one screen that tells you to cancel something.
//
// Everything else in Toolnaut adds tools. This subtracts: it takes what the
// person actually pays for, finds the subscriptions that do the same job, picks
// the one that fits THEIR role, and names a free tool that covers the rest.
// The algorithm lives in utils/stackAudit.js; this is only the surface.
//
// NO INVENTED PRICES. The amounts are typed by the user, and a tool with no
// amount is still audited for overlap — it just cannot contribute a saving.
//
// WHAT IS PAID. The headline (health score, how many duplicates, the total you
// are spending) is free: it is the part that has to be true for everyone, and
// it is what makes the case for the plan. The cancel list — which tool to keep,
// which to drop, the free tool that covers it — is the paid part, and only when
// payments are switched on at all.

function Money({ value }) {
  return <span className="tabular-nums">₹{Math.round(value).toLocaleString('en-IN')}</span>
}

function HealthRing({ value }) {
  const r = 52
  const c = 2 * Math.PI * r
  const dash = (Math.max(0, Math.min(100, value)) / 100) * c
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
        <defs>
          <linearGradient id="health-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a5b4fc" />
            <stop offset="0.5" stopColor="#f0abfc" />
            <stop offset="1" stopColor="#7dd3fc" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke="url(#health-grad)" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-semibold text-white">{value}</span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Health</span>
      </div>
    </div>
  )
}

export default function Audit() {
  const track = useAnalytics()
  const ent = useEntitlement()
  const paymentsOn = import.meta.env.VITE_PAYMENTS_ENABLED === 'true'

  const quiz = loadQuiz()
  const answers = quiz.completed ? quiz.answers : null
  const persona = quiz.completed ? generatePersona(quiz.answers) : null

  // The tools we already know about: the starter stack from the quiz, anything
  // added to the stack, and saved tools. The person can add more by name.
  const known = useMemo(() => {
    const slugs = new Set([
      ...(persona?.stack || []).map((t) => t.slug),
      ...loadStack(),
      ...loadFavorites(),
    ])
    return [...slugs].map(getTool).filter(Boolean)
  }, [persona])

  const [spend, setSpendState] = useState(loadSpend)
  const [extra, setExtra] = useState([])
  const [query, setQuery] = useState('')
  const [ran, setRan] = useState(false)

  const tools = useMemo(() => {
    const seen = new Set()
    return [...known, ...extra].filter((t) => {
      if (!t || seen.has(t.slug)) return false
      seen.add(t.slug)
      return true
    })
  }, [known, extra])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const have = new Set(tools.map((t) => t.slug))
    return TOOLS.filter((t) => !have.has(t.slug) && t.name.toLowerCase().includes(q)).slice(0, 6)
  }, [query, tools])

  const report = useMemo(
    () => auditStack(tools.map((t) => ({ slug: t.slug, monthly: spend[t.slug] })), { answers }),
    [tools, spend, answers],
  )

  function priceChanged(slug, value) {
    setSpendState(setSpend(slug, value))
  }

  function run() {
    setRan(true)
    track(EVENTS.CTA_CLICK, {
      cta: 'run_spend_audit',
      tools: report.toolCount,
      duplicates: report.duplicates.length,
    })
  }

  // The cancel list is the paid part — but only once payments exist at all.
  const locked = paymentsOn && !ent.loading && !ent.unknown && ent.configured && !ent.active

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.22em] cosmic-text">Spend audit</p>
      <h1 className="arcade-heading mt-3 text-4xl sm:text-5xl">
        What are you paying twice for?
      </h1>
      <p className="mt-4 max-w-2xl text-zinc-400">
        Tell us what each AI tool costs you a month. Toolnaut compares what they actually do,
        keeps the one that fits your role, and shows the ones you can cancel. Your amounts stay
        in this browser.
      </p>

      {/* --- the tools and their prices --- */}
      <div className="sticker mt-8 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-white">Your paid tools</h2>
          <p className="text-sm text-zinc-400">
            {report.toolCount} tools · <Money value={report.monthlyTotal} /> a month
          </p>
        </div>

        {tools.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">
            Nothing here yet. <Link to="/app/discover" className="text-white underline underline-offset-4">Add the tools you use</Link>,
            or search for them below.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-white/5">
            {tools.map((t) => (
              <li key={t.slug} className="flex flex-wrap items-center gap-3 py-2.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: CATEGORY_META[t.category]?.color || '#a1a1aa' }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{t.name}</span>
                <span className="text-[11px] uppercase tracking-wider text-zinc-600">{t.price || 'unpriced'}</span>
                <label className="flex items-center gap-1.5 text-sm text-zinc-400">
                  <span className="sr-only">Monthly cost of {t.name}</span>
                  <span aria-hidden="true">₹</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={spend[t.slug] ?? ''}
                    onChange={(e) => priceChanged(t.slug, e.target.value)}
                    placeholder="0"
                    className="w-24 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-right text-sm text-white outline-none"
                  />
                  <span className="text-xs text-zinc-600">/mo</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5">
          <label htmlFor="audit-search" className="sr-only">Add a tool you pay for</label>
          <input
            id="audit-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add a tool you pay for…"
            className="w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600"
          />
          {matches.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {matches.map((t) => (
                <li key={t.slug}>
                  <button
                    type="button"
                    onClick={() => { setExtra((x) => [...x, t]); setQuery('') }}
                    className="arcade-chip press min-h-8 cursor-pointer"
                  >
                    + {t.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="button" onClick={run} className="nb-btn mt-6 px-6 py-2.5 text-sm" disabled={!tools.length}>
          Run the audit
        </button>
      </div>

      {/* --- the report --- */}
      {ran && tools.length > 0 && (
        <>
          <div className="sticker mt-6 flex flex-wrap items-center gap-8 p-6">
            <HealthRing value={report.health} />
            <div className="min-w-[240px] flex-1">
              <p className="text-sm text-zinc-400">You could stop paying</p>
              <p className="font-display text-4xl font-semibold text-white">
                <Money value={report.monthlySaving} /><span className="text-base font-normal text-zinc-500"> /month</span>
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                <Money value={report.annualSaving} /> a year · {report.redundantCount} of your {report.toolCount} tools
                overlap with one you already pay for
              </p>
              {report.monthlySaving === 0 && (
                <p className="mt-3 text-sm text-zinc-500">
                  {report.duplicates.length > 0
                    ? 'Add what those tools cost you and the saving appears here.'
                    : 'Nothing overlapping. This stack is doing its job.'}
                </p>
              )}
            </div>
          </div>

          {locked ? (
            <div className="sticker mt-6 p-6">
              <h2 className="font-display text-lg font-semibold text-white">
                {report.duplicates.length} overlapping {report.duplicates.length === 1 ? 'subscription' : 'subscriptions'} found
              </h2>
              <p className="mt-2 max-w-xl text-sm text-zinc-400">
                The cancel list — which one to keep for your role, which to drop, and the free tool that
                covers the rest — comes with a plan.
              </p>
              <Link to="/pay" className="nb-btn mt-5 inline-block px-6 py-2.5 text-sm">See plans</Link>
            </div>
          ) : (
            <>
              {report.duplicates.map((d) => (
                <div key={d.keeper.slug} className="sticker mt-6 p-6">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] cosmic-text">Overlapping</p>
                  <h2 className="mt-2 font-display text-lg font-semibold text-white">
                    Keep {d.keeper.name}
                    {d.keeperFit !== null && <span className="ml-2 text-sm font-normal text-zinc-500">{d.keeperFit}% fit for your role</span>}
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {d.drop.map((x) => (
                      <li key={x.tool.slug} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <span className="min-w-0 flex-1">
                          <Link to={`/app/tools/${x.tool.slug}`} className="text-sm text-white underline-offset-4 hover:underline">{x.tool.name}</Link>
                          <span className="ml-2 text-xs text-zinc-500">does {x.overlap}% of the same job</span>
                        </span>
                        <span className="text-sm text-zinc-300">
                          {x.monthly > 0 ? <><Money value={x.monthly} />/mo</> : 'no price set'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {report.freeSwaps.length > 0 && (
                <div className="sticker mt-6 p-6">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] cosmic-text">Free cover</p>
                  <h2 className="mt-2 font-display text-lg font-semibold text-white">A free tool does most of this</h2>
                  <ul className="mt-4 space-y-3">
                    {report.freeSwaps.map((s) => (
                      <li key={s.tool.slug} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <span className="min-w-0 flex-1 text-sm text-zinc-200">
                          {s.tool.name} <span className="text-zinc-500">→</span>{' '}
                          <Link to={`/app/tools/${s.alternative.slug}`} className="text-white underline-offset-4 hover:underline">{s.alternative.name}</Link>
                          <span className="ml-2 text-xs text-zinc-500">{s.overlap}% overlap · {s.alternative.price}</span>
                        </span>
                        {s.monthly > 0 && <span className="text-sm text-zinc-300"><Money value={s.monthly} />/mo</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs text-zinc-500">
                    Free and freemium tools have limits. Check the free tier covers your volume before you cancel anything.
                  </p>
                </div>
              )}

              {report.duplicates.length === 0 && report.freeSwaps.length === 0 && (
                <div className="sticker mt-6 p-6">
                  <h2 className="font-display text-lg font-semibold text-white">Nothing to cut</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    No two tools here do the same job, and nothing free covers what you pay for.
                    Run this again whenever you add a subscription.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
