import { STAFF_ROLES } from '../config/roles.js'
import User from '../models/User.js'
import { ApiError } from '../utils/apiResponse.js'
import { verifyAccessToken } from '../utils/generateTokens.js'

export const getBearerToken = (req) => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ')
  return scheme === 'Bearer' && token ? token : null
}

// Verifies the access token and loads the user, so deleted or demoted accounts lose access immediately.
// The role checked by authorize() is the one in the database, never the one inside the token.
export const protect = async (req, _res, next) => {
  try {
    const token = getBearerToken(req)
    if (!token) throw new ApiError(401, 'Authentication required', { code: 'TOKEN_MISSING' })

    let payload
    try {
      payload = verifyAccessToken(token)
    } catch {
      throw new ApiError(401, 'Invalid or expired access token', { code: 'TOKEN_INVALID' })
    }

    const user = await User.findById(payload.sub)
    if (!user) throw new ApiError(401, 'Account no longer exists', { code: 'TOKEN_INVALID' })

    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

export const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user?.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action'))
  }
  return next()
}

export const adminOnly = authorize('admin')
export const staffOnly = authorize(...STAFF_ROLES)
