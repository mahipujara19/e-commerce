import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { client, startTestServer } from './setup.js'

let server
let app
let Product
let Coupon
let products

const ADMIN = { email: 'admin@test.dev', password: 'Admin123!' }
const STAFF = { email: 'staff@test.dev', password: 'Staff123!' }

const address = {
  fullName: 'Jo Buyer',
  email: 'jo@test.dev',
  phone: '+1 555 010 2030',
  address: '1 Market Street',
  city: 'Springfield',
  state: 'IL',
  zipCode: '62701',
  country: 'United States',
}

beforeAll(async () => {
  server = await startTestServer()
  app = server.app
  const { default: User } = await import('../models/User.js')
  ;({ default: Product } = await import('../models/Product.js'))
  ;({ default: Coupon } = await import('../models/Coupon.js'))

  const admin = await User.create({ name: 'Ada Admin', role: 'admin', emailVerified: true, ...ADMIN })
  await User.create({ name: 'Sam Staff', role: 'staff', emailVerified: true, ...STAFF })
  const base = { description: 'A test piece', category: 'testing', image: 'https://example.com/a.png', createdBy: admin._id }
  products = await Product.create([
    { ...base, name: 'Brass Lamp', price: 40, stock: 5 },
    { ...base, name: 'Linen Throw', price: 25.5, stock: 1 },
    { ...base, name: 'Sold Out Vase', price: 10, stock: 0 },
  ])
  await Coupon.create({ code: 'WELCOME10', type: 'percent', value: 10 })
  await Coupon.create({ code: 'ONCE', type: 'fixed', value: 5, maxUses: 1 })
  await Coupon.create({ code: 'OLD', type: 'percent', value: 50, expiresAt: new Date(Date.now() - 1000) })
})

afterAll(async () => {
  await server?.stop()
})

describe('health and security basics', () => {
  it('reports health with database status', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ status: 'ok', database: 'connected', payments: 'cod' })
    expect(res.headers['x-request-id']).toBeTruthy()
  })

  it('rejects state-changing requests without a CSRF token', async () => {
    const res = await request(app).post('/api/auth/login').send(ADMIN)
    expect(res.status).toBe(403)
  })

  it('returns JSON 404s for unknown API routes', async () => {
    const res = await request(app).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it('serves a sitemap listing products', async () => {
    const res = await request(app).get('/sitemap.xml')
    expect(res.status).toBe(200)
    expect(res.text).toContain(`/productitem/${products[0].id}`)
  })
})

describe('quotes', () => {
  it('prices from the database and reports stock problems', async () => {
    const res = await request(app).post('/api/orders/quote').set('X-CSRF-Token', 'x').send({})
    expect(res.status).toBe(403) // CSRF applies to quotes too

    const shopper = await client(app)
    const quote = await shopper.post('/api/orders/quote', {
      items: [
        { product: products[0].id, quantity: 2 },
        { product: products[1].id, quantity: 3 },
        { product: products[2].id, quantity: 1 },
      ],
    })
    expect(quote.status).toBe(200)
    expect(quote.body.data.subtotal).toBe(40 * 2 + 25.5 * 3 + 10)
    expect(quote.body.data.issues.map((issue) => issue.type)).toEqual(['insufficient_stock', 'insufficient_stock'])
    expect(quote.body.data.issues[0]).toMatchObject({ product: products[1].id, available: 1 })
  })

  it('applies valid coupons and explains invalid ones', async () => {
    const shopper = await client(app)
    const items = [{ product: products[0].id, quantity: 1 }]

    const good = await shopper.post('/api/orders/quote', { items, couponCode: 'welcome10' })
    expect(good.body.data).toMatchObject({ subtotal: 40, discount: 4, shipping: 5.99, tax: 2.88, totalAmount: 44.87 })

    const expired = await shopper.post('/api/orders/quote', { items, couponCode: 'OLD' })
    expect(expired.body.data).toMatchObject({ discount: 0, couponError: 'This code has expired' })
  })
})

describe('customer order lifecycle', () => {
  let shopper
  let orderId

  beforeAll(async () => {
    shopper = await client(app)
    const res = await shopper.signup({ name: 'Jo Buyer', email: 'jo@test.dev' })
    expect(res.status).toBe(201)
  })

  it('requires sign-in to place an order', async () => {
    const guest = await client(app)
    const res = await guest.post('/api/orders', { items: [{ product: products[0].id, quantity: 1 }], shippingAddress: address })
    expect(res.status).toBe(401)
  })

  it('validates the shipping address, including the phone number', async () => {
    const res = await shopper.post('/api/orders', {
      items: [{ product: products[0].id, quantity: 1 }],
      shippingAddress: { ...address, phone: 'call me' },
    })
    expect(res.status).toBe(400)
    expect(res.body.data.errors[0].field).toBe('shippingAddress.phone')
  })

  it('refuses an order that exceeds stock, without reserving anything', async () => {
    const res = await shopper.post('/api/orders', {
      items: [{ product: products[0].id, quantity: 1 }, { product: products[1].id, quantity: 2 }],
      shippingAddress: address,
    })
    expect(res.status).toBe(409)
    expect(res.body.data.code).toBe('STOCK_CHANGED')
    expect((await Product.findById(products[0].id)).stock).toBe(5)
  })

  it('places an order with a coupon, reserves stock and saves the address', async () => {
    const res = await shopper.post('/api/orders', {
      items: [{ product: products[0].id, quantity: 2 }],
      shippingAddress: address,
      couponCode: 'ONCE',
      saveAddress: true,
    })
    expect(res.status).toBe(201)
    const { order, paymentUrl } = res.body.data
    orderId = order.id
    expect(paymentUrl).toBeNull()
    expect(order).toMatchObject({ subtotal: 80, discount: 5, shipping: 0, status: 'pending', couponCode: 'ONCE' })
    expect(order.payment).toEqual({ method: 'manual', status: 'unpaid' })
    expect(order.estimatedDelivery).toBeTruthy()
    expect((await Product.findById(products[0].id)).stock).toBe(3)
    expect((await Coupon.findOne({ code: 'ONCE' })).usedCount).toBe(1)

    // saveAddress is applied in the background
    await new Promise((resolve) => setTimeout(resolve, 200))
    const saved = await shopper.get('/api/users/me/addresses')
    expect(saved.body.data).toHaveLength(1)
    expect(saved.body.data[0]).toMatchObject({ city: 'Springfield', isDefault: true })
  })

  it('does not accept a single-use coupon twice', async () => {
    const res = await shopper.post('/api/orders', {
      items: [{ product: products[0].id, quantity: 1 }],
      shippingAddress: address,
      couponCode: 'ONCE',
    })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/fully redeemed/)
  })

  it('hides other customers’ orders', async () => {
    const other = await client(app)
    await other.signup({ name: 'Nosy Parker', email: 'nosy@test.dev' })
    const res = await other.get(`/api/orders/${orderId}`)
    expect(res.status).toBe(404)
  })

  it('lets the customer cancel a pending order, returning stock and the coupon use', async () => {
    const res = await shopper.post(`/api/orders/${orderId}/cancel`)
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('cancelled')
    expect(res.body.data.statusHistory.at(-1)).toMatchObject({ status: 'cancelled', note: 'Cancelled by customer' })
    expect((await Product.findById(products[0].id)).stock).toBe(5)
    expect((await Coupon.findOne({ code: 'ONCE' })).usedCount).toBe(0)

    const again = await shopper.post(`/api/orders/${orderId}/cancel`)
    expect(again.status).toBe(400)
    expect((await Product.findById(products[0].id)).stock).toBe(5)
  })
})

describe('staff order handling', () => {
  let orderId
  let staff

  beforeAll(async () => {
    const shopper = await client(app)
    await shopper.signup({ name: 'Ship Me', email: 'ship@test.dev' })
    const res = await shopper.post('/api/orders', { items: [{ product: products[1].id, quantity: 1 }], shippingAddress: address })
    orderId = res.body.data.order.id
    staff = await client(app)
    await staff.login(STAFF.email, STAFF.password)
  })

  it('ships an order with a tracking number and records the history', async () => {
    const res = await staff.put(`/api/orders/${orderId}`, { status: 'shipped', carrier: 'UPS', trackingNumber: '1Z999' })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ status: 'shipped', carrier: 'UPS', trackingNumber: '1Z999' })
    expect(res.body.data.statusHistory.map((event) => event.status)).toEqual(['pending', 'shipped'])
  })

  it('records the change in the admin activity log', async () => {
    const admin = await client(app)
    await admin.login(ADMIN.email, ADMIN.password)
    const res = await admin.get('/api/admin/audit-logs')
    expect(res.status).toBe(200)
    expect(res.body.data[0]).toMatchObject({ action: 'order.update', actorEmail: STAFF.email })
  })

  it('keeps coupons and the activity log admin-only', async () => {
    expect((await staff.get('/api/admin/coupons')).status).toBe(403)
    expect((await staff.get('/api/admin/audit-logs')).status).toBe(403)
  })
})

describe('coupon administration', () => {
  it('creates, updates and deletes a coupon', async () => {
    const admin = await client(app)
    await admin.login(ADMIN.email, ADMIN.password)

    const created = await admin.post('/api/admin/coupons', { code: 'spring-25', type: 'percent', value: 25, minSubtotal: 50 })
    expect(created.status).toBe(201)
    expect(created.body.data.code).toBe('SPRING-25')

    const invalid = await admin.post('/api/admin/coupons', { code: 'BAD', type: 'percent', value: 150 })
    expect(invalid.status).toBe(400)

    const updated = await admin.put(`/api/admin/coupons/${created.body.data.id}`, { active: false })
    expect(updated.body.data.active).toBe(false)

    expect((await admin.delete(`/api/admin/coupons/${created.body.data.id}`)).status).toBe(200)
  })
})

describe('saved addresses', () => {
  it('keeps exactly one default address', async () => {
    const shopper = await client(app)
    await shopper.signup({ name: 'Addie Ress', email: 'addie@test.dev' })
    const { phone, fullName, address: street, city, state, zipCode, country } = address
    const fields = { fullName, phone, address: street, city, state, zipCode, country }

    const first = await shopper.post('/api/users/me/addresses', { ...fields, label: 'Home' })
    expect(first.body.data[0].isDefault).toBe(true)

    const second = await shopper.post('/api/users/me/addresses', { ...fields, label: 'Work', isDefault: true })
    expect(second.body.data.map((item) => item.isDefault)).toEqual([false, true])

    const removed = await shopper.delete(`/api/users/me/addresses/${second.body.data[1].id}`)
    expect(removed.body.data).toHaveLength(1)
    expect(removed.body.data[0].isDefault).toBe(true)
  })
})

describe('contact form', () => {
  it('validates and accepts messages', async () => {
    const visitor = await client(app)
    const bad = await visitor.post('/api/contact', { name: 'A', email: 'nope', topic: 'Other', message: 'hi' })
    expect(bad.status).toBe(400)

    const good = await visitor.post('/api/contact', {
      name: 'Curious Cat',
      email: 'cat@test.dev',
      topic: 'Product question',
      message: 'Is the brass lamp dimmable?',
    })
    expect(good.status).toBe(200)
  })
})
