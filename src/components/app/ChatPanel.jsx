import { useEffect, useRef, useState } from 'react'
import { CloseIcon, SendIcon } from './icons'

// AI chat assistant stub. The panel UX (persistent across /app routes,
// context-aware greeting) is real; replies are canned until the Claude API
// integration lands. Desktop: right column. Mobile: bottom sheet.
export default function ChatPanel({ personaName, onClose, idPrefix = 'chat' }) {
  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      text: personaName
        ? `Hey ${personaName}! I know your stack — ask me anything about your tools once I'm connected to the backend.`
        : 'Hey! Take the quiz and I can tailor my answers to your stack.',
    },
  ])
  const [draft, setDraft] = useState('')
  const closeBtnRef = useRef(null)

  // The launcher button that opens this panel unmounts the instant it does
  // (AppShell renders it only while !chatOpen), so the keyboard focus that
  // opened it would otherwise land on <body> with nothing to tab from. Moving
  // it onto the close button — and honoring Escape, standard for a dismissible
  // panel — keeps a keyboard/screen-reader user oriented inside the panel.
  useEffect(() => {
    closeBtnRef.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function send(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setMessages((m) => [
      ...m,
      { role: 'user', text },
      {
        role: 'assistant',
        text: 'I come online with the backend integration — your message shape, history and this panel are already wired for it.',
      },
    ])
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b-2 px-4 py-3" style={{ borderColor: 'var(--lime)' }}>
        <div>
          <p className="font-display text-sm font-black uppercase italic text-white">AI Copilot</p>
          <p className="text-xs font-bold text-lime-400">Preview — replies are canned</p>
        </div>
        <button
          ref={closeBtnRef}
          onClick={onClose}
          aria-label="Close assistant"
          className="press flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-black bg-white/5 text-slate-300 hover:text-white"
          style={{ boxShadow: '2px 2px 0 #000' }}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl border-2 border-black px-4 py-2.5 text-sm leading-relaxed ${
              m.role === 'user' ? 'ml-auto text-black' : 'bg-[#14141f] text-slate-200'
            }`}
            style={m.role === 'user'
              ? { background: 'var(--lime)', boxShadow: '3px 3px 0 #000' }
              : { boxShadow: '3px 3px 0 var(--hot-pink)' }}
          >
            {m.text}
          </div>
        ))}
      </div>

      <form onSubmit={send} className="border-t-2 border-white/10 p-3">
        <div
          className="flex items-center gap-2 rounded-full border-2 border-black bg-[#12121c]/90 p-1 pl-4"
          style={{ boxShadow: '3px 3px 0 #000' }}
        >
          <label htmlFor={`${idPrefix}-input`} className="sr-only">Message the assistant</label>
          <input
            id={`${idPrefix}-input`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about your stack..."
            className="w-full bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send message"
            className="nb-btn flex h-10 w-10 shrink-0 items-center justify-center !rounded-full !p-0"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  )
}
