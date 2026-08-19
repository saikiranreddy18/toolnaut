import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TOOLS, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../../utils/toolsCatalog'
import { matchScore } from '../../utils/matchScore'
import { loadQuiz } from '../../state/quizStore'
import { loadStack, addToStack, removeFromStack } from '../../state/stackStore'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { haptic } from '../../utils/haptics'

const PRICES = ['free', 'freemium', 'paid']
const LEVELS = ['beginner', 'intermediate', 'advanced']

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

  function toggleStack(tool) {
    if (stack.includes(tool.slug)) {
      setStack(removeFromStack(tool.slug))
    } else {
      haptic.select()
      setStack(addToStack(tool.slug))
      track(EVENTS.CTA_CLICK, { cta: 'add_to_stack', tool: tool.slug })
    }
  }

  const needle = q.trim().toLowerCase()
  const results = TOOLS
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

  const hasFilters = q || cat || price || level

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:py-10">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-black" style={{ color: 'var(--lime)' }}>▸ FIND</p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        {TOOLS.length} TOOLS,<br/>RANKED FOR YOU
      </h1>
      {!answers && (
        <p className="mt-3 text-sm text-slate-400">
          <Link to="/quiz" className="font-bold underline underline-offset-2" style={{ color: 'var(--lime)' }}>
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
                  {tool.score != null && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 font-display text-xs font-black"
                      style={{ background: 'var(--lime)', color: '#000', border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
                    >
                      {tool.score}%
                    </span>
                  )}
                </div>
                <p className="arcade-heading lime mt-3 text-base group-hover:opacity-80">
                  {tool.name.toUpperCase()}
                </p>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-300">{tool.blurb}</p>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                  <span className="rounded-full border border-white/20 px-2 py-0.5">{PRICE_LABELS[tool.price]}</span>
                  <span className="rounded-full border border-white/20 px-2 py-0.5">{LEVEL_LABELS[tool.level]}</span>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleStack(tool) }}
                  className={`nb-btn mt-4 px-4 py-2 text-xs ${added ? 'dark' : ''}`}
                >
                  {added ? '✓ IN STACK' : '⚡ ADD'}
                </button>
              </Link>
            )
          })}
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
