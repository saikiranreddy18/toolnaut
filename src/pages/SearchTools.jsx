import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useHead } from '../utils/head'
import { TOOLS, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../utils/toolsCatalog'
import { matchesQuery } from '../utils/search'
import { encodeStackSlugs } from '../utils/shareStack'

const RESULT_CAP = 60

// Public, crawlable, no session required — every other "type a keyword" path
// (Discover's search box) sits behind AppShell's login wall. This answers the
// single most obvious thing a first-time visitor expects from a tool
// directory: "does Toolnaut have X," with no quiz and no sign-in required.
export default function SearchTools() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const trimmed = q.trim()

  const results = useMemo(() => {
    if (!trimmed) return []
    return TOOLS.filter((tool) => matchesQuery(tool, trimmed))
  }, [trimmed])

  // Categories guaranteed to lead somewhere, same escape-route pattern
  // Discover.jsx's own empty state already uses.
  const suggestedCats = useMemo(
    () => Object.entries(CATEGORY_META).filter(([id]) => TOOLS.some((t) => t.category === id)).slice(0, 6),
    [],
  )

  useHead(
    trimmed
      ? {
          title: `"${trimmed}" — AI tool search results — Toolnaut`,
          description: `${results.length} AI tool${results.length === 1 ? '' : 's'} matching "${trimmed}" in Toolnaut's catalog of ${TOOLS.length}+ AI tools.`,
          path: '/search',
        }
      : {
          title: 'Search AI tools — Toolnaut',
          description: `Search Toolnaut's catalog of ${TOOLS.length}+ AI tools by name, category, or use case.`,
          path: '/search',
        },
  )

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:py-16">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-black" style={{ color: 'var(--lime)' }}>▸ SEARCH</p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">FIND AN AI TOOL</h1>

      <div className="mt-6">
        <label htmlFor="public-tool-search" className="sr-only">Search tools</label>
        <input
          id="public-tool-search"
          type="search"
          value={q}
          autoFocus
          onChange={(e) => setSearchParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
          placeholder='Try "video", "Anthropic" or "healthcare"...'
          className="w-full rounded-full px-5 py-3.5 text-base text-white placeholder:text-slate-500 focus:outline-none"
          style={{
            background: 'rgba(20,18,31,0.9)',
            border: '2px solid #000',
            boxShadow: '3px 3px 0 #000',
          }}
        />
      </div>

      {!trimmed ? (
        <div className="mt-10">
          <p className="max-w-xl text-sm leading-relaxed text-slate-400">
            Toolnaut tracks {TOOLS.length}+ AI tools across coding, design, writing, data,
            automation and learning — scouted daily, not a static list someone compiled once.
            Search by name, category, or the problem you're trying to solve, or jump straight
            into a category:
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {suggestedCats.map(([id, meta]) => (
              <Link key={id} to={`/tools/${id}`} className="arcade-chip press min-h-11 inline-flex items-center">
                {meta.name}
              </Link>
            ))}
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="mt-10">
          <h2 className="arcade-heading section text-xl sm:text-2xl">NO TOOLS MATCH</h2>
          <p className="mt-3 max-w-md text-sm text-slate-400">
            Nothing in the catalog matches “<span className="font-bold text-white">{trimmed}</span>”. Try a
            broader search, or jump into a category that has tools waiting:
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {suggestedCats.map(([id, meta]) => (
              <Link key={id} to={`/tools/${id}`} className="arcade-chip press min-h-11 inline-flex items-center">
                {meta.name}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <>
          <h2 className="arcade-heading section mt-8 text-xl sm:text-2xl">
            {results.length} RESULT{results.length === 1 ? '' : 'S'}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.slice(0, RESULT_CAP).map((tool) => (
              <Link
                key={tool.slug}
                to={`/s/${encodeStackSlugs([tool.slug])}`}
                className="glass block rounded-2xl p-5 transition-opacity hover:opacity-90"
              >
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: CATEGORY_META[tool.category]?.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{tool.sourceCategory}</span>
                </span>
                <p className="arcade-heading lime mt-2 text-base">{tool.name.toUpperCase()}</p>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-300">{tool.blurb}</p>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                  <span className="rounded-full border border-white/20 px-2 py-0.5">{PRICE_LABELS[tool.price]}</span>
                  <span className="rounded-full border border-white/20 px-2 py-0.5">{LEVEL_LABELS[tool.level]}</span>
                </div>
              </Link>
            ))}
          </div>
          {results.length > RESULT_CAP && (
            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">
              Showing {RESULT_CAP} of {results.length} — narrow your search for more specific results.
            </p>
          )}
        </>
      )}

      <div className="mt-12 text-center">
        <Link
          to="/goal"
          className="glow-btn inline-block rounded-full bg-gradient-to-r from-exus-purple to-exus-cyan px-7 py-3 font-display text-sm font-semibold text-white"
        >
          Build my own stack
        </Link>
      </div>
    </div>
  )
}
