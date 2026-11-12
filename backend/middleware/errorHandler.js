import { isDbConnected } from '../config/db.js'
import { ApiError } from '../utils/apiResponse.js'
import { EmailDeliveryError } from '../utils/sendEmail.js'

const UNAVAILABLE_MESSAGE = 'The service is temporarily unavailable. Please try again shortly.'

export const requireDb = (_req, _res, next) => {
  if (isDbConnected()) return next()
  return next(new ApiError(503, UNAVAILABLE_MESSAGE))
}

export const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`))
}

const normalizeError = (error) => {
  if (error instanceof ApiError) return error
  if (error.type === 'entity.parse.failed') return new ApiError(400, 'Request body is not valid JSON')
  if (error.type === 'entity.too.large') return new ApiError(400, 'Request body is too large')
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(({ path, message }) => ({ field: path, message }))
    return new ApiError(400, errors[0]?.message ?? 'Invalid data', { errors })
  }
  if (error.name === 'CastError') return new ApiError(400, `Invalid value for ${error.path}`)
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0] ?? 'value'
    return new ApiError(409, `An account with this ${field} already exists`)
  }
  if (error instanceof EmailDeliveryError) {
    console.error(`[email] ${error.message}`)
    return new ApiError(503, 'We could not send that email right now. Please try again shortly.')
  }
  if (error.name?.startsWith('MongoNetwork') || error.name === 'MongoServerSelectionError') {
    return new ApiError(503, UNAVAILABLE_MESSAGE)
  }
  return null
}

// Express identifies error middleware by its four arguments, so _next must stay.
export const errorHandler = (error, req, res, _next) => {
  const known = normalizeError(error)
  // Unexpected errors are logged with the request id, which is also returned to the client in X-Request-Id,
  // so a customer report can be matched to the exact log line.
  if (!known) console.error(`[error] ${req.method} ${req.originalUrl} (request ${req.id ?? 'unknown'})`, error)

  res.status(known?.status ?? 500).json({
    success: false,
    message: known?.message ?? 'Something went wrong on our side',
    data: known?.data ?? null,
  })
}
