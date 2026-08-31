// claim_key normaliser for tool_claims ingestion.
//
// The database is fail-closed: 0003_tool_claims.sql CHECKs
// claim_key ~ '^[a-z0-9._-]*$', so an import writing 'Slack' fails rather than
// silently minting a second "current" fact next to 'slack'. Correct, but raw
// rejection is operator friction — this is the application-level half: callers
// normalise display names into keys BEFORE the write, and the CHECK remains
// the final guarantee if some path forgets to.
//
// The display name is not this function's business: pass the original string
// as claim_display and the key derived here as claim_key.
//
//   Slack            -> slack
//   Google  Sheets   -> google-sheets
//   GPT-4.1          -> gpt-4.1       (dots survive; versions stay distinct)
//   C++ SDK          -> c-sdk         (punctuation strips — see collisions)
//   n8n              -> n8n
//   '  '             -> ''            (caller decides if '' is legal: it is
//                                      for singleton claim types, not others)
export function toClaimKey(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[.\-_]+|[.\-_]+$/g, '')
}

// Normalisation is lossy on purpose, which means DISTINCT names can collapse
// into one key — 'C++ SDK' and 'C SDK' both become 'c-sdk'. Silently letting
// the second overwrite the first would corrupt the catalogue, so ingestion
// must run its batch through this first and refuse to proceed on collisions.
//
// Returns [] when every name maps to its own key; otherwise one entry per
// colliding key with every original spelling that produced it, so the report
// names the actual conflict instead of "duplicate key".
export function claimKeyCollisions(names) {
  const byKey = new Map()
  for (const name of names) {
    const key = toClaimKey(name)
    if (!key) continue // empties are a validation concern, not a collision
    const list = byKey.get(key) || []
    list.push(name)
    byKey.set(key, list)
  }
  // Two spellings are the SAME fact when they differ only in case or spacing
  // ('Slack' vs 'slack ') — that is normalisation doing its job, not a
  // conflict. A collision is when materially different names collapse: the
  // gentle fold below keeps punctuation, so 'C++ SDK' vs 'C SDK' still
  // registers as two names fighting over one key.
  const gentle = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ')
  return [...byKey.entries()]
    .filter(([, list]) => new Set(list.map(gentle)).size > 1)
    .map(([key, inputs]) => ({ key, inputs: [...new Set(inputs)] }))
}
