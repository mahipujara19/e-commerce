import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { matchedData, validationResult } from 'express-validator'
import User from '../models/User.js'
import { countryRule, currencyRule, resolveCurrency } from '../utils/localeRules.js'

// Runs the sign-up country/currency rules on a request body, like the route does before the controller.
const check = async (body, { optionalCountry = false } = {}) => {
  const req = { body: { ...body } }
  for (const rule of [countryRule({ optional: optionalCountry }), currencyRule()]) await rule.run(req)
  return { errors: [...new Set(validationResult(req).array().map((error) => error.path))], data: matchedData(req, { locations: ['body'] }) }
}

describe('sign-up country and currency validation', () => {
  it('requires a country from the delivery list', async () => {
    assert.deepEqual((await check({})).errors, ['country'])
    assert.deepEqual((await check({ country: 'Atlantis' })).errors, ['country'])
    assert.deepEqual((await check({ country: 'India' })).errors, [])
  })

  it('accepts a supported currency in any case and stores it in upper case', async () => {
    const result = await check({ country: 'India', currency: 'eur' })
    assert.deepEqual(result.errors, [])
    assert.equal(result.data.currency, 'EUR')
  })

  it('rejects a currency the store does not support, whatever the client sends', async () => {
    assert.deepEqual((await check({ country: 'India', currency: 'XYZ' })).errors, ['currency'])
    assert.deepEqual((await check({ country: 'India', currency: ['EUR'] })).errors, ['currency'])
  })

  it('lets the preferences update send only a currency', async () => {
    assert.deepEqual((await check({ currency: 'GBP' }, { optionalCountry: true })).errors, [])
  })
})

describe('resolveCurrency (what sign-up saves)', () => {
  it('saves the country default when the sign-up form sends only a country', async () => {
    const { errors, data } = await check({ country: 'Germany' })
    assert.deepEqual(errors, [])
    assert.equal(data.currency, undefined)
    assert.equal(resolveCurrency({ ...data, storeCurrency: 'usd' }), 'EUR')
  })

  it('keeps a valid choice, else uses the country, else the store currency', () => {
    assert.equal(resolveCurrency({ country: 'India', currency: 'GBP', storeCurrency: 'inr' }), 'GBP')
    assert.equal(resolveCurrency({ country: 'Japan', currency: undefined, storeCurrency: 'inr' }), 'JPY')
    assert.equal(resolveCurrency({ country: 'Atlantis', currency: 'XYZ', storeCurrency: 'inr' }), 'INR')
  })
})

describe('user profile persistence', () => {
  const base = { name: 'Asha Rao', email: 'asha@example.com', password: 'x'.repeat(60) }

  it('stores country and currency and returns them to the store', () => {
    const user = new User({ ...base, country: 'India', currency: 'inr' })
    assert.equal(user.validateSync(), undefined)
    assert.equal(user.currency, 'INR')
    const json = user.toJSON()
    assert.equal(json.country, 'India')
    assert.equal(json.currency, 'INR')
    assert.equal(json.password, undefined)
  })

  it('refuses an unsupported currency at the database layer too', () => {
    const error = new User({ ...base, currency: 'XYZ' }).validateSync()
    assert.ok(error?.errors?.currency)
  })

  it('still accepts older accounts saved before these fields existed', () => {
    const user = new User(base)
    assert.equal(user.validateSync(), undefined)
    assert.equal(user.country, undefined)
    assert.equal(user.currency, undefined)
  })
})
