// Store rules from the shared .env. The API reads the same VITE_* values, so the bag and the order agree.
const setting = (value, fallback) => {
  const number = Number(value)
  return value !== undefined && value !== '' && Number.isFinite(number) && number >= 0 ? number : fallback
}

export const CURRENCY = (import.meta.env.VITE_CURRENCY || 'USD').toUpperCase()
export const FREE_SHIPPING_MINIMUM = setting(import.meta.env.VITE_FREE_SHIPPING_MINIMUM, 75)
export const FLAT_SHIPPING = setting(import.meta.env.VITE_FLAT_SHIPPING, 5.99)
export const TAX_RATE = setting(import.meta.env.VITE_TAX_RATE, 0.08)

export const SIGNATURE_CATEGORIES = ['mens-watches', 'womens-jewellery', 'womens-bags', 'fragrances', 'womens-watches', 'sunglasses']

export const LUXURY_CATEGORIES = [...SIGNATURE_CATEGORIES, 'furniture', 'home-decoration']

export const featuredRank = (product) => {
  const index = LUXURY_CATEGORIES.indexOf(product.category)
  return index === -1 ? LUXURY_CATEGORIES.length : index
}

export const formatCategory = (value = '') =>
  value.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())

const LOCALE = CURRENCY === 'INR' ? 'en-IN' : 'en-US'
const moneyFormat = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY })
const wholeMoneyFormat = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 })

// Prices, e.g. "₹1,499.00" or "$75.00".
export const money = (value) => moneyFormat.format(Number(value) || 0)
// Round amounts in sentences, e.g. "free shipping over ₹999" (keeps decimals only when there are some).
export const moneyShort = (value) => (Number.isInteger(Number(value)) ? wholeMoneyFormat : moneyFormat).format(Number(value) || 0)
// Any supported currency, for converted display prices (see hooks/useMoney.js). One formatter per currency.
const formatters = new Map()
export const formatMoneyIn = (value, currency) => {
  if (!formatters.has(currency)) {
    formatters.set(currency, new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency }))
  }
  return formatters.get(currency).format(Number(value) || 0)
}

// "Free shipping over $75", used across the store.
export const FREE_SHIPPING_TEXT = `Free shipping over ${moneyShort(FREE_SHIPPING_MINIMUM)}`

export const originalPrice = (product) =>
  product.discountPercentage > 0 ? product.price / (1 - product.discountPercentage / 100) : null

export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

export const LOW_STOCK_THRESHOLD = 10

export const stockLevel = (stock) => (stock === 0 ? 'out' : stock <= LOW_STOCK_THRESHOLD ? 'low' : 'ok')

export const orderNumber = (id) => `GT-${id.slice(-8).toUpperCase()}`

export const formatDate = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Date(value).toLocaleDateString(undefined, options)

/**
 * Mirrors backend/utils/orderTotals.js exactly (all in cents), so the bag shows what the order will cost.
 * The server still prices every order itself; this is only the preview.
 * coupon: { type: 'percent' | 'fixed', value } or null.
 */
export const cartTotals = (items, coupon = null) => {
  const count = items.reduce((total, item) => total + (item.quantity ?? 1), 0)
  const subtotalCents = items.reduce((total, item) => total + Math.round(item.price * 100) * (item.quantity ?? 1), 0)
  const rawDiscount = !coupon ? 0 : coupon.type === 'percent' ? Math.round((subtotalCents * coupon.value) / 100) : Math.round(coupon.value * 100)
  const discountCents = Math.min(Math.max(rawDiscount, 0), subtotalCents)
  const goodsCents = subtotalCents - discountCents
  const shippingCents = goodsCents >= FREE_SHIPPING_MINIMUM * 100 || subtotalCents === 0 ? 0 : Math.round(FLAT_SHIPPING * 100)
  const taxCents = Math.round(goodsCents * TAX_RATE)
  return {
    count,
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    shipping: shippingCents / 100,
    tax: taxCents / 100,
    total: (goodsCents + shippingCents + taxCents) / 100,
  }
}

export const PAYMENT_LABELS = {
  awaiting_payment: 'Awaiting payment',
  unpaid: 'Unpaid',
  paid: 'Paid',
  refunded: 'Refunded',
}
