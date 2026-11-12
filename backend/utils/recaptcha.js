import { env } from '../config/env.js'
import { ApiError } from './apiResponse.js'
import { clientIp } from './clientIp.js'
import { logSecurityEvent } from './securityLog.js'

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

// Google error codes that mean our own setup is wrong, not that the visitor failed the check.
const CONFIG_ERRORS = new Set(['missing-input-secret', 'invalid-input-secret'])

const unavailable = (code) =>
  new ApiError(503, 'Sign-up is temporarily unavailable. Please try again later.', { code })

/**
 * Verifies the reCAPTCHA token from the signup form with Google. Only a server-side check stops bots: the browser
 * widget alone can simply be skipped.
 * - RECAPTCHA_SECRET_KEY empty: skipped in development; in production sign-up is refused (never silently allowed).
 * - Google says the secret is wrong: refused with 503 and a clear server log, since no visitor can pass.
 */
export const requireCaptcha = async (req, _res, next) => {
  if (!env.recaptchaSecret) {
    if (!env.isProduction) return next()
    console.error('[captcha] Sign-up refused: RECAPTCHA_SECRET_KEY is not set.')
    return next(unavailable('CAPTCHA_NOT_CONFIGURED'))
  }

  const token = req.body?.captchaToken
  if (typeof token !== 'string' || !token || token.length > 4000) {
    return next(new ApiError(400, 'Please complete the "I am not a robot" check.', { code: 'CAPTCHA_REQUIRED' }))
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: env.recaptchaSecret, response: token, remoteip: clientIp(req) }),
      signal: AbortSignal.timeout(8000),
    })
    const result = await response.json()
    if (!result.success) {
      const errors = result['error-codes'] ?? []
      if (errors.some((code) => CONFIG_ERRORS.has(code))) {
        console.error(`[captcha] Google rejected RECAPTCHA_SECRET_KEY (${errors.join(', ')}). Copy the secret key from the same reCAPTCHA registration as VITE_RECAPTCHA_SITE_KEY.`)
        return next(unavailable('CAPTCHA_MISCONFIGURED'))
      }
      // A token from a different site key also fails here; if every sign-up fails, check that both keys come from
      // one registration and that this site's domain is listed in it.
      logSecurityEvent('captcha_failed', { ip: clientIp(req), errors: errors.join(',') })
      return next(new ApiError(400, 'The "I am not a robot" check expired or failed. Please try it again.', { code: 'CAPTCHA_FAILED' }))
    }
    return next()
  } catch (error) {
    console.error(`[captcha] Verification request failed: ${error.message}`)
    return next(new ApiError(503, 'We could not verify the security check. Please try again in a moment.'))
  }
}
