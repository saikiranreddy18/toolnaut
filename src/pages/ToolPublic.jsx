import { Link, Navigate, useParams } from 'react-router-dom'
import { useHead } from '../utils/head'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import { TOOLS, getTool, CATEGORY_META, PRICE_LABELS, LEVEL_LABELS } from '../utils/toolsCatalog'
import { relatedTools, toolDescription, toolJsonLd, toolPath, toolTitle } from '../utils/toolSeo'

// /ai-tools/:slug — the public, indexable page for one tool.
//
// The in-app page (/app/tools/:slug) is personalised: fit for YOUR role, add to
// YOUR stack. This one is the same facts for everyone, so it can be crawled,
// shared and ranked. It links into the app rather than duplicating it: "Add to
// my stack" and "See how it fits me" both go through the app.
//
// The static HTML a crawler receives for this URL is written at build time by
// scripts/gen-tool-pages.mjs from the same utils/toolSeo.js, so the head the
// crawler sees and the head this component sets are identical.
export default function ToolPublic() {
  const { slug } = useParams()
  const tool = getTool(slug)
  const related = tool ? relatedTools(tool, TOOLS, 6) : []

  useHead(
    tool
      ? {
          title: toolTitle(tool),
          description: toolDescription(tool),
          path: toolPath(tool.slug),
          jsonLd: toolJsonLd(tool, related),
        }
      : { noindex: true },
  )

  if (!tool) return <Navigate to="/search" replace />

  const meta = CATEGORY_META[tool.category]
  const facts = [
    ['Pricing', PRICE_LABELS[tool.price] || tool.pricing],
    ['Level', LEVEL_LABELS[tool.level]],
    ['Category', tool.sourceCategory],
    ['Best for', tool.audience],
    ['Worth knowing', tool.note],
    ['Made by', tool.dev],
    ['Launched', tool.year],
  ].filter(([, v]) => v)

  return (
    <div id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-5 py-10 lg:py-16">
      <header className="mb-10 flex items-center justify-between gap-4">
        <Link to="/" aria-label="Toolnaut home">
          <BrandLogo {...LOGO.page} />
        </Link>
        <Link to="/goal" className="nb-btn px-4 py-2 text-xs">
          Find your stack
        </Link>
      </header>

      <nav aria-label="Breadcrumb" className="text-xs text-zinc-500">
        <Link to="/" className="hover:text-zinc-300">Toolnaut</Link>
        <span className="mx-1.5">›</span>
        {meta && (
          <>
            <Link to={`/tools/${tool.category}`} className="hover:text-zinc-300">
              AI tools for {meta.name.toLowerCase()}
            </Link>
            <span className="mx-1.5">›</span>
          </>
        )}
        <span className="text-zinc-400">{tool.name}</span>
      </nav>

      <h1 className="arcade-heading mt-4 text-4xl sm:text-5xl">{tool.name}</h1>
      {tool.blurb && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-300">{tool.blurb}</p>}

      <div className="mt-7 flex flex-wrap gap-3">
        <Link to={`/app/tools/${tool.slug}`} className="nb-btn px-6 py-3 text-sm">
          See how it fits you
        </Link>
        {tool.website && (
          <a
            href={tool.website}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="nb-btn dark px-6 py-3 text-sm"
          >
            Visit {tool.name} ↗
          </a>
        )}
      </div>

      <section className="sticker mt-10 p-6">
        <h2 className="font-display text-lg font-semibold text-white">At a glance</h2>
        <dl className="mt-4 divide-y divide-white/5">
          {facts.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[130px_1fr] gap-4 py-2.5 text-sm">
              <dt className="text-zinc-500">{label}</dt>
              <dd className="text-zinc-200">{value}</dd>
            </div>
          ))}
        </dl>
        {tool.tags?.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {tool.tags.map((tag) => (
              <li key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">{tag}</li>
            ))}
          </ul>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-white">Alternatives to {tool.name}</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {related.map((o) => (
              <li key={o.slug}>
                <Link to={toolPath(o.slug)} className="sticker block h-full p-5 transition hover:border-white/20">
                  <span className="font-display text-base font-semibold text-white">{o.name}</span>
                  <span className="mt-1.5 block text-xs leading-relaxed text-zinc-400">{o.blurb}</span>
                  <span className="mt-3 inline-block rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-zinc-500">
                    {PRICE_LABELS[o.price] || o.pricing}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {related[0] && (
            <p className="mt-5 text-sm">
              <Link to={`/compare/${tool.slug},${related[0].slug}`} className="text-zinc-300 underline underline-offset-4 hover:text-white">
                Compare {tool.name} with {related[0].name} →
              </Link>
            </p>
          )}
        </section>
      )}

      <section className="sticker mt-12 p-7 text-center">
        <h2 className="font-display text-xl font-semibold text-white">Not sure {tool.name} is right for you?</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-400">
          Tell Toolnaut your role and goal and get a ranked AI stack from {TOOLS.length.toLocaleString()} tools, with the reasoning shown.
        </p>
        <Link to="/goal" className="nb-btn mt-5 inline-block px-6 py-3 text-sm">Build my AI stack — free</Link>
      </section>
    </div>
  )
}
