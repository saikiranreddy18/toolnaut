import { THREADS } from '../utils/communityData'

// User-generated community content + upvotes, layered over the seed threads.
// localStorage until the backend owns it.
const THREADS_KEY = 'exus_threads_v1'
const REPLIES_KEY = 'exus_replies_v1'
const UPVOTES_KEY = 'exus_upvotes_v1'

function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v ?? fallback
  } catch {
    return fallback
  }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage blocked */ }
}

// Merge seed + user threads, newest first, with per-thread reply counts and
// applied upvotes so the list reflects the user's own activity.
export function loadThreads() {
  const userThreads = read(THREADS_KEY, [])
  const userReplies = read(REPLIES_KEY, {})
  const upvotes = read(UPVOTES_KEY, {})

  return [...userThreads, ...THREADS]
    .map((t) => {
      const extra = (userReplies[t.id] || []).length
      return {
        ...t,
        replyCount: (t.replies?.length || 0) + extra,
        upvotes: t.upvotes + (upvotes[t.id] ? 1 : 0),
        upvoted: !!upvotes[t.id],
      }
    })
    .sort((a, b) => b.at - a.at)
}

export function getThread(id) {
  const userThreads = read(THREADS_KEY, [])
  const base = userThreads.find((t) => t.id === id) || THREADS.find((t) => t.id === id)
  if (!base) return null
  const userReplies = read(REPLIES_KEY, {})
  const upvotes = read(UPVOTES_KEY, {})
  const replies = [...(base.replies || []), ...(userReplies[id] || [])].sort((a, b) => a.at - b.at)
  return {
    ...base,
    replies,
    upvotes: base.upvotes + (upvotes[id] ? 1 : 0),
    upvoted: !!upvotes[id],
  }
}

export function toggleUpvote(id) {
  const upvotes = read(UPVOTES_KEY, {})
  if (upvotes[id]) delete upvotes[id]
  else upvotes[id] = true
  write(UPVOTES_KEY, upvotes)
  return !!upvotes[id]
}

export function addReply(threadId, body, author) {
  const replies = read(REPLIES_KEY, {})
  const list = replies[threadId] || []
  list.push({ id: `u-${Date.now()}`, author, body, at: Date.now() })
  replies[threadId] = list
  write(REPLIES_KEY, replies)
  return list
}

export function addThread({ title, body, category, type, author }) {
  const threads = read(THREADS_KEY, [])
  const t = {
    id: `u-${Date.now()}`,
    title, body, category, type, author,
    upvotes: 0,
    at: Date.now(),
    replies: [],
    mine: true,
  }
  threads.unshift(t)
  write(THREADS_KEY, threads)
  return t
}
