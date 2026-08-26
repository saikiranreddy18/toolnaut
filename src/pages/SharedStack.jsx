import { Link, useParams } from 'react-router-dom'
import { getTool, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../utils/toolsCatalog'
import { decodeStackSlugs } from '../utils/shareStack'

// Public, read-only view of someone else's stack. No session, no localStorage
// writes — a stale/renamed slug just quietly drops out instead of crashing.
export default function SharedStack() {
  const { slugs } = useParams()
  const tools = decodeStackSlugs(slugs).map(getTool).filter(Boolean)

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 lg:py-16">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-black" style={{ color: 'var(--lime)' }}>
        ▸ SHARED STACK
      </p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        {tools.length > 0 ? `${tools.length} TOOL${tools.length === 1 ? '' : 'S'}` : 'STACK NOT FOUND'}
      </h1>

      {tools.length === 0 ? (
        <p className="mt-4 max-w-md text-sm text-slate-400">
          This link doesn't point to any tools we recognize — it may be old, or
          mistyped.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const meta = CATEGORY_META[tool.category] || { name: tool.category, color: 'var(--cyan)' }
            return (
              <div key={tool.slug} className="glass rounded-2xl p-5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                  <span className="truncate">{tool.sourceCategory}</span>
                </span>
                <p className="arcade-heading lime mt-2 text-base">{tool.name.toUpperCase()}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{tool.blurb}</p>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                  <span className="rounded-full border border-white/20 px-2 py-0.5">{PRICE_LABELS[tool.price]}</span>
                  <span className="rounded-full border border-white/20 px-2 py-0.5">{LEVEL_LABELS[tool.level]}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Link
        to="/goal"
        className="glow-btn mt-10 inline-block rounded-full bg-gradient-to-r from-exus-purple to-exus-cyan px-7 py-3 font-display text-sm font-semibold text-white"
      >
        Build my own stack
      </Link>
    </div>
  )
}
