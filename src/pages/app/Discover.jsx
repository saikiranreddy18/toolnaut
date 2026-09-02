import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TOOLS, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../../utils/toolsCatalog'
import { matchScore, matchReasonShort } from '../../utils/matchScore'
import { byProminence, isCatalogNoise } from '../../utils/prominence'
import { getNewTools } from '../../utils/newTools'
import { matchesQuery } from '../../utils/search'
import { compareByNewest, compareByName } from '../../utils/sortResults'
import { loadQuiz } from '../../state/quizStore'
import { loadStack, addToStack, removeFromStack } from '../../state/stackStore'
import { loadFavorites, addFavorite, removeFavorite } from '../../state/favoritesStore'
import { markActed } from '../../utils/funnel'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { haptic } from '../../utils/haptics'
import ToolCard from '../../components/app/ToolCard'

const PRICES = ['free', 'freemium', 'paid']
const LEVELS = ['beginner', 'intermediate', 'advanced']
const MAX_COMPARE = 4
// 'match' is the default and never appears in the URL, so an existing
// shared/bookmarked Discover link with no `sort` param keeps today's order.
const SORTS = [
  { key: 'match', label: 'Top match' },
  { key: 'newest', label: 'Newest' },
  { key: 'name', label: 'A-Z' },
]

// The catalog is ~750 tools and every one of them used to render at once:
// ~14,500 DOM nodes and a 58,000px-tall page on desktop, 167,000px on mobile,
// re-created on every keystroke in the search box. Nobody scrolls 750 cards;
// they search or filter. So render a screenful and let the rest be asked for.
const PAGE_SIZE = 24

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`arcade-chip press min-h-9 shrink-0 cursor-pointer ${active ? 'on' : ''}`}
    >
      {children}
    </button>
  )
}

// Tool discovery engine. All filter state lives in the URL so results are
// shareable and the back button restores them (APP-FLOW.md §5).
export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [stack, setStack] = useState(loadStack)
  const [favorites, setFavorites] = useState(loadFavorites)
  const [compare, setCompare] = useState([])
  const track = useAnalytics()

  const quiz = loadQuiz()
  const answers = quiz.completed ? quiz.answers : null

  const q = searchParams.get('q') || ''
  const cat = searchParams.get('cat') || ''
  const price = searchParams.get('price') || ''
  const level = searchParams.get('level') || ''
  const sort = searchParams.get('sort') || 'match'

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: key === 'q' })
  }

  function toggleCompare(slug) {
    setCompare((c) =>
      c.includes(slug) ? c.filter((s) => s !== slug) : c.length < MAX_COMPARE ? [...c, slug] : c,
    )
  }

  function toggleStack(tool) {
    if (stack.includes(tool.slug)) {
      setStack(removeFromStack(tool.slug, 'discover'))
    } else {
      haptic.select()
      setStack(addToStack(tool.slug, 'discover'))
      track(EVENTS.CTA_CLICK, { cta: 'add_to_stack', tool: tool.slug })
    }
  }

  function toggleFavorite(tool) {
    if (favorites.includes(tool.slug)) {
      setFavorites(removeFavorite(tool.slug, 'discover'))
    } else {
      haptic.select()
      setFavorites(addFavorite(tool.slug, 'discover'))
      markActed(track, 'save', { slug: tool.slug, surface: 'discover' })
      track(EVENTS.CTA_CLICK, { cta: 'add_favorite', tool: tool.slug })
    }
  }

  // quiz.answers is a fresh object from every loadQuiz() call, so key on its
  // contents rather than identity — otherwise the memo below never hits and
  // actions unrelated to filtering (e.g. toggleStack) re-run this over all
  // TOOLS anyway.
  const answersKey = answers ? JSON.stringify(answers) : ''
  const tieBreak = useMemo(() => byProminence(answers?.domain), [answers?.domain])
  const results = useMemo(() => {
    const scored = TOOLS
      .filter((tool) =>
        (!cat || tool.category === cat) &&
        (!price || tool.price === price) &&
        (!level || tool.level === level) &&
        matchesQuery(tool, q),
      )
      .map((tool) => ({ ...tool, score: matchScore(tool, answers) }))

    if (sort === 'newest') return scored.sort(compareByNewest)
    if (sort === 'name') return scored.sort(compareByName)
    // Score first, then prominence. The tiebreak used to carry most of the
    // weight here: matchScore's baseline overflowed its own ceiling, so
    // dozens of tools pinned at 99 and the real ordering was alphabetical.
    // The baseline is fixed and scores now spread, but prominence still
    // breaks the genuine ties.
    return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || tieBreak(a, b))
  }, [q, cat, price, level, sort, answersKey, tieBreak])

  const hasFilters = !!(q || cat || price || level)

  // Paging is derived, not an effect: storing the filter signature alongside
  // the count resets the page during the same render that changes the filters,
  // so a new result set never flashes the previous page length first.
  const filterKey = `${q}|${cat}|${price}|${level}|${sort}`
  const [page, setPage] = useState({ key: filterKey, count: PAGE_SIZE })
  const visibleCount = page.key === filterKey ? page.count : PAGE_SIZE
  const visible = results.slice(0, visibleCount)
  const remaining = results.length - visible.length

  // Computed once: TOOLS is fully hydrated with live (radar-discovered) tools
  // before first render (see main.jsx), and discoveredAt never changes after.
  // Same filter as the ranking: "New this week" reads as an editorial pick, so
  // a scraped repo wearing a NEW badge there is the most prominent place the
  // catalog's few non-products could possibly land.
  const freshTools = useMemo(() => getNewTools(7).filter((t) => !isCatalogNoise(t)).slice(0, 8), [])

  // For the no-results state: the categories that actually still have tools,
  // so every suggested escape route is guaranteed to lead somewhere.
  const suggestedCats = useMemo(
    () => Object.entries(CATEGORY_META).filter(([id]) => TOOLS.some((t) => t.category === id)).slice(0, 6),
    [],
  )

  const gridHeading = hasFilters
    ? `${results.length} RESULT${results.length === 1 ? '' : 'S'}`
    : answers
      ? 'RECOMMENDED FOR YOU'
      : 'ALL TOOLS'

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:py-10 xl:max-w-7xl">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-black" style={{ color: 'var(--lime)' }}>▸ FIND</p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        {TOOLS.length} TOOLS,<br/>RANKED FOR YOU
      </h1>
      {!answers && (
        <p className="mt-3 text-sm text-slate-400">
          <Link to="/goal" className="font-bold underline underline-offset-2" style={{ color: 'var(--lime)' }}>
            Take the quiz
          </Link>{' '}
          to unlock personal match scores.
        </p>
      )}

      <div className="mt-6">
        <label htmlFor="tool-search" className="sr-only">Search tools</label>
        <input
          id="tool-search"
          type="search"
          value={q}
          onChange={(e) => setParam('q', e.target.value)}
          placeholder='Try "video", "Anthropic" or "healthcare"...'
          className="w-full rounded-full px-5 py-3.5 text-base text-white placeholder:text-slate-500 focus:outline-none"
          style={{
            background: 'rgba(20,18,31,0.9)',
            border: '2px solid #000',
            boxShadow: '3px 3px 0 #000',
          }}
        />
      </div>

      {freshTools.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">🆕 New this week</h2>
            <Link to="/new" className="flex min-h-11 items-center text-[10px] font-bold uppercase tracking-widest text-exus-lime hover:opacity-80">
              See the full feed →
            </Link>
          </div>
          <div className="no-scrollbar -mx-5 mt-2 flex gap-3 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            {freshTools.map((tool) => (
              <Link
                key={tool.slug}
                to={`/app/tools/${tool.slug}`}
                className="sticker group flex w-40 shrink-0 flex-col p-3"
              >
                <span className="arcade-heading lime compact text-sm group-hover:opacity-80">{tool.name.toUpperCase()}</span>
                <span className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-300">{tool.blurb}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* filter rows swipe horizontally on mobile, wrap on wide screens */}
      <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <Pill active={!cat} onClick={() => setParam('cat', '')}>All</Pill>
        {Object.entries(CATEGORY_META).map(([id, meta]) => (
          <Pill key={id} active={cat === id} onClick={() => setParam('cat', cat === id ? '' : id)}>
            {meta.name}
          </Pill>
        ))}
      </div>

      <div className="no-scrollbar -mx-5 mt-3 flex items-center gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <span className="shrink-0 text-xs uppercase tracking-widest text-slate-600">Price</span>
        {PRICES.map((p) => (
          <Pill key={p} active={price === p} onClick={() => setParam('price', price === p ? '' : p)}>
            {PRICE_LABELS[p]}
          </Pill>
        ))}
        <span className="ml-3 shrink-0 text-xs uppercase tracking-widest text-slate-600">Level</span>
        {LEVELS.map((l) => (
          <Pill key={l} active={level === l} onClick={() => setParam('level', level === l ? '' : l)}>
            {LEVEL_LABELS[l]}
          </Pill>
        ))}
        <span className="ml-3 shrink-0 text-xs uppercase tracking-widest text-slate-600">Sort</span>
        {SORTS.map(({ key, label }) => (
          <Pill key={key} active={sort === key} onClick={() => setParam('sort', key === 'match' ? '' : key)}>
            {label}
          </Pill>
        ))}
      </div>

      {results.length === 0 ? (
        /* A dead end is where people leave. Name what was searched, then hand
           back routes that are known to have tools behind them. */
        <div className="mt-12">
          <h2 className="arcade-heading section text-xl sm:text-2xl">NO TOOLS MATCH</h2>
          <p className="mt-3 max-w-md text-sm text-slate-400">
            {q ? <>Nothing in the catalog matches “<span className="font-bold text-white">{q}</span>”</> : 'Nothing matches these filters'}
            {(cat || price || level) && ' with the filters you have on'}. Try a
            broader search, or jump into a category that has tools waiting:
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {suggestedCats.map(([id, meta]) => (
              <button
                key={id}
                onClick={() => { setSearchParams({ cat: id }); haptic.tap() }}
                className="arcade-chip press min-h-11 cursor-pointer"
              >
                {meta.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSearchParams({})}
            className="nb-btn dark mt-6 min-h-11 px-4 py-2 text-xs"
          >
            CLEAR ALL FILTERS
          </button>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="arcade-heading section text-xl sm:text-2xl">{gridHeading}</h2>
            {hasFilters && (
              <button
                onClick={() => setSearchParams({})}
                className="press font-display text-[10px] font-black uppercase tracking-widest text-slate-400 underline underline-offset-4 hover:text-white"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((tool, i) => (
              <ToolCard showFit={false}
                key={tool.slug}
                tool={tool}
                index={i}
                reason={matchReasonShort(tool, answers)}
                inStack={stack.includes(tool.slug)}
                onToggleStack={toggleStack}
                isFavorite={favorites.includes(tool.slug)}
                onToggleFavorite={toggleFavorite}
                compare={{
                  checked: compare.includes(tool.slug),
                  disabled: !compare.includes(tool.slug) && compare.length >= MAX_COMPARE,
                  onToggle: toggleCompare,
                }}
              />
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 pb-4">
            {/* aria-live so a screen reader hears the list grow after LOAD MORE
                — the button stays put and nothing else announces the change. */}
            <p aria-live="polite" className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Showing {visible.length} of {results.length} tools
            </p>
            {remaining > 0 && (
              <button
                onClick={() => { haptic.tap(); setPage({ key: filterKey, count: visibleCount + PAGE_SIZE }) }}
                className="nb-btn min-h-11 px-6 py-3 text-sm"
              >
                LOAD {Math.min(remaining, PAGE_SIZE)} MORE
              </button>
            )}
          </div>
        </>
      )}

      {compare.length >= 2 && (
        <div
          role="region"
          aria-label="Compare selection"
          /* clears the mobile bottom nav, which it used to sit directly on top
             of — the nav is 64px plus its 2px lime border plus the safe area */
          className="fixed inset-x-0 bottom-[calc(4.125rem+env(safe-area-inset-bottom))] z-40 flex flex-wrap items-center justify-center gap-3 px-5 py-4 lg:bottom-0"
          style={{ background: 'rgba(10,9,16,0.96)', borderTop: '2px solid #000', boxShadow: '0 -3px 0 #000' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {compare.length} of {MAX_COMPARE} selected
          </p>
          <Link
            to={`/app/compare?tools=${compare.map(encodeURIComponent).join(',')}`}
            className="nb-btn min-h-11 px-5 py-2.5 text-xs"
          >
            COMPARE ({compare.length}) →
          </Link>
          <button onClick={() => setCompare([])} className="nb-btn dark min-h-11 px-4 py-2.5 text-xs">
            CLEAR
          </button>
        </div>
      )}
    </div>
  )
}
