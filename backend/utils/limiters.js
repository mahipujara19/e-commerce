import { RATE_LIMITS } from '../config/security.js'
import { createLimiter } from './rateLimiter.js'

// Shared instances, so routes and controllers count against the same windows.
export const limiters = Object.fromEntries(
  Object.entries(RATE_LIMITS).map(([name, options]) => [name, createLimiter({ name, ...options })]),
)
