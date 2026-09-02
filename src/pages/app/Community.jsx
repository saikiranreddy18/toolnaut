import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { loadThreads, addThread, toggleUpvote } from '../../state/communityStore'
import { FORUM_CATEGORIES, TYPE_META, timeAgo } from '../../utils/communityData'
import { loadQuiz } from '../../state/quizStore'
import { loadSession } from '../../state/authStore'
import { haptic } from '../../utils/haptics'
import { UpvoteIcon, ReplyIcon } from '../../components/app/icons'
import RankCard from '../../components/app/RankCard'

const TYPES = ['question', 'showcase', 'discussion']

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`arcade-chip press min-h-9 shrink-0 cursor-pointer ${active ? 'on' : ''}`}
    >
      {children}
    </button>
  )
}

const TYPE_LETTER = { question: 'Q', showcase: 'S', discussion: 'D' }
const TYPE_ARCADE = {
  question: { bg: 'var(--cyan)', color: '#000' },
  showcase: { bg: 'var(--hot-pink)', color: '#fff' },
  discussion: { bg: 'var(--lime)', color: '#000' },
}

export default function Community() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [threads, setThreads] = useState(loadThreads)
  const [composing, setComposing] = useState(false)

  const cat = searchParams.get('cat') || ''
  const quiz = loadQuiz()
  const homeCategory = quiz.completed ? quiz.answers.domain : null

  const shown = useMemo(
    () => (cat ? threads.filter((t) => t.category === cat) : threads),
    [threads, cat],
  )
  const seededCount = useMemo(() => shown.filter((t) => t.seed).length, [shown])

  function setCat(id) {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('cat', id)
    else next.delete('cat')
    setSearchParams(next, { replace: true })
  }

  function upvote(id) {
    haptic.tap()
    toggleUpvote(id)
    setThreads(loadThreads())
  }

  return (
    <div className="mx-auto max-w-5xl px-5 xl:max-w-6xl py-6 lg:py-10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-display text-xs uppercase tracking-[0.2em] font-black" style={{ color: 'var(--lime)' }}>▸ SQUAD</p>
          <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">THE SIGNAL</h1>
          <p className="mt-2 text-sm font-medium text-slate-300">
            Where explorers compare stacks and answer each other's tool questions.
          </p>
        </div>
        <button
          onClick={() => { setComposing((v) => !v); haptic.tap() }}
          className="nb-btn min-h-11 shrink-0 px-4 py-2.5 text-xs"
        >
          {composing ? '× CLOSE' : '+ POST'}
        </button>
      </div>

      {/* Standing sits under the page identity, not above it. It used to be the
          first thing on the screen, so a first-time visitor met a table of
          placeholder handles before learning what SQUAD was for. */}
      <div className="mt-8">
        <RankCard />
      </div>

      <AnimatePresence>
        {composing && (
          <Composer
            homeCategory={homeCategory}
            onPost={(t) => { setThreads(loadThreads()); setComposing(false); haptic.success(); return t }}
          />
        )}
      </AnimatePresence>

      {/* The eight seed threads are written, not collected. RankCard right above
          already says its rows are placeholders; the feed said nothing, so the
          one invented thing on the page was the one thing unlabelled. */}
      {seededCount > 0 && (
        <div className="mt-6 rounded-xl border-2 border-black p-3" style={{ background: 'rgba(255,46,163,0.08)' }}>
          <p className="text-xs leading-relaxed text-slate-300">
            <span
              className="mr-2 inline-block rounded-full border-2 border-black px-2 py-0.5 align-middle font-display text-[9px] font-black uppercase tracking-[0.12em] text-black"
              style={{ background: 'var(--hot-pink)' }}
            >
              Preview
            </span>
            {seededCount} example conversations show what this space is for.
            They are written by us, not posted by users — accounts are not live
            yet. Your own posts and upvotes are real and saved.
          </p>
        </div>
      )}

      {/* category filter — swipeable on mobile */}
      <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <Pill active={!cat} onClick={() => setCat('')}>All</Pill>
        {FORUM_CATEGORIES.map((c) => (
          <Pill key={c.id} active={cat === c.id} onClick={() => setCat(cat === c.id ? '' : c.id)}>
            {c.name}
            {c.id === homeCategory && <span className="ml-1 text-exus-pink">•</span>}
          </Pill>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {shown.map((t, i) => {
          const arcade = TYPE_ARCADE[t.type]
          const letter = TYPE_LETTER[t.type] || '·'
          const stickerColor = i % 3 === 0 ? '' : i % 3 === 1 ? 'pink' : 'cyan'
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -1 : 1 }}
              transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04, type: 'spring', stiffness: 200 }}
              className={`sticker ${stickerColor} p-4`}
            >
              <div className="flex items-center gap-2 text-[11px]">
                <span
                  className="grid h-6 w-6 place-items-center rounded-full font-display text-xs font-black"
                  style={{ background: arcade.bg, color: arcade.color, border: '2px solid #000' }}
                >
                  {letter}
                </span>
                <span className="font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t.mine ? 'YOU' : t.author} · {timeAgo(t.at)}
                </span>
                {t.seed && (
                  <span className="rounded-full border border-white/20 px-1.5 py-0.5 font-display text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Example
                  </span>
                )}
              </div>

              <Link to={`/app/community/${t.id}`} className="mt-3 block">
                <h2 className="arcade-heading lime compact text-base sm:text-lg leading-tight">
                  {t.title.toUpperCase()}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-300">{t.body}</p>
              </Link>

              <div className="mt-3 flex items-center gap-4 text-xs">
                <button
                  onClick={() => upvote(t.id)}
                  aria-pressed={t.upvoted}
                  className="press flex min-h-9 cursor-pointer items-center gap-1.5 font-display font-black uppercase tracking-wider"
                  style={{ color: t.upvoted ? 'var(--lime)' : '#9d97bd' }}
                >
                  <UpvoteIcon />
                  ▲ {t.upvotes}
                </button>
                <Link
                  to={`/app/community/${t.id}`}
                  className="flex min-h-9 items-center gap-1.5 font-display font-black uppercase tracking-wider text-slate-400"
                >
                  <ReplyIcon />
                  💬 {t.replyCount}
                </Link>
              </div>
            </motion.div>
          )
        })}
      </div>

      {shown.length === 0 && (
        /* Was a dead end: a headline, a sentence, and nothing to click. */
        <div className="mt-12">
          <h2 className="arcade-heading section text-xl sm:text-2xl">NOTHING HERE YET</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
            No one has posted in{' '}
            <span className="font-bold text-white">
              {FORUM_CATEGORIES.find((c) => c.id === cat)?.name || 'this category'}
            </span>{' '}
            yet. Ask the question you came here with — it is the fastest way to
            start the thread you were looking for.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => { setComposing(true); haptic.tap() }}
              className="nb-btn min-h-11 px-5 py-2.5 text-xs"
            >
              + POST THE FIRST ONE
            </button>
            <button onClick={() => setCat('')} className="nb-btn dark min-h-11 px-4 py-2.5 text-xs">
              SEE ALL CATEGORIES
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Composer({ homeCategory, onPost }) {
  const session = loadSession()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState(homeCategory || 'general')
  const [type, setType] = useState('question')

  function submit(e) {
    e.preventDefault()
    if (title.trim().length < 6) return
    addThread({
      title: title.trim(),
      body: body.trim(),
      category,
      type,
      author: session?.user.name || 'you',
    })
    onPost()
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      onSubmit={submit}
      className="glass mt-4 overflow-hidden rounded-2xl p-4"
    >
      <label htmlFor="post-title" className="sr-only">Post title</label>
      <input
        id="post-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ask something or share a win…"
        className="w-full bg-transparent text-base font-semibold text-white placeholder:text-slate-500 focus:outline-none"
        autoFocus
      />
      <label htmlFor="post-body" className="sr-only">Details</label>
      <textarea
        id="post-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a little context (optional)"
        rows={3}
        className="mt-2 w-full resize-none bg-transparent text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none"
      />

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {TYPES.map((ty) => (
          <Pill key={ty} active={type === ty} onClick={() => setType(ty)}>{TYPE_META[ty].label}</Pill>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
        {FORUM_CATEGORIES.map((c) => (
          <Pill key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</Pill>
        ))}
      </div>

      <button
        type="submit"
        disabled={title.trim().length < 6}
        className="nb-btn wide mt-4 w-full py-3 text-sm disabled:opacity-40"
        style={{ display: 'block' }}
      >
        ⚡ POST TO SIGNAL
      </button>
    </motion.form>
  )
}
