import { createSlice } from '@reduxjs/toolkit'
import { normalizeCurrency, preferredCurrency } from '../../../shared/currencies.js'

/**
 * The customer's display currency and the cached exchange rates (GET /api/currency/rates, fetched by
 * currencyListeners.js). Customers are always charged in the store currency (`base`); other currencies are
 * shown as approximate conversions only.
 *
 * selected: the chosen currency code, or null for "the store currency". Guests' choice is kept in this browser;
 * signed-in customers' choice comes from, and is saved to, their profile.
 */
export const CURRENCY_KEY = 'currency'

const loadStored = () => {
  try {
    return normalizeCurrency(globalThis.localStorage?.getItem(CURRENCY_KEY))
  } catch {
    return null
  }
}

const store = (code) => {
  try {
    if (code) globalThis.localStorage?.setItem(CURRENCY_KEY, code)
    else globalThis.localStorage?.removeItem(CURRENCY_KEY)
  } catch {
    // Storage unavailable: the choice lasts for this visit only.
  }
}

// Sign-up, sign-in, session restore and profile updates all deliver the session user as the payload.
const USER_ACTIONS = ['auth/signup/fulfilled', 'auth/login/fulfilled', 'auth/restoreSession/fulfilled', 'auth/updateProfile/fulfilled']

export const initialCurrencyState = (stored = loadStored()) => ({
  selected: stored,
  base: null,
  rates: null,
  // 'idle' | 'loading' | 'ready' | 'unavailable'
  status: 'idle',
  stale: false,
})

const currencySlice = createSlice({
  name: 'currency',
  initialState: initialCurrencyState,
  reducers: {
    // Unsupported codes are ignored, so nothing unexpected reaches the price formatter or the API.
    setCurrency: (state, action) => {
      const code = normalizeCurrency(action.payload)
      if (!code) return
      state.selected = code
      store(code)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase('currency/fetchRates/pending', (state) => {
        state.status = 'loading'
      })
      .addCase('currency/fetchRates/fulfilled', (state, action) => {
        const { base, rates, available, stale } = action.payload
        state.base = base
        state.rates = rates
        state.stale = Boolean(stale)
        state.status = available ? 'ready' : 'unavailable'
      })
      .addCase('currency/fetchRates/rejected', (state) => {
        state.status = 'unavailable'
      })
      // A saved account preference wins over this browser's; older accounts fall back to their country's
      // currency, and accounts with neither keep the current choice.
      .addMatcher(
        (action) => USER_ACTIONS.includes(action.type),
        (state, action) => {
          const fromAccount = preferredCurrency({ user: action.payload, storeCurrency: null })
          if (fromAccount) state.selected = fromAccount
        },
      )
  },
})

export const { setCurrency } = currencySlice.actions
export default currencySlice.reducer
