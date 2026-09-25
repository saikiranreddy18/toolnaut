import { Link, Navigate, useParams } from 'react-router-dom'
import { useHead, SITE } from '../utils/head'
import { TOOLS, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../utils/toolsCatalog'
import { newestDiscovery, formatUpdated } from '../utils/freshness'
import { FLAGSHIP, starterScore, isCatalogNoise } from '../utils/prominence'

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

// The questions people ask a search engine or an AI assistant about a category,
// answered only from catalog fields (price, level, flagship list) so every
// sentence is checkable. A question with nothing true to say is dropped.
function categoryFaq(domain, name, tools) {
  const lower = name.toLowerCase()
  const ranked = tools
    .filter((t) => !isCatalogNoise(t))
    .map((t) => ({ t, s: starterScore(t, FLAGSHIP[domain] || []) }))
    .sort((a, b) => b.s - a.s || a.t.name.localeCompare(b.t.name))
    .map((x) => x.t)
  const names = (list) => list.slice(0, 5).map((t) => t.name).join(', ')
  const free = ranked.filter((t) => t.price === 'free' || t.price === 'freemium')
  const beginner = ranked.filter((t) => t.level === 'beginner')
  return [
    ranked.length && {
      q: `What are the best AI tools for ${lower}?`,
      a: `Well-known starting points among the ${tools.length} ${lower} tools on Toolnaut are ${names(ranked)}. The right pick depends on your role, budget and experience — Toolnaut's 60-second quiz ranks them for you and shows why each one fits.`,
    },
    free.length && {
      q: `Are there free AI tools for ${lower}?`,
      a: `Yes. ${free.length} of the ${tools.length} ${lower} tools on Toolnaut are free or have a free tier, including ${names(free)}.`,
    },
    beginner.length && {
      q: `Which AI tools for ${lower} are good for beginners?`,
      a: `${beginner.length} ${lower} tools on Toolnaut are rated beginner-friendly, including ${names(beginner)}.`,
    },
  ].filter(Boolean)
}

// Public, crawlable, no session required — the top-of-funnel surface a search
// engine or a shared link can land on directly, unlike everything behind
// AppShell's session guard. Reuses SharedStack.jsx's read-only card pattern.
export default function CategoryLanding() {
  const { domain } = useParams()
  const meta = CATEGORY_META[domain]
  // Everything below runs for an unknown domain too. useHead is a hook, so it
  // cannot sit after the redirect return — React requires the same hooks on
  // every render, and a route change from /tools/design to /tools/nonsense
  // would otherwise change the count and throw.
  const tools = meta ? TOOLS.filter((t) => t.category === domain) : []
  // Only tools the radar added carry a date. A category with none shows no
  // "updated" date at all rather than an invented one — see utils/freshness.js.
  const updated = newestDiscovery(tools)
  const faq = meta ? categoryFaq(domain, meta.name, tools) : []

  // These six pages are the strongest organic-search assets on the site —
  // "best AI tools for design" is exactly what someone types — and every one of
  // them was shipping the homepage's title and, worse, its canonical, which
  // asks Google to treat them all as duplicates of the homepage and index none
  // of them. ItemList so the tools are legible as a list rather than prose.
  useHead(
    meta
      ? {
          title: `Best AI tools for ${meta.name.toLowerCase()} (${tools.length} compared) — Toolnaut`,
          description:
            DOMAIN_BLURB[domain] ||
            `${tools.length} AI tools for ${meta.name.toLowerCase()}, with pricing, difficulty and what each one is actually for.`,
          path: `/tools/${domain}`,
          jsonLd: [{
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `Best AI tools for ${meta.name}`,
            url: `${SITE}/tools/${domain}`,
            ...(updated ? { dateModified: updated } : {}),
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: tools.length,
              itemListElement: tools.slice(0, 25).map((t, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: t.name,
                description: t.blurb,
                url: `${SITE}/ai-tools/${t.slug}`,
              })),
            },
          },
          ...(faq.length
            ? [{
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: faq.map((f) => ({
                  '@type': 'Question',
                  name: f.q,
                  acceptedAnswer: { '@type': 'Answer', text: f.a },
                })),
              }]
            : [])],
        }
      : {},
  )

  if (!meta) return <Navigate to="/" replace />

  return (
    <div id="main-content" tabIndex={-1} className="relative z-10 mx-auto max-w-5xl px-5 py-10 lg:py-16">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-semibold" style={{ color: meta.color }}>
        {meta.name} tools
      </p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        Best AI tools for {meta.name.toLowerCase()}
      </h1>
      {updated && (
        <p className="mt-2 text-xs text-zinc-400">
          Updated <time dateTime={updated}>{formatUpdated(updated)}</time>
        </p>
      )}
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300">
        {DOMAIN_BLURB[domain] || `${tools.length} tools in this category.`}
      </p>

      <Link to="/goal" className="nb-btn mt-6 inline-block px-6 py-3 text-sm">
        Take the 60-second quiz for your own stack
      </Link>

      {tools.length === 0 ? (
        <p className="mt-10 text-sm text-zinc-400">No tools in this category yet — check back soon.</p>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <div key={tool.slug} className="glass rounded-2xl p-5">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                <span className="truncate">{tool.sourceCategory}</span>
              </span>
              <Link to={`/ai-tools/${tool.slug}`} className="arcade-heading mt-2 block text-base hover:underline underline-offset-4">
                {tool.name}
              </Link>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">{tool.blurb}</p>
              <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                <span className="rounded-full border border-white/20 px-2 py-0.5">{PRICE_LABELS[tool.price]}</span>
                <span className="rounded-full border border-white/20 px-2 py-0.5">{LEVEL_LABELS[tool.level]}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {faq.length > 0 && (
        <section className="mt-14 max-w-3xl">
          <h2 className="arcade-heading text-xl">Common questions</h2>
          <div className="mt-4 space-y-4">
            {faq.map((f) => (
              <div key={f.q} className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white">{f.q}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-300">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
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
