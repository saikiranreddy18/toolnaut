// Google's favicon service is zero-infrastructure: no API key, resolves a
// real icon (or a generic globe, never a broken image) for any domain
// regardless of that site's own favicon path/format.
export function getFaviconUrl(tool, size = 32) {
  if (!tool?.website) return null
  let hostname
  try {
    hostname = new URL(tool.website).hostname
  } catch {
    return null
  }
  return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`
}
