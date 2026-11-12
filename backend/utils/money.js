import { env } from '../config/env.js'

// Formats an amount in the store currency for emails and messages, e.g. "₹1,499.00" or "$75.00".
const formatter = new Intl.NumberFormat(env.payments.currency === 'inr' ? 'en-IN' : 'en-US', {
  style: 'currency',
  currency: env.payments.currency.toUpperCase(),
})

export const formatMoney = (value) => formatter.format(Number(value) || 0)
