import { Link } from 'react-router-dom'
import { PRICE_LABELS, LEVEL_LABELS } from '../utils/toolsCatalog'
import { getNewTools } from '../utils/newTools'
import { isCatalogNoise } from '../utils/prominence'
import { timeAgo } from '../utils/communityData'

// Public, crawlable, no session required — same tier as CategoryLanding.jsx
// and SharedStack.jsx. Reuses the already-tested getNewTools() util (the same
// one Discover.jsx's gated "New this week" strip already calls), just at a
// 30-day window instead of 7 so a public SEO page isn't empty most weeks.
export default function NewTools() {
  const tools = getNewTools(30).filter((t) => !isCatalogNoise(t))

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:py-16">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-black text-exus-lime">
        ▸ FRESH FROM THE RADAR
      </p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        NEWEST AI TOOLS ADDED TO TOOLNAUT
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
        {tools.length > 0
          ? `${tools.length} tool${tools.length === 1 ? '' : 's'} added in the last 30 days, discovered automatically by Toolnaut's radar pipeline — nothing here is sponsored.`
          : "Toolnaut's radar pipeline discovers new AI tools daily from GitHub, Hacker News, Product Hunt and RSS — nothing sponsored, nothing hand-picked."}
      </p>

      <Link to="/goal" className="nb-btn mt-6 inline-block px-6 py-3 text-sm">
        🚀 Take the 60-second quiz for your own stack
      </Link>

      {tools.length === 0 ? (
        <p className="mt-10 text-sm text-slate-400">No new tools in the last 30 days — check back soon.</p>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <div key={tool.slug} className="glass rounded-2xl p-5">
              <span className="flex items-center justify-between gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                <span className="truncate">{tool.sourceCategory}</span>
                <span className="shrink-0 text-exus-lime">Added {timeAgo(new Date(tool.discoveredAt).getTime())}</span>
              </span>
              <p className="arcade-heading lime mt-2 text-base">{tool.name.toUpperCase()}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">{tool.blurb}</p>
              <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                <span className="rounded-full border border-white/20 px-2 py-0.5">{PRICE_LABELS[tool.price]}</span>
                <span className="rounded-full border border-white/20 px-2 py-0.5">{LEVEL_LABELS[tool.level]}</span>
              </div>
            </div>
          ))}
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
