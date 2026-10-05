import { GITHUB_REPO_URL } from '../config'

// Both flows land as a GitHub issue — that tracker is the queue, there is no
// in-app moderation or submission history for either. Pure and testable the
// same way shareStack.js/newTools.js are.
function issueUrl({ title, body, labels }) {
  const params = new URLSearchParams({ title, body, labels })
  return `${GITHUB_REPO_URL}/issues/new?${params.toString()}`
}

export function buildSuggestToolUrl({ name, url, note }) {
  const body = [
    `**Tool name:** ${name || '(not given)'}`,
    `**URL:** ${url || '(not given)'}`,
    `**Note:** ${note || '(none)'}`,
  ].join('\n')
  return issueUrl({ title: `Suggest a tool: ${name || 'untitled'}`, body, labels: 'tool-submission' })
}

export function buildReportIssueUrl({ slug, name, note }) {
  const body = [
    `**Tool:** ${name || '(not given)'}`,
    `**Slug:** ${slug || '(not given)'}`,
    `**What's wrong:** ${note || '(none given — see title)'}`,
  ].join('\n')
  return issueUrl({ title: `Report listing issue: ${name || slug || 'untitled'}`, body, labels: 'tool-report' })
}
