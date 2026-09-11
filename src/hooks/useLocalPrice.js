import { useEffect, useState } from 'react'
import { convertFromINR } from '../utils/currency'
import { useVisitorCountry } from './useVisitorCountry'

// An INR amount rendered in the reader's own currency, when that is possible.
//
// Returns null in every case where a conversion should NOT be shown: the
// visitor is in India, the country is not known yet, or the rate lookup failed.
// Callers show plain INR then. Null is the safe answer — a missing conversion
// costs a little readability, an invented one quotes a price nobody will be
// charged.
export function useLocalPrice(amountINR) {
  const country = useVisitorCountry()
  const [local, setLocal] = useState(null)

  useEffect(() => {
    if (!country || !Number.isFinite(amountINR)) return
    let alive = true
    convertFromINR(amountINR, country).then((r) => { if (alive) setLocal(r) })
    return () => { alive = false }
  }, [country, amountINR])

  return local
}
