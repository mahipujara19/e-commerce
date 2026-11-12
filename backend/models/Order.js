import mongoose from 'mongoose'
import { jsonOptions } from '../utils/jsonTransform.js'

export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

// awaiting_payment: sent to Stripe, not paid yet (stock is held until the session expires).
// unpaid: manual payment mode, settled offline. paid / refunded: card payments.
export const PAYMENT_STATUSES = ['awaiting_payment', 'unpaid', 'paid', 'refunded']
// card = paid online (Stripe or Razorpay, including UPI and netbanking); manual = pay on delivery.
export const PAYMENT_METHODS = ['card', 'manual']
export const PAYMENT_PROVIDERS = ['stripe', 'razorpay']

// Name, image and price are copied so past orders survive later product edits or deletion.
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

export const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    // Optional in the schema so orders placed before it was collected still load; the API requires it for new orders.
    phone: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false },
)

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    // Online payments only. Card orders from before Razorpay was added have no provider and are Stripe orders.
    provider: { type: String, enum: PAYMENT_PROVIDERS },
    status: { type: String, enum: PAYMENT_STATUSES, required: true },
    razorpayOrderId: { type: String, index: { sparse: true } },
    razorpayPaymentId: String,
    stripeSessionId: { type: String, index: { sparse: true } },
    stripePaymentIntentId: String,
    paidAt: Date,
    refundedAt: Date,
  },
  { _id: false },
)

const statusEventSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    note: String,
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: {
      type: [orderItemSchema],
      validate: { validator: (items) => items.length > 0, message: 'An order needs at least one item' },
    },
    shippingAddress: { type: shippingAddressSchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    couponCode: String,
    shipping: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    // Absent on orders placed before payments were added; the API reports those as unpaid manual orders.
    payment: paymentSchema,
    statusHistory: { type: [statusEventSchema], default: [] },
    carrier: { type: String, trim: true },
    // Where shipping and tax came from (shippo / stripe / flat / free) and whether a provider fallback was used.
    pricing: {
      shippingSource: String,
      taxSource: String,
      fallback: Boolean,
    },
    // Stripe Tax: the calculation used for this order, and the transaction recorded once it is paid.
    taxCalculationId: String,
    taxTransactionId: String,
    trackingNumber: { type: String, trim: true },
    estimatedDelivery: Date,
  },
  { timestamps: true, toJSON: jsonOptions() },
)

orderSchema.index({ 'payment.status': 1, createdAt: 1 })

export default mongoose.model('Order', orderSchema)
