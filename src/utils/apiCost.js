// Self-reported API cost estimate. Same shape as stackValue.js: the visitor
// types their own usage, Toolnaut only multiplies against the dated prices in
// modelPricing.js — no catalog-schema dependency, nothing scraped live.

const DAYS_PER_MONTH = 30.44

export function estimateApiCost({ inputPer1M, outputPer1M, requestsPerDay, avgInputTokens, avgOutputTokens }) {
  const reqs = Number(requestsPerDay)
  const inTok = Number(avgInputTokens)
  const outTok = Number(avgOutputTokens)
  if (!Number.isFinite(reqs) || reqs <= 0) return null
  if (!Number.isFinite(inTok) || inTok < 0) return null
  if (!Number.isFinite(outTok) || outTok < 0) return null
  if (inTok === 0 && outTok === 0) return null

  const dailyCost = (reqs * inTok / 1_000_000) * inputPer1M + (reqs * outTok / 1_000_000) * outputPer1M
  return { dailyCost, monthlyCost: dailyCost * DAYS_PER_MONTH }
}
