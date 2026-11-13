/**
 * Currency rules shared by the API (backend/) and the store (frontend/), so both agree on what is supported.
 *
 * Customers are always charged in the store currency (VITE_CURRENCY / CURRENCY). Any other currency here is
 * for display only: prices are converted with the cached rates from GET /api/currency/rates and shown as
 * approximate. Plain JavaScript with no imports, so it runs unchanged in Node and in the browser.
 */

// Currencies a customer may choose. Rates for all of them come from the European Central Bank feed, except AED,
// which is derived from its fixed US-dollar peg (see backend/services/currencyService.js).
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'NZD', 'SGD', 'MXN', 'BRL', 'AED',
]

// Every delivery country (frontend/src/utils/countries.js, backend/utils/countries.js) → its everyday currency.
export const COUNTRY_CURRENCY = {
  Australia: 'AUD',
  Austria: 'EUR',
  Belgium: 'EUR',
  Brazil: 'BRL',
  Canada: 'CAD',
  Denmark: 'DKK',
  Finland: 'EUR',
  France: 'EUR',
  Germany: 'EUR',
  India: 'INR',
  Ireland: 'EUR',
  Italy: 'EUR',
  Japan: 'JPY',
  Mexico: 'MXN',
  Netherlands: 'EUR',
  'New Zealand': 'NZD',
  Norway: 'NOK',
  Portugal: 'EUR',
  Singapore: 'SGD',
  Spain: 'EUR',
  Sweden: 'SEK',
  Switzerland: 'CHF',
  'United Arab Emirates': 'AED',
  'United Kingdom': 'GBP',
  'United States': 'USD',
}

// "eur" or " EUR " → "EUR" when supported; anything else → null. Never trust a currency without this check.
export const normalizeCurrency = (code) => {
  if (typeof code !== 'string') return null
  const upper = code.trim().toUpperCase()
  return SUPPORTED_CURRENCIES.includes(upper) ? upper : null
}

// The default currency for a country, or `fallback` for an unknown country.
export const currencyForCountry = (country, fallback = null) => COUNTRY_CURRENCY[country] ?? fallback

/**
 * The currency a customer sees, from the most to the least specific:
 * their saved choice → their country's currency (older accounts may have only a country) →
 * the choice saved in this browser (guests) → the store currency (older accounts with neither field).
 */
export const preferredCurrency = ({ user = null, stored = null, storeCurrency }) =>
  normalizeCurrency(user?.currency) ??
  normalizeCurrency(currencyForCountry(user?.country)) ??
  normalizeCurrency(stored) ??
  storeCurrency

/**
 * Converts an amount from the store currency with `rates` ({ CODE: units per 1 store-currency unit }).
 * Returns null when there is no usable rate, so callers can fall back to the store price.
 */
export const convertAmount = (amount, to, rates) => {
  const rate = rates?.[to]
  const value = Number(amount)
  if (!Number.isFinite(value) || !Number.isFinite(rate) || rate <= 0) return null
  return value * rate
}
