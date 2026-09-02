// Showing an INR price in the reader's own currency.
//
// DISPLAY ONLY. Every plan is charged in rupees — see priceFor in planData.js.
// What this produces is a readability aid so someone in Berlin does not have to
// mentally divide by ninety, and it is always labelled as approximate with the
// real INR figure kept alongside. A converted number presented as the price
// would be a number the checkout does not honour.
//
// REAL RATES OR NOTHING. If the rate cannot be fetched this returns null and
// callers fall back to showing plain INR. A hardcoded rate would be wrong the
// week after it was written and would quietly misquote every visitor; a made-up
// one is worse. Nothing here invents a number.
//
// The source is open.er-api.com: free, no key, no attribution requirement.

const RATES_KEY = 'tn_fx_inr_v1'
const TTL_MS = 12 * 60 * 60 * 1000 // twice a day is plenty for a price label

// The currency people actually price things in, per market. Deliberately short:
// these are the places worth quoting natively, and everywhere else falls back
// to USD, which is the second currency almost everyone can read.
const COUNTRY_CURRENCY = {
  IN: 'INR', US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
  SG: 'SGD', AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD',
  JP: 'JPY', CN: 'CNY', HK: 'HKD', KR: 'KRW', MY: 'MYR', ID: 'IDR',
  TH: 'THB', PH: 'PHP', VN: 'VND', BD: 'BDT', LK: 'LKR', NP: 'NPR', PK: 'PKR',
  ZA: 'ZAR', NG: 'NGN', KE: 'KES', EG: 'EGP',
  BR: 'BRL', MX: 'MXN', AR: 'ARS', CL: 'CLP', CO: 'COP',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK',
  TR: 'TRY', RU: 'RUB', IL: 'ILS',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR',
  AT: 'EUR', IE: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR',
}

export function currencyForCountry(country) {
  const cc = String(country || '').toUpperCase()
  if (!cc) return null
  return COUNTRY_CURRENCY[cc] || 'USD'
}

function readCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(RATES_KEY) || 'null')
    if (!raw?.rates || !raw?.at) return null
    if (Date.now() - raw.at > TTL_MS) return null
    return raw.rates
  } catch {
    return null
  }
}

let inflight = null

// Rates keyed by currency code, expressed per 1 INR. null on any failure.
export async function inrRates() {
  const cached = readCache()
  if (cached) return cached
  // One request per page even if several components ask at once.
  if (inflight) return inflight

  inflight = fetch('https://open.er-api.com/v6/latest/INR')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const rates = d?.result === 'success' ? d.rates : null
      if (!rates) return null
      try {
        localStorage.setItem(RATES_KEY, JSON.stringify({ at: Date.now(), rates }))
      } catch { /* storage blocked; the in-memory promise still serves this page */ }
      return rates
    })
    .catch(() => null)
    .finally(() => { inflight = null })

  return inflight
}

// Rounds to something that reads like a price rather than a calculation.
// $361.4372 is arithmetic; $361 is a price. Zero-decimal currencies (yen, won)
// never take a fractional part at all.
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'ISK'])

function tidy(amount, currency) {
  if (ZERO_DECIMAL.has(currency)) return Math.round(amount)
  if (amount >= 100) return Math.round(amount)
  // Under a hundred, keep the pennies — rounding ₹299 to "$4" loses real
  // precision at exactly the price point where it matters most.
  return Math.round(amount * 100) / 100
}

// { text, currency } for an INR amount in the visitor's currency, or null when
// no conversion should be shown (India, unknown country, rates unavailable).
export async function convertFromINR(amountINR, country) {
  const currency = currencyForCountry(country)
  if (!currency || currency === 'INR') return null

  const rates = await inrRates()
  const rate = rates?.[currency]
  if (!Number.isFinite(rate)) return null

  const converted = tidy(amountINR * rate, currency)
  const whole = Number.isInteger(converted)
  try {
    return {
      currency,
      // en-US as the formatting locale, not the visitor's: it renders USD as
      // "$316" where several locales give "US$316", and the symbol is the point
      // of showing this at all.
      //
      // No trailing ".00" on a whole number either — tidy() already rounded
      // anything over a hundred, and "$316.00" is arithmetic where "$316" is a
      // price.
      text: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: whole || ZERO_DECIMAL.has(currency) ? 0 : 2,
      }).format(converted),
    }
  } catch {
    // Intl rejects an unknown code on some engines rather than falling back.
    return { currency, text: `${converted} ${currency}` }
  }
}
