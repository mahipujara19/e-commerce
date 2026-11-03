/**
 * Thin fetch wrapper for the Express API.
 *
 * The access token lives only in this module's memory, so it never reaches
 * localStorage. The refresh token is an httpOnly cookie the browser sends for us.
 * When a request gets a 401, the token is refreshed once and the request retried.
 */

let accessToken = null
let refreshInFlight = null
let handleSessionExpired = () => {}

export const setAccessToken = (token) => {
  accessToken = token
}

export const setSessionExpiredHandler = (handler) => {
  handleSessionExpired = handler
}

export class ApiRequestError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const send = async (path, { method = 'GET', body } = {}) => {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiRequestError(0, 'Unable to reach the server. Please check your connection.')
  }

  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.success) {
    throw new ApiRequestError(response.status, result?.message ?? 'The server is unavailable. Please try again shortly.')
  }
  return result.data
}

// Shared promise so parallel 401s (or StrictMode's double effects) trigger only one refresh.
export const refreshSession = () => {
  refreshInFlight ??= send('/auth/refresh', { method: 'POST' })
    .then((data) => {
      accessToken = data.accessToken
      return data
    })
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

export const api = async (path, options) => {
  try {
    return await send(path, options)
  } catch (error) {
    if (error.status !== 401 || path.startsWith('/auth/')) throw error
  }

  try {
    await refreshSession()
  } catch (error) {
    if (error.status === 401) {
      accessToken = null
      handleSessionExpired()
      throw new ApiRequestError(401, 'Your session has expired. Please sign in again.')
    }
    throw error
  }

  return send(path, options)
}
