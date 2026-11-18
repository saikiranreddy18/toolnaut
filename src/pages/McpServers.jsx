import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import { useHead, SITE } from '../utils/head'
import { TOOLS, PRICE_LABELS, LEVEL_LABELS } from '../utils/toolsCatalog'
import { isMcpTool } from '../utils/mcpTools'
import { isCatalogNoise } from '../utils/prominence'
import { newestDiscovery, formatUpdated } from '../utils/freshness'
import { haptic } from '../utils/haptics'

const PAGE_SIZE = 24

// Public, crawlable, no session required — same tier as NewTools.jsx and
// CategoryLanding.jsx. MCP is a tag, not a 7th domain: the tools it matches
// already have real domains (code, automation) that would become ambiguous
// if MCP became a taxonomy level, so this stays a flat, tag-derived view.
export default function McpServers() {
  const tools = TOOLS.filter((t) => isMcpTool(t) && !isCatalogNoise(t))
  const [count, setCount] = useState(PAGE_SIZE)
  const visible = tools.slice(0, count)
  const remaining = tools.length - visible.length
  // The newest tool on this page, not the build time — see utils/freshness.js.
  const updated = newestDiscovery(tools)

  useHead({
    title: `AI tools with MCP servers (${tools.length} compared) — Toolnaut`,
    description:
      'AI tools that ship an MCP (Model Context Protocol) server, found by the nightly radar. What each one connects to, what it costs, and how hard it is to pick up.',
    path: '/mcp-servers',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `AI tools with MCP servers (${tools.length} compared)`,
      url: `${SITE}/mcp-servers`,
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
  })

  return (
    <div id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-5 py-10 lg:py-16">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link to="/" aria-label="Toolnaut home">
          <BrandLogo {...LOGO.page} />
        </Link>
        <Link to="/goal" className="nb-btn px-4 py-2 text-xs">
          Find your stack
        </Link>
      </header>

      <p className="text-xs font-medium uppercase tracking-[0.22em] cosmic-text">
        MCP ecosystem
      </p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        AI tools with MCP servers
      </h1>
      {updated && (
        <p className="mt-2 text-xs text-zinc-400">
          Updated <time dateTime={updated}>{formatUpdated(updated)}</time>
        </p>
      )}
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300">
        MCP (Model Context Protocol) is the open standard that lets AI
        assistants and coding agents connect to outside tools and data. Every
        tool below ships an MCP server or client, found automatically by
        Toolnaut's radar pipeline — nothing here is sponsored.
      </p>

      <Link to="/goal" className="nb-btn mt-6 inline-block px-6 py-3 text-sm">
        Take the 60-second quiz for your own stack
      </Link>

      {tools.length === 0 ? (
        <p className="mt-10 text-sm text-zinc-400">No MCP tools found yet — check back soon.</p>
      ) : (
        <>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((tool) => (
              <div key={tool.slug} className="glass rounded-2xl p-5">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
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

          <div className="mt-8 flex flex-col items-center gap-3 pb-4">
            <p aria-live="polite" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Showing {visible.length} of {tools.length} tools
            </p>
            {remaining > 0 && (
              <button
                onClick={() => { haptic.tap(); setCount(count + PAGE_SIZE) }}
                className="nb-btn min-h-11 px-6 py-3 text-sm"
              >
                LOAD {Math.min(remaining, PAGE_SIZE)} MORE
              </button>
            )}
          </div>
        </>
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
