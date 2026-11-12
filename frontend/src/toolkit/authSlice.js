import { createAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, refreshSession, setAccessToken } from '../utils/api'
import { apiThunk } from './apiThunk'

/**
 * ── authSlice ──
 * Manages user authentication state, backed by the Express API.
 *
 * - localStorage 'auth' → profile only, a hint that a session may exist after a reload
 * - access token        → in memory (see utils/api.js), restored from the refresh cookie on load
 * - passwords and tokens are never stored in the browser
 *
 * Flow:
 * 1. signup / login → API returns the user and access token, and sets the refresh cookie
 * 2. App load       → restoreSession exchanges the cookie for a new access token and the user's
 *                     current profile and role from the database; sessionChecked flips once it settles
 * 3. logout         → API invalidates the refresh token, session cleared locally
 * 4. refresh fails  → sessionExpired clears the session and LoginForm explains why
 */

// Older versions of this app kept plain-text passwords here.
try {
  localStorage.removeItem('registeredUsers')
} catch {
  // Storage unavailable — nothing to remove
}

// Load current session from localStorage
const loadSession = () => {
  try {
    const saved = localStorage.getItem('auth')
    if (saved) {
      const session = JSON.parse(saved)
      if (!session || typeof session !== 'object') return null
      return { isAuthenticated: session.isAuthenticated, user: session.user }
    }
  } catch {
    // Corrupted data — start fresh
  }
  return null
}

// Persist current session state to localStorage
const saveSession = (state) => {
  try {
    localStorage.setItem('auth', JSON.stringify({
      isAuthenticated: state.isAuthenticated,
      user: state.user,
    }))
  } catch {
    // localStorage full — fail silently
  }
}

// The API stores a single name; the UI greets users by first name.
const toSessionUser = ({ id, name, email, phone, role, emailVerified, marketingOptIn, createdAt }) => {
  const [firstName, ...rest] = name.trim().split(/\s+/)
  return {
    id,
    firstName,
    lastName: rest.join(' '),
    email,
    phone,
    role,
    emailVerified: Boolean(emailVerified),
    marketingOptIn: Boolean(marketingOptIn),
    createdAt,
  }
}

const startSession = ({ user, accessToken, accessTokenExpiresIn }) => {
  setAccessToken(accessToken, accessTokenExpiresIn)
  return toSessionUser(user)
}

// signup also reports whether the verification email went out, as action.meta.verificationEmailSent.
const authThunk = (type, path) =>
  createAsyncThunk(type, async (credentials, { rejectWithValue, fulfillWithValue }) => {
    try {
      const data = await api(path, { method: 'POST', body: credentials })
      return fulfillWithValue(startSession(data), { verificationEmailSent: data.verificationEmailSent })
    } catch (error) {
      return rejectWithValue(error.message)
    }
  })

export const signup = authThunk('auth/signup', '/auth/signup')
export const login = authThunk('auth/login', '/auth/login')

// Local sign-out must succeed even if the server cannot be reached.
export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await api('/auth/logout', { method: 'POST' })
  } catch {
    // The session is still cleared below
  } finally {
    setAccessToken(null)
  }
})

// Dispatched when the refresh token is rejected, so the user must sign in again.
export const sessionExpired = createAction('auth/sessionExpired')

// A network or server failure keeps the session; only a rejected token ends it (utils/api.js then
// dispatches sessionExpired). Guests have nothing to restore, so no request is made for them.
export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async () => startSession(await refreshSession()),
  { condition: (_, { getState }) => getState().auth.isAuthenticated },
)

export const updateProfile = apiThunk('auth/updateProfile', async (details) =>
  toSessionUser(await api('/users/me', { method: 'PUT', body: details })),
)

// Works signed in or out: the link may be opened on another device.
export const verifyEmail = apiThunk('auth/verifyEmail', (token) =>
  api('/auth/verify-email', { method: 'POST', body: { token } }),
)

const initialSession = loadSession()

const initialState = {
  isAuthenticated: initialSession?.isAuthenticated ?? false,
  user: initialSession?.user ?? null,
  // Until the server confirms the remembered session, its role cannot be trusted for route guards.
  sessionChecked: !initialSession?.isAuthenticated,
  // Set when a signed-in session ends on its own, so the login page can say why.
  expired: false,
  verificationEmailSent: null,
}

const clearSession = (state) => {
  state.isAuthenticated = false
  state.user = null
  state.sessionChecked = true
  saveSession(state)
}

const setUser = (state, action) => {
  state.isAuthenticated = true
  state.user = action.payload
  state.sessionChecked = true
  state.expired = false
  saveSession(state)
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    dismissExpired: (state) => {
      state.expired = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signup.fulfilled, (state, action) => {
        setUser(state, action)
        state.verificationEmailSent = action.meta.verificationEmailSent ?? null
      })
      .addCase(login.fulfilled, setUser)
      .addCase(restoreSession.fulfilled, setUser)
      // Offline or server down: keep the remembered profile; API calls retry the refresh when needed.
      .addCase(restoreSession.rejected, (state) => {
        state.sessionChecked = true
      })
      .addCase(updateProfile.fulfilled, setUser)
      .addCase(verifyEmail.fulfilled, (state, action) => {
        if (state.user?.email === action.payload.email) {
          state.user.emailVerified = true
          saveSession(state)
        }
      })
      .addCase(logout.fulfilled, (state) => {
        clearSession(state)
        state.expired = false
      })
      .addCase(sessionExpired, (state) => {
        state.expired = state.expired || state.isAuthenticated
        clearSession(state)
      })
  },
})

export const { dismissExpired } = authSlice.actions

export default authSlice.reducer
