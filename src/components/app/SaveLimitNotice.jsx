import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SAVE_LIMIT_EVENT } from '../../utils/saveLimit'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'

// Shown when a save is refused because the plan's limit is reached.
//
// Says exactly what happened and both ways forward — remove a tool, or
// upgrade — rather than a save button that silently does nothing. Mounted once
// in AppShell and triggered by allowSave() from any page.

export default function SaveLimitNotice() {
  const [limit, setLimit] = useState(null)
  const track = useAnalytics()

  useEffect(() => {
    // Not tracked as an upgrade click: only a real click on the button is.
    const onHit = (e) => setLimit(e.detail?.limit ?? null)
    window.addEventListener(SAVE_LIMIT_EVENT, onHit)
    return () => window.removeEventListener(SAVE_LIMIT_EVENT, onHit)
  }, [])

  useEffect(() => {
    if (limit == null) return
    const id = setTimeout(() => setLimit(null), 9000)
    return () => clearTimeout(id)
  }, [limit])

  if (limit == null) return null

  return (
    <div
      role="status"
      className="sticker fixed bottom-28 left-1/2 z-[60] w-[min(92vw,420px)] p-4 lg:bottom-8"
      style={{ transform: 'translateX(-50%)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed text-zinc-200">
          <strong className="text-white">Your Student plan saves up to {limit} tools.</strong>{' '}
          Remove one to save this, or upgrade to Pro for unlimited saved tools.
        </p>
        <button type="button" onClick={() => setLimit(null)} aria-label="Dismiss" className="-mt-1 text-zinc-400 hover:text-white">✕</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/pay"
          onClick={() => { track(EVENTS.UPGRADE_CLICKED, { surface: 'save_limit', plan: 'guru' }); setLimit(null) }}
          className="nb-btn pink min-h-10 px-4 py-2 text-xs"
        >
          Upgrade to Pro
        </Link>
        <Link to="/app/favorites" onClick={() => setLimit(null)} className="nb-btn dark min-h-10 px-4 py-2 text-xs">
          Manage saved
        </Link>
      </div>
    </div>
  )
}
