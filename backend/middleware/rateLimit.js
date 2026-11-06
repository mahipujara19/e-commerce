import { ApiError } from '../utils/apiResponse.js'
import { clientIp } from '../utils/clientIp.js'
import { logSecurityEvent } from '../utils/securityLog.js'

export const byIp = clientIp
export const byUser = (req) => req.user?.id

// Counts every request, for endpoints where each call sends an email or tries a token.
export const limitRequests = ({ limiter, key, name, message }) => async (req, res, next) => {
  try {
    const { exceeded, retryAfterMs } = await limiter.hit(key(req))
    if (!exceeded) return next()

    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000)
    logSecurityEvent('rate_limited', { limit: name, ip: clientIp(req), userId: req.user?.id, path: req.originalUrl })
    res.set('Retry-After', String(retryAfterSeconds))
    throw new ApiError(429, message, { code: 'RATE_LIMITED', retryAfterSeconds })
  } catch (error) {
    return next(error)
  }
}
