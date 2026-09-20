import { retry, httpError } from './util/retry.js'
import { log } from './util/logger.js'

// Daily review bot: validates every tool before it gets published to the catalog.
// Checks: website availability, metadata quality, duplicates, spam patterns.
// Returns detailed issues that block publication.

export async function reviewTool(record, { store } = {}) {
  const issues = []
  const warnings = []

  // 1. Check website is accessible
  const webCheck = await checkWebsite(record.website)
  if (!webCheck.ok) {
    issues.push(`website-unreachable: ${webCheck.reason}`)
  } else if (webCheck.redirects > 3) {
    warnings.push(`too-many-redirects: ${webCheck.redirects}`)
  }

  // 2. Check metadata quality
  if (!record.blurb || record.blurb.length < 20) {
    issues.push('blurb-too-short: needs at least 20 chars')
  }
  if (record.blurb && record.blurb.length > 140) {
    warnings.push('blurb-too-long: over 140 chars')
  }
  if (!record.tags || record.tags.length < 2) {
    warnings.push('insufficient-tags: needs at least 2')
  }

  // 3. Check for spam patterns
  const spamCheck = checkSpam(record)
  if (spamCheck.length > 0) {
    issues.push(...spamCheck)
  }

  // 4. Check for duplicate/near-duplicate
  if (store) {
    const dup = findNearDuplicate(record, store)
    if (dup) {
      issues.push(`duplicate-of: ${dup.slug}`)
    }
  }

  // 5. Check confidence score
  if (record.confidence < 0.5) {
    issues.push(`low-confidence: ${record.confidence} (need >= 0.5)`)
  }

  // 6. Check domain is whitelisted (not some random blog)
  const domainCheck = checkDomain(record.website)
  if (!domainCheck.ok) {
    warnings.push(`suspicious-domain: ${domainCheck.reason}`)
  }

  const decision = issues.length === 0 ? 'approve' : 'reject'
  return {
    decision,
    issues,
    warnings,
    score: calculateScore(record, issues, warnings),
  }
}

// Check if website is live and accessible
async function checkWebsite(url) {
  try {
    const response = await retry(
      () =>
        fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
          redirect: 'follow',
        }),
      { maxRetries: 2, backoffMs: 500 }
    )

    if (!response.ok) {
      return { ok: false, reason: `HTTP ${response.status}` }
    }

    // Count redirects from Response object (if available)
    const redirects = response.redirected ? 1 : 0
    return { ok: true, redirects }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
}

// Detect spam, scams, malware patterns
function checkSpam(record) {
  const issues = []
  const text = `${record.name} ${record.blurb} ${record.website}`.toLowerCase()

  const spamPatterns = [
    /\b(spam|scam|malware|phishing|crypto.*scam|make.*money.*fast|click.*here.*now)\b/i,
    /\b(viagra|cialis|pharma|gambling|casino|poker)\b/i,
    /(http|https):\/\/.*\.(ru|cn|tk|ml)\b/, // Known spam TLDs
    /\$\d{4,}.*\b(guaranteed|free|easy)\b/i, // Too-good-to-be-true pricing
  ]

  spamPatterns.forEach(p => {
    if (p.test(text)) issues.push(`spam-pattern: ${p.source}`)
  })

  return issues
}

// Find similar/duplicate tools already in catalog
function findNearDuplicate(record, store) {
  const threshold = 0.85
  const similarity = (a, b) => {
    const s1 = a.toLowerCase()
    const s2 = b.toLowerCase()
    const longer = Math.max(s1.length, s2.length)
    if (longer === 0) return 1
    const matches = s1 === s2 ? longer : levenshteinDistance(s1, s2)
    return (longer - matches) / longer
  }

  for (const existing of store?.allTools?.() || []) {
    if (similarity(record.name, existing.name) > threshold) {
      return existing
    }
  }
  return null
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(s1, s2) {
  const shorter = s1.length <= s2.length ? s1 : s2
  const longer = s1.length > s2.length ? s1 : s2
  if (shorter.length === 0) return longer.length
  return longer.split('').filter((c, i) => c === shorter[i]).length
}

// Check if domain is legitimate (not random blog or parked domain)
function checkDomain(url) {
  try {
    const { hostname } = new URL(url)

    // Block obvious junk domains
    if (/^(example|test|localhost|127\.0\.0|192\.168)/.test(hostname)) {
      return { ok: false, reason: 'example/localhost domain' }
    }
    if (/\.(test|local|invalid|localhost)$/i.test(hostname)) {
      return { ok: false, reason: 'reserved TLD' }
    }

    // Warn on short/random domains (parked or spam)
    if (hostname.split('.')[0].length < 3 && /^[a-z0-9]{3,}$/i.test(hostname.split('.')[0])) {
      return { ok: true, reason: 'very-short-domain' }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, reason: 'invalid-url' }
  }
}

// Calculate quality score (0-1) for the tool
function calculateScore(record, issues, warnings) {
  let score = record.confidence || 0.5

  // Penalty for issues
  score -= issues.length * 0.15

  // Penalty for warnings
  score -= warnings.length * 0.05

  // Bonus for good metadata
  if (record.tags?.length >= 3) score += 0.05
  if (record.audience) score += 0.05
  if (record.dev) score += 0.03

  return Math.max(0, Math.min(1, score))
}

// Daily review run: check all staged/review tools
export async function runDailyReview(store) {
  const allTools = store?.allTools?.() || []
  const staged = allTools.filter(t => t.lifecycle === 'staged' || t.lifecycle === 'review')

  const results = {
    checked: staged.length,
    approved: 0,
    rejected: 0,
    issues: [],
  }

  for (const tool of staged) {
    const review = await reviewTool(tool, { store })

    if (review.decision === 'approve') {
      results.approved++
      tool.lifecycle = 'published'
      store?.upsertTool(tool)
    } else {
      results.rejected++
      results.issues.push({
        slug: tool.slug,
        name: tool.name,
        issues: review.issues,
        warnings: review.warnings,
      })
      tool.lifecycle = 'rejected'
      store?.upsertTool(tool)
    }
  }

  log.info(`Daily review: ${results.approved} approved, ${results.rejected} rejected`)
  return results
}
