import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { client, startTestServer } from './setup.js'

// Stripe Tax stand-in: 10% of the line amounts plus shipping.
const stripe = vi.hoisted(() => ({
  tax: {
    calculations: {
      create: vi.fn(async ({ line_items, shipping_cost }) => {
        const base = line_items.reduce((sum, line) => sum + line.amount, 0) + shipping_cost.amount
        return { id: 'taxcalc_1', tax_amount_exclusive: Math.round(base * 0.1) }
      }),
    },
    transactions: {
      createFromCalculation: vi.fn(async () => ({ id: 'tax_txn_1' })),
      createReversal: vi.fn(async () => ({ id: 'tax_rev_1' })),
    },
  },
}))

vi.mock('../utils/stripe.js', () => ({ getStripe: () => stripe, toCents: (amount) => Math.round(amount * 100) }))

const shippoReply = (rates) => ({ ok: true, status: 200, json: async () => ({ rates }) })
const RATES = [
  { amount: '12.40', currency: 'USD', provider: 'UPS', servicelevel: { name: 'Ground' }, estimated_days: 4 },
  { amount: '8.15', currency: 'USD', provider: 'USPS', servicelevel: { name: 'Priority Mail' }, estimated_days: 3 },
  { amount: '3.00', currency: 'EUR', provider: 'DHL', servicelevel: { name: 'Economy' }, estimated_days: 9 },
]

const address = {
  fullName: 'Tia Taxpayer',
  email: 'tia@test.dev',
  phone: '+1 555 010 1234',
  address: '5 Rate Road',
  city: 'Austin',
  state: 'TX',
  zipCode: '78701',
  country: 'United States',
}

let server
let pricing
let product
let shopper
const realFetch = globalThis.fetch
const fetchMock = vi.fn()

beforeAll(async () => {
  server = await startTestServer({
    SHIPPING_PROVIDER: 'shippo',
    SHIPPO_API_KEY: 'shippo_test_fake',
    SHIP_FROM_STREET: '1 Warehouse Way',
    SHIP_FROM_CITY: 'Dallas',
    SHIP_FROM_STATE: 'TX',
    SHIP_FROM_ZIP: '75201',
    SHIP_FROM_COUNTRY: 'US',
    SHIP_HANDLING_FEE: '1',
    TAX_PROVIDER: 'stripe',
    STRIPE_SECRET_KEY: 'sk_test_fake',
  })
  pricing = await import('../services/pricingService.js')
  const { default: User } = await import('../models/User.js')
  const { default: Product } = await import('../models/Product.js')
  const admin = await User.create({ name: 'Ada Admin', email: 'ada@pricing.dev', password: 'Admin123!', role: 'admin' })
  product = await Product.create({ name: 'Mug', description: 'Stoneware', price: 20, stock: 50, category: 'home', image: 'https://example.com/m.png', createdBy: admin._id })
  shopper = await client(server.app)
  await shopper.signup({ name: 'Tia Taxpayer', email: 'tia@test.dev' })
  // Only calls to Shippo are faked; supertest's own requests do not use fetch.
  globalThis.fetch = (url, options) => (String(url).includes('goshippo') ? fetchMock(url, options) : realFetch(url, options))
})

afterAll(async () => {
  globalThis.fetch = realFetch
  await server?.stop()
})

beforeEach(() => {
  vi.clearAllMocks()
  pricing.clearPricingCache()
})

const line = (quantity, price = 20) => [{ product: 'p1', name: 'Mug', price, quantity }]

describe('third-party shipping and tax', () => {
  it('uses the cheapest carrier rate in the store currency, plus handling, and Stripe Tax', async () => {
    fetchMock.mockResolvedValueOnce(shippoReply(RATES))
    const result = await pricing.priceOrder({ lines: line(2), address })

    expect(result.shipping).toBe(9.15) // USPS 8.15 + 1.00 handling; the cheaper EUR rate is ignored
    expect(result.tax).toBe(4.92) // 10% of (40.00 + 9.15)
    expect(result.totalAmount).toBe(54.07)
    expect(result.pricing).toMatchObject({ shippingSource: 'shippo', taxSource: 'stripe', fallback: false, carrier: 'USPS Priority Mail', taxCalculationId: 'taxcalc_1' })
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('ShippoToken shippo_test_fake')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).address_to.country).toBe('US')
  })

  it('reuses a recent result so checkout and the order agree', async () => {
    fetchMock.mockResolvedValueOnce(shippoReply(RATES))
    await pricing.priceOrder({ lines: line(2), address })
    await pricing.priceOrder({ lines: line(2), address })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(stripe.tax.calculations.create).toHaveBeenCalledTimes(1)
  })

  it('falls back to the flat rates when the providers fail', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
    stripe.tax.calculations.create.mockRejectedValueOnce(new Error('Stripe is down'))
    const result = await pricing.priceOrder({ lines: line(1), address })

    expect(result).toMatchObject({ shipping: 5.99, tax: 1.6, totalAmount: 27.59 })
    expect(result.pricing).toMatchObject({ shippingSource: 'flat', taxSource: 'flat', fallback: true })
  })

  it('falls back when a carrier answers with no usable rates', async () => {
    fetchMock.mockResolvedValueOnce(shippoReply([{ amount: '3.00', currency: 'EUR', provider: 'DHL' }]))
    const result = await pricing.priceOrder({ lines: line(1), address })
    expect(result.pricing).toMatchObject({ shippingSource: 'flat', fallback: true })
  })

  it('does not call a carrier for free shipping or without a full address', async () => {
    const free = await pricing.priceOrder({ lines: line(4), address })
    expect(free.shipping).toBe(0)
    const noAddress = await pricing.priceOrder({ lines: line(1) })
    expect(noAddress).toMatchObject({ shipping: 5.99, tax: 1.6 })
    expect(noAddress.pricing.estimated).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('charges the quoted amounts on the order and records the tax transaction', async () => {
    fetchMock.mockResolvedValue(shippoReply(RATES))
    const items = [{ product: product.id, quantity: 1 }]

    const quote = await shopper.post('/api/orders/quote', { items, shippingAddress: address })
    expect(quote.body.data).toMatchObject({ shipping: 9.15, shippingMethod: 'USPS Priority Mail', pricing: { shippingSource: 'shippo', taxSource: 'stripe' } })

    const placed = await shopper.post('/api/orders', { items, shippingAddress: address })
    expect(placed.status).toBe(201)
    const order = placed.body.data.order
    expect(order).toMatchObject({ shipping: quote.body.data.shipping, tax: quote.body.data.tax, totalAmount: quote.body.data.totalAmount, carrier: 'USPS Priority Mail' })
    expect(order.taxCalculationId).toBeUndefined() // internal ids stay on the server

    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(stripe.tax.transactions.createFromCalculation).toHaveBeenCalledWith(
      { calculation: 'taxcalc_1', reference: order.id },
      { idempotencyKey: `tax-${order.id}` },
    )

    await shopper.post(`/api/orders/${order.id}/cancel`)
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(stripe.tax.transactions.createReversal).toHaveBeenCalledTimes(1)
    fetchMock.mockReset()
  })
})

describe('team management stays separate from customers', () => {
  it('only adds admins and staff, and never changes a customer’s role', async () => {
    const admin = await client(server.app)
    await admin.login('ada@pricing.dev', 'Admin123!')

    const asCustomer = await admin.post('/api/users', { name: 'Cus Tomer', email: 'cus@pricing.dev', password: 'Secret123!', role: 'customer' })
    expect(asCustomer.status).toBe(400)

    const staff = await admin.post('/api/users', { name: 'New Staff', email: 'staff@pricing.dev', password: 'Secret123!', role: 'staff' })
    expect(staff.status).toBe(201)
    expect((await admin.patch(`/api/users/${staff.body.data.id}/role`, { role: 'customer' })).status).toBe(400)
    expect((await admin.patch(`/api/users/${staff.body.data.id}/role`, { role: 'admin' })).status).toBe(200)

    const users = await admin.get('/api/users')
    const customer = users.body.data.find((user) => user.email === 'tia@test.dev')
    const promote = await admin.patch(`/api/users/${customer.id}/role`, { role: 'staff' })
    expect(promote.status).toBe(400)
  })
})
