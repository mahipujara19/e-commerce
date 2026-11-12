import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

let env
let requireCaptcha
const realFetch = globalThis.fetch

beforeAll(async () => {
  // config/env.js needs these to load; no database is used here.
  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGO_URI: 'mongodb://127.0.0.1:1/unused',
    JWT_ACCESS_SECRET: 'test-access-secret-that-is-long-enough-123456',
    JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-long-enough-654321',
    PAYMENT_METHODS: '',
    PAYMENT_MODE: 'manual',
    STRIPE_SECRET_KEY: '',
    RECAPTCHA_SECRET_KEY: '',
  })
  ;({ env } = await import('../config/env.js'))
  ;({ requireCaptcha } = await import('../utils/recaptcha.js'))
})

afterEach(() => {
  globalThis.fetch = realFetch
  env.isProduction = false
  env.recaptchaSecret = ''
  vi.restoreAllMocks()
})

afterAll(() => {
  globalThis.fetch = realFetch
})

// Runs the middleware and resolves with what it passed to next(): undefined (allowed) or the error.
const run = (body = {}) =>
  new Promise((resolve) => {
    requireCaptcha({ body, ip: '203.0.113.9' }, {}, resolve)
  })

const google = (result) => {
  globalThis.fetch = vi.fn(async () => ({ json: async () => result }))
  return globalThis.fetch
}

describe('signup reCAPTCHA check', () => {
  it('is skipped in development when no secret key is set', async () => {
    const fetch = google({ success: false })
    expect(await run()).toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuses sign-up in production when the secret key is missing, instead of skipping the check', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    env.isProduction = true
    const error = await run({ captchaToken: 'token' })
    expect(error).toMatchObject({ status: 503, data: { code: 'CAPTCHA_NOT_CONFIGURED' } })
  })

  it('requires a token when a secret key is set', async () => {
    env.recaptchaSecret = 'server-secret'
    expect(await run()).toMatchObject({ status: 400, data: { code: 'CAPTCHA_REQUIRED' } })
  })

  it('accepts a token Google confirms, sending the secret only to Google', async () => {
    env.recaptchaSecret = 'server-secret'
    const fetch = google({ success: true })
    expect(await run({ captchaToken: 'good-token' })).toBeUndefined()
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('https://www.google.com/recaptcha/api/siteverify')
    expect(new URLSearchParams(options.body).get('secret')).toBe('server-secret')
  })

  it('rejects a failed or expired check as the visitor\'s problem', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    env.recaptchaSecret = 'server-secret'
    google({ success: false, 'error-codes': ['timeout-or-duplicate'] })
    expect(await run({ captchaToken: 'old-token' })).toMatchObject({ status: 400, data: { code: 'CAPTCHA_FAILED' } })
  })

  it('reports a wrong secret key as a setup problem, not a failed check', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    env.recaptchaSecret = 'wrong-secret'
    google({ success: false, 'error-codes': ['invalid-input-secret'] })
    expect(await run({ captchaToken: 'token' })).toMatchObject({ status: 503, data: { code: 'CAPTCHA_MISCONFIGURED' } })
    expect(log.mock.calls[0][0]).toContain('RECAPTCHA_SECRET_KEY')
    expect(log.mock.calls[0][0]).not.toContain('wrong-secret')
  })
})
