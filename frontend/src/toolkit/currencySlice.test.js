import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import reducer, { initialCurrencyState, setCurrency } from './currencySlice.js'

const RATES = { type: 'currency/fetchRates/fulfilled', payload: { base: 'INR', rates: { INR: 1, EUR: 0.011 }, available: true, stale: false } }
const signedIn = (type, user) => ({ type, payload: { id: 'u1', firstName: 'Asha', ...user } })

describe('currency switching', () => {
  it('starts on the store currency for a new visitor', () => {
    assert.equal(initialCurrencyState(null).selected, null)
  })

  it('switches to a supported currency and ignores anything else', () => {
    let state = reducer(initialCurrencyState(null), setCurrency('eur'))
    assert.equal(state.selected, 'EUR')
    state = reducer(state, setCurrency('XYZ'))
    assert.equal(state.selected, 'EUR')
  })

  it('becomes ready once rates load, or unavailable when they cannot', () => {
    assert.equal(reducer(initialCurrencyState(null), RATES).status, 'ready')
    assert.equal(reducer(initialCurrencyState(null), { type: 'currency/fetchRates/rejected' }).status, 'unavailable')
    const down = { ...RATES, payload: { ...RATES.payload, available: false } }
    assert.equal(reducer(initialCurrencyState(null), down).status, 'unavailable')
  })
})

describe('account preference on sign-up and sign-in', () => {
  it('applies the currency the server saved at sign-up (the country default)', () => {
    const state = reducer(initialCurrencyState('USD'), signedIn('auth/signup/fulfilled', { country: 'Germany', currency: 'EUR' }))
    assert.equal(state.selected, 'EUR')
  })

  it('lets the header switcher change the currency after sign-up', () => {
    let state = reducer(initialCurrencyState(null), signedIn('auth/signup/fulfilled', { country: 'Germany', currency: 'EUR' }))
    state = reducer(state, setCurrency('GBP'))
    assert.equal(state.selected, 'GBP')
  })

  it('uses the country for an older account without a saved currency', () => {
    const state = reducer(initialCurrencyState(null), signedIn('auth/login/fulfilled', { country: 'Japan', currency: null }))
    assert.equal(state.selected, 'JPY')
  })

  it('keeps the current choice for an older account with neither field', () => {
    const state = reducer(initialCurrencyState('EUR'), signedIn('auth/restoreSession/fulfilled', { country: null, currency: null }))
    assert.equal(state.selected, 'EUR')
  })
})
