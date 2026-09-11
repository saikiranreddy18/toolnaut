import { useEffect, useState } from 'react'
import { subscribeSync, syncState } from '../../state/sync'

// Says where the user's data actually is.
//
// Silence is the wrong default here: someone who signs in expecting a backup
// and gets a failed write should not find out weeks later when they open a
// second device. Equally, this must not nag — when there is nothing to say it
// renders nothing at all.
const LABEL = {
  syncing: { text: 'Syncing…', tone: 'var(--cyan)' },
  synced: { text: 'Synced', tone: 'var(--lime)' },
  error: { text: "Couldn't sync — saved on this device", tone: 'var(--hot-pink)' },
  // 'unavailable' and 'idle' render nothing: no server sync configured is the
  // app's normal state today, and announcing it on every page would be noise
  // about something the visitor cannot act on.
}

export default function SyncStatus() {
  const [state, setState] = useState(syncState)

  useEffect(() => subscribeSync(setState), [])

  // 'synced' is worth showing briefly and then getting out of the way.
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (state !== 'synced') { setVisible(true); return }
    const t = setTimeout(() => setVisible(false), 2600)
    return () => clearTimeout(t)
  }, [state])

  const label = LABEL[state]
  if (!label || !visible) return null

  return (
    <p
      className="px-4 pt-2 font-display text-[10px] font-black uppercase tracking-[0.14em]"
      style={{ color: label.tone }}
      role="status"
      aria-live="polite"
    >
      {label.text}
    </p>
  )
}
