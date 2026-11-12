import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../config/env.js'

/**
 * Minimal Razorpay REST client (https://razorpay.com/docs/api/). Uses the key id and secret with HTTP Basic auth.
 * Amounts are in the smallest currency unit (paise for INR).
 */

const API = 'https://api.razorpay.com/v1'
const TIMEOUT_MS = 15000

export class RazorpayError extends Error {
  constructor(status, message, code) {
    super(message)
    this.name = 'RazorpayError'
    this.status = status
    this.code = code
  }
}

const request = async (method, path, body) => {
  const { razorpayKeyId, razorpayKeySecret } = env.payments
  if (!razorpayKeyId || !razorpayKeySecret) throw new RazorpayError(0, 'Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)')

  let response
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    throw new RazorpayError(0, `Razorpay could not be reached: ${error.message}`)
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new RazorpayError(response.status, data.error?.description || `Razorpay answered ${response.status}`, data.error?.code)
  }
  return data
}

export const razorpay = {
  createOrder: ({ amount, currency, receipt, notes }) => request('POST', '/orders', { amount, currency: currency.toUpperCase(), receipt, notes }),
  orderPayments: (razorpayOrderId) => request('GET', `/orders/${razorpayOrderId}/payments`),
  fetchPayment: (paymentId) => request('GET', `/payments/${paymentId}`),
  // Only needed when the account is not set to capture payments automatically.
  capturePayment: (paymentId, amount, currency) => request('POST', `/payments/${paymentId}/capture`, { amount, currency: currency.toUpperCase() }),
  refundPayment: (paymentId, { amount, notes }) => request('POST', `/payments/${paymentId}/refund`, { amount, speed: 'normal', notes }),
}

const safeEqualHex = (expected, received) => {
  if (typeof received !== 'string') return false
  const left = Buffer.from(expected)
  const right = Buffer.from(received)
  return left.length === right.length && timingSafeEqual(left, right)
}

// Checkout success: Razorpay signs "<order_id>|<payment_id>" with the key secret.
export const isValidPaymentSignature = ({ razorpayOrderId, razorpayPaymentId, signature }) =>
  safeEqualHex(createHmac('sha256', env.payments.razorpayKeySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex'), signature)

// Webhooks: Razorpay signs the raw request body with the webhook secret.
export const isValidWebhookSignature = (rawBody, signature) =>
  Boolean(env.payments.razorpayWebhookSecret) &&
  safeEqualHex(createHmac('sha256', env.payments.razorpayWebhookSecret).update(rawBody).digest('hex'), signature)
