import { Link, useSearchParams } from 'react-router-dom'
import { getTool, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../../utils/toolsCatalog'
import { matchScore, fitBand } from '../../utils/matchScore'
import { loadQuiz } from '../../state/quizStore'
import { loadStack, addToStack, removeFromStack } from '../../state/stackStore'
import { useAnalytics } from '../../hooks/useAnalytics'
import { markActed } from '../../utils/funnel'
import { EVENTS } from '../../utils/analyticsEvents'
import { haptic } from '../../utils/haptics'
import { Fragment, useEffect, useState } from 'react'

// Comparison state lives entirely in the ?tools= query string, same pattern
// as Discover's q/cat/price/level params — no persisted/named comparisons.
export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [stack, setStack] = useState(loadStack)
  const track = useAnalytics()

  // Opening a comparison is itself the qualifying action — there is no
  // later confirm step to hang it on.
  useEffect(() => { markActed(track, 'compare') }, [])

  const quiz = loadQuiz()
  const answers = quiz.completed ? quiz.answers : null

  const slugs = (searchParams.get('tools') || '').split(',').map((s) => s.trim()).filter(Boolean)
  const tools = slugs.map(getTool).filter(Boolean)

  function removeTool(slug) {
    const next = tools.filter((t) => t.slug !== slug).map((t) => t.slug)
    if (next.length === 0) setSearchParams({})
    else setSearchParams({ tools: next.join(',') })
  }

  function toggleStack(tool) {
    if (stack.includes(tool.slug)) {
      setStack(removeFromStack(tool.slug))
    } else {
      haptic.select()
      setStack(addToStack(tool.slug))
      track(EVENTS.CTA_CLICK, { cta: 'add_to_stack', tool: tool.slug, location: 'compare' })
    }
  }

  const rows = [
    { label: 'Category', get: (t) => (CATEGORY_META[t.category] || {}).name || t.category },
    { label: 'Price', get: (t) => `${PRICE_LABELS[t.price]}${t.pricing ? ` — ${t.pricing}` : ''}` },
    { label: 'Level', get: (t) => LEVEL_LABELS[t.level] },
    { label: 'Developer', get: (t) => t.dev || '—' },
    { label: 'Since', get: (t) => t.year || '—' },
    { label: 'Audience', get: (t) => t.audience || '—' },
    { label: 'Status', get: (t) => t.status || '—' },
    { label: 'Tags', get: (t) => (t.tags && t.tags.length > 0 ? t.tags.join(', ') : '—') },
  ]
  if (answers) {
    // Band, not a percentage — see fitBand's note in matchScore.js.
    rows.unshift({ label: 'Fit', get: (t) => fitBand(matchScore(t, answers))?.label || '—' })
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:py-10">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-black" style={{ color: 'var(--lime)' }}>▸ COMPARE</p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        {tools.length > 0 ? `${tools.length} TOOLS SIDE BY SIDE` : 'NOTHING TO COMPARE'}
      </h1>

      {tools.length === 0 ? (
        <div className="mt-8">
          <p className="max-w-md text-sm text-slate-400">
            Pick 2 to 4 tools in FIND and hit “Compare” to see them side by side.
          </p>
          <Link to="/app/discover" className="nb-btn dark mt-5 inline-block px-5 py-2.5 text-xs">
            ← BACK TO FIND
          </Link>
        </div>
      ) : (
        <>
          {/* Table layout — sm and up */}
          <div className="mt-8 hidden overflow-x-auto sm:block">
            <div
              className="grid gap-px"
              style={{ gridTemplateColumns: `10rem repeat(${tools.length}, minmax(11rem, 1fr))` }}
            >
              <div />
              {tools.map((tool) => {
                const meta = CATEGORY_META[tool.category] || { color: 'var(--cyan)' }
                return (
                  <div key={tool.slug} className="sticker flex flex-col p-4">
                    <button
                      onClick={() => removeTool(tool.slug)}
                      aria-label={`Remove ${tool.name} from comparison`}
                      className="cursor-pointer self-end text-xs text-slate-500 hover:text-white"
                    >
                      ✕
                    </button>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                      <span className="truncate">{tool.sourceCategory}</span>
                    </span>
                    <Link to={`/app/tools/${tool.slug}`} className="arcade-heading lime compact mt-2 text-base hover:opacity-80">
                      {tool.name.toUpperCase()}
                    </Link>
                    <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-300">{tool.blurb}</p>
                    <button
                      onClick={() => toggleStack(tool)}
                      className={`nb-btn mt-3 px-3 py-2 text-[10px] ${stack.includes(tool.slug) ? 'dark' : ''}`}
                    >
                      {stack.includes(tool.slug) ? '✓ IN STACK' : '⚡ ADD'}
                    </button>
                  </div>
                )
              })}

              {rows.map((row) => (
                <Fragment key={row.label}>
                  <div className="flex items-center px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {row.label}
                  </div>
                  {tools.map((tool) => (
                    <div
                      key={`${row.label}-${tool.slug}`}
                      className="flex items-center border-t border-white/10 px-3 py-3 text-sm text-white"
                    >
                      {row.get(tool)}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>

          {/* Stacked cards — mobile */}
          <div className="mt-8 flex flex-col gap-5 sm:hidden">
            {tools.map((tool) => {
              const meta = CATEGORY_META[tool.category] || { color: 'var(--cyan)' }
              return (
                <div key={tool.slug} className="sticker p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                      <span className="truncate">{tool.sourceCategory}</span>
                    </span>
                    <button
                      onClick={() => removeTool(tool.slug)}
                      aria-label={`Remove ${tool.name} from comparison`}
                      className="cursor-pointer text-xs text-slate-500 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <Link to={`/app/tools/${tool.slug}`} className="arcade-heading lime compact mt-2 block text-base hover:opacity-80">
                    {tool.name.toUpperCase()}
                  </Link>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">{tool.blurb}</p>
                  <dl className="mt-3 space-y-1.5">
                    {rows.map((row) => (
                      <div key={row.label} className="flex justify-between gap-3 text-xs">
                        <dt className="font-bold uppercase tracking-wider text-slate-500">{row.label}</dt>
                        <dd className="text-right text-slate-200">{row.get(tool)}</dd>
                      </div>
                    ))}
                  </dl>
                  <button
                    onClick={() => toggleStack(tool)}
                    className={`nb-btn mt-4 px-4 py-2 text-xs ${stack.includes(tool.slug) ? 'dark' : ''}`}
                  >
                    {stack.includes(tool.slug) ? '✓ IN STACK' : '⚡ ADD'}
                  </button>
                </div>
              )
            })}
          </div>

          <Link to="/app/discover" className="nb-btn dark mt-8 inline-block px-5 py-2.5 text-xs">
            ← BACK TO FIND
          </Link>
        </>
      )}
    </div>
  )
}
