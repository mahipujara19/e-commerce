import { createAsyncThunk, createListenerMiddleware } from '@reduxjs/toolkit'
import { api } from '../utils/api'
import { setCurrency } from './currencySlice'

// Exchange rates against the store currency; the server caches them, so this is one cheap request per visit.
export const fetchRates = createAsyncThunk('currency/fetchRates', () => api('/currency/rates'), {
  condition: (_, { getState }) => getState().currency.status === 'idle',
})

export const currencyListeners = createListenerMiddleware()

// A signed-in customer's switcher choice is saved to their profile, so it follows them to other devices.
// A failure only means the choice is not remembered elsewhere; the prices on screen have already changed.
currencyListeners.startListening({
  actionCreator: setCurrency,
  effect: async (_action, { getState }) => {
    const { auth, currency } = getState()
    if (!auth.isAuthenticated || !currency.selected || auth.user?.currency === currency.selected) return
    try {
      await api('/users/me/preferences', { method: 'PATCH', body: { currency: currency.selected } })
    } catch (error) {
      console.warn(`[currency] Could not save the currency preference: ${error.message}`)
    }
  },
})
