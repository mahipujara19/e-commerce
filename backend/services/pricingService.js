import { createHash } from 'node:crypto'
import { env } from '../config/env.js'
import { countryCode } from '../utils/countries.js'
import { FREE_SHIPPING_MINIMUM, orderTotals } from '../utils/orderTotals.js'
import { getStripe, toCents } from '../utils/stripe.js'

/**
 * Shipping and tax for an order, from third-party providers with a flat-rate fallback.
 *
 *   Shipping: SHIPPING_PROVIDER=shippo → live carrier rates (cheapest is used); flat → VITE_FLAT_SHIPPING below VITE_FREE_SHIPPING_MINIMUM.
 *   Tax:      TAX_PROVIDER=stripe      → Stripe Tax for the destination;           flat → VITE_TAX_RATE of goods.
 *
 * Free shipping over FREE_SHIPPING_MINIMUM always applies, without calling a carrier.
 * Any provider error or timeout falls back to the flat rule for that part, is logged as "[pricing]", and is
 * reported in `fallback`, so checkout keeps working when an outside service is down.
 * Results are cached for a short time, so the price quoted at checkout is the price charged a moment later.
 */

const PROVIDER_TIMEOUT_MS = 8000
const CACHE_TTL_MS = 15 * 60 * 1000
const CACHE_MAX = 500
const SHIPPO_URL = 'https://api.goshippo.com/shipments/'
const DAY_MS = 24 * 60 * 60 * 1000

const cache = new Map()

const cached = async (key, compute) => {
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value
  const value = await compute()
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value)
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS })
  return value
}

export const clearPricingCache = () => cache.clear()

const withTimeout = (promise, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${PROVIDER_TIMEOUT_MS / 1000}s`)), PROVIDER_TIMEOUT_MS)),
  ])

const hashOf = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 32)

// A full address is needed to ask a carrier or tax service; the bag page has none yet and gets the flat estimate.
const usableAddress = (address) => {
  const country = countryCode(address?.country)
  return address?.address && address.city && address.zipCode && country ? { ...address, countryCode: country } : null
}

// ── Shipping: Shippo ──

const shippoRate = async (address, itemCount) => {
  const { from, parcel, itemWeightLb, shippoApiKey } = env.shipping
  const [length, width, height] = parcel
  const response = await fetch(SHIPPO_URL, {
    method: 'POST',
    headers: { Authorization: `ShippoToken ${shippoApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address_from: { name: from.name, street1: from.street1, city: from.city, state: from.state, zip: from.zip, country: from.country, phone: from.phone, email: from.email },
      address_to: {
        name: address.fullName || 'Customer',
        street1: address.address,
        city: address.city,
        state: address.state,
        zip: address.zipCode,
        country: address.countryCode,
        phone: address.phone,
        email: address.email,
      },
      parcels: [{ length, width, height, distance_unit: 'in', weight: Math.max(itemWeightLb * itemCount, 0.1), mass_unit: 'lb' }],
      async: false,
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Shippo answered ${response.status}`)

  const shipment = await response.json()
  const currency = env.payments.currency.toUpperCase()
  const rates = (shipment.rates ?? []).filter((rate) => rate.currency === currency && Number(rate.amount) > 0)
  if (!rates.length) {
    const messages = (shipment.messages ?? []).map((message) => message.text).filter(Boolean).join('; ')
    throw new Error(`Shippo returned no ${currency} rates${messages ? `: ${messages}` : ''}`)
  }

  const cheapest = rates.reduce((best, rate) => (Number(rate.amount) < Number(best.amount) ? rate : best))
  const amount = Math.round((Number(cheapest.amount) + env.shipping.handlingFee) * 100) / 100
  return {
    amount,
    carrier: [cheapest.provider, cheapest.servicelevel?.name].filter(Boolean).join(' '),
    estimatedDays: Number(cheapest.estimated_days) || null,
  }
}

const shippingFor = async ({ address, goods, itemCount, flatShipping }) => {
  if (goods >= FREE_SHIPPING_MINIMUM || goods === 0) return { amount: 0, source: 'free' }
  if (env.shipping.provider !== 'shippo' || !address) return { amount: flatShipping, source: 'flat' }

  try {
    const rate = await cached(`ship:${hashOf([address.address, address.city, address.zipCode, address.countryCode, itemCount])}`, () =>
      withTimeout(shippoRate(address, itemCount), 'Shippo'),
    )
    return { ...rate, source: 'shippo' }
  } catch (error) {
    console.warn(`[pricing] Shipping rate failed, using the flat rate: ${error.message}`)
    return { amount: flatShipping, source: 'flat', fallback: true }
  }
}

// ── Tax: Stripe Tax ──

// Spreads an order discount over the lines in proportion to their value, so tax is charged on what is actually paid.
const discountedLineCents = (lines, discountCents) => {
  const totals = lines.map((line) => toCents(line.price) * line.quantity)
  const subtotal = totals.reduce((sum, value) => sum + value, 0)
  let remaining = discountCents
  return totals.map((value, index) => {
    const share = index === totals.length - 1 ? remaining : Math.round((discountCents * value) / (subtotal || 1))
    remaining -= share
    return Math.max(value - share, 0)
  })
}

const stripeTax = async ({ lines, discount, shipping, address }) => {
  const amounts = discountedLineCents(lines, toCents(discount))
  const calculation = await getStripe().tax.calculations.create({
    currency: env.payments.currency,
    line_items: lines.map((line, index) => ({ amount: amounts[index], quantity: line.quantity, reference: String(line.product) })),
    shipping_cost: { amount: toCents(shipping) },
    customer_details: {
      address: { line1: address.address, city: address.city, state: address.state, postal_code: address.zipCode, country: address.countryCode },
      address_source: 'shipping',
    },
  })
  return { amount: calculation.tax_amount_exclusive / 100, calculationId: calculation.id }
}

const taxFor = async ({ lines, discount, shipping, address, flatTax }) => {
  if (env.tax.provider !== 'stripe' || !address) return { amount: flatTax, source: 'flat' }

  const key = `tax:${hashOf([lines.map((line) => [String(line.product), line.price, line.quantity]), discount, shipping, address.address, address.city, address.state, address.zipCode, address.countryCode])}`
  try {
    const result = await cached(key, () => withTimeout(stripeTax({ lines, discount, shipping, address }), 'Stripe Tax'))
    return { ...result, source: 'stripe' }
  } catch (error) {
    console.warn(`[pricing] Tax calculation failed, using the flat rate: ${error.message}`)
    return { amount: flatTax, source: 'flat', fallback: true }
  }
}

/**
 * Totals for priced lines with an optional coupon and delivery address.
 * Returns the orderTotals shape plus `pricing`: where shipping and tax came from, whether a fallback was used,
 * and the carrier, delivery estimate and Stripe Tax calculation id when a provider answered.
 */
export const priceOrder = async ({ lines, coupon = null, address = null }) => {
  const flat = orderTotals(lines, coupon)
  const destination = usableAddress(address)
  const goods = Math.round((flat.subtotal - flat.discount) * 100) / 100
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)

  const shipping = await shippingFor({ address: destination, goods, itemCount, flatShipping: flat.shipping })
  const tax = await taxFor({ lines, discount: flat.discount, shipping: shipping.amount, address: destination, flatTax: flat.tax })

  return {
    subtotal: flat.subtotal,
    discount: flat.discount,
    shipping: shipping.amount,
    tax: tax.amount,
    totalAmount: Math.round((goods + shipping.amount + tax.amount) * 100) / 100,
    pricing: {
      shippingSource: shipping.source,
      taxSource: tax.source,
      // True when an address was given but a provider failed and a flat rate was used instead.
      fallback: Boolean(shipping.fallback || tax.fallback),
      // True when no full address was available, so shipping and tax are estimates until checkout.
      estimated: !destination && (env.shipping.provider !== 'flat' || env.tax.provider !== 'flat'),
      carrier: shipping.carrier,
      estimatedDelivery: shipping.estimatedDays ? new Date(Date.now() + shipping.estimatedDays * DAY_MS) : undefined,
      taxCalculationId: tax.calculationId,
    },
  }
}

// Records a confirmed order with Stripe Tax so it appears in tax reports. Resolves with the transaction id; never throws.
export const recordTaxTransaction = async (order) => {
  if (!order.taxCalculationId) return null
  try {
    const transaction = await getStripe().tax.transactions.createFromCalculation(
      { calculation: order.taxCalculationId, reference: String(order.id) },
      { idempotencyKey: `tax-${order.id}` },
    )
    return transaction.id
  } catch (error) {
    console.error(`[pricing] Could not record the tax transaction for ${order.id}: ${error.message}`)
    return null
  }
}

// Undoes the tax record of a cancelled order, so refunded sales are not reported as taxable. Never throws.
export const reverseTaxTransaction = async (order) => {
  if (!order.taxTransactionId) return
  try {
    await getStripe().tax.transactions.createReversal(
      { mode: 'full', original_transaction: order.taxTransactionId, reference: `${order.id}-cancel` },
      { idempotencyKey: `tax-reversal-${order.id}` },
    )
  } catch (error) {
    console.error(`[pricing] Could not reverse the tax transaction for ${order.id}: ${error.message}`)
  }
}
