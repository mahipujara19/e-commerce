import Stripe from 'stripe'
import { env } from '../config/env.js'

let client = null

// Created on first use, so the API starts (and tests run) without Stripe credentials in manual payment mode.
export const getStripe = () => {
  if (!env.payments.stripeSecretKey) throw new Error('Stripe is not configured (STRIPE_SECRET_KEY is empty)')
  client ??= new Stripe(env.payments.stripeSecretKey, { maxNetworkRetries: 2, timeout: 20000 })
  return client
}

export const toCents = (amount) => Math.round(amount * 100)
