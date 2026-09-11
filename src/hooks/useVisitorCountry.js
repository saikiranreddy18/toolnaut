import { useEffect, useState } from 'react'

// The visitor's country, for hiding offers they cannot buy.
//
// PRESENTATION ONLY. The server reads x-vercel-ip-country and refuses a
// restricted plan whatever the browser believes — this hook exists so a visitor
// in an excluded country is not shown a dead end, not to enforce anything. A
// value from here must never be the reason something is allowed.
//
// null means "not determined yet", which callers should treat as "show it":
// failing the other way would hide a live offer from everyone during the
// lookup, and from everyone whose request for it fails.
let cached = null

// ?preview_country=US overrides what this reports, so the team can see a
// geo-restricted offer from a country that cannot buy it. Presentation only,
// and safe precisely because this hook decides nothing: /api/create-order reads
// the real edge header and refuses the plan regardless of what the URL claims.
// Without this, whoever asked for the founder ribbon cannot see it from India.
function previewOverride() {
  try {
    const v = new URLSearchParams(window.location.search).get('preview_country')
    return v ? v.toUpperCase().slice(0, 2) : null
  } catch {
    return null
  }
}

export function useVisitorCountry() {
  const [country, setCountry] = useState(() => previewOverride() ?? cached)

  useEffect(() => {
    if (previewOverride()) return
    if (cached !== null) return
    let alive = true
    fetch('/api/geo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const c = String(d?.country || '').toUpperCase()
        if (!c) return
        cached = c
        if (alive) setCountry(c)
      })
      .catch(() => { /* undetermined; callers show the offer */ })
    return () => { alive = false }
  }, [])

  return country
}
