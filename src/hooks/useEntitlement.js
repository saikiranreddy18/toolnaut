import { useCallback, useEffect, useState } from 'react'
import { fetchEntitlement, daysLeft } from '../utils/entitlement'

// What this account may do, as a hook.
//
// ASK THE SERVER, ALWAYS. There is no localStorage copy and no cache across
// mounts: an entitlement can end while a tab sits open, and a stale "yes" is
// the one answer that costs money. The call is cheap and the endpoint sets
// no-store precisely so this stays true.
//
// `unknown: true` means the CHECK failed — network down, /api unavailable in
// local dev — not that the user lacks a plan. Callers must fail OPEN on it:
// bricking the whole app because one request timed out is far worse than
// letting a visit through.
//
// Returns { loading, unknown, active, trial, plan, endsAt, days, refresh }.
export function useEntitlement() {
  const [state, setState] = useState({ loading: true, unknown: false, active: false })

  const load = useCallback(async () => {
    const ent = await fetchEntitlement()
    setState({ ...ent, loading: false, days: daysLeft(ent.endsAt) })
    return ent
  }, [])

  useEffect(() => {
    let alive = true
    fetchEntitlement().then((ent) => {
      if (alive) setState({ ...ent, loading: false, days: daysLeft(ent.endsAt) })
    })
    return () => { alive = false }
  }, [])

  // refresh() exists for the moment after a payment lands: the entitlement was
  // written server-side a second ago and the page needs to stop saying "no"
  // without a reload.
  return { ...state, refresh: load }
}
