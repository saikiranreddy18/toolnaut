import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TOOLS, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../../utils/toolsCatalog'
import { matchScore } from '../../utils/matchScore'
import { isNewTool, getNewTools } from '../../utils/newTools'
import { loadQuiz } from '../../state/quizStore'
import { loadStack, addToStack, removeFromStack } from '../../state/stackStore'
import { loadFavorites, addFavorite, removeFavorite } from '../../state/favoritesStore'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { haptic } from '../../utils/haptics'
import { HeartIcon } from '../../components/app/icons'

const PRICES = ['free', 'freemium', 'paid']
const LEVELS = ['beginner', 'intermediate', 'advanced']
const MAX_COMPARE = 4

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
      setStack(removeFromStack(tool.slug))
    } else {
      haptic.select()
      setStack(addToStack(tool.slug))
      track(EVENTS.CTA_CLICK, { cta: 'add_to_stack', tool: tool.slug })
    }
  }

  function toggleFavorite(tool) {
    if (favorites.includes(tool.slug)) {
      setFavorites(removeFavorite(tool.slug))
    } else {
      haptic.select()
      setFavorites(addFavorite(tool.slug))
      track(EVENTS.CTA_CLICK, { cta: 'add_favorite', tool: tool.slug })
    }
  }

  // quiz.answers is a fresh object from every loadQuiz() call, so key on its
  // contents rather than identity — otherwise the memo below never hits and
  // actions unrelated to filtering (e.g. toggleStack) re-run this over all
  // TOOLS anyway.
  const answersKey = answers ? JSON.stringify(answers) : ''
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return TOOLS
      .filter((tool) =>
        (!cat || tool.category === cat) &&
        (!price || tool.price === price) &&
        (!level || tool.level === level) &&
        (!needle ||
          tool.name.toLowerCase().includes(needle) ||
          tool.blurb.toLowerCase().includes(needle) ||
          tool.sourceCategory.toLowerCase().includes(needle) ||
          (tool.dev && tool.dev.toLowerCase().includes(needle)) ||
          tool.tags.some((tag) => tag.includes(needle))),
      )
      .map((tool) => ({ ...tool, score: matchScore(tool, answers) }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name))
  }, [q, cat, price, level, answersKey])

  const hasFilters = q || cat || price || level
  // Computed once: TOOLS is fully hydrated with live (radar-discovered) tools
  // before first render (see main.jsx), and discoveredAt never changes after.
  const freshTools = useMemo(() => getNewTools(7).slice(0, 8), [])

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:py-10">
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
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">🆕 New this week</p>
          <div className="no-scrollbar -mx-5 mt-2 flex gap-3 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            {freshTools.map((tool) => (
              <Link
                key={tool.slug}
                to={`/app/tools/${tool.slug}`}
                className="sticker group flex w-40 shrink-0 flex-col p-3"
              >
                <p className="arcade-heading lime text-xs group-hover:opacity-80">{tool.name.toUpperCase()}</p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-300">{tool.blurb}</p>
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
      </div>

      {results.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="arcade-heading text-xl">NO TOOLS MATCH</p>
          <p className="mt-3 text-sm text-slate-400">Try a broader search or clear the filters.</p>
          <button
            onClick={() => setSearchParams({})}
            className="nb-btn dark mt-5 px-4 py-2 text-xs"
          >
            CLEAR ALL
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((tool, i) => {
            const added = stack.includes(tool.slug)
            const meta = CATEGORY_META[tool.category] || { name: tool.category, color: 'var(--cyan)' }
            const stickerColor = i % 3 === 0 ? '' : i % 3 === 1 ? 'pink' : 'cyan'
            return (
              <Link
                key={tool.slug}
                to={`/app/tools/${tool.slug}`}
                className={`sticker ${stickerColor} group flex flex-col p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                    <span className="truncate">{tool.sourceCategory}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {isNewTool(tool) && (
                      <span
                        className="rounded-full px-2 py-0.5 font-display text-[10px] font-black"
                        style={{ background: 'var(--hot-pink)', color: '#000', border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
                      >
                        NEW
                      </span>
                    )}
                    {tool.score != null && (
                      <span
                        className="rounded-full px-2 py-0.5 font-display text-xs font-black"
                        style={{ background: 'var(--lime)', color: '#000', border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
                      >
                        {tool.score}%
                      </span>
                    )}
                  </span>
                </div>
                <p className="arcade-heading lime mt-3 text-base group-hover:opacity-80">
                  {tool.name.toUpperCase()}
                </p>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-300">{tool.blurb}</p>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                  <span className="rounded-full border border-white/20 px-2 py-0.5">{PRICE_LABELS[tool.price]}</span>
                  <span className="rounded-full border border-white/20 px-2 py-0.5">{LEVEL_LABELS[tool.level]}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleStack(tool) }}
                    className={`nb-btn px-4 py-2 text-xs ${added ? 'dark' : ''}`}
                  >
                    {added ? '✓ IN STACK' : '⚡ ADD'}
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(tool) }}
                    aria-label={favorites.includes(tool.slug) ? 'Remove from favorites' : 'Save to favorites'}
                    aria-pressed={favorites.includes(tool.slug)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 ${
                      favorites.includes(tool.slug) ? 'text-[var(--hot-pink)]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <HeartIcon filled={favorites.includes(tool.slug)} />
                  </button>
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/20 px-2.5 py-2 text-[10px] font-bold uppercase text-slate-400 hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={compare.includes(tool.slug)}
                      disabled={!compare.includes(tool.slug) && compare.length >= MAX_COMPARE}
                      onChange={(e) => { e.preventDefault(); toggleCompare(tool.slug) }}
                      className="h-3.5 w-3.5 cursor-pointer accent-[var(--lime)] disabled:cursor-not-allowed"
                    />
                    Compare
                  </label>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {compare.length >= 2 && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-3 px-5 py-4"
          style={{ background: 'rgba(10,9,16,0.96)', borderTop: '2px solid #000', boxShadow: '0 -3px 0 #000' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {compare.length} of {MAX_COMPARE} selected
          </p>
          <Link
            to={`/app/compare?tools=${compare.map(encodeURIComponent).join(',')}`}
            className="nb-btn px-5 py-2.5 text-xs"
          >
            COMPARE ({compare.length}) →
          </Link>
          <button onClick={() => setCompare([])} className="nb-btn dark px-4 py-2.5 text-xs">
            CLEAR
          </button>
        </div>
      )}

      {hasFilters && results.length > 0 && (
        <p className="mt-6 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
          {results.length} of {TOOLS.length} tools shown
        </p>
      )}
    </div>
  )
}
