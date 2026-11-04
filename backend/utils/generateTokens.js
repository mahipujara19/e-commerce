import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60
const JWT_OPTIONS = { algorithm: 'HS256' }

export const ACCESS_TOKEN_MAX_AGE_MS = ACCESS_TOKEN_TTL_SECONDS * 1000
export const REFRESH_TOKEN_MAX_AGE_MS = REFRESH_TOKEN_TTL_SECONDS * 1000

export const generateAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.jwtAccessSecret, { ...JWT_OPTIONS, expiresIn: ACCESS_TOKEN_TTL_SECONDS })

export const generateRefreshToken = (user) =>
  jwt.sign({ sub: user.id, jti: randomUUID() }, env.jwtRefreshSecret, { ...JWT_OPTIONS, expiresIn: REFRESH_TOKEN_TTL_SECONDS })

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtAccessSecret, { algorithms: ['HS256'] })

export const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret, { algorithms: ['HS256'] })

// SHA-256 rather than bcrypt: bcrypt only reads the first 72 bytes, which JWTs for one user share.
export const hashToken = (token) => createHash('sha256').update(token).digest('hex')

// Single-use token for email links; returns the raw value to send and the hash to store.
export const generateEmailToken = () => {
  const token = randomBytes(32).toString('hex')
  return { token, hash: hashToken(token) }
}

export const tokenMatchesHash = (token, storedHash) => {
  if (!storedHash) return false
  return timingSafeEqual(Buffer.from(hashToken(token)), Buffer.from(storedHash))
}
