import { createSlice } from '@reduxjs/toolkit'

/**
 * ── authSlice ──
 * Manages user authentication state.
 *
 * Two separate localStorage keys:
 * - 'auth'            → current session (isAuthenticated, user)
 * - 'registeredUsers' → array of all signed-up users (survives logout)
 *
 * Flow:
 * 1. User signs up → saved to registeredUsers[] AND logged in
 * 2. User logs out → session cleared, but registeredUsers[] stays
 * 3. User logs in → checks registeredUsers[] by email → restores session
 */

// Load current session from localStorage
const loadSession = () => {
  try {
    const saved = localStorage.getItem('auth')
    if (saved) {
      const session = JSON.parse(saved)
      if (!session || typeof session !== 'object') return null

      const sanitizedSession = {
        isAuthenticated: session.isAuthenticated,
        user: session.user,
      }

      if (Object.hasOwn(session, 'addresses')) {
        localStorage.setItem('auth', JSON.stringify(sanitizedSession))
      }

      return sanitizedSession
    }
  } catch {
    // Corrupted data — start fresh
  }
  return null
}

/**
 * Load all registered users from localStorage.
 * This is a separate store that survives logout,
 * so users can sign up once and log in again later.
 */
const loadRegisteredUsers = () => {
  try {
    const saved = localStorage.getItem('registeredUsers')
    if (saved) return JSON.parse(saved)
  } catch {
    // Corrupted — start fresh
  }
  return []
}

// Save a new user to the registeredUsers array in localStorage
const saveRegisteredUser = (userData) => {
  try {
    const users = loadRegisteredUsers()
    // Avoid duplicates — update if email already exists
    const existingIndex = users.findIndex((u) => u.email === userData.email)
    if (existingIndex !== -1) {
      users[existingIndex] = userData
    } else {
      users.push(userData)
    }
    localStorage.setItem('registeredUsers', JSON.stringify(users))
  } catch {
    // localStorage full — fail silently
  }
}

const savedSession = loadSession()

const initialState = {
  isAuthenticated: savedSession?.isAuthenticated ?? false,
  user: savedSession?.user ?? null,
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

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Called after successful signup.
     * 1. Saves user to registeredUsers[] so they can log in later
     * 2. Logs the user in immediately (sets session)
     */
    signup: (state, action) => {
      const { firstName, lastName, email, phone, password } = action.payload
      state.isAuthenticated = true
      state.user = { firstName, lastName, email, phone }
      saveSession(state)
      // Save to persistent registeredUsers store (survives logout)
      saveRegisteredUser({ firstName, lastName, email, phone, password })
    },

    /**
     * Called from LoginForm after verifying credentials.
     * Restores the session with the user's profile data.
     */
    login: (state, action) => {
      const { email, firstName, lastName, phone } = action.payload
      state.isAuthenticated = true
      state.user = { firstName, lastName, email, phone }
      saveSession(state)
    },

    /**
     * Clears current session but does NOT remove registeredUsers.
     * The user can log back in later with their credentials.
     */
    logout: (state) => {
      state.isAuthenticated = false
      state.user = null
      saveSession(state)
    },
  },
})

// Export the registeredUsers loader so LoginForm can check credentials
export { loadRegisteredUsers }
export const { signup, login, logout } = authSlice.actions
export default authSlice.reducer
