import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getTool, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../utils/toolsCatalog'
import { decodeStackSlugs } from '../utils/shareStack'
import { loadSession } from '../state/authStore'
import { addToStack, loadStack } from '../state/stackStore'
import { useHead, SITE } from '../utils/head'

// Public, read-only view of someone else's stack — except the CTA below,
// which does write to stackStore: adopting a shared stack is the entire
// point of sharing one, and addToStack() already no-ops with no session.
export default function SharedStack() {
  const { slugs } = useParams()
  const navigate = useNavigate()
  const tools = decodeStackSlugs(slugs).map(getTool).filter(Boolean)
  const session = loadSession()
  const alreadyHasAll = tools.length > 0 && tools.every((t) => loadStack().includes(t.slug))
  const [added, setAdded] = useState(false)

  // Not in scripts/prerender.mjs's ROUTES — content is keyed off the :slugs
  // param, not a fixed route, so this only ever reaches a client-side visitor
  // (someone who clicked a shared link), never a static crawl. Still worth
  // setting: it fixes the tab title and the pasted-link preview, which is the
  // whole reason this page exists.
  const names = tools.map((t) => t.name)
  useHead(
    tools.length > 0
      ? {
          title: `My AI stack: ${names.slice(0, 5).join(', ')}${names.length > 5 ? ` +${names.length - 5} more` : ''} — Toolnaut`,
          description: `A shared AI tool stack from Toolnaut — ${tools.length} tool${tools.length === 1 ? '' : 's'}: ${names.join(', ')}.`,
          path: `/s/${slugs}`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            numberOfItems: tools.length,
            itemListElement: tools.map((t, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: t.name,
              description: t.blurb,
              url: `${SITE}/app/tools/${t.slug}`,
            })),
          },
        }
      : { path: `/s/${slugs}` },
  )

  function adoptAndGo(destination) {
    tools.forEach((t) => addToStack(t.slug, 'shared_stack'))
    setAdded(true)
    setTimeout(() => navigate(destination), 500)
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 lg:py-16">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-black" style={{ color: 'var(--lime)' }}>
        ▸ SHARED STACK
      </p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        {tools.length > 0 ? `${tools.length} TOOL${tools.length === 1 ? '' : 'S'}` : 'STACK NOT FOUND'}
      </h1>

      {tools.length === 0 ? (
        <p className="mt-4 max-w-md text-sm text-slate-400">
          This link doesn't point to any tools we recognize — it may be old, or
          mistyped.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const meta = CATEGORY_META[tool.category] || { name: tool.category, color: 'var(--cyan)' }
            return (
              <div key={tool.slug} className="glass rounded-2xl p-5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                  <span className="truncate">{tool.sourceCategory}</span>
                </span>
                <p className="arcade-heading lime mt-2 text-base">{tool.name.toUpperCase()}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{tool.blurb}</p>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                  <span className="rounded-full border border-white/20 px-2 py-0.5">{PRICE_LABELS[tool.price]}</span>
                  <span className="rounded-full border border-white/20 px-2 py-0.5">{LEVEL_LABELS[tool.level]}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tools.length === 0 ? null : session ? (
        <div className="mt-10 flex flex-wrap items-center gap-4">
          {alreadyHasAll ? (
            <p className="text-sm text-slate-400">You already have all {tools.length} of these.</p>
          ) : (
            <button
              onClick={() => adoptAndGo('/app/stack')}
              className="glow-btn inline-block rounded-full bg-gradient-to-r from-exus-purple to-exus-cyan px-7 py-3 font-display text-sm font-semibold text-white"
            >
              {added ? '✓ Added!' : `⚡ Add all ${tools.length} to my stack`}
            </button>
          )}
          <Link to="/app/stack" className="text-sm text-slate-400 underline underline-offset-4">
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
      {tools.length === 0 && (
        <Link
          to="/goal"
          className="glow-btn mt-10 inline-block rounded-full bg-gradient-to-r from-exus-purple to-exus-cyan px-7 py-3 font-display text-sm font-semibold text-white"
        >
          Build my own stack
        </Link>
      )}
    </div>
  )
}
