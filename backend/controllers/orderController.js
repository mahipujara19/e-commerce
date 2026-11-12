import { matchedData } from 'express-validator'
import { env } from '../config/env.js'
import { STAFF_ROLES } from '../config/roles.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import {
  buildQuote,
  cancelOrder,
  changeOrderStatus,
  confirmRazorpayPayment,
  placeOrder,
  quoteResponse,
  reconcilePayment,
  resumePayment,
} from '../services/orderService.js'
import { ApiError, sendSuccess } from '../utils/apiResponse.js'
import { audit } from '../utils/auditLog.js'
import { orderNumber } from '../utils/sendEmail.js'

const CUSTOMER_FIELDS = 'name email phone'

// Orders from before payments were tracked have no payment record; they were settled outside the app.
const withPayment = (order) => {
  const json = order.toJSON()
  json.payment ??= { method: 'manual', status: 'unpaid' }
  if (json.payment.method === 'card') json.payment.provider ??= 'stripe'
  delete json.payment.stripeSessionId
  delete json.payment.stripePaymentIntentId
  delete json.payment.razorpayOrderId
  delete json.payment.razorpayPaymentId
  delete json.taxCalculationId
  delete json.taxTransactionId
  return json
}

const loadOwnOrder = async (req) => {
  const order = await Order.findById(req.params.id)
  if (!order) throw new ApiError(404, 'Order not found')
  if (!order.user.equals(req.user._id) && !STAFF_ROLES.includes(req.user.role)) {
    // 404 rather than 403, so order ids cannot be probed.
    throw new ApiError(404, 'Order not found')
  }
  return order
}

const METHOD_INFO = {
  cod: { label: 'Cash on delivery', description: 'Pay in cash (or UPI to the courier) when your order arrives.' },
  razorpay: { label: 'UPI, cards, netbanking & wallets', description: 'Pay securely with Razorpay: UPI, debit or credit card, netbanking or wallets.' },
  stripe: { label: 'Credit or debit card', description: 'Pay on a secure Stripe page. Apple Pay and Google Pay are accepted.' },
}

// Payment settings the storefront needs before checkout.
export const getCheckoutConfig = (_req, res) => {
  sendSuccess(res, {
    message: 'Checkout settings',
    data: {
      paymentMethods: env.payments.methods.map((id) => ({ id, ...METHOD_INFO[id] })),
      // Development only: ids of methods that are switched off. Never shown to customers; how to switch one on is
      // in .env.example.
      unavailableMethods: env.isProduction ? [] : env.payments.unavailable.map((id) => ({ id })),
      // Older clients read a single mode.
      paymentMode: env.payments.methods[0] === 'cod' ? 'manual' : env.payments.methods[0],
      currency: env.payments.currency,
      shippingProvider: env.shipping.provider,
      taxProvider: env.tax.provider,
    },
  })
}

// Prices the bag with live stock and an optional coupon, without reserving anything.
export const quoteOrder = async (req, res, next) => {
  try {
    const { items, couponCode, shippingAddress } = matchedData(req, { locations: ['body'] })
    sendSuccess(res, { message: 'Quote ready', data: quoteResponse(await buildQuote({ items, couponCode, address: shippingAddress })) })
  } catch (error) {
    next(error)
  }
}

export const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, couponCode, saveAddress, paymentMethod } = matchedData(req, { locations: ['body'] })
    const { order, payment } = await placeOrder({ user: req.user, items, shippingAddress, couponCode, paymentMethod })

    // Optional convenience; a failure here must not affect the order that was just placed.
    if (saveAddress) {
      const { email: _email, ...address } = shippingAddress
      User.updateOne(
        { _id: req.user._id, 'addresses.9': { $exists: false } },
        { $push: { addresses: { ...address, isDefault: req.user.addresses.length === 0 } } },
      ).catch((error) => console.error(`[orders] Could not save address: ${error.message}`))
    }

    sendSuccess(res, {
      status: 201,
      message: payment ? 'Continue to payment' : 'Order placed',
      // paymentUrl is kept for Stripe so older clients keep working.
      data: { order: withPayment(order), payment, paymentUrl: payment?.provider === 'stripe' ? payment.url : null },
    })
  } catch (error) {
    next(error)
  }
}

export const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 })
    sendSuccess(res, { message: 'Orders loaded', data: orders.map(withPayment) })
  } catch (error) {
    next(error)
  }
}

export const getAllOrders = async (_req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('user', CUSTOMER_FIELDS)
    sendSuccess(res, { message: 'Orders loaded', data: orders.map(withPayment) })
  } catch (error) {
    next(error)
  }
}

// Also settles a card payment that Stripe finished but whose webhook has not arrived yet,
// so the confirmation page is right the moment the customer comes back from Stripe.
export const getOrder = async (req, res, next) => {
  try {
    let order = await loadOwnOrder(req)
    try {
      order = await reconcilePayment(order)
    } catch (error) {
      console.error(`[payments] Could not reconcile ${order.id}: ${error.message}`)
    }
    sendSuccess(res, { message: 'Order loaded', data: withPayment(order) })
  } catch (error) {
    next(error)
  }
}

export const payOrder = async (req, res, next) => {
  try {
    const order = await loadOwnOrder(req)
    const payment = await resumePayment(order)
    sendSuccess(res, { message: 'Payment ready', data: { payment, paymentUrl: payment.provider === 'stripe' ? payment.url : null } })
  } catch (error) {
    next(error)
  }
}

// Called by the browser after the Razorpay popup succeeds; the server checks the signature and the payment itself.
export const verifyRazorpay = async (req, res, next) => {
  try {
    const order = await loadOwnOrder(req)
    const { razorpayOrderId, razorpayPaymentId, signature } = matchedData(req, { locations: ['body'] })
    const paid = await confirmRazorpayPayment(order, { razorpayOrderId, razorpayPaymentId, signature })
    sendSuccess(res, { message: 'Payment confirmed', data: withPayment(paid) })
  } catch (error) {
    next(error)
  }
}

// Customers may cancel until the order is being prepared. A card payment is refunded automatically.
export const cancelOwnOrder = async (req, res, next) => {
  try {
    const order = await loadOwnOrder(req)
    if (!order.user.equals(req.user._id)) throw new ApiError(404, 'Order not found')
    if (order.status !== 'pending') {
      throw new ApiError(400, 'This order is already being prepared and can no longer be cancelled online. Please contact us.')
    }
    const cancelled = await cancelOrder(order, { note: 'Cancelled by customer' })
    sendSuccess(res, { message: 'Order cancelled', data: withPayment(cancelled) })
  } catch (error) {
    next(error)
  }
}

export const updateOrderStatus = async (req, res, next) => {
  try {
    const changes = matchedData(req, { locations: ['body'] })
    const order = await Order.findById(req.params.id)
    if (!order) throw new ApiError(404, 'Order not found')

    const previous = order.status
    const updated = await changeOrderStatus(order, changes)
    await updated.populate('user', CUSTOMER_FIELDS)

    audit(req.user, 'order.update', {
      targetType: 'order',
      targetId: order.id,
      summary: `${orderNumber(order.id)}: ${previous} → ${updated.status}${changes.trackingNumber ? ` (tracking ${changes.trackingNumber})` : ''}`,
      details: changes,
    })

    sendSuccess(res, { message: 'Order updated', data: withPayment(updated) })
  } catch (error) {
    next(error)
  }
}
