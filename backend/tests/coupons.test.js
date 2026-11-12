import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { client, startTestServer } from './setup.js'

let server
let app
let Coupon
let lamp

const DAY = 24 * 60 * 60 * 1000

const address = {
  fullName: 'Ola Offers',
  email: 'ola@test.dev',
  phone: '+1 555 010 4040',
  address: '9 Coupon Court',
  city: 'Springfield',
  state: 'IL',
  zipCode: '62701',
  country: 'United States',
}

beforeAll(async () => {
  server = await startTestServer()
  app = server.app
  const { default: User } = await import('../models/User.js')
  const { default: Product } = await import('../models/Product.js')
  ;({ default: Coupon } = await import('../models/Coupon.js'))

  const admin = await User.create({ name: 'Ada Admin', role: 'admin', emailVerified: true, email: 'admin@coupons.dev', password: 'Admin123!' })
  lamp = await Product.create({
    name: 'Brass Lamp', description: 'A test piece', category: 'testing', image: 'https://example.com/a.png', price: 40, stock: 20, createdBy: admin._id,
  })

  await Coupon.create([
    // Shown
    { code: 'WELCOME10', description: 'Welcome offer', type: 'percent', value: 10 },
    { code: 'BIG25', type: 'fixed', value: 25, minSubtotal: 100, expiresAt: new Date(Date.now() + 7 * DAY) },
    { code: 'LASTONE', type: 'fixed', value: 5, maxUses: 3, usedCount: 2 },
    // Hidden
    { code: 'PAUSED', type: 'percent', value: 15, active: false },
    { code: 'EXPIRED', type: 'percent', value: 50, expiresAt: new Date(Date.now() - 1000) },
    { code: 'USEDUP', type: 'fixed', value: 5, maxUses: 2, usedCount: 2 },
  ])
})

afterAll(async () => {
  await server?.stop()
})

describe('public coupon list', () => {
  it('lists only active, unexpired coupons with uses left, without signing in', async () => {
    const res = await request(app).get('/api/coupons')
    expect(res.status).toBe(200)
    expect(res.body.data.map((coupon) => coupon.code).sort()).toEqual(['BIG25', 'LASTONE', 'WELCOME10'])
  })

  it('returns only customer-safe fields', async () => {
    const { body } = await request(app).get('/api/coupons')
    body.data.forEach((coupon) => {
      expect(Object.keys(coupon).sort()).toEqual(['code', 'description', 'expiresAt', 'minSubtotal', 'type', 'value'])
    })
    expect(body.data.find((coupon) => coupon.code === 'BIG25')).toMatchObject({ type: 'fixed', value: 25, minSubtotal: 100, expiresAt: expect.any(String) })
    expect(body.data.find((coupon) => coupon.code === 'WELCOME10')).toMatchObject({ description: 'Welcome offer', minSubtotal: 0, expiresAt: null })
  })

  it('drops a coupon once its last use is claimed', async () => {
    const shopper = await client(app)
    await shopper.signup({ name: 'Last Use', email: 'last@test.dev' })
    const res = await shopper.post('/api/orders', {
      items: [{ product: lamp.id, quantity: 1 }],
      couponCode: 'LASTONE',
      shippingAddress: address,
    })
    expect(res.status).toBe(201)

    const codes = (await request(app).get('/api/coupons')).body.data.map((coupon) => coupon.code)
    expect(codes).not.toContain('LASTONE')
  })
})

describe('applying a displayed coupon', () => {
  it('applies a listed code through the server quote and order', async () => {
    const shopper = await client(app)
    await shopper.signup({ name: 'Ola Offers', email: 'ola@test.dev' })
    const [offer] = (await request(app).get('/api/coupons')).body.data.filter((coupon) => coupon.code === 'WELCOME10')
    const items = [{ product: lamp.id, quantity: 2 }]

    const quote = await shopper.post('/api/orders/quote', { items, couponCode: offer.code })
    expect(quote.body.data).toMatchObject({ subtotal: 80, discount: 8, couponError: null, coupon: { code: 'WELCOME10' } })

    const order = await shopper.post('/api/orders', { items, couponCode: offer.code, shippingAddress: address })
    expect(order.status).toBe(201)
    expect(order.body.data.order).toMatchObject({ couponCode: 'WELCOME10', discount: 8 })
  })

  it('still enforces the minimum spend on the server for a listed code', async () => {
    const shopper = await client(app)
    const quote = await shopper.post('/api/orders/quote', { items: [{ product: lamp.id, quantity: 1 }], couponCode: 'BIG25' })
    expect(quote.body.data).toMatchObject({ discount: 0, couponError: expect.stringContaining('at least') })
  })
})
