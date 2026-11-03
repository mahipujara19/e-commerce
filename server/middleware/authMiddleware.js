import User from '../models/User.js'
import { ApiError } from '../utils/apiResponse.js'
import { verifyAccessToken } from '../utils/generateTokens.js'

export const getBearerToken = (req) => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ')
  return scheme === 'Bearer' && token ? token : null
}

// Verifies the access token and loads the user, so deleted or demoted accounts lose access immediately.
export const protect = async (req, _res, next) => {
  try {
    const token = getBearerToken(req)
    if (!token) throw new ApiError(401, 'Authentication required')

    let payload
    try {
      payload = verifyAccessToken(token)
    } catch {
      throw new ApiError(401, 'Invalid or expired access token')
    }

    const user = await User.findById(payload.sub)
    if (!user) throw new ApiError(401, 'Account no longer exists')

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
