import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getTool, TOOLS, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../../utils/toolsCatalog'
import { matchScore, matchReasons } from '../../utils/matchScore'
import { loadQuiz } from '../../state/quizStore'
import { loadStack, addToStack, removeFromStack } from '../../state/stackStore'
import { loadFavorites, addFavorite, removeFavorite } from '../../state/favoritesStore'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { haptic } from '../../utils/haptics'
import { HeartIcon } from '../../components/app/icons'

export default function ToolDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const track = useAnalytics()
  const [stack, setStack] = useState(loadStack)
  const [favorites, setFavorites] = useState(loadFavorites)

  const tool = getTool(slug)

  // Prefer neighbours in the exact source category, then fall back to domain.
  // Memoized so actions unrelated to this list (e.g. toggleStack, which only
  // flips local `stack` state) don't re-filter all 700+ tools on every render
  // — same fix already applied to Discover.jsx's equivalent computation.
  // Runs before the not-found return below: clicking a related-tool link keeps
  // this same component instance mounted with a new slug, so every hook here
  // must run on every render regardless of whether that slug resolves.
  const related = useMemo(() => {
    if (!tool) return []
    const sameSource = TOOLS.filter((t) => t.sourceCategory === tool.sourceCategory && t.slug !== tool.slug)
    const sameDomain = TOOLS.filter((t) => t.category === tool.category && t.sourceCategory !== tool.sourceCategory && t.slug !== tool.slug)
    return [...sameSource, ...sameDomain].slice(0, 3)
  }, [tool])

  if (!tool) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-5 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Tool not found</h1>
        <p className="mt-2 text-sm text-slate-400">It may have been renamed or removed from the catalog.</p>
        <Link
          to="/app/discover"
          className="mt-6 rounded-full border border-white/15 px-4 py-2 font-display text-sm text-slate-200 hover:border-exus-cyan/60 hover:text-white"
        >
          Browse all tools
        </Link>
      </div>
    )
  }

  const quiz = loadQuiz()
  const answers = quiz.completed ? quiz.answers : null
  const score = matchScore(tool, answers)
  const reasons = matchReasons(tool, answers)
  const meta = CATEGORY_META[tool.category] || { name: tool.category, color: 'var(--cyan)' }
  const added = stack.includes(tool.slug)
  const favorited = favorites.includes(tool.slug)

  // Back preserves Discover's filters when we came from there (history state);
  // on a cold deep link there's nothing to go back to, so land on Discover.
  function goBack() {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/app/discover')
  }

  function toggleStack() {
    if (added) {
      setStack(removeFromStack(tool.slug))
    } else {
      haptic.select()
      setStack(addToStack(tool.slug))
      track(EVENTS.CTA_CLICK, { cta: 'add_to_stack', tool: tool.slug, location: 'detail' })
    }
  }

  function toggleFavorite() {
    if (favorited) {
      setFavorites(removeFavorite(tool.slug))
    } else {
      haptic.select()
      setFavorites(addFavorite(tool.slug))
      track(EVENTS.CTA_CLICK, { cta: 'add_favorite', tool: tool.slug, location: 'detail' })
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:py-10">
      <button
        onClick={goBack}
        className="cursor-pointer font-display text-sm text-slate-400 transition-colors hover:text-white"
      >
        ← Back to Discover
      </button>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-400">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
          {tool.sourceCategory}
        </span>
        {score != null && (
          <span
            className="rounded-full px-3 py-1 font-display text-xs font-black uppercase"
            style={{ background: 'var(--lime)', color: '#000', border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
          >
            {score}% MATCH
          </span>
        )}
        {tool.status && tool.status !== 'Active' && (
          <span
            className="rounded-full px-3 py-1 font-display text-xs font-black uppercase"
            style={{ background: 'var(--hot-pink)', color: '#fff', border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
          >
            {tool.status}
          </span>
        )}
      </div>

      <h1 className="arcade-heading mt-4 text-4xl sm:text-5xl">{tool.name.toUpperCase()}</h1>
      {(tool.dev || tool.year) && (
        <p className="mt-2 font-display text-sm font-black uppercase tracking-wider" style={{ color: 'var(--lime)' }}>
          {tool.dev}{tool.dev && tool.year ? ' · ' : ''}{tool.year ? `SINCE ${tool.year}` : ''}
        </p>
      )}
      <p className="mt-4 max-w-xl text-base leading-relaxed text-white font-medium">{tool.blurb}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="arcade-chip">{(tool.pricing || PRICE_LABELS[tool.price]).toUpperCase()}</span>
        <span className="arcade-chip">{LEVEL_LABELS[tool.level].toUpperCase()}</span>
        {tool.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="arcade-chip">{tag.toUpperCase()}</span>
        ))}
      </div>

      {tool.website && (
        <a
          href={tool.website}
          target="_blank"
          rel="noopener noreferrer"
          className="nb-btn dark mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs"
        >
          VISIT WEBSITE
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 17 17 7M7 7h10v10" />
          </svg>
        </a>
      )}

      <div className="mt-7 flex items-center gap-3">
        <button
          onClick={toggleStack}
          className={`nb-btn px-8 py-4 text-base ${added ? 'dark' : ''}`}
        >
          {added ? '✓ IN MY STACK — REMOVE' : '⚡ ADD TO MY STACK'}
        </button>
        <button
          onClick={toggleFavorite}
          aria-label={favorited ? 'Remove from favorites' : 'Save to favorites'}
          aria-pressed={favorited}
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-black ${
            favorited ? 'bg-[var(--hot-pink)] text-white' : 'bg-transparent text-slate-400 hover:text-white'
          }`}
          style={{ boxShadow: '3px 3px 0 #000' }}
        >
          <HeartIcon filled={favorited} />
        </button>
      </div>

      <div className="sticker mt-8 p-5" style={{ transform: 'rotate(0)' }}>
        <p className="arcade-heading lime text-base">◆ WHY IT FITS</p>
        {reasons.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {reasons.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-white">
                <span className="mt-1 shrink-0 font-black" style={{ color: 'var(--lime)' }} aria-hidden="true">◆</span>
                {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-300">
            <Link to="/goal" className="font-black underline underline-offset-2" style={{ color: 'var(--lime)' }}>
              Take the quiz
            </Link>{' '}
            and this becomes personal — fit, budget, learning curve, scored against your profile.
          </p>
        )}
      </div>

      {related.length > 0 && (
        <div className="mt-10">
          <p className="arcade-heading text-lg">RELATED TOOLS</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {related.map((r, i) => (
              <Link
                key={r.slug}
                to={`/app/tools/${r.slug}`}
                className={`sticker ${i === 0 ? '' : i === 1 ? 'pink' : 'cyan'} p-4`}
              >
                <p className="arcade-heading lime text-sm">{r.name.toUpperCase()}</p>
                <p className="mt-2 text-xs text-slate-300">{r.blurb}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
