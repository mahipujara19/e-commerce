import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import { createRateCache, RATES_URL, rebase } from '../services/currencyService.js'

// A stand-in for the ECB feed: rates per 1 EUR.
const ECB = { amount: 1, base: 'EUR', date: '2026-11-12', rates: { INR: 90, USD: 1.1, GBP: 0.85, JPY: 160 } }
const ok = (body) => ({ ok: true, status: 200, json: async () => body })

beforeEach(() => mock.method(console, 'warn', () => {}))
afterEach(() => mock.restoreAll())

describe('rebase', () => {
  it('expresses every rate per 1 unit of the store currency, deriving AED from its dollar peg', () => {
    const rates = rebase(ECB.rates, 'INR')
    assert.equal(rates.INR, 1)
    assert.equal(rates.EUR, Number((1 / 90).toPrecision(8)))
    assert.equal(rates.USD, Number((1.1 / 90).toPrecision(8)))
    assert.equal(rates.AED, Number(((1.1 * 3.6725) / 90).toPrecision(8)))
    assert.equal(rates.XYZ, undefined)
  })

  it('refuses a feed without the store currency', () => {
    assert.throws(() => rebase({ USD: 1.1 }, 'INR'), /INR/)
  })
})

describe('rate cache', () => {
  it('fetches once and serves the cached rates until they expire', async () => {
    let time = 0
    const fetchImpl = mock.fn(async () => ok(ECB))
    const cache = createRateCache({ base: 'inr', fetchImpl, ttlMs: 1000, now: () => time })

    const [first, second] = await Promise.all([cache.getRates(), cache.getRates()])
    assert.equal(fetchImpl.mock.callCount(), 1, 'parallel requests share one fetch')
    assert.equal(fetchImpl.mock.calls[0].arguments[0], RATES_URL)
    assert.deepEqual(first, second)
    assert.equal(first.base, 'INR')
    assert.equal(first.available, true)

    time = 500
    await cache.getRates()
    assert.equal(fetchImpl.mock.callCount(), 1)

    time = 1500
    await cache.getRates()
    assert.equal(fetchImpl.mock.callCount(), 2)
  })

  it('keeps the last good rates, marked stale, when the feed fails', async () => {
    let time = 0
    let failing = false
    const fetchImpl = async () => {
      if (failing) throw new Error('network down')
      return ok(ECB)
    }
    const cache = createRateCache({ base: 'INR', fetchImpl, ttlMs: 1000, now: () => time })
    const good = await cache.getRates()

    failing = true
    time = 5000
    const stale = await cache.getRates()
    assert.equal(stale.available, true)
    assert.equal(stale.stale, true)
    assert.deepEqual(stale.rates, good.rates)
  })

  it('reports conversion as unavailable when no rates were ever loaded', async () => {
    const cache = createRateCache({ base: 'INR', fetchImpl: async () => ({ ok: false, status: 503 }) })
    const result = await cache.getRates()
    assert.equal(result.available, false)
    assert.deepEqual(result.rates, { INR: 1 })
  })
})
