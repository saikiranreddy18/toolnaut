import { Fragment } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTool, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../utils/toolsCatalog'
import { decodeStackSlugs } from '../utils/shareStack'
import { useHead, SITE } from '../utils/head'

// Public, read-only fork of the authenticated Compare.jsx table — no session,
// no Fit row (there is no quiz context for a stranger landing on this link),
// no add/toggle actions. Same table-building logic, same visual language.
const ROWS = [
  { label: 'Category', get: (t) => (CATEGORY_META[t.category] || {}).name || t.category },
  { label: 'Price', get: (t) => `${PRICE_LABELS[t.price]}${t.pricing ? ` — ${t.pricing}` : ''}` },
  { label: 'Level', get: (t) => LEVEL_LABELS[t.level] },
  { label: 'Developer', get: (t) => t.dev || '—' },
  { label: 'Since', get: (t) => t.year || '—' },
  { label: 'Audience', get: (t) => t.audience || '—' },
  { label: 'Status', get: (t) => (t.status === 'Active' ? 'Active' : `${t.status || '—'}${t.note ? ` (${t.note})` : ''}`) },
  { label: 'Tags', get: (t) => (t.tags && t.tags.length > 0 ? t.tags.join(', ') : '—') },
]

export default function PublicCompare() {
  const { slugs } = useParams()
  const tools = decodeStackSlugs(slugs).map(getTool).filter(Boolean)
  const names = tools.map((t) => t.name)
  const title = names.length >= 2
    ? `${names.slice(0, 2).join(' vs ')}${names.length > 2 ? ` +${names.length - 2} more` : ''} — compared | Toolnaut`
    : `Compare AI tools | Toolnaut`

  useHead(
    tools.length > 0
      ? {
          title,
          description: `Side-by-side comparison of ${names.join(', ')} — category, price, level and more, from Toolnaut's 700+ tool catalog.`,
          path: `/compare/${slugs}`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            numberOfItems: tools.length,
            itemListElement: tools.map((t, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: t.name,
              description: t.blurb,
              url: `${SITE}/app/tools/${t.slug}`,
            })),
          },
        }
      : { path: `/compare/${slugs}` },
  )

  return (
    <div className="mx-auto max-w-5xl px-5 xl:max-w-6xl py-8 lg:py-10">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-black" style={{ color: 'var(--lime)' }}>▸ COMPARE</p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        {tools.length > 0 ? `${tools.length} TOOLS SIDE BY SIDE` : 'NOTHING TO COMPARE'}
      </h1>

      {tools.length === 0 ? (
        <div className="mt-8">
          <p className="max-w-md text-sm text-slate-400">
            This link doesn't point to any tools we recognize — it may be old, or mistyped.
          </p>
          <Link to="/goal" className="nb-btn dark mt-5 inline-block px-5 py-2.5 text-xs">
            ← BUILD MY OWN STACK
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
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                      <span className="truncate">{tool.sourceCategory}</span>
                    </span>
                    <p className="arcade-heading lime compact mt-2 text-base">{tool.name.toUpperCase()}</p>
                    <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-300">{tool.blurb}</p>
                  </div>
                )
              })}

              {ROWS.map((row) => (
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
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                    <span className="truncate">{tool.sourceCategory}</span>
                  </span>
                  <p className="arcade-heading lime compact mt-2 text-base">{tool.name.toUpperCase()}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">{tool.blurb}</p>
                  <dl className="mt-3 space-y-1.5">
                    {ROWS.map((row) => (
                      <div key={row.label} className="flex justify-between gap-3 text-xs">
                        <dt className="font-bold uppercase tracking-wider text-slate-500">{row.label}</dt>
                        <dd className="text-right text-slate-200">{row.get(tool)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )
            })}
          </div>

          <Link
            to="/goal"
            className="glow-btn mt-10 inline-block rounded-full bg-gradient-to-r from-exus-purple to-exus-cyan px-7 py-3 font-display text-sm font-semibold text-white"
          >
            Build my own stack
          </Link>
        </>
      )}
    </div>
  )
}
