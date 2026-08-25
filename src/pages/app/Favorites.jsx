import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getTool, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../../utils/toolsCatalog'
import { loadFavorites, removeFavorite } from '../../state/favoritesStore'
import { loadStack, addToStack, removeFromStack } from '../../state/stackStore'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { haptic } from '../../utils/haptics'
import { HeartIcon } from '../../components/app/icons'

// Lightweight save-for-later list — separate from Stack's heavier
// add-to-stack action, same shape stackStore already uses.
export default function Favorites() {
  const [favoriteSlugs, setFavoriteSlugs] = useState(loadFavorites)
  const [stack, setStack] = useState(loadStack)
  const track = useAnalytics()

  const tools = favoriteSlugs.map(getTool).filter(Boolean)

  function unfavorite(slug) {
    setFavoriteSlugs(removeFavorite(slug))
  }

  function toggleStack(tool) {
    if (stack.includes(tool.slug)) {
      setStack(removeFromStack(tool.slug))
    } else {
      haptic.select()
      setStack(addToStack(tool.slug))
      track(EVENTS.CTA_CLICK, { cta: 'add_to_stack', tool: tool.slug, location: 'favorites' })
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:py-10">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-black" style={{ color: 'var(--lime)' }}>▸ SAVED</p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        {tools.length > 0 ? `${tools.length} FAVORITE${tools.length === 1 ? '' : 'S'}` : 'NO FAVORITES YET'}
      </h1>

      {tools.length === 0 ? (
        <div className="mt-8">
          <p className="max-w-md text-sm text-slate-400">
            Tap the heart on any tool in Discover to shortlist it here — no
            commitment, just a save for later.
          </p>
          <Link to="/app/discover" className="nb-btn mt-5 inline-block px-5 py-2.5 text-xs">
            BROWSE TOOLS →
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool, i) => {
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
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); unfavorite(tool.slug) }}
                    aria-label="Remove from favorites"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--hot-pink)]"
                  >
                    <HeartIcon filled />
                  </button>
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
                  {added ? '✓ IN STACK' : '⚡ ADD TO STACK'}
                </button>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
