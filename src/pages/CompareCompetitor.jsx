import { Fragment } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useHead, SITE } from '../utils/head'
import { COMPARISONS } from '../content/comparisons'
import { BUNDLED_COUNT } from '../utils/toolsCatalog'

// The single highest-intent SEO page type a directory has — someone typing
// "Toolnaut vs Futurepedia" is already comparing directories, not asking what
// an AI tool is. Public, prerendered, no session — same shape as
// PublicCompare.jsx's per-tool table, one row per directory-level fact
// instead of per catalog tool.
const TOOLNAUT_FLOOR = Math.floor(BUNDLED_COUNT / 100) * 100

export default function CompareCompetitor() {
  const { slug } = useParams()
  const c = COMPARISONS.find((x) => x.slug === slug)

  useHead(
    c
      ? {
          title: `Toolnaut vs ${c.name} — Which AI tool directory fits you?`,
          description: `How Toolnaut compares to ${c.name}: catalog size, browsing model, pricing, and what Toolnaut does differently — a personalized stack and roadmap, not just a bigger list.`,
          path: `/vs/${c.slug}`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: `Toolnaut vs ${c.name}`,
            url: `${SITE}/vs/${c.slug}`,
          },
        }
      : { path: `/vs/${slug}` },
  )

  if (!c) return <Navigate to="/" replace />

  const rows = [
    { label: 'Catalog size', toolnaut: `${TOOLNAUT_FLOOR}+ tools`, them: c.catalogSize },
    { label: 'Browsing model', toolnaut: 'Quiz-personalized stack, not a browse list', them: c.browseModel },
    { label: 'Pricing', toolnaut: 'Free for 7 days, then a one-time pass', them: c.pricing },
    { label: 'Learning plan', toolnaut: '4-week guided roadmap included', them: 'Not offered' },
  ]

  return (
    <div id="main-content" tabIndex={-1} className="relative z-10 mx-auto max-w-4xl px-5 py-10 lg:py-16">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-semibold cosmic-text">
        Toolnaut vs {c.name}
      </p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        Toolnaut vs {c.name}: which fits you?
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300">{c.toolnautDifference}</p>

      <div className="mt-8 overflow-x-auto">
        <div className="grid min-w-[28rem] gap-px" style={{ gridTemplateColumns: '9rem repeat(2, minmax(10rem, 1fr))' }}>
          <div />
          <div className="sticker p-4">
            <p className="arcade-heading compact text-base">Toolnaut</p>
          </div>
          <div className="sticker p-4">
            <p className="arcade-heading compact text-base">{c.name}</p>
          </div>
          {rows.map((row) => (
            <Fragment key={row.label}>
              <div className="flex items-center px-3 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">
                {row.label}
              </div>
              <div className="flex items-center border-t border-white/10 px-3 py-3 text-sm text-white">
                {row.toolnaut}
              </div>
              <div className="flex items-center border-t border-white/10 px-3 py-3 text-sm text-white">
                {row.them}
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      {c.strengths?.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Where {c.name} is ahead</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-zinc-300">
            {c.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-12 text-center">
        <Link
          to="/goal"
          className="glow-btn inline-block rounded-full bg-gradient-to-r from-exus-purple to-exus-cyan px-7 py-3 font-display text-sm font-semibold text-white"
        >
          Build my own stack
        </Link>
      </div>
    </div>
  )
}
