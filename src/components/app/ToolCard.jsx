import { Link } from 'react-router-dom'
import { CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../../utils/toolsCatalog'
import { isNewTool } from '../../utils/newTools'
import { HeartIcon } from './icons'

// The one tool card, shared by Discover and Favorites.
//
// WHY THIS IS NOT A <Link> WRAPPING THE WHOLE CARD, WHICH IS WHAT IT REPLACED.
// The old card was an <a> containing two <button>s, a <label> and a checkbox.
// Interactive-inside-interactive is invalid HTML: the buttons were unreachable
// by keyboard in the tab order the visual layout implies, and screen readers
// announced one enormous link per card. On Discover that was ~3,000 nested
// controls on a single page.
//
// So the card is an <article>, the tool name is a real <h3>, and the LINK is
// stretched over the card with ::after. Whole-card click survives, the actions
// sit above it on z-10 as siblings, and every card becomes a heading a screen
// reader can jump between — which is the only way to navigate a long result
// list without arrowing through every control.
export default function ToolCard({
  tool,
  index = 0,
  inStack,
  onToggleStack,
  isFavorite,
  onToggleFavorite,
  reason,
  compare,
}) {
  const meta = CATEGORY_META[tool.category] || { name: tool.category, color: 'var(--cyan)' }
  const stickerColor = index % 3 === 0 ? '' : index % 3 === 1 ? 'pink' : 'cyan'

  return (
    <article className={`sticker ${stickerColor} group relative flex flex-col p-4`}>
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
              title={`${tool.score}% match with your persona`}
            >
              {tool.score}%
            </span>
          )}
        </span>
      </div>

      <h3 className="arcade-heading lime mt-3 text-base">
        <Link
          to={`/app/tools/${tool.slug}`}
          className="after:absolute after:inset-0 after:content-[''] group-hover:opacity-80"
        >
          {tool.name.toUpperCase()}
        </Link>
      </h3>

      {/* Answers "why am I being shown this?" right where the score is, instead
          of only on the detail page the user has to open first. */}
      {reason && (
        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--lime)' }}>
          ◆ {reason}
        </p>
      )}

      <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-300">{tool.blurb}</p>

      <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
        <span className="rounded-full border border-white/20 px-2 py-0.5">{PRICE_LABELS[tool.price]}</span>
        <span className="rounded-full border border-white/20 px-2 py-0.5">{LEVEL_LABELS[tool.level]}</span>
      </div>

      {/* z-10 lifts the controls above the stretched link's ::after overlay */}
      <div className="relative z-10 mt-4 flex items-center gap-2">
        <button
          onClick={() => onToggleStack(tool)}
          aria-pressed={inStack}
          className={`nb-btn min-h-11 px-4 py-2 text-xs ${inStack ? 'dark' : ''}`}
        >
          {inStack ? '✓ IN STACK' : '⚡ ADD'}
        </button>
        <button
          onClick={() => onToggleFavorite(tool)}
          aria-label={isFavorite ? `Remove ${tool.name} from saved` : `Save ${tool.name}`}
          aria-pressed={isFavorite}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 ${
            isFavorite ? 'text-[var(--hot-pink)]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <HeartIcon filled={isFavorite} />
        </button>
        {compare && (
          <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/20 px-2.5 text-[10px] font-bold uppercase text-slate-400 hover:text-white">
            <input
              type="checkbox"
              checked={compare.checked}
              disabled={compare.disabled}
              onChange={() => compare.onToggle(tool.slug)}
              /* every checkbox on the page would otherwise announce as just
                 "Compare", with nothing to say which of 24 tools it belongs to */
              aria-label={`Compare ${tool.name}`}
              className="h-3.5 w-3.5 cursor-pointer accent-[var(--lime)] disabled:cursor-not-allowed"
            />
            <span aria-hidden="true">Compare</span>
          </label>
        )}
      </div>
    </article>
  )
}
