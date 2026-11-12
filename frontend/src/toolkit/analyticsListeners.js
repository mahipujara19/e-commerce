import { createListenerMiddleware } from '@reduxjs/toolkit'
import { gaItem, trackEvent } from '../utils/analytics'
import { login, signup } from './authSlice'
import { addItem } from './slice'
import { CURRENCY } from '../utils/format'

// Store actions that are also business events. Each call is a no-op until analytics is enabled and accepted.
export const analyticsListeners = createListenerMiddleware()

analyticsListeners.startListening({
  actionCreator: addItem,
  effect: ({ payload }) => {
    const quantity = Math.max(1, Number(payload.quantity) || 1)
    trackEvent('add_to_cart', { currency: CURRENCY, value: payload.price * quantity, items: [gaItem(payload, quantity)] })
  },
})
analyticsListeners.startListening({ actionCreator: login.fulfilled, effect: () => trackEvent('login', { method: 'email' }) })
analyticsListeners.startListening({ actionCreator: signup.fulfilled, effect: () => trackEvent('sign_up', { method: 'email' }) })
