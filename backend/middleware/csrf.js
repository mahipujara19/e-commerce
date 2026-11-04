import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { env } from '../config/env.js'
import { ApiError, sendSuccess } from '../utils/apiResponse.js'

/**
 * Signed double-submit cookie.
 *
 * GET /api/csrf-token sets an httpOnly cookie and returns the same token in the body. The frontend keeps it
 * in memory and sends it back as the X-CSRF-Token header on every state-changing request. A forged
 * cross-site request carries the cookie but cannot read the token to put in the header.
 *
 * The token is signed, so a cookie planted by a sibling subdomain (which cannot know the secret) is rejected.
 * The token is returned in the body rather than read from document.cookie so it also works when the
 * frontend and API are on different origins.
 */

export const CSRF_COOKIE = 'csrfToken'
export const CSRF_HEADER = 'x-csrf-token'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const cookieOptions = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  path: '/api',
}

const sign = (value) => createHmac('sha256', env.csrfSecret).update(value).digest('hex')

const createToken = () => {
  const value = randomBytes(32).toString('hex')
  return `${value}.${sign(value)}`
}

const safeEqual = (a, b) => {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

const isSigned = (token) => {
  if (typeof token !== 'string') return false
  const [value, signature, extra] = token.split('.')
  return Boolean(value && signature) && extra === undefined && safeEqual(signature, sign(value))
}

// Reuses a valid cookie so several open tabs share one token instead of invalidating each other.
export const issueCsrfToken = (req, res) => {
  const existing = req.cookies?.[CSRF_COOKIE]
  const token = isSigned(existing) ? existing : createToken()

  res.cookie(CSRF_COOKIE, token, { ...cookieOptions, maxAge: MAX_AGE_MS })
  res.set('Cache-Control', 'no-store')
  sendSuccess(res, { message: 'CSRF token issued', data: { csrfToken: token } })
}

export const verifyCsrf = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next()

  const cookieToken = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.get(CSRF_HEADER)

  if (!cookieToken || !headerToken || !isSigned(cookieToken) || !safeEqual(cookieToken, headerToken)) {
    return next(new ApiError(403, 'Your security token is missing or has expired. Please try again.', { code: 'CSRF_INVALID' }))
  }
  return next()
}
