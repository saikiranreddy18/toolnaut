import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NAV } from '../../shells/AppShell'
import { TOOLS } from '../../utils/toolsCatalog'
import { matchesQuery } from '../../utils/search'
import { CloseIcon } from './icons'

const TOOL_CAP = 8

// Global quick-jump (Cmd/Ctrl+K): type a few letters from anywhere in /app and
// land on a nav destination or a specific tool, instead of nav-to-Discover-
// then-filter. Pure navigation — no in-palette actions in this first cut.
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    setSelected(0)
    inputRef.current?.focus()
  }, [open])

  const navMatches = useMemo(() => {
    const query = q.trim().toLowerCase()
    return NAV.filter((n) => !query || n.label.toLowerCase().includes(query))
  }, [q])

  const toolMatches = useMemo(() => {
    if (!q.trim()) return []
    return TOOLS.filter((t) => matchesQuery(t, q)).slice(0, TOOL_CAP)
  }, [q])

  const results = useMemo(() => [
    ...navMatches.map((n) => ({ kind: 'nav', to: n.to, label: n.label })),
    ...toolMatches.map((t) => ({ kind: 'tool', to: `/app/tools/${t.slug}`, label: t.name })),
  ], [navMatches, toolMatches])

  useEffect(() => { setSelected(0) }, [q])

  function go(to) {
    navigate(to)
    onClose()
  }

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((i) => Math.min(i + 1, results.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((i) => Math.max(i - 1, 0)) }
      else if (e.key === 'Enter') { e.preventDefault(); const r = results[selected]; if (r) go(r.to) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, selected])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Quick jump">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" onClick={onClose} />
      <div className="sticker relative w-full max-w-lg overflow-hidden !p-0" style={{ boxShadow: '0 24px 60px -20px rgba(0,0,0,0.85)' }}>
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <label htmlFor="palette-input" className="sr-only">Quick jump to a page or tool</label>
          <input
            id="palette-input"
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to a page or tool..."
            className="w-full bg-transparent text-base text-white placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick jump"
            className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:text-white"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">No matches for &quot;{q}&quot;</p>
          )}
          {navMatches.length > 0 && (
            <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Go to</p>
          )}
          {navMatches.map((n) => {
            const idx = results.findIndex((r) => r.kind === 'nav' && r.to === n.to)
            return (
              <button
                key={n.to}
                type="button"
                onMouseEnter={() => setSelected(idx)}
                onClick={() => go(n.to)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${idx === selected ? 'bg-white/10 text-white' : 'text-zinc-300'}`}
              >
                {n.label}
              </button>
            )
          })}
          {toolMatches.length > 0 && (
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tools</p>
          )}
          {toolMatches.map((t) => {
            const to = `/app/tools/${t.slug}`
            const idx = results.findIndex((r) => r.kind === 'tool' && r.to === to)
            return (
              <button
                key={t.slug}
                type="button"
                onMouseEnter={() => setSelected(idx)}
                onClick={() => go(to)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm ${idx === selected ? 'bg-white/10 text-white' : 'text-zinc-300'}`}
              >
                <span>{t.name}</span>
                <span className="text-xs text-zinc-500">{t.sourceCategory}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
