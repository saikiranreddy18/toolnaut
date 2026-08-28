import { useState } from 'react'
import Avatar, { AVATARS } from './Avatar'
import { loadAvatar, setAvatar } from '../../state/avatarStore'
import { haptic } from '../../utils/haptics'

// Arcade character select, which is the one interaction pattern the rest of
// Toolnaut's identity already implies. Both sets are shown to everyone — the
// tabs are a way to find a face in sixteen, not a gate.
const SETS = [
  { id: 'a', label: 'Crew I' },
  { id: 'b', label: 'Crew II' },
]

export default function AvatarPicker({ onChange }) {
  const [selected, setSelected] = useState(loadAvatar)
  const [set, setSet] = useState(() => {
    const current = AVATARS.find((a) => a.id === loadAvatar())
    return current?.set || 'a'
  })

  const shown = AVATARS.filter((a) => a.set === set)

  function pick(id) {
    haptic.select()
    // Tapping the current avatar clears it, so there is a way back to the
    // initial badge without a separate destructive button.
    const next = setAvatar(id === selected ? null : id)
    setSelected(next)
    onChange?.(next)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {SETS.map((s) => (
          <button
            key={s.id}
            onClick={() => { haptic.tap(); setSet(s.id) }}
            aria-pressed={set === s.id}
            className={`arcade-chip press min-h-11 cursor-pointer ${set === s.id ? 'on' : ''}`}
          >
            {s.label}
          </button>
        ))}
        <span className="ml-auto font-display text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {selected ? AVATARS.find((a) => a.id === selected)?.name : 'None picked'}
        </span>
      </div>

      <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-8">
        {shown.map((a) => {
          const isOn = selected === a.id
          return (
            <li key={a.id}>
              <button
                onClick={() => pick(a.id)}
                aria-pressed={isOn}
                aria-label={isOn ? `${a.name} selected. Tap to clear` : `Choose ${a.name}`}
                className="press flex w-full flex-col items-center gap-1.5 rounded-xl p-1.5 transition-transform"
                style={{
                  border: `2px solid ${isOn ? 'var(--lime)' : 'transparent'}`,
                  background: isOn ? 'rgba(255,255,255,0.06)' : 'transparent',
                }}
              >
                <Avatar id={a.id} size={52} title="" />
                <span
                  className="font-display text-[9px] font-black uppercase tracking-wider"
                  style={{ color: isOn ? 'var(--lime)' : '#6b6690' }}
                >
                  {a.name}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
