import { env } from '../config/env.js'
import Order from '../models/Order.js'
import { cancelOrder, handleRazorpayPayment, markOrderPaid } from '../services/orderService.js'
import { isValidWebhookSignature } from '../utils/razorpay.js'
import { getStripe } from '../utils/stripe.js'

/**
 * POST /api/payments/webhook — Stripe calls this; it is the source of truth that a payment happened.
 * Mounted with express.raw() before the JSON parser and CSRF check, because the signature covers the raw body.
 * Configure in the Stripe dashboard with the events: checkout.session.completed,
 * checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired.
 */
export const stripeWebhook = async (req, res) => {
  let event
  try {
    event = getStripe().webhooks.constructEvent(req.body, req.get('stripe-signature'), env.payments.stripeWebhookSecret)
  } catch (error) {
    console.warn(`[payments] Rejected webhook: ${error.message}`)
    return res.status(400).json({ success: false, message: 'Invalid signature', data: null })
  }

  const session = event.data.object
  const orderId = session.metadata?.orderId ?? session.client_reference_id

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        // A delayed method (e.g. bank debit) completes the session before the money arrives.
        if (session.payment_status === 'paid' && orderId) {
          await markOrderPaid(orderId, { paymentIntentId: session.payment_intent, amountTotal: session.amount_total })
        }
        break
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const order = orderId && (await Order.findById(orderId))
        if (order && order.status !== 'cancelled' && order.payment?.status === 'awaiting_payment') {
          await cancelOrder(order, { note: 'Payment was not completed', notify: event.type === 'checkout.session.async_payment_failed' })
        }
        break
      }
      default:
        break
    }
  } catch (error) {
    // 500 makes Stripe retry later, which is what we want for a temporary database problem.
    console.error(`[payments] Webhook ${event.type} for ${orderId} failed: ${error.message}`)
    return res.status(500).json({ success: false, message: 'Webhook handling failed', data: null })
  }

  return res.json({ success: true, message: 'Received', data: null })
}

/**
 * POST /api/payments/razorpay/webhook — Razorpay calls this; mounted with express.raw() because the signature
 * covers the raw body. In the Razorpay Dashboard (Accounts & Settings → Webhooks) subscribe to:
 * payment.captured, payment.authorized, order.paid.
 */
export const razorpayWebhook = async (req, res) => {
  if (!isValidWebhookSignature(req.body, req.get('x-razorpay-signature'))) {
    console.warn('[payments] Rejected Razorpay webhook: invalid signature')
    return res.status(400).json({ success: false, message: 'Invalid signature', data: null })
  }

  let event
  try {
    event = JSON.parse(req.body.toString('utf8'))
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid JSON', data: null })
  }

  const payment = event.payload?.payment?.entity
  try {
    if (['payment.captured', 'payment.authorized', 'order.paid'].includes(event.event) && payment?.order_id) {
      const order = await Order.findOne({ 'payment.razorpayOrderId': payment.order_id })
      if (order) await handleRazorpayPayment(order, payment)
    }
  } catch (error) {
    // 500 makes Razorpay retry later.
    console.error(`[payments] Razorpay webhook ${event.event} for ${payment?.order_id} failed: ${error.message}`)
    return res.status(500).json({ success: false, message: 'Webhook handling failed', data: null })
  }
  return res.json({ success: true, message: 'Received', data: null })
}
