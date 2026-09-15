import { useState } from 'react'
import { resourcesFor, VERIFIED } from '../../data/toolResources'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'

// "What does this connect to?" and "Where do I learn it?", on the tool page.
//
// Both answer the two most common questions after "is this the right tool":
// will it fit the apps I already use, and how do I get good at it. Every fact
// links to the official page it came from, with the date it was checked, so a
// reader can confirm it rather than take our word — see data/toolResources.js
// for the sourcing rule. A tool with nothing verified shows nothing.

const SHOWN = 12

const KIND_LABEL = { course: 'Course', docs: 'Docs', help: 'Help center' }

function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export default function ToolResources({ tool }) {
  const data = resourcesFor(tool?.slug)
  const track = useAnalytics()
  const [all, setAll] = useState(false)
  if (!data) return null

  const integ = data.integrations
  const names = integ ? (all ? integ.names : integ.names.slice(0, SHOWN)) : []
  const hidden = integ ? integ.names.length - SHOWN : 0

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {integ && (
        <section className="sticker p-5 sm:col-span-2" style={{ transform: 'rotate(0)' }} aria-labelledby="works-with">
          <h2 id="works-with" className="arcade-heading compact text-lg">
            {integ.kind === 'works_in' ? 'Works in' : 'Works with'}
          </h2>
          {integ.summary && <p className="mt-2 text-sm font-bold text-white">{integ.summary}</p>}
          <ul className="mt-3 flex flex-wrap gap-2" aria-label={integ.kind === 'works_in' ? 'Where it works' : 'Integrations'}>
            {names.map((n) => (
              <li key={n} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-zinc-200">
                {n}
              </li>
            ))}
            {hidden > 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => setAll((v) => !v)}
                  className="rounded-full border-2 border-dashed border-zinc-500 px-2.5 py-1 text-xs font-bold text-zinc-300 hover:text-white"
                  aria-expanded={all}
                >
                  {all ? 'Show fewer' : `+${hidden} more`}
                </button>
              </li>
            )}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
            {integ.note ? `${integ.note} ` : ''}Source:{' '}
            <a
              href={integ.source.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track(EVENTS.INTEGRATION_SOURCE_CLICKED, { tool: tool.slug })}
              className="underline underline-offset-2 hover:text-zinc-300"
            >
              {integ.source.title}
            </a>{' '}
            · checked {formatDate(VERIFIED)}
          </p>
        </section>
      )}

      {data.learn?.length > 0 && (
        <section className="sticker cyan p-5 sm:col-span-2" style={{ transform: 'rotate(0)' }} aria-labelledby="learn-it">
          <h2 id="learn-it" className="arcade-heading compact text-lg">Learn it</h2>
          <p className="mt-1 text-xs text-zinc-400">Official training from {tool.name}&apos;s makers.</p>
          <ul className="mt-3 space-y-2">
            {data.learn.map((r) => (
              <li key={r.url}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track(EVENTS.LEARN_RESOURCE_CLICKED, { tool: tool.slug, kind: r.kind })}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 transition-colors hover:bg-white/10"
                >
                  <span className="text-sm font-bold text-white">{r.title}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 font-display text-[9px] font-semibold text-black" style={{ background: 'var(--cyan)' }}>
                      {KIND_LABEL[r.kind]}
                    </span>
                    <span aria-hidden="true" className="text-zinc-400 group-hover:text-white">↗</span>
                    <span className="sr-only">(opens in a new tab)</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
