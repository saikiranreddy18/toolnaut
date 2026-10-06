import { REVIEWS } from '../utils/toolReviewsData'
import { read as scopedRead, write as scopedWrite } from './scopedStorage'

// User-submitted per-tool reviews, layered over the seed set. localStorage
// (scoped per-account via scopedStorage.js) until the backend owns it.
const REVIEWS_KEY = 'exus_tool_reviews_v1'

function read(fallback) {
  try {
    const v = scopedRead(REVIEWS_KEY)
    return v ?? fallback
  } catch {
    return fallback
  }
}
function write(value) {
  scopedWrite(REVIEWS_KEY, value)
}

// Merge seed + user reviews for one tool, newest first.
export function getReviews(slug) {
  const userReviews = read([]).filter((r) => r.slug === slug)
  const seeded = REVIEWS.filter((r) => r.slug === slug)
  return [...userReviews, ...seeded].sort((a, b) => b.at - a.at)
}

// null when the tool has zero reviews — never render a fabricated "0.0".
export function getAverageRating(slug) {
  const all = getReviews(slug)
  if (all.length === 0) return null
  const sum = all.reduce((s, r) => s + r.rating, 0)
  return Math.round((sum / all.length) * 10) / 10
}

// One review per slug per browser — same toggle-not-append spirit as
// communityStore's toggleUpvote.
export function hasReviewed(slug) {
  return read([]).some((r) => r.slug === slug)
}

export function addReview(slug, { rating, body, author }) {
  const userReviews = read([])
  if (userReviews.some((r) => r.slug === slug)) return userReviews
  const r = { id: `u-${Date.now()}`, slug, author, rating, body, at: Date.now(), mine: true }
  userReviews.unshift(r)
  write(userReviews)
  return userReviews
}
