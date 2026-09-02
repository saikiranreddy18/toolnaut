import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTool, TOOLS, CATEGORY_META } from '../../utils/toolsCatalog'
import { matchScore, matchReasonShort } from '../../utils/matchScore'
import { byProminence, recognisableStarters } from '../../utils/prominence'
import { loadQuiz } from '../../state/quizStore'
import { loadFavorites, addFavorite, removeFavorite } from '../../state/favoritesStore'
import { loadStack, addToStack, removeFromStack } from '../../state/stackStore'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { haptic } from '../../utils/haptics'
import ToolCard from '../../components/app/ToolCard'

const SORTS = [
  { id: 'recent', label: 'Recently saved' },
  { id: 'match', label: 'Best match' },
  { id: 'name', label: 'A–Z' },
]

// Your AI shortlist. Separate from Stack's heavier add-to-stack action.
export default function Favorites() {
  const [favoriteSlugs, setFavoriteSlugs] = useState(loadFavorites)
  const [stack, setStack] = useState(loadStack)
  const [sort, setSort] = useState('recent')
  const [cat, setCat] = useState('')
  const track = useAnalytics()

  const quiz = loadQuiz()
  const answers = quiz.completed ? quiz.answers : null

  const tools = useMemo(() => {
    const resolved = favoriteSlugs
      .map(getTool)
      .filter(Boolean)
      .map((t) => ({ ...t, score: matchScore(t, answers) }))
    // favoritesStore appends, so insertion order is oldest-first
    const ordered = sort === 'recent' ? [...resolved].reverse()
      : sort === 'name' ? [...resolved].sort((a, b) => a.name.localeCompare(b.name))
        : [...resolved].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    return cat ? ordered.filter((t) => t.category === cat) : ordered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteSlugs, sort, cat, answers ? JSON.stringify(answers) : ''])

  // Only the categories actually present in the shortlist — a filter row of
  // mostly-empty chips is noise.
  const presentCats = useMemo(() => {
    const ids = new Set(favoriteSlugs.map(getTool).filter(Boolean).map((t) => t.category))
    return Object.entries(CATEGORY_META).filter(([id]) => ids.has(id))
  }, [favoriteSlugs])

  // Empty-state suggestions. Real catalog tools scored by the real matcher when
  // there is a persona; otherwise the genuinely newest arrivals. Nothing here
  // is invented — there is no usage data, so there is no "popular" to claim.
  const starterPicks = useMemo(() => {
    if (!answers) return []
    return TOOLS
      .map((t) => ({ ...t, score: matchScore(t, answers) }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || byProminence(answers.domain)(a, b))
      .slice(0, 3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers ? JSON.stringify(answers) : ''])

  function toggleFavorite(tool) {
    if (favoriteSlugs.includes(tool.slug)) {
      setFavoriteSlugs(removeFavorite(tool.slug, 'favorites'))
    } else {
      haptic.select()
      setFavoriteSlugs(addFavorite(tool.slug, 'favorites'))
      track(EVENTS.CTA_CLICK, { cta: 'add_favorite', tool: tool.slug, location: 'saved' })
    }
  }

  function toggleStack(tool) {
    if (stack.includes(tool.slug)) {
      setStack(removeFromStack(tool.slug, 'favorites'))
    } else {
      haptic.select()
      setStack(addToStack(tool.slug, 'favorites'))
      track(EVENTS.CTA_CLICK, { cta: 'add_to_stack', tool: tool.slug, location: 'saved' })
    }
  }

  const total = favoriteSlugs.length

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:py-10 xl:max-w-7xl">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-black" style={{ color: 'var(--lime)' }}>▸ SAVED</p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">YOUR AI SHORTLIST</h1>

      {total === 0 ? (
        <div className="mt-6">
          <p className="max-w-md text-sm leading-relaxed text-slate-300">
            Nothing saved yet. Tap the heart on any tool in <span className="font-bold text-white">FIND</span> to
            park it here — no commitment, just a shortlist you can come back to
            before you commit anything to your stack.
          </p>
          <Link to="/app/discover" className="nb-btn mt-5 inline-block min-h-11 px-5 py-2.5 text-xs">
            FIND TOOLS →
          </Link>

          {starterPicks.length > 0 && (
            <div className="mt-12">
              <h2 className="arcade-heading section text-xl sm:text-2xl">STARTER PICKS</h2>
              <p className="mt-2 max-w-md text-sm text-slate-400">
                Your three highest-scoring tools right now. Save one to start the
                shortlist.
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {starterPicks.map((tool, i) => (
                  <ToolCard
                    key={tool.slug}
                    tool={tool}
                    index={i}
                    reason={matchReasonShort(tool, answers)}
                    inStack={stack.includes(tool.slug)}
                    onToggleStack={toggleStack}
                    isFavorite={favoriteSlugs.includes(tool.slug)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No persona: starterPicks needs a score to sort by, so it is empty
              here and this screen used to be one stretched card above 400px of
              nothing. Constrain the card to a readable measure and give the
              page something to actually do — recognisable tools, savable right
              now, which is the whole point of a shortlist page. */}
          {starterPicks.length === 0 && (
            <>
            <div className="sticker cyan mt-10 max-w-2xl p-5">
              <p className="arcade-heading lime compact text-lg">◆ GET RANKED PICKS</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Answer nine questions and Toolnaut scores all {TOOLS.length} tools
                against how you actually work — so this page can suggest, not just store.
              </p>
              <Link to="/goal" className="nb-btn cyan mt-4 inline-block min-h-11 px-4 py-2.5 text-xs">
                TAKE THE 60-SECOND QUIZ
              </Link>
            </div>

            <div className="mt-10">
              <h2 className="arcade-heading section text-xl sm:text-2xl">START WITH A NAME YOU KNOW</h2>
              <p className="mt-2 max-w-lg text-sm text-slate-400">
                Recognisable tools across six kinds of work. Tap the heart to
                shortlist one now — the quiz will rank it later.
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recognisableStarters(TOOLS, 4).map((tool, i) => (
                  <ToolCard
                    key={tool.slug}
                    tool={tool}
                    index={i}
                    inStack={stack.includes(tool.slug)}
                    onToggleStack={toggleStack}
                    isFavorite={favoriteSlugs.includes(tool.slug)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {total} tool{total === 1 ? '' : 's'} saved
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="saved-sort" className="text-xs uppercase tracking-widest text-slate-600">Sort</label>
              <select
                id="saved-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="min-h-9 cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold text-white"
                style={{ background: 'rgba(20,18,31,0.9)', border: '2px solid #000' }}
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {presentCats.length > 1 && (
            <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              <button
                onClick={() => setCat('')}
                aria-pressed={!cat}
                className={`arcade-chip press min-h-9 shrink-0 cursor-pointer ${!cat ? 'on' : ''}`}
              >
                All
              </button>
              {presentCats.map(([id, meta]) => (
                <button
                  key={id}
                  onClick={() => setCat(cat === id ? '' : id)}
                  aria-pressed={cat === id}
                  className={`arcade-chip press min-h-9 shrink-0 cursor-pointer ${cat === id ? 'on' : ''}`}
                >
                  {meta.name}
                </button>
              ))}
            </div>
          )}

          {tools.length === 0 ? (
            <div className="mt-12">
              <h2 className="arcade-heading section text-xl">NOTHING IN THIS CATEGORY</h2>
              <p className="mt-2 text-sm text-slate-400">
                You have saved tools, just none filed under this one.
              </p>
              <button onClick={() => setCat('')} className="nb-btn dark mt-4 min-h-11 px-4 py-2 text-xs">
                SHOW ALL SAVED
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tools.map((tool, i) => (
                <ToolCard
                  key={tool.slug}
                  tool={tool}
                  index={i}
                  reason={matchReasonShort(tool, answers)}
                  inStack={stack.includes(tool.slug)}
                  onToggleStack={toggleStack}
                  isFavorite
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}

          <p className="mt-10 text-sm text-slate-400">
            Ready to commit some of these?{' '}
            <Link to="/app/stack" className="font-bold underline underline-offset-2" style={{ color: 'var(--lime)' }}>
              Your stack
            </Link>{' '}
            is where the ones you actually use live.
          </p>
        </>
      )}
    </div>
  )
}
