import { SUPPORTED_CURRENCIES } from '../../shared/currencies.js'

// European Central Bank reference rates (published once per working day), via Frankfurter: free, no API key.
export const RATES_URL = 'https://api.frankfurter.dev/v1/latest'
// The UAE dirham is pegged to the US dollar and is not in the ECB feed.
const AED_PER_USD = 3.6725
const TTL_MS = 12 * 60 * 60 * 1000
const TIMEOUT_MS = 6000

// ECB rates are per 1 EUR; this re-bases them on the store currency for every supported currency.
export const rebase = (eurRates, base) => {
  const perEur = { ...eurRates, EUR: 1 }
  if (Number.isFinite(perEur.USD)) perEur.AED = perEur.USD * AED_PER_USD
  const baseRate = perEur[base]
  if (!Number.isFinite(baseRate) || baseRate <= 0) throw new Error(`No exchange rate for the store currency ${base}`)

  const rates = {}
  SUPPORTED_CURRENCIES.forEach((code) => {
    if (Number.isFinite(perEur[code]) && perEur[code] > 0) rates[code] = Number((perEur[code] / baseRate).toPrecision(8))
  })
  rates[base] = 1
  return rates
}

/**
 * Exchange rates against the store currency, cached for 12 hours. Parallel requests share one fetch.
 * If the feed fails, the last good rates are kept (marked stale); with none yet, conversion is unavailable and the
 * store simply shows prices in its own currency. Rates are for display only: nothing is ever charged with them.
 */
export const createRateCache = ({ base, fetchImpl = (...args) => fetch(...args), ttlMs = TTL_MS, now = () => Date.now() }) => {
  const storeCurrency = base.toUpperCase()
  let cached = null
  let inFlight = null

  const load = async () => {
    const response = await fetchImpl(RATES_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) throw new Error(`Rates feed answered ${response.status}`)
    const body = await response.json()
    return { base: storeCurrency, rates: rebase(body.rates ?? {}, storeCurrency), date: body.date ?? null, fetchedAt: now() }
  }

  return {
    async getRates() {
      if (cached && now() - cached.fetchedAt < ttlMs) return { ...cached, available: true, stale: false }

      inFlight ??= load()
        .then((fresh) => {
          cached = fresh
          return { ...fresh, available: true, stale: false }
        })
        .catch((error) => {
          console.warn(`[currency] Could not refresh exchange rates: ${error.message}`)
          if (cached) return { ...cached, available: true, stale: true }
          return { base: storeCurrency, rates: { [storeCurrency]: 1 }, date: null, available: false, stale: false }
        })
        .finally(() => {
          inFlight = null
        })
      return inFlight
    },
  }
}
