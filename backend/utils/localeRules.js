import { body } from 'express-validator'
import { currencyForCountry, normalizeCurrency, SUPPORTED_CURRENCIES } from '../../shared/currencies.js'
import { COUNTRY_CODES } from './countries.js'

export const COUNTRIES = Object.keys(COUNTRY_CODES)

// Country: one of the delivery countries, exactly as listed.
export const countryRule = ({ optional = false } = {}) => {
  const rule = body('country')
  return (optional ? rule.optional() : rule)
    .isString().withMessage('Please choose your country')
    .trim()
    .isIn(COUNTRIES).withMessage('Please choose a country from the list')
}

// Currency: optional, any case, but only a supported code is accepted and it is stored in upper case.
export const currencyRule = () =>
  body('currency')
    .optional({ values: 'falsy' })
    .isString().withMessage('Please choose a currency')
    .customSanitizer((value) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
    .isIn(SUPPORTED_CURRENCIES).withMessage(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`)

// The currency to save: the customer's (validated) choice, else their country's, else the store's.
export const resolveCurrency = ({ country, currency, storeCurrency }) =>
  normalizeCurrency(currency) ?? normalizeCurrency(currencyForCountry(country)) ?? storeCurrency.toUpperCase()
