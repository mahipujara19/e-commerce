/**
 * Thin fetch wrapper for the Express API.
 *
 * - The access token lives only in this module's memory, so it never reaches localStorage.
 * - The refresh token is an httpOnly cookie the browser sends for us (credentials: 'include').
 * - Every POST/PUT/PATCH/DELETE carries an X-CSRF-Token header. The token is fetched once from
 *   /api/csrf-token, kept in memory, and fetched again if the server rejects it.
 * - A token about to expire is refreshed before the request; a 401 triggers one refresh and one retry.
 *   A request is never retried twice, and only one refresh runs at a time, so there are no loops.
 */

// Empty in development (Vite proxies /api). Set VITE_API_URL when the API is served from another origin.
const API_BASE = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')}/api`
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
// Refresh a little early so a request never leaves with a token that expires on the way.
const EXPIRY_MARGIN_MS = 30 * 1000

let accessToken = null
let accessTokenExpiresAt = 0
let refreshInFlight = null
let csrfToken = null
let csrfInFlight = null
let handleSessionExpired = () => {}

export const setAccessToken = (token, expiresInMs) => {
  accessToken = token
  accessTokenExpiresAt = token && expiresInMs ? Date.now() + expiresInMs : 0
}

export const setSessionExpiredHandler = (handler) => {
  handleSessionExpired = handler
}

export class ApiRequestError extends Error {
  constructor(status, message, code, retryAfterSeconds, data) {
    super(message)
    this.status = status
    this.code = code
    // Set on 429 responses from rate-limited endpoints.
    this.retryAfterSeconds = retryAfterSeconds
    // Extra detail from the server, e.g. per-item stock issues or field errors.
    this.data = data
  }
}

const REQUEST_TIMEOUT_MS = 20 * 1000

// Used when the server gives no message of its own (a proxy error page, a crash, an empty body).
const FALLBACK_MESSAGES = {
  400: 'Some details were not accepted. Please check them and try again.',
  401: 'Please sign in to continue.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you were looking for. It may have been removed.',
  409: 'Something changed in the meantime. Please review and try again.',
  413: 'That request was too large.',
  429: 'Too many attempts. Please wait a moment and try again.',
}

export const messageForStatus = (status) =>
  FALLBACK_MESSAGES[status] ??
  (status >= 500 ? 'Our servers are having trouble right now. Please try again in a moment.' : 'Something went wrong. Please try again.')

const request = async (path, { method = 'GET', body, headers: extra } = {}) => {
  const headers = { ...extra }
  if (body) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError') {
      throw new ApiRequestError(0, 'The server took too long to respond. Please check your connection and try again.', 'TIMEOUT')
    }
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    throw new ApiRequestError(
      0,
      offline ? 'You appear to be offline. Reconnect and try again.' : 'Unable to reach the server. Please check your connection.',
      'NETWORK',
    )
  }

  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.success) {
    throw new ApiRequestError(
      response.status,
      result?.message ?? messageForStatus(response.status),
      result?.data?.code,
      result?.data?.retryAfterSeconds,
      result?.data,
    )
  }
  return result.data
}

// Shared promise so parallel requests fetch the token once.
const ensureCsrfToken = () => {
  if (csrfToken) return Promise.resolve(csrfToken)
  csrfInFlight ??= request('/csrf-token')
    .then((data) => {
      csrfToken = data.csrfToken
      return csrfToken
    })
    .finally(() => {
      csrfInFlight = null
    })
  return csrfInFlight
}

// Adds the bearer and CSRF headers; retries once with a fresh CSRF token if the server rejected it.
const send = async (path, options = {}) => {
  const method = options.method ?? 'GET'
  const unsafe = UNSAFE_METHODS.has(method)

  const attempt = async () => {
    const headers = {}
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`
    if (unsafe) headers['X-CSRF-Token'] = await ensureCsrfToken()
    return request(path, { ...options, method, headers })
  }

  try {
    return await attempt()
  } catch (error) {
    if (!unsafe || error.code !== 'CSRF_INVALID') throw error
    csrfToken = null
    return attempt()
  }
}

const expireSession = () => {
  setAccessToken(null)
  handleSessionExpired()
  return new ApiRequestError(401, 'Your session has expired. Please sign in again.', 'SESSION_EXPIRED')
}

// Shared promise so parallel 401s (or StrictMode's double effects) trigger only one refresh.
// A rejected refresh token ends the session; a network or server error does not.
export const refreshSession = () => {
  refreshInFlight ??= send('/auth/refresh', { method: 'POST' })
    .then((data) => {
      setAccessToken(data.accessToken, data.accessTokenExpiresIn)
      return data
    })
    .catch((error) => {
      throw error.status === 401 ? expireSession() : error
    })
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

// Auth endpoints manage the session themselves, so they are never refreshed or retried here.
const isAuthPath = (path) => path.startsWith('/auth/')

export const api = async (path, options) => {
  if (!isAuthPath(path) && accessToken && Date.now() > accessTokenExpiresAt - EXPIRY_MARGIN_MS) {
    // Expired in memory: refresh up front instead of sending a request that is sure to fail.
    // A network error falls through to the request; a rejected session stops here.
    try {
      await refreshSession()
    } catch (error) {
      if (error.status === 401) throw error
    }
  }

  try {
    return await send(path, options)
  } catch (error) {
    if (error.status !== 401 || isAuthPath(path)) throw error
  }

  await refreshSession()

  try {
    return await send(path, options)
  } catch (error) {
    // Still rejected with a brand-new token: the account is gone or the session was revoked.
    if (error.status === 401) throw expireSession()
    throw error
  }
}
