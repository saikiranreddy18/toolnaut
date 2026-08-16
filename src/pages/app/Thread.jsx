import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getThread, addReply, toggleUpvote } from '../../state/communityStore'
import { TYPE_META, timeAgo, FORUM_CATEGORIES } from '../../utils/communityData'
import { loadSession } from '../../state/authStore'
import { haptic } from '../../utils/haptics'
import { UpvoteIcon, SendIcon } from '../../components/app/icons'

export default function Thread() {
  const { id } = useParams()
  const navigate = useNavigate()
  const session = loadSession()
  const [thread, setThread] = useState(() => getThread(id))
  const [draft, setDraft] = useState('')

  if (!thread) return <Navigate to="/app/community" replace />

  const tm = TYPE_META[thread.type]
  const catName = FORUM_CATEGORIES.find((c) => c.id === thread.category)?.name || thread.category

  function goBack() {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/app/community')
  }

  function upvote() {
    haptic.tap()
    toggleUpvote(id)
    setThread(getThread(id))
  }

  function send(e) {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    haptic.select()
    addReply(id, body, session?.user.name || 'you')
    setDraft('')
    setThread(getThread(id))
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-2xl flex-col px-5 py-6 lg:min-h-0 lg:py-10">
      <button
        onClick={goBack}
        className="press cursor-pointer self-start font-display text-sm text-slate-400 transition-colors hover:text-white"
      >
        ← Back to community
      </button>

      {/* original post */}
      <div className="mt-5">
        <div className="flex items-center gap-2">
          <span
            className="grid h-6 w-6 place-items-center rounded-full font-display text-xs font-black"
            style={{
              background: thread.type === 'question' ? 'var(--cyan)' : thread.type === 'showcase' ? 'var(--hot-pink)' : 'var(--lime)',
              color: thread.type === 'showcase' ? '#fff' : '#000',
              border: '2px solid #000',
            }}
          >
            {thread.type === 'question' ? 'Q' : thread.type === 'showcase' ? 'S' : 'D'}
          </span>
          <Link
            to={`/app/community?cat=${thread.category}`}
            className="font-display text-xs font-black uppercase tracking-widest"
            style={{ color: 'var(--lime)' }}
          >
            {catName}
          </Link>
        </div>
        <h1 className="arcade-heading mt-3 text-2xl sm:text-3xl leading-tight">{thread.title.toUpperCase()}</h1>
        <p className="mt-2 font-display text-xs font-black uppercase tracking-widest text-slate-500">
          {thread.mine ? 'YOU' : thread.author} · {timeAgo(thread.at)}
        </p>
        {thread.body && <p className="mt-4 text-base leading-relaxed text-white font-medium">{thread.body}</p>}

        <button
          onClick={upvote}
          aria-pressed={thread.upvoted}
          className={`nb-btn mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-xs ${thread.upvoted ? '' : 'dark'}`}
        >
          <UpvoteIcon />
          ▲ {thread.upvotes} {thread.upvotes === 1 ? 'UPVOTE' : 'UPVOTES'}
        </button>
      </div>

      {/* replies */}
      <div className="mt-8 border-t-2 pt-6" style={{ borderColor: 'rgba(163,255,46,0.2)' }}>
        <p className="arcade-heading text-lg">
          {thread.replies.length} {thread.replies.length === 1 ? 'REPLY' : 'REPLIES'}
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {thread.replies.map((r, i) => {
            const mine = r.id.startsWith('u-')
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -0.5 : 0.5 }}
                transition={{ duration: 0.25 }}
                className={`sticker ${mine ? 'cyan' : ''} p-4`}
              >
                <p className="font-display text-xs font-black uppercase tracking-widest" style={{ color: mine ? 'var(--lime)' : '#9d97bd' }}>
                  {mine ? (session?.user.name?.toUpperCase() || 'YOU') : r.author.toUpperCase()} · {timeAgo(r.at)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white font-medium">{r.body}</p>
              </motion.div>
            )
          })}
          {thread.replies.length === 0 && (
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">▸ No replies yet — start the thread.</p>
          )}
        </div>
      </div>

      {/* reply composer — sticky above the bottom nav on mobile */}
      <form
        onSubmit={send}
        className="sticky bottom-0 z-20 mt-6 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/95 to-transparent pb-2 pt-3 lg:static"
      >
        <div
          className="flex items-center gap-2 rounded-full p-1 pl-4"
          style={{
            background: 'rgba(20,18,31,0.95)',
            border: '2px solid #000',
            boxShadow: '3px 3px 0 #000',
          }}
        >
          <label htmlFor="reply-input" className="sr-only">Write a reply</label>
          <input
            id="reply-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add your reply…"
            className="w-full bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send reply"
            disabled={!draft.trim()}
            className="press flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-opacity disabled:opacity-40"
            style={{ background: 'var(--lime)', color: '#000', border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  )
}
