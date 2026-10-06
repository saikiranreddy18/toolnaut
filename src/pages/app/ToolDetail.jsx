import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getTool, TOOLS, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../../utils/toolsCatalog'
import { matchScore, matchReasons, fitBand } from '../../utils/matchScore'
import { loadQuiz } from '../../state/quizStore'
import { loadStack, addToStack, removeFromStack } from '../../state/stackStore'
import { loadFavorites, addFavorite, removeFavorite } from '../../state/favoritesStore'
import { recordView } from '../../state/recentlyViewedStore'
import { allowSave } from '../../utils/saveLimit'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { haptic } from '../../utils/haptics'
import { buildReportIssueUrl } from '../../utils/suggestTool'
import { getReviews, getAverageRating, addReview } from '../../state/toolReviewsStore'
import { timeAgo } from '../../utils/communityData'
import { loadSession } from '../../state/authStore'
import { HeartIcon, StarIcon } from '../../components/app/icons'
import TrustPanel from '../../components/app/TrustPanel'
import ToolResources from '../../components/app/ToolResources'

function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="press p-0.5 text-zinc-500"
          style={{ color: n <= value ? 'var(--lime)' : undefined }}
        >
          <StarIcon filled={n <= value} />
        </button>
      ))}
    </div>
  )
}

function ReviewForm({ toolName, onSubmit }) {
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')

  function submit(e) {
    e.preventDefault()
    if (rating < 1) return
    onSubmit({ rating, body: body.trim() })
    setRating(0)
    setBody('')
  }

  return (
    <form onSubmit={submit} className="glass mt-4 rounded-2xl p-4">
      <p className="font-display text-xs font-semibold uppercase text-zinc-400">Rate {toolName}</p>
      <div className="mt-2">
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <label htmlFor="review-body" className="sr-only">Your review</label>
      <textarea
        id="review-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What was it like to use? (optional)"
        rows={2}
        className="mt-3 w-full resize-none bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
      />
      <button
        type="submit"
        disabled={rating < 1}
        className="nb-btn wide mt-3 w-full py-2.5 text-xs disabled:opacity-40"
      >
        Post review
      </button>
    </form>
  )
}

export default function ToolDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const track = useAnalytics()
  const [stack, setStack] = useState(loadStack)
  const [favorites, setFavorites] = useState(loadFavorites)

  const tool = getTool(slug)
  const [reviews, setReviews] = useState(() => (tool ? getReviews(tool.slug) : []))

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

  // Records on mount and whenever the slug changes — clicking a related-tool
  // link keeps this same component instance mounted, per the comment above.
  useEffect(() => {
    if (tool) {
      recordView(tool.slug)
      setReviews(getReviews(tool.slug))
    }
  }, [tool?.slug])

  if (!tool) {
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-5 text-center">
        <h1 className="arcade-heading text-2xl">Tool not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          Nothing in the catalog is filed under
          {' '}<span className="font-bold text-white">{slug}</span>. It may have been
          renamed, or the link may be from an older build.
        </p>
        <Link to="/app/discover" className="nb-btn mt-6 min-h-11 px-5 py-2.5 text-xs">
          Browse all tools →
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
  const avgRating = getAverageRating(tool.slug)
  const alreadyReviewed = reviews.some((r) => r.mine)

  // Back preserves Discover's filters when we came from there (history state);
  // on a cold deep link there's nothing to go back to, so land on Discover.
  const cameFromApp = window.history.state?.idx > 0

  function goBack() {
    if (cameFromApp) navigate(-1)
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
      // The plan saved-tools limit (Student: 10). Shows the upgrade notice.
      if (!allowSave(favorites.length)) return
      haptic.select()
      setFavorites(addFavorite(tool.slug))
      track(EVENTS.CTA_CLICK, { cta: 'add_favorite', tool: tool.slug, location: 'detail' })
    }
  }

  function submitReview({ rating, body }) {
    haptic.select()
    const session = loadSession()
    addReview(tool.slug, { rating, body, author: session?.user.name || 'you' })
    setReviews(getReviews(tool.slug))
    track(EVENTS.CTA_CLICK, { cta: 'add_review', tool: tool.slug, location: 'detail' })
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:py-10">
      <button
        onClick={goBack}
        className="press cursor-pointer font-display text-sm text-zinc-400 transition-colors hover:text-white"
      >
        {cameFromApp ? '← Back' : '← Back to Find'}
      </button>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-zinc-400">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
          {tool.sourceCategory}
        </span>
        {score != null && (
          <span
            className="rounded-full px-3 py-1 font-display text-xs font-semibold uppercase"
            style={{ background: 'var(--lime)', color: '#000', border: '2px solid #000', boxShadow: '0 10px 28px -14px rgba(0,0,0,0.7)' }}
          >
            {fitBand(score)?.label || 'Match'}
          </span>
        )}
        {tool.status && tool.status !== 'Active' && (
          <span
            className="rounded-full px-3 py-1 font-display text-xs font-semibold uppercase"
            style={{ background: 'var(--hot-pink)', color: '#fff', border: '2px solid #000', boxShadow: '0 10px 28px -14px rgba(0,0,0,0.7)' }}
          >
            {tool.status}
          </span>
        )}
        {avgRating != null && (
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 font-display text-xs font-semibold text-white">
            <StarIcon filled /> {avgRating.toFixed(1)}
            <span className="text-zinc-400">({reviews.length})</span>
          </span>
        )}
      </div>

      <h1 className="arcade-heading mt-4 text-4xl sm:text-5xl">{tool.name}</h1>
      {(tool.dev || tool.year) && (
        <p className="mt-2 font-display text-sm font-semibold" style={{ color: 'var(--lime)' }}>
          {tool.dev}{tool.dev && tool.year ? ' · ' : ''}{tool.year ? `Since ${tool.year}` : ''}
        </p>
      )}
      <p className="mt-4 max-w-xl text-base leading-relaxed text-white font-medium">{tool.blurb}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="arcade-chip">{(tool.pricing || PRICE_LABELS[tool.price])}</span>
        <span className="arcade-chip">{LEVEL_LABELS[tool.level]}</span>
        {tool.tags.slice(0, 4).map((tag) => (
          <Link key={tag} to={`/app/discover?q=${encodeURIComponent(tag)}`} className="arcade-chip press">
            {tag}
          </Link>
        ))}
      </div>

      {tool.website && (
        <a
          href={tool.website}
          target="_blank"
          rel="noopener noreferrer"
          className="nb-btn dark mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs"
        >
          Visit website
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 17 17 7M7 7h10v10" />
          </svg>
        </a>
      )}
      {/* Plain text, not another nb-btn — a correction link shouldn't compete
          with the primary CTAs above it. */}
      <a
        href={buildReportIssueUrl({ slug: tool.slug, name: tool.name })}
        target="_blank"
        rel="noopener noreferrer"
        className="press mt-3 block text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-300"
      >
        Something wrong here?
      </a>

      <div className="mt-7 flex items-center gap-3">
        <button
          onClick={toggleStack}
          className={`nb-btn px-8 py-4 text-base ${added ? 'dark' : ''}`}
        >
          {added ? '✓ In my stack · Remove' : 'Add to my stack'}
        </button>
        <button
          onClick={toggleFavorite}
          aria-label={favorited ? `Remove ${tool.name} from saved` : `Save ${tool.name}`}
          aria-pressed={favorited}
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 ${
 favorited ? 'bg-[var(--hot-pink)] text-white' : 'bg-transparent text-zinc-400 hover:text-white'
 }`}
          style={{ boxShadow: '0 10px 28px -14px rgba(0,0,0,0.7)' }}
        >
          <HeartIcon filled={favorited} />
        </button>
      </div>

      <div className="sticker mt-8 p-5" style={{ transform: 'rotate(0)' }}>
        <p className="arcade-heading compact text-lg">Why it fits</p>
        {reasons.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {reasons.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-white">
                <span className="mt-1 shrink-0 font-semibold" style={{ color: 'var(--lime)' }} aria-hidden="true">◆</span>
                {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-300">
            <Link to="/goal" className="font-semibold underline underline-offset-2" style={{ color: 'var(--lime)' }}>
              Take the quiz
            </Link>{' '}
            and this becomes personal — fit, budget, learning curve, scored against your profile.
          </p>
        )}
      </div>

      {/* Reasoning sits with the decision, before the page moves on to other
          products. */}
      <TrustPanel tool={tool} answers={quiz.completed ? quiz.answers : null} />

      {/* Verified integrations and official training, each linked to its source. */}
      <ToolResources tool={tool} />

      {/* Toolnaut's own case runs first (why it fits, the honest trust panel,
          verified resources); real users' case runs here, before the page
          moves on to other products. */}
      <div className="sticker mt-8 p-5" style={{ transform: 'rotate(0)' }}>
        <div className="flex items-center justify-between gap-3">
          <p className="arcade-heading compact text-lg">Reviews</p>
          {avgRating != null && (
            <span className="flex items-center gap-1 font-display text-sm font-semibold text-white">
              <StarIcon filled /> {avgRating.toFixed(1)}
              <span className="text-zinc-400">({reviews.length})</span>
            </span>
          )}
        </div>
        {reviews.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="border-t border-white/10 pt-3 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((n) => <StarIcon key={n} filled={n <= r.rating} />)}
                  </span>
                  <span className="font-display text-[10px] font-bold text-zinc-400">
                    {r.mine ? 'YOU' : r.author} · {timeAgo(r.at)}
                  </span>
                </div>
                {r.body && <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">{r.body}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-300">
            No reviews yet — be the first to share how {tool.name} worked for you.
          </p>
        )}

        {alreadyReviewed ? (
          <p className="mt-4 text-xs text-zinc-500">You've already reviewed {tool.name}.</p>
        ) : (
          <ReviewForm toolName={tool.name} onSubmit={submitReview} />
        )}
      </div>

      {related.length > 0 && (
        <div className="mt-10">
          <h2 className="arcade-heading section text-xl sm:text-2xl">Related tools</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {related.map((r, i) => (
              <Link
                key={r.slug}
                to={`/app/tools/${r.slug}`}
                className={`sticker ${i === 0 ? '' : i === 1 ? 'pink' : 'cyan'} p-4`}
              >
                <p className="arcade-heading compact text-base">{r.name}</p>
                <p className="mt-2 text-xs text-zinc-300">{r.blurb}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
