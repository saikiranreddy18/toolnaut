import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useHead, SITE } from '../utils/head'
import { getCollection } from '../utils/collectionsData'
import { getTool, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../utils/toolsCatalog'
import { loadSession } from '../state/authStore'
import { addToStack, loadStack } from '../state/stackStore'
import { getFaviconUrl } from '../utils/faviconUrl'

// Same "adopt" pattern as SharedStack.jsx's adoptAndGo, applied to a
// hand-curated slug list instead of a pasted-link user stack.
export default function CollectionDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const collection = getCollection(slug)
  const tools = collection ? collection.toolSlugs.map(getTool).filter(Boolean) : []
  const session = loadSession()
  const alreadyHasAll = tools.length > 0 && tools.every((t) => loadStack().includes(t.slug))
  const [added, setAdded] = useState(false)

  useHead(
    collection
      ? {
          title: `${collection.title} — ${tools.length} AI tools — Toolnaut`,
          description: collection.blurb,
          path: `/collections/${slug}`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: collection.title,
            url: `${SITE}/collections/${slug}`,
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: tools.length,
              itemListElement: tools.map((t, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: t.name,
                description: t.blurb,
                url: `${SITE}/ai-tools/${t.slug}`,
              })),
            },
          },
        }
      : {},
  )

  if (!collection) return <Navigate to="/collections" replace />

  function adoptAndGo(destination) {
    tools.forEach((t) => addToStack(t.slug))
    setAdded(true)
    setTimeout(() => navigate(destination), 500)
  }

  return (
    <div id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-5 py-10 lg:py-16">
      <Link to="/collections" className="text-xs text-zinc-400 underline underline-offset-4">
        ← All collections
      </Link>
      <p className="mt-4 font-display text-xs uppercase tracking-[0.2em] font-semibold cosmic-text">
        Collection
      </p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">{collection.title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300">{collection.rationale}</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const meta = CATEGORY_META[tool.category] || { name: tool.category, color: 'var(--cyan)' }
          return (
            <div key={tool.slug} className="glass rounded-2xl p-5">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                <span className="truncate">{tool.sourceCategory}</span>
              </span>
              <Link to={`/ai-tools/${tool.slug}`} className="arcade-heading mt-2 flex items-center gap-2 text-base hover:underline underline-offset-4">
                {getFaviconUrl(tool) && (
                  <img
                    src={getFaviconUrl(tool)}
                    alt=""
                    loading="lazy"
                    width={28}
                    height={28}
                    className="h-7 w-7 shrink-0 rounded-full"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                )}
                {tool.name}
              </Link>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">{tool.blurb}</p>
              <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                <span className="rounded-full border border-white/20 px-2 py-0.5">{PRICE_LABELS[tool.price]}</span>
                <span className="rounded-full border border-white/20 px-2 py-0.5">{LEVEL_LABELS[tool.level]}</span>
              </div>
            </div>
          )
        })}
      </div>

      {session ? (
        <div className="mt-10 flex flex-wrap items-center gap-4">
          {alreadyHasAll ? (
            <p className="text-sm text-zinc-400">You already have all {tools.length} of these.</p>
          ) : (
            <button
              onClick={() => adoptAndGo('/app/stack')}
              className="glow-btn inline-block rounded-full bg-gradient-to-r from-exus-purple to-exus-cyan px-7 py-3 font-display text-sm font-semibold text-white"
            >
              {added ? '✓ Added!' : `Add all ${tools.length} to my stack`}
            </button>
          )}
          <Link to="/app/stack" className="text-sm text-zinc-400 underline underline-offset-4">
            View my stack instead
          </Link>
        </div>
      ) : (
        <button
          onClick={() => adoptAndGo('/goal')}
          className="glow-btn mt-10 inline-block rounded-full bg-gradient-to-r from-exus-purple to-exus-cyan px-7 py-3 font-display text-sm font-semibold text-white"
        >
          {added ? '✓ Added!' : 'Add these & take the quiz'}
        </button>
      )}
    </div>
  )
}
