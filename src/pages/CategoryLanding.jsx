import { Link, Navigate, useParams } from 'react-router-dom'
import { TOOLS, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../utils/toolsCatalog'

// One-line, honest descriptions — no per-tool editorial content is invented,
// this just frames what the domain's filtered tool list already contains.
const DOMAIN_BLURB = {
  code: 'Coding assistants, LLMOps platforms, security and AI-hardware tools for developers shipping product.',
  design: 'Image, video, audio, presentation and 3D generation tools for visual and creative work.',
  writing: 'Chatbots, copywriting, marketing, legal and translation tools for words and outreach.',
  data: 'Research, analytics, finance, healthcare and science tools for anyone working with data.',
  automation: 'Agents, meeting notes, HR and customer-support tools that automate the busywork.',
  learning: 'Tools built for education, tutoring and skill-building.',
}

// Public, crawlable, no session required — the top-of-funnel surface a search
// engine or a shared link can land on directly, unlike everything behind
// AppShell's session guard. Reuses SharedStack.jsx's read-only card pattern.
export default function CategoryLanding() {
  const { domain } = useParams()
  const meta = CATEGORY_META[domain]
  if (!meta) return <Navigate to="/" replace />

  const tools = TOOLS.filter((t) => t.category === domain)

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:py-16">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-black" style={{ color: meta.color }}>
        ▸ {meta.name.toUpperCase()} TOOLS
      </p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        BEST AI TOOLS FOR {meta.name.toUpperCase()}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
        {DOMAIN_BLURB[domain] || `${tools.length} tools in this category.`}
      </p>

      <Link to="/goal" className="nb-btn mt-6 inline-block px-6 py-3 text-sm">
        🚀 Take the 60-second quiz for your own stack
      </Link>

      {tools.length === 0 ? (
        <p className="mt-10 text-sm text-slate-400">No tools in this category yet — check back soon.</p>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
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
