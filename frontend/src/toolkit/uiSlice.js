import { createSlice } from '@reduxjs/toolkit'

const THEME_KEY = 'theme'

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Storage unavailable — fall back to the system preference.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: { cartOpen: false, theme: getInitialTheme() },
  reducers: {
    openCart: (state) => {
      state.cartOpen = true
    },
    closeCart: (state) => {
      state.cartOpen = false
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_KEY, state.theme)
      } catch {
        // Storage unavailable — the choice lasts for this session only.
      }
    },
  },
})

export const { openCart, closeCart, toggleTheme } = uiSlice.actions
export default uiSlice.reducer
