import { createHmac } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { client, startTestServer } from './setup.js'

const KEY_ID = 'rzp_test_fakekey'
const KEY_SECRET = 'razorpay-test-secret'
const WEBHOOK_SECRET = 'razorpay-webhook-secret'

// A stand-in for api.razorpay.com that keeps orders and payments in memory.
const fake = { orders: new Map(), payments: new Map(), refunds: [], captures: [], counter: 0, failNextOrder: false }

const json = (status, body) => ({ ok: status < 400, status, json: async () => body })

const razorpayApi = async (url, options = {}) => {
  const path = new URL(url).pathname.replace('/v1', '')
  const body = options.body ? JSON.parse(options.body) : null
  expect(options.headers.Authorization).toBe(`Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`)

  if (options.method === 'POST' && path === '/orders') {
    if (fake.failNextOrder) {
      fake.failNextOrder = false
      return json(500, { error: { description: 'Razorpay is down' } })
    }
    const order = { id: `order_Test${++fake.counter}`, ...body, status: 'created' }
    fake.orders.set(order.id, order)
    return json(200, order)
  }
  let match = path.match(/^\/orders\/(order_\w+)\/payments$/)
  if (match) return json(200, { items: [...fake.payments.values()].filter((payment) => payment.order_id === match[1]) })
  match = path.match(/^\/payments\/(pay_\w+)$/)
  if (match) return fake.payments.has(match[1]) ? json(200, fake.payments.get(match[1])) : json(404, { error: { description: 'Not found' } })
  match = path.match(/^\/payments\/(pay_\w+)\/capture$/)
  if (match) {
    fake.captures.push(match[1])
    fake.payments.get(match[1]).status = 'captured'
    return json(200, fake.payments.get(match[1]))
  }
  match = path.match(/^\/payments\/(pay_\w+)\/refund$/)
  if (match) {
    fake.refunds.push({ paymentId: match[1], ...body })
    return json(200, { id: `rfnd_${fake.refunds.length}`, status: 'processed' })
  }
  return json(404, { error: { description: `Unhandled ${options.method} ${path}` } })
}

// What Razorpay does when the customer pays in the popup.
const pay = (razorpayOrderId, { status = 'captured', amount } = {}) => {
  const order = fake.orders.get(razorpayOrderId)
  const payment = { id: `pay_Test${++fake.counter}`, order_id: razorpayOrderId, amount: amount ?? order.amount, currency: order.currency, status }
  fake.payments.set(payment.id, payment)
  const signature = createHmac('sha256', KEY_SECRET).update(`${razorpayOrderId}|${payment.id}`).digest('hex')
  return { payment, signature }
}

const address = {
  fullName: 'Ravi Kumar',
  email: 'ravi@test.dev',
  phone: '+91 98765 43210',
  address: '12 MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  zipCode: '560001',
  country: 'India',
}

let server
let Order
let Product
let product
let shopper
let staff
const realFetch = globalThis.fetch

const stockNow = async () => (await Product.findById(product.id)).stock

// Each shopper may place 10 orders per 15 minutes (the flood limit), so later tests use a second one.
const placeOrder = async (quantity = 1, who = shopper) => {
  const res = await who.post('/api/orders', { items: [{ product: product.id, quantity }], shippingAddress: address })
  expect(res.status).toBe(201)
  return res.body.data
}

const verify = (orderId, razorpayOrderId, paymentId, signature) =>
  shopper.post(`/api/orders/${orderId}/razorpay/verify`, { razorpayOrderId, razorpayPaymentId: paymentId, signature })

const sendWebhook = (event, payment, secret = WEBHOOK_SECRET) => {
  const body = JSON.stringify({ event, payload: { payment: { entity: payment } } })
  return request(server.app)
    .post('/api/payments/razorpay/webhook')
    .set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', createHmac('sha256', secret).update(body).digest('hex'))
    .send(body)
}

beforeAll(async () => {
  server = await startTestServer({
    // Both offered at checkout; Razorpay first, so it is preselected.
    PAYMENT_METHODS: 'razorpay,cod',
    RAZORPAY_KEY_ID: KEY_ID,
    RAZORPAY_KEY_SECRET: KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    VITE_CURRENCY: 'INR',
  })
  globalThis.fetch = (url, options) => (String(url).startsWith('https://api.razorpay.com') ? razorpayApi(url, options) : realFetch(url, options))

  const { default: User } = await import('../models/User.js')
  ;({ default: Product } = await import('../models/Product.js'))
  ;({ default: Order } = await import('../models/Order.js'))
  const admin = await User.create({ name: 'Asha Admin', email: 'asha@rzp.dev', password: 'Admin123!', role: 'admin' })
  await User.create({ name: 'Sunil Staff', email: 'sunil@rzp.dev', password: 'Staff123!', role: 'staff' })
  product = await Product.create({ name: 'Brass Diya', description: 'Handmade', price: 1499, stock: 20, category: 'home', image: 'https://example.com/d.png', createdBy: admin._id })

  shopper = await client(server.app)
  await shopper.signup({ name: 'Ravi Kumar', email: 'ravi@test.dev' })
  staff = await client(server.app)
  await staff.login('sunil@rzp.dev', 'Staff123!')
})

afterAll(async () => {
  globalThis.fetch = realFetch
  await server?.stop()
})

beforeEach(() => {
  fake.refunds.length = 0
  fake.captures.length = 0
})

describe('choosing a payment method', () => {
  it('lists the enabled methods in order', async () => {
    const config = (await shopper.get('/api/orders/config')).body.data
    expect(config.paymentMethods.map((method) => method.id)).toEqual(['razorpay', 'cod'])
    expect(config.paymentMethods[1]).toMatchObject({ label: 'Cash on delivery' })
    // Ids only: setup instructions (which keys to add) are never sent to the browser.
    expect(config.unavailableMethods).toEqual([{ id: 'stripe' }])
  })

  // A separate shopper, so these orders do not count towards the main shopper's order-flood limit.
  let chooser
  beforeAll(async () => {
    chooser = await client(server.app)
    await chooser.signup({ name: 'Kavya Iyer', email: 'kavya@test.dev' })
  })

  it('places a cash-on-delivery order when the customer picks it', async () => {
    const res = await chooser.post('/api/orders', { items: [{ product: product.id, quantity: 1 }], shippingAddress: address, paymentMethod: 'cod' })
    expect(res.status).toBe(201)
    expect(res.body.data.payment).toBeNull()
    expect(res.body.data.order.payment).toEqual({ method: 'manual', status: 'unpaid' })
    await chooser.post(`/api/orders/${res.body.data.order.id}/cancel`)
  })

  it('refuses a method that is not enabled', async () => {
    const res = await chooser.post('/api/orders', { items: [{ product: product.id, quantity: 1 }], shippingAddress: address, paymentMethod: 'stripe' })
    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Please choose an available payment method')
  })
})

describe('Razorpay checkout', () => {
  it('charges in rupees and returns the popup options for a new order', async () => {
    expect((await shopper.get('/api/orders/config')).body.data).toMatchObject({ paymentMode: 'razorpay', currency: 'inr' })

    const { order, payment } = await placeOrder(1)
    expect(order.payment).toEqual({ method: 'card', provider: 'razorpay', status: 'awaiting_payment' })
    expect(payment).toMatchObject({ provider: 'razorpay', keyId: KEY_ID, currency: 'INR', amount: Math.round(order.totalAmount * 100) })
    expect(payment.prefill).toEqual({ name: 'Ravi Kumar', email: 'ravi@test.dev', contact: '+91 98765 43210' })
    expect(fake.orders.get(payment.orderId)).toMatchObject({ amount: payment.amount, currency: 'INR', receipt: order.id })
  })

  it('marks the order paid only with a valid signature', async () => {
    const { order, payment } = await placeOrder()
    const { payment: paid, signature } = pay(payment.orderId)

    const forged = await verify(order.id, payment.orderId, paid.id, 'f'.repeat(64))
    expect(forged.status).toBe(400)
    expect(forged.body.data.code).toBe('PAYMENT_UNVERIFIED')
    expect((await Order.findById(order.id)).payment.status).toBe('awaiting_payment')

    const res = await verify(order.id, payment.orderId, paid.id, signature)
    expect(res.status).toBe(200)
    expect(res.body.data.payment).toEqual({ method: 'card', provider: 'razorpay', status: 'paid', paidAt: expect.any(String) })
    expect((await Order.findById(order.id)).payment.razorpayPaymentId).toBe(paid.id)
  })

  it('rejects a signed payment for a different amount', async () => {
    const { order, payment } = await placeOrder()
    const { payment: paid, signature } = pay(payment.orderId, { amount: 100 })
    const res = await verify(order.id, payment.orderId, paid.id, signature)
    expect(res.status).toBe(400)
    expect((await Order.findById(order.id)).payment.status).toBe('awaiting_payment')
  })

  it('captures an authorized payment when auto-capture is off', async () => {
    const { order, payment } = await placeOrder()
    const { payment: paid, signature } = pay(payment.orderId, { status: 'authorized' })
    expect((await verify(order.id, payment.orderId, paid.id, signature)).status).toBe(200)
    expect(fake.captures).toEqual([paid.id])
  })

  it('confirms through the webhook, and ignores forged webhooks', async () => {
    const { order, payment } = await placeOrder()
    const { payment: paid } = pay(payment.orderId)

    expect((await sendWebhook('payment.captured', paid, 'wrong-secret')).status).toBe(400)
    expect((await Order.findById(order.id)).payment.status).toBe('awaiting_payment')

    expect((await sendWebhook('payment.captured', paid)).status).toBe(200)
    expect((await sendWebhook('order.paid', paid)).status).toBe(200) // duplicate delivery is harmless
    const saved = await Order.findById(order.id)
    expect(saved.payment.status).toBe('paid')
    expect(saved.statusHistory.filter((event) => event.note === 'Payment received')).toHaveLength(1)
  })

  it('settles a paid order when the customer returns before verification reached the server', async () => {
    const { order, payment } = await placeOrder()
    pay(payment.orderId)
    const res = await shopper.get(`/api/orders/${order.id}`)
    expect(res.body.data.payment.status).toBe('paid')
    expect(res.body.data.payment.razorpayOrderId).toBeUndefined() // internal ids stay on the server
  })

  it('releases stock when the popup is closed without paying', async () => {
    const before = await stockNow()
    const { order } = await placeOrder(2)
    expect(await stockNow()).toBe(before - 2)
    const res = await shopper.post(`/api/orders/${order.id}/cancel`)
    expect(res.body.data).toMatchObject({ status: 'cancelled', payment: { status: 'unpaid' } })
    expect(await stockNow()).toBe(before)
    expect(fake.refunds).toEqual([])
  })

  it('refunds instead of dropping a payment that lands while the order is cancelled', async () => {
    const { order, payment } = await placeOrder()
    const { payment: paid } = pay(payment.orderId) // paid, but neither the browser nor the webhook told us yet
    const res = await staff.put(`/api/orders/${order.id}`, { status: 'cancelled' })
    expect(res.status).toBe(200)
    expect(res.body.data.payment.status).toBe('refunded')
    expect(fake.refunds).toEqual([{ paymentId: paid.id, amount: paid.amount, speed: 'normal', notes: { orderId: order.id, reason: 'Order cancelled' } }])
  })

  it('refunds a payment made in a popup left open after the order was cancelled', async () => {
    const { order, payment } = await placeOrder()
    await shopper.post(`/api/orders/${order.id}/cancel`)
    const { payment: late } = pay(payment.orderId)
    expect((await sendWebhook('payment.captured', late)).status).toBe(200)
    expect(fake.refunds.map((refund) => refund.paymentId)).toEqual([late.id])
  })

  it('refunds a paid order cancelled by the customer', async () => {
    const { order, payment } = await placeOrder()
    const { payment: paid, signature } = pay(payment.orderId)
    await verify(order.id, payment.orderId, paid.id, signature)
    const res = await shopper.post(`/api/orders/${order.id}/cancel`)
    expect(res.body.data.payment.status).toBe('refunded')
    expect(fake.refunds[0]).toMatchObject({ paymentId: paid.id, amount: paid.amount })
  })

  it('lets the customer reopen the popup for an unpaid order', async () => {
    const second = await client(server.app)
    await second.signup({ name: 'Meera Shah', email: 'meera@test.dev' })
    const { order, payment } = await placeOrder(1, second)
    const res = await second.post(`/api/orders/${order.id}/pay`)
    expect(res.body.data.payment).toMatchObject({ provider: 'razorpay', orderId: payment.orderId })
  })

  it('undoes the reservation if Razorpay cannot create the order', async () => {
    const before = await stockNow()
    fake.failNextOrder = true
    const third = await client(server.app)
    await third.signup({ name: 'Arjun Rao', email: 'arjun@test.dev' })
    const res = await third.post('/api/orders', { items: [{ product: product.id, quantity: 1 }], shippingAddress: address })
    expect(res.status).toBe(502)
    expect(await stockNow()).toBe(before)
  })
})
