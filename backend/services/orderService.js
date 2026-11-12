import { env } from '../config/env.js'
import Coupon from '../models/Coupon.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import { ApiError } from '../utils/apiResponse.js'
import { priceOrder, recordTaxTransaction, reverseTaxTransaction } from './pricingService.js'
import {
  orderNumber,
  sendNewOrderAlertEmail,
  sendOrderCancelledEmail,
  sendOrderConfirmationEmail,
  sendOrderDeliveredEmail,
  sendOrderShippedEmail,
} from '../utils/sendEmail.js'
import { formatMoney } from '../utils/money.js'
import { isValidPaymentSignature, razorpay } from '../utils/razorpay.js'
import { getStripe, toCents } from '../utils/stripe.js'

const DAY_MS = 24 * 60 * 60 * 1000
// Default delivery promise shown to customers until staff set one when shipping.
export const DELIVERY_DAYS = 5
// Stripe's minimum Checkout session lifetime. Stock is held for this long, then released if unpaid.
const PAYMENT_WINDOW_MS = 30 * 60 * 1000
// Orders still awaiting payment this long after creation are checked against Stripe and cancelled if unpaid.
const STALE_PAYMENT_MS = PAYMENT_WINDOW_MS + 15 * 60 * 1000

// ── Coupons ──

const couponProblem = (coupon, subtotal, now = new Date()) => {
  if (!coupon || !coupon.active) return 'This code is not valid'
  if (coupon.expiresAt && coupon.expiresAt <= now) return 'This code has expired'
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return 'This code has been fully redeemed'
  if (subtotal < coupon.minSubtotal) return `This code needs a subtotal of at least ${formatMoney(coupon.minSubtotal)}`
  return null
}

// Claims one use atomically, so a limited code cannot be redeemed more times than allowed under concurrency.
const claimCoupon = async (coupon) => {
  const filter = { _id: coupon._id, active: true }
  if (coupon.maxUses) filter.usedCount = { $lt: coupon.maxUses }
  const { modifiedCount } = await Coupon.updateOne(filter, { $inc: { usedCount: 1 } })
  if (!modifiedCount) throw new ApiError(400, 'This code has been fully redeemed', { code: 'COUPON_INVALID' })
}

export const PUBLIC_COUPON_LIMIT = 20

/**
 * Codes customers may see on the storefront: switched on, not expired and with uses left. Only customer-safe fields
 * are returned (no usage counts, limits or ids). Whether a code fits a particular bag (its minimum subtotal) is still
 * decided by couponProblem() when the code is applied to a quote or an order.
 */
export const listPublicCoupons = async (now = new Date()) => {
  const coupons = await Coupon.find({
    active: true,
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      { $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(PUBLIC_COUPON_LIMIT)
    .lean()

  return coupons.map((coupon) => ({
    code: coupon.code,
    description: coupon.description || '',
    type: coupon.type,
    value: coupon.value,
    minSubtotal: coupon.minSubtotal ?? 0,
    expiresAt: coupon.expiresAt ?? null,
  }))
}

const releaseCoupon = (code) =>
  code ? Coupon.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }) : null

// ── Quotes ──

const mergeQuantities = (items) => {
  const quantities = new Map()
  items.forEach(({ product, quantity }) => quantities.set(String(product), (quantities.get(String(product)) ?? 0) + quantity))
  return quantities
}

/**
 * Prices a bag from the database: current prices, live stock and an optional coupon.
 * Never trusts names, prices or totals from the client. Problems are returned, not thrown, so checkout can
 * show every one at once: issues = [{ product, type: 'unavailable' | 'insufficient_stock', available, message }].
 */
export const buildQuote = async ({ items: requested, couponCode, address }) => {
  const quantities = mergeQuantities(requested)
  const products = await Product.find({ _id: { $in: [...quantities.keys()] } })
  const byId = new Map(products.map((product) => [product.id, product]))
  const issues = []
  const lines = []

  for (const [id, quantity] of quantities) {
    const product = byId.get(id)
    if (!product) {
      issues.push({ product: id, type: 'unavailable', available: 0, message: 'This item is no longer available' })
      continue
    }
    if (product.stock < quantity) {
      issues.push({
        product: id,
        type: 'insufficient_stock',
        available: product.stock,
        message: product.stock === 0 ? `${product.name} is sold out` : `Only ${product.stock} of ${product.name} left`,
      })
    }
    lines.push({ product: product._id, name: product.name, image: product.image, price: product.price, quantity })
  }

  const subtotal = lines.reduce((sum, line) => sum + Math.round(line.price * 100) * line.quantity, 0) / 100
  let coupon = null
  let couponError = null

  if (couponCode) {
    const found = await Coupon.findOne({ code: couponCode.trim().toUpperCase() })
    couponError = couponProblem(found, subtotal)
    if (!couponError) coupon = found
  }

  const { pricing, ...totals } = await priceOrder({ lines, coupon: coupon && { type: coupon.type, value: coupon.value }, address })
  return { lines, issues, coupon, couponError, totals, pricing }
}

export const quoteResponse = ({ lines, issues, coupon, couponError, totals, pricing }) => ({
  items: lines.map(({ product, name, image, price, quantity }) => ({ product: String(product), name, image, price, quantity })),
  issues,
  coupon: coupon ? { code: coupon.code, type: coupon.type, value: coupon.value, description: coupon.description } : null,
  couponError,
  ...totals,
  shippingMethod: pricing.carrier,
  estimatedDelivery: pricing.estimatedDelivery,
  pricing: { shippingSource: pricing.shippingSource, taxSource: pricing.taxSource, fallback: pricing.fallback, estimated: pricing.estimated },
})

// ── Stock ──

const releaseStock = (items) =>
  Promise.all(items.map(({ product, quantity }) => Product.updateOne({ _id: product }, { $inc: { stock: quantity } })))

// The conditional update makes each reservation atomic, so concurrent orders cannot oversell.
// MongoDB transactions need a replica set, so a failure instead gives back what was already reserved.
const reserveStock = async (items) => {
  const reserved = []
  for (const item of items) {
    const { modifiedCount } = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
    )
    if (!modifiedCount) {
      await releaseStock(reserved)
      throw new ApiError(409, `Not enough stock for ${item.name}. Please update your bag.`, { code: 'STOCK_CHANGED' })
    }
    reserved.push(item)
  }
}

// ── Notifications (never fail the request) ──

const staffRecipients = async () => {
  if (env.supportEmail) return [env.supportEmail]
  return User.find({ role: 'admin' }).distinct('email')
}

const safely = (label, task) =>
  Promise.resolve()
    .then(task)
    .catch((error) => console.error(`[orders] ${label} failed: ${error.message}`))

const announceConfirmedOrder = (order) => {
  safely('Confirmation email', () => sendOrderConfirmationEmail(order))
  safely('New order alert', async () => {
    const to = await staffRecipients()
    if (to.length) await sendNewOrderAlertEmail({ to, order })
  })
}

// ── Stripe ──

const stripeLineItems = (order) => {
  const currency = env.payments.currency
  const lines = order.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency,
      unit_amount: toCents(item.price),
      product_data: { name: item.name, images: /^https:\/\//.test(item.image) ? [item.image] : undefined },
    },
  }))
  if (order.shipping > 0) {
    lines.push({ quantity: 1, price_data: { currency, unit_amount: toCents(order.shipping), product_data: { name: 'Shipping' } } })
  }
  if (order.tax > 0) {
    lines.push({ quantity: 1, price_data: { currency, unit_amount: toCents(order.tax), product_data: { name: 'Sales tax' } } })
  }
  return lines
}

const createCheckoutSession = async (order) => {
  const stripe = getStripe()
  // Stripe Checkout cannot take a negative line, so an order discount becomes a one-off Stripe coupon.
  const discounts = order.discount > 0
    ? [{
        coupon: (await stripe.coupons.create({
          amount_off: toCents(order.discount),
          currency: env.payments.currency,
          duration: 'once',
          name: order.couponCode ? `Code ${order.couponCode}` : 'Discount',
          max_redemptions: 1,
        })).id,
      }]
    : undefined

  return stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: stripeLineItems(order),
      discounts,
      customer_email: order.shippingAddress.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      payment_intent_data: { metadata: { orderId: order.id }, description: `Order ${orderNumber(order.id)}` },
      expires_at: Math.floor((Date.now() + PAYMENT_WINDOW_MS) / 1000),
      success_url: `${env.clientUrl}/checkout/complete?order=${order.id}`,
      cancel_url: `${env.clientUrl}/checkout/complete?order=${order.id}&cancelled=1`,
    },
    // A retried request can never create a second session for the same order.
    { idempotencyKey: `checkout-${order.id}` },
  )
}

// ── Order lifecycle ──

const pushStatus = (order, status, note) => {
  order.status = status
  order.statusHistory.push({ status, at: new Date(), note })
}

// ── Razorpay ──

const STORE_NAME = 'goodthings'

// What the browser needs to open the Razorpay Checkout popup for an order. The key id is public by design.
const razorpayCheckout = (order) => ({
  provider: 'razorpay',
  keyId: env.payments.razorpayKeyId,
  orderId: order.payment.razorpayOrderId,
  amount: toCents(order.totalAmount),
  currency: env.payments.currency.toUpperCase(),
  name: STORE_NAME,
  description: `Order ${orderNumber(order.id)}`,
  prefill: { name: order.shippingAddress.fullName, email: order.shippingAddress.email, contact: order.shippingAddress.phone },
})

const createRazorpayOrder = (order) =>
  razorpay.createOrder({
    amount: toCents(order.totalAmount),
    currency: env.payments.currency,
    // Razorpay limits receipts to 40 characters; the Mongo id is 24.
    receipt: order.id,
    notes: { orderId: order.id, orderNumber: orderNumber(order.id) },
  })

// A Razorpay payment for this order that has the right amount, captured or (if auto-capture is off) authorized.
const usablePayment = (order, payment) =>
  payment &&
  payment.order_id === order.payment.razorpayOrderId &&
  payment.amount === toCents(order.totalAmount) &&
  payment.currency === env.payments.currency.toUpperCase() &&
  ['captured', 'authorized'].includes(payment.status)

// Captures an authorized payment (accounts without auto-capture), then marks the order paid.
const settleRazorpayPayment = async (order, payment) => {
  if (payment.status === 'authorized') await razorpay.capturePayment(payment.id, payment.amount, payment.currency)
  return markOrderPaid(order.id, { razorpayPaymentId: payment.id, amountTotal: payment.amount })
}

// Looks for a successful payment on the order's Razorpay order. Resolves with the payment or null.
const findRazorpayPayment = async (order) => {
  if (!order.payment?.razorpayOrderId) return null
  const { items = [] } = await razorpay.orderPayments(order.payment.razorpayOrderId)
  return items.find((payment) => payment.status === 'captured' && usablePayment(order, payment)) ??
    items.find((payment) => usablePayment(order, payment)) ??
    null
}

// From the webhook: pays the order, or refunds a payment that arrived after the order was cancelled
// (a customer who left the popup open), so nobody is ever charged for a cancelled order.
export const handleRazorpayPayment = async (order, payment) => {
  if (order.status === 'cancelled') {
    if (payment.status === 'captured' && order.payment?.razorpayPaymentId !== payment.id) {
      console.warn(`[payments] Razorpay payment ${payment.id} arrived for cancelled order ${order.id}; refunding it`)
      await razorpay.refundPayment(payment.id, { amount: payment.amount, notes: { orderId: order.id, reason: 'Order was already cancelled' } })
    }
    return order
  }
  if (order.payment?.status !== 'awaiting_payment' || !usablePayment(order, payment)) return order
  return settleRazorpayPayment(order, payment)
}

/**
 * Called by the browser after the Razorpay popup reports success. The signature proves the ids came from Razorpay;
 * the payment is then fetched from Razorpay itself to check its amount and status before the order is marked paid.
 */
export const confirmRazorpayPayment = async (order, { razorpayOrderId, razorpayPaymentId, signature }) => {
  if (order.payment?.provider !== 'razorpay' || order.payment.razorpayOrderId !== razorpayOrderId) {
    throw new ApiError(400, 'This payment does not belong to this order')
  }
  if (!isValidPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature })) {
    throw new ApiError(400, 'The payment could not be verified. If you were charged, contact us and we will sort it out.', { code: 'PAYMENT_UNVERIFIED' })
  }
  if (order.payment.status === 'paid') return order

  const payment = await razorpay.fetchPayment(razorpayPaymentId)
  if (!usablePayment(order, payment)) {
    console.error(`[payments] Razorpay payment ${razorpayPaymentId} does not match order ${order.id} (status ${payment?.status}, amount ${payment?.amount})`)
    throw new ApiError(400, 'The payment does not match this order. If you were charged, contact us.', { code: 'PAYMENT_UNVERIFIED' })
  }
  return (await settleRazorpayPayment(order, payment)) ?? Order.findById(order.id)
}

/**
 * Places an order: prices it from the database, reserves stock, claims the coupon and, for online payments,
 * starts the payment. Resolves with { order, payment }: payment is null for pay on delivery,
 * { provider: 'stripe', url } for Stripe Checkout, or the Razorpay Checkout options for Razorpay.
 */
export const placeOrder = async ({ user, items: requested, shippingAddress, couponCode, paymentMethod }) => {
  // The customer's choice, or the store's first method. The route already rejects methods that are not enabled.
  const method = paymentMethod ?? env.payments.methods[0]
  if (!env.payments.methods.includes(method)) throw new ApiError(400, 'This payment method is not available')

  const quote = await buildQuote({ items: requested, couponCode, address: shippingAddress })

  if (quote.issues.length) {
    throw new ApiError(409, quote.issues[0].message, { code: 'STOCK_CHANGED', issues: quote.issues })
  }
  if (couponCode && quote.couponError) {
    throw new ApiError(400, quote.couponError, { code: 'COUPON_INVALID' })
  }

  await reserveStock(quote.lines)
  try {
    if (quote.coupon) await claimCoupon(quote.coupon)
  } catch (error) {
    await releaseStock(quote.lines)
    throw error
  }

  const provider = method === 'cod' ? null : method
  const card = Boolean(provider)
  let order
  try {
    order = await Order.create({
      user: user._id,
      items: quote.lines,
      shippingAddress,
      ...quote.totals,
      couponCode: quote.coupon?.code,
      payment: card ? { method: 'card', provider, status: 'awaiting_payment' } : { method: 'manual', status: 'unpaid' },
      statusHistory: [{ status: 'pending', at: new Date(), note: card ? 'Awaiting payment' : 'Order placed' }],
      // A carrier's own estimate (plus a day to prepare the parcel) when one was quoted, otherwise the store default.
      estimatedDelivery: quote.pricing.estimatedDelivery
        ? new Date(quote.pricing.estimatedDelivery.getTime() + DAY_MS)
        : new Date(Date.now() + DELIVERY_DAYS * DAY_MS),
      carrier: quote.pricing.carrier,
      pricing: { shippingSource: quote.pricing.shippingSource, taxSource: quote.pricing.taxSource, fallback: quote.pricing.fallback },
      taxCalculationId: quote.pricing.taxCalculationId,
    })
  } catch (error) {
    await Promise.all([releaseStock(quote.lines), releaseCoupon(quote.coupon?.code)])
    throw error
  }

  if (!card) {
    announceConfirmedOrder(order)
    safely('Tax record', () => recordTax(order))
    return { order, payment: null }
  }

  try {
    if (provider === 'razorpay') {
      const razorpayOrder = await createRazorpayOrder(order)
      order.payment.razorpayOrderId = razorpayOrder.id
      await order.save()
      return { order, payment: razorpayCheckout(order) }
    }
    const session = await createCheckoutSession(order)
    order.payment.stripeSessionId = session.id
    await order.save()
    return { order, payment: { provider: 'stripe', url: session.url } }
  } catch (error) {
    // Payment could not even start: undo everything so the customer can simply try again.
    console.error(`[payments] Could not start a ${provider} payment for ${order.id}: ${error.message}`)
    await cancelOrder(order, { note: 'Payment could not be started', notify: false })
    throw new ApiError(502, 'We could not start the payment. You have not been charged. Please try again in a moment.')
  }
}

// Idempotent: Stripe and Razorpay can deliver the same event more than once, and the browser may confirm it too.
export const markOrderPaid = async (orderId, { paymentIntentId, razorpayPaymentId, amountTotal } = {}) => {
  const set = { 'payment.status': 'paid', 'payment.paidAt': new Date() }
  if (paymentIntentId) set['payment.stripePaymentIntentId'] = paymentIntentId
  if (razorpayPaymentId) set['payment.razorpayPaymentId'] = razorpayPaymentId
  const order = await Order.findOneAndUpdate(
    { _id: orderId, 'payment.status': 'awaiting_payment', status: 'pending' },
    {
      $set: set,
      $push: { statusHistory: { status: 'pending', at: new Date(), note: 'Payment received' } },
    },
    { returnDocument: 'after' },
  )
  if (!order) return null

  if (amountTotal != null && amountTotal !== toCents(order.totalAmount)) {
    console.error(`[payments] Amount mismatch on ${order.id}: paid ${amountTotal}, order ${toCents(order.totalAmount)}`)
  }
  announceConfirmedOrder(order)
  safely('Tax record', () => recordTax(order))
  return order
}

const recordTax = async (order) => {
  const transactionId = await recordTaxTransaction(order)
  if (transactionId) await Order.updateOne({ _id: order._id }, { taxTransactionId: transactionId })
}

const refundIfPaid = async (order) => {
  if (order.payment?.status !== 'paid' || order.payment.method !== 'card') return
  if (order.payment.provider === 'razorpay') {
    if (!order.payment.razorpayPaymentId) return
    await razorpay.refundPayment(order.payment.razorpayPaymentId, {
      amount: toCents(order.totalAmount),
      notes: { orderId: order.id, reason: 'Order cancelled' },
    })
  } else {
    if (!order.payment.stripePaymentIntentId) return
    await getStripe().refunds.create(
      { payment_intent: order.payment.stripePaymentIntentId, metadata: { orderId: order.id } },
      { idempotencyKey: `refund-${order.id}` },
    )
  }
  order.payment.status = 'refunded'
  order.payment.refundedAt = new Date()
}

/**
 * Cancels an order once: refunds a card payment, expires an open Stripe session, returns stock and the coupon use.
 * A refund failure stops the cancellation, so an order is never marked cancelled while the customer is still charged.
 */
export const cancelOrder = async (order, { note, notify = true } = {}) => {
  if (order.status === 'cancelled') throw new ApiError(400, 'This order is already cancelled')

  if (order.payment?.status === 'awaiting_payment' && order.payment.stripeSessionId) {
    // Close the payment page first. If that fails the session already ended, possibly because the customer
    // just paid, so look it up: a paid session is recorded here and refunded below, never silently dropped.
    const stripe = getStripe()
    let session
    try {
      session = await stripe.checkout.sessions.expire(order.payment.stripeSessionId)
    } catch {
      try {
        session = await stripe.checkout.sessions.retrieve(order.payment.stripeSessionId)
      } catch (error) {
        console.error(`[payments] Could not check the session for ${order.id}: ${error.message}`)
        throw new ApiError(502, 'Payment status could not be confirmed with Stripe, so the order was not cancelled. Please try again.')
      }
    }
    if (session.payment_status === 'paid') {
      order.payment.status = 'paid'
      order.payment.paidAt = new Date()
      order.payment.stripePaymentIntentId = session.payment_intent
    }
  }

  if (order.payment?.status === 'awaiting_payment' && order.payment.provider === 'razorpay') {
    // A Razorpay order stays payable until we stop it, so check for a payment that just went through.
    let payment
    try {
      payment = await findRazorpayPayment(order)
    } catch (error) {
      console.error(`[payments] Could not check Razorpay payments for ${order.id}: ${error.message}`)
      throw new ApiError(502, 'Payment status could not be confirmed with Razorpay, so the order was not cancelled. Please try again.')
    }
    if (payment) {
      if (payment.status === 'authorized') await razorpay.capturePayment(payment.id, payment.amount, payment.currency)
      order.payment.status = 'paid'
      order.payment.paidAt = new Date()
      order.payment.razorpayPaymentId = payment.id
    }
  }

  try {
    await refundIfPaid(order)
  } catch (error) {
    const where = order.payment?.provider === 'razorpay' ? 'Razorpay' : 'Stripe'
    console.error(`[payments] Refund failed for ${order.id}: ${error.message}`)
    throw new ApiError(502, `The refund could not be issued, so the order was not cancelled. Please try again or refund it in ${where}.`)
  }

  // Claim the cancellation atomically so stock is only ever returned once.
  const claimed = await Order.updateOne({ _id: order._id, status: { $ne: 'cancelled' } }, { $set: { status: 'cancelled' } })
  if (!claimed.modifiedCount) throw new ApiError(400, 'This order is already cancelled')

  pushStatus(order, 'cancelled', note)
  // Never paid: record that no money was taken, rather than leaving it "awaiting".
  if (order.payment?.status === 'awaiting_payment') order.payment.status = 'unpaid'
  await order.save()
  await Promise.all([releaseStock(order.items), releaseCoupon(order.couponCode)])
  if (order.taxTransactionId) safely('Tax reversal', () => reverseTaxTransaction(order))

  if (notify) safely('Cancellation email', () => sendOrderCancelledEmail(order))
  return order
}

const isStale = (order) => Date.now() - new Date(order.createdAt).getTime() > STALE_PAYMENT_MS

// Asks the payment provider what happened to an order still awaiting payment: pays it, cancels it, or leaves it open.
export const reconcilePayment = async (order) => {
  if (order.payment?.status !== 'awaiting_payment') return order

  if (order.payment.provider === 'razorpay') {
    if (!order.payment.razorpayOrderId || !env.payments.razorpayKeyId) return order
    const payment = await findRazorpayPayment(order)
    if (payment) return (await settleRazorpayPayment(order, payment)) ?? Order.findById(order.id)
    // Razorpay orders never expire on their own, so an abandoned one is closed here to free the stock.
    if (isStale(order)) {
      return cancelOrder(order, { note: 'Payment was not completed', notify: false }).catch(() => Order.findById(order.id))
    }
    return order
  }

  if (!order.payment.stripeSessionId || !env.payments.stripeSecretKey) return order

  const session = await getStripe().checkout.sessions.retrieve(order.payment.stripeSessionId)
  if (session.payment_status === 'paid') {
    return (await markOrderPaid(order.id, { paymentIntentId: session.payment_intent, amountTotal: session.amount_total })) ??
      Order.findById(order.id)
  }
  if (session.status === 'expired') {
    return cancelOrder(order, { note: 'Payment was not completed', notify: false }).catch(() => Order.findById(order.id))
  }
  return order
}

// Payment details to finish an unpaid order, while its payment window is still open.
export const resumePayment = async (order) => {
  if (order.payment?.status !== 'awaiting_payment' || order.status !== 'pending') {
    throw new ApiError(400, 'This order does not need payment')
  }
  if (order.payment.provider === 'razorpay' && order.payment.razorpayOrderId) {
    if (isStale(order)) throw new ApiError(410, 'This payment has expired. Please place the order again.')
    return razorpayCheckout(order)
  }
  if (!order.payment.stripeSessionId) throw new ApiError(400, 'This order does not need payment')
  const session = await getStripe().checkout.sessions.retrieve(order.payment.stripeSessionId)
  if (session.status !== 'open' || !session.url) {
    throw new ApiError(410, 'This payment link has expired. Please place the order again.')
  }
  return { provider: 'stripe', url: session.url }
}

// Status changes by staff. Returns the saved order; sends the matching customer email.
export const changeOrderStatus = async (order, { status, carrier, trackingNumber, estimatedDelivery, note }) => {
  if (order.status === 'cancelled') throw new ApiError(400, 'A cancelled order cannot be changed')

  if (status === 'cancelled') return cancelOrder(order, { note })

  if (order.payment?.status === 'awaiting_payment' && status && status !== 'pending') {
    throw new ApiError(400, 'This order has not been paid yet. It can only be cancelled until payment arrives.')
  }

  if (carrier !== undefined) order.carrier = carrier || undefined
  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber || undefined
  if (estimatedDelivery !== undefined) order.estimatedDelivery = estimatedDelivery || undefined

  const changed = status && status !== order.status
  if (changed) pushStatus(order, status, note)
  await order.save()

  if (changed && status === 'shipped') safely('Shipped email', () => sendOrderShippedEmail(order))
  if (changed && status === 'delivered') safely('Delivered email', () => sendOrderDeliveredEmail(order))
  return order
}

// Safety net for missed webhooks: settles every order left awaiting payment past its window.
export const sweepStalePayments = async () => {
  if (env.payments.methods.every((method) => method === 'cod')) return
  const stale = await Order.find({
    'payment.status': 'awaiting_payment',
    status: 'pending',
    createdAt: { $lt: new Date(Date.now() - STALE_PAYMENT_MS) },
  }).limit(50)

  for (const order of stale) {
    try {
      const settled = await reconcilePayment(order)
      // No session or Razorpay order at all means payment never started; nothing can complete it.
      if (settled?.payment?.status === 'awaiting_payment' && !order.payment.stripeSessionId && !order.payment.razorpayOrderId) {
        await cancelOrder(order, { note: 'Payment was not completed', notify: false })
      }
    } catch (error) {
      console.error(`[payments] Could not settle ${order.id}: ${error.message}`)
    }
  }
}
