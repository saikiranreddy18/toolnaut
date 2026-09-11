import { useEffect } from 'react'

// Per-route document head.
//
// index.html carries ONE set of tags and every route inherited them, which was
// harmless while the app served an empty shell to crawlers. Prerendering made
// it harmful: /tools/code, /tools/design, /new and /pricing now ship real,
// distinct content under a canonical pointing at the homepage — which tells a
// search engine they are duplicates of it and should be dropped from the index.
// The better the prerendered pages got, the more thoroughly that one tag threw
// them away.
//
// Done imperatively rather than with a helmet library because the prerenderer
// snapshots document.documentElement.outerHTML after render, so whatever these
// effects set is what lands in the static file. No dependency, no provider, and
// the same code path serves crawlers and client-side navigation alike.

const SITE = 'https://toolnaut.xyz'
const DEFAULTS = {
  title: 'Toolnaut — Your AI Stack, Personalized',
  description:
    'Discover the perfect AI tools for your role. Learn them. Master them. Toolnaut is the role-aware command center for AI tool discovery and learning paths.',
}

function setMeta(selector, attr, key, value) {
  if (!value) return
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

function setLink(rel, href) {
  if (!href) return
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * @param {object} o
 * @param {string} [o.title]        full <title>; falls back to the site default
 * @param {string} [o.description]  meta description AND og:description
 * @param {string} [o.path]         route path, e.g. '/tools/code' — drives canonical + og:url
 * @param {object} [o.jsonLd]       structured data, emitted as application/ld+json
 */
export function useHead({ title, description, path, jsonLd, noindex = false } = {}) {
  // Serialised so a fresh object literal on every render does not re-run this.
  const ld = jsonLd ? JSON.stringify(jsonLd) : null

  useEffect(() => {
    const t = title || DEFAULTS.title
    const d = description || DEFAULTS.description
    const url = path ? `${SITE}${path}` : SITE

    document.title = t
    setMeta('meta[name="description"]', 'name', 'description', d)
    setMeta('meta[property="og:title"]', 'property', 'og:title', t)
    setMeta('meta[property="og:description"]', 'property', 'og:description', d)
    setMeta('meta[property="og:url"]', 'property', 'og:url', url)
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', t)
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', d)
    setLink('canonical', url)

    // Routes that exist but should not be found. The tag is REMOVED rather than
    // set to "index" when a page does not ask for it: this is a SPA, so the
    // element persists across navigation and a stale noindex left behind by one
    // route would quietly delist the next one.
    const robots = document.querySelector('meta[name="robots"]')
    if (noindex) setMeta('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow')
    else if (robots) robots.remove()

    // One managed block, replaced rather than appended, so navigating between
    // routes cannot leave a previous page's structured data behind describing
    // something the visitor is no longer looking at.
    const existing = document.getElementById('route-jsonld')
    if (existing) existing.remove()
    if (ld) {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.id = 'route-jsonld'
      s.textContent = ld
      document.head.appendChild(s)
    }
  }, [title, description, path, ld, noindex])
}

export { SITE }
