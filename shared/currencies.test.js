import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { COUNTRY_CODES } from '../backend/utils/countries.js'
import { convertAmount, COUNTRY_CURRENCY, currencyForCountry, normalizeCurrency, preferredCurrency, SUPPORTED_CURRENCIES } from './currencies.js'

describe('country-to-currency defaults', () => {
  it('gives every delivery country a supported currency', () => {
    for (const country of Object.keys(COUNTRY_CODES)) {
      assert.ok(SUPPORTED_CURRENCIES.includes(COUNTRY_CURRENCY[country]), `${country} has no supported currency`)
    }
  })

  it('picks the everyday currency for a country, with a fallback for unknown ones', () => {
    assert.equal(currencyForCountry('India'), 'INR')
    assert.equal(currencyForCountry('Germany'), 'EUR')
    assert.equal(currencyForCountry('United Kingdom'), 'GBP')
    assert.equal(currencyForCountry('Atlantis', 'USD'), 'USD')
    assert.equal(currencyForCountry(undefined), null)
  })
})

describe('normalizeCurrency', () => {
  it('accepts supported codes in any case and rejects everything else', () => {
    assert.equal(normalizeCurrency(' eur '), 'EUR')
    assert.equal(normalizeCurrency('XYZ'), null)
    assert.equal(normalizeCurrency(''), null)
    assert.equal(normalizeCurrency({ code: 'EUR' }), null)
  })
})

describe('preferredCurrency (fallbacks)', () => {
  it('uses the account choice first', () => {
    assert.equal(preferredCurrency({ user: { country: 'India', currency: 'GBP' }, stored: 'USD', storeCurrency: 'INR' }), 'GBP')
  })

  it('uses the country for older accounts that have no currency saved', () => {
    assert.equal(preferredCurrency({ user: { country: 'Japan' }, storeCurrency: 'INR' }), 'JPY')
  })

  it('falls back to the browser choice, then the store currency, for accounts with neither field', () => {
    assert.equal(preferredCurrency({ user: {}, stored: 'eur', storeCurrency: 'INR' }), 'EUR')
    assert.equal(preferredCurrency({ user: { currency: 'XYZ' }, storeCurrency: 'INR' }), 'INR')
    assert.equal(preferredCurrency({ storeCurrency: 'INR' }), 'INR')
  })
})

describe('convertAmount', () => {
  it('multiplies by the rate and refuses to guess without one', () => {
    assert.equal(convertAmount(100, 'EUR', { EUR: 0.5 }), 50)
    assert.equal(convertAmount(100, 'GBP', { EUR: 0.011 }), null)
    assert.equal(convertAmount('abc', 'EUR', { EUR: 0.011 }), null)
    assert.equal(convertAmount(100, 'EUR', { EUR: -1 }), null)
  })
})
