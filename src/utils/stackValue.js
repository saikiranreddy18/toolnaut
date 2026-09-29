// Self-reported time-value estimate for a stack. See StackValue.jsx for why
// this is arithmetic on numbers the visitor types in, never a per-tool or
// per-category multiplier Toolnaut would have to invent.

const WEEKS_PER_MONTH = 4.33

export function estimateValue({ hoursSavedPerWeek, hourlyValue }) {
  const hours = Number(hoursSavedPerWeek)
  const rate = Number(hourlyValue)
  if (!Number.isFinite(hours) || !Number.isFinite(rate) || hours <= 0 || rate <= 0) return null
  const weeklyValue = hours * rate
  return { weeklyValue, monthlyValue: weeklyValue * WEEKS_PER_MONTH }
}
