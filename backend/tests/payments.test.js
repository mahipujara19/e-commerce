import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { client, startTestServer } from './setup.js'

// A stand-in for the Stripe SDK: records calls and lets each test decide what Stripe reports.
const stripe = vi.hoisted(() => {
  const state = { sessions: new Map(), counter: 0 }
  const fake = {
    state,
    coupons: { create: vi.fn(async ({ amount_off }) => ({ id: `coupon_${amount_off}` })) },
    checkout: {
      sessions: {
        create: vi.fn(async (params) => {
          const id = `cs_test_${++state.counter}`
          const session = { id, url: `https://checkout.stripe.test/${id}`, status: 'open', payment_status: 'unpaid', params }
          state.sessions.set(id, session)
          return session
        }),
        retrieve: vi.fn(async (id) => state.sessions.get(id)),
        expire: vi.fn(async (id) => {
          const session = state.sessions.get(id)
          if (session.status !== 'open') throw new Error('Session is not open')
          session.status = 'expired'
          return session
        }),
      },
    },
    refunds: { create: vi.fn(async () => ({ id: 're_1', status: 'succeeded' })) },
    webhooks: {
      constructEvent: (body, signature) => {
        if (signature !== 'valid-signature') throw new Error('No signatures found matching the expected signature')
        return JSON.parse(body.toString())
      },
    },
  }
  return fake
})

vi.mock('../utils/stripe.js', () => ({
  getStripe: () => stripe,
  toCents: (amount) => Math.round(amount * 100),
}))

let server
let app
let Product
let Order
let product
let shopper
let staff

const address = {
  fullName: 'Pat Payer',
  email: 'pat@test.dev',
  phone: '+44 20 7946 0000',
  address: '2 Pay Lane',
  city: 'London',
  state: 'London',
  zipCode: 'EC1A 1BB',
  country: 'United Kingdom',
}

const sendWebhook = (type, session, signature = 'valid-signature') =>
  request(app)
    .post('/api/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', signature)
    .send(JSON.stringify({ type, data: { object: session } }))

const placeOrder = async (body = {}) => {
  const res = await shopper.post('/api/orders', { items: [{ product: product.id, quantity: 2 }], shippingAddress: address, ...body })
  expect(res.status).toBe(201)
  return res.body.data
}

const stockNow = async () => (await Product.findById(product.id)).stock

beforeAll(async () => {
  server = await startTestServer({ PAYMENT_MODE: 'stripe', STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_WEBHOOK_SECRET: 'whsec_fake' })
  app = server.app
  const { default: User } = await import('../models/User.js')
  const { default: Coupon } = await import('../models/Coupon.js')
  ;({ default: Product } = await import('../models/Product.js'))
  ;({ default: Order } = await import('../models/Order.js'))

  const admin = await User.create({ name: 'Ada Admin', email: 'ada@test.dev', password: 'Admin123!', role: 'admin' })
  await User.create({ name: 'Sam Staff', email: 'sam@test.dev', password: 'Staff123!', role: 'staff' })
  product = await Product.create({
    name: 'Silk Scarf',
    description: 'Soft',
    price: 30,
    stock: 10,
    category: 'accessories',
    image: 'https://example.com/scarf.png',
    createdBy: admin._id,
  })
  await Coupon.create({ code: 'FIVE', type: 'fixed', value: 5 })

  shopper = await client(app)
  await shopper.signup({ name: 'Pat Payer', email: 'pat@test.dev' })
  staff = await client(app)
  await staff.login('sam@test.dev', 'Staff123!')
})

afterAll(async () => {
  await server?.stop()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Stripe Checkout', () => {
  it('reports card payments to the storefront', async () => {
    const res = await shopper.get('/api/orders/config')
    expect(res.body.data.paymentMode).toBe('stripe')
  })

  it('opens a Checkout session whose amount matches the order total exactly', async () => {
    const before = await stockNow()
    const { order, paymentUrl } = await placeOrder({ couponCode: 'FIVE' })

    expect(paymentUrl).toMatch(/^https:\/\/checkout\.stripe\.test\//)
    expect(order.payment).toEqual({ method: 'card', provider: 'stripe', status: 'awaiting_payment' })
    expect(await stockNow()).toBe(before - 2)

    const params = stripe.checkout.sessions.create.mock.calls[0][0]
    const lineTotal = params.line_items.reduce((sum, line) => sum + line.price_data.unit_amount * line.quantity, 0)
    const discount = Number(params.discounts[0].coupon.replace('coupon_', ''))
    expect(lineTotal - discount).toBe(Math.round(order.totalAmount * 100))
    expect(params.metadata.orderId).toBe(order.id)
    expect(stripe.checkout.sessions.create.mock.calls[0][1]).toEqual({ idempotencyKey: `checkout-${order.id}` })
  })

  it('rejects webhooks without a valid signature', async () => {
    const res = await sendWebhook('checkout.session.completed', {}, 'forged')
    expect(res.status).toBe(400)
  })

  it('keeps unpaid orders from being processed or shipped', async () => {
    const { order } = await placeOrder()
    const res = await staff.put(`/api/orders/${order.id}`, { status: 'shipped' })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/not been paid/)
  })

  it('marks the order paid from the webhook, once, even if Stripe retries', async () => {
    const { order } = await placeOrder()
    const sessionId = (await Order.findById(order.id)).payment.stripeSessionId
    const session = { id: sessionId, payment_status: 'paid', payment_intent: 'pi_123', amount_total: Math.round(order.totalAmount * 100), metadata: { orderId: order.id } }

    expect((await sendWebhook('checkout.session.completed', session)).status).toBe(200)
    expect((await sendWebhook('checkout.session.completed', session)).status).toBe(200)

    const saved = await Order.findById(order.id)
    expect(saved.payment.status).toBe('paid')
    expect(saved.payment.stripePaymentIntentId).toBe('pi_123')
    expect(saved.statusHistory.filter((event) => event.note === 'Payment received')).toHaveLength(1)

    // Paid orders can now move on.
    expect((await staff.put(`/api/orders/${order.id}`, { status: 'processing' })).status).toBe(200)
  })

  it('confirms payment when the customer returns before the webhook arrives', async () => {
    const { order } = await placeOrder()
    const saved = await Order.findById(order.id)
    Object.assign(stripe.state.sessions.get(saved.payment.stripeSessionId), { status: 'complete', payment_status: 'paid', payment_intent: 'pi_early' })

    const res = await shopper.get(`/api/orders/${order.id}`)
    expect(res.body.data.payment.status).toBe('paid')
    expect(res.body.data.payment.stripeSessionId).toBeUndefined() // internal ids are not exposed
  })

  it('releases stock when the payment session expires', async () => {
    const { order } = await placeOrder()
    const before = await stockNow()
    const session = { id: 'cs_any', payment_status: 'unpaid', metadata: { orderId: order.id } }
    stripe.state.sessions.get((await Order.findById(order.id)).payment.stripeSessionId).status = 'expired'

    expect((await sendWebhook('checkout.session.expired', session)).status).toBe(200)
    const saved = await Order.findById(order.id)
    expect(saved.status).toBe('cancelled')
    expect(saved.payment.status).toBe('unpaid')
    expect(await stockNow()).toBe(before + 2)
  })

  it('refunds a paid order when the customer cancels it', async () => {
    const { order } = await placeOrder()
    const saved = await Order.findById(order.id)
    Object.assign(stripe.state.sessions.get(saved.payment.stripeSessionId), { status: 'complete', payment_status: 'paid', payment_intent: 'pi_refund' })
    await shopper.get(`/api/orders/${order.id}`) // settles it as paid

    const res = await shopper.post(`/api/orders/${order.id}/cancel`)
    expect(res.status).toBe(200)
    expect(res.body.data.payment.status).toBe('refunded')
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      { payment_intent: 'pi_refund', metadata: { orderId: order.id } },
      { idempotencyKey: `refund-${order.id}` },
    )
  })

  it('refunds instead of dropping a payment that lands while staff cancel', async () => {
    const { order } = await placeOrder()
    const saved = await Order.findById(order.id)
    // The customer paid a moment ago; our database has not heard yet, and the session can no longer be expired.
    Object.assign(stripe.state.sessions.get(saved.payment.stripeSessionId), { status: 'complete', payment_status: 'paid', payment_intent: 'pi_race' })

    const res = await staff.put(`/api/orders/${order.id}`, { status: 'cancelled' })
    expect(res.status).toBe(200)
    expect(res.body.data.payment.status).toBe('refunded')
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1)
  })

  it('does not cancel an order when the refund fails', async () => {
    const { order } = await placeOrder()
    const saved = await Order.findById(order.id)
    Object.assign(stripe.state.sessions.get(saved.payment.stripeSessionId), { status: 'complete', payment_status: 'paid', payment_intent: 'pi_fail' })
    await shopper.get(`/api/orders/${order.id}`)
    stripe.refunds.create.mockRejectedValueOnce(new Error('card_declined'))

    const res = await shopper.post(`/api/orders/${order.id}/cancel`)
    expect(res.status).toBe(502)
    expect((await Order.findById(order.id)).status).toBe('pending')
  })

  it('undoes the reservation if Stripe cannot open a session', async () => {
    await Product.updateOne({ _id: product._id }, { stock: 10 })
    const before = await stockNow()
    stripe.checkout.sessions.create.mockRejectedValueOnce(new Error('Stripe is down'))
    const res = await shopper.post('/api/orders', { items: [{ product: product.id, quantity: 1 }], shippingAddress: address })
    expect(res.status).toBe(502)
    expect(res.body.message).toMatch(/not been charged/)
    expect(await stockNow()).toBe(before)
  })
})
