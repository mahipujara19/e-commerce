// Mirrors cartTotals in frontend/src/utils/format.js so the order total matches what checkout shows.
// All arithmetic is in cents (or paise), so totals never drift between the API, the browser and the payment provider.
// The rules come from the shared .env (VITE_* so the browser reads the very same values); defaults suit USD.
const setting = (name, fallback) => {
  const raw = process.env[name]
  const value = Number(raw)
  return raw !== undefined && raw !== '' && Number.isFinite(value) && value >= 0 ? value : fallback
}
export const FREE_SHIPPING_MINIMUM = setting('VITE_FREE_SHIPPING_MINIMUM', 75)
export const FLAT_SHIPPING = setting('VITE_FLAT_SHIPPING', 5.99)
export const TAX_RATE = setting('VITE_TAX_RATE', 0.08)

const toCents = (value) => Math.round(value * 100)

// coupon: { type: 'percent' | 'fixed', value } or null. The discount never exceeds the subtotal.
export const discountCents = (subtotalCents, coupon) => {
  if (!coupon) return 0
  const raw = coupon.type === 'percent' ? Math.round((subtotalCents * coupon.value) / 100) : toCents(coupon.value)
  return Math.min(Math.max(raw, 0), subtotalCents)
}

// Free shipping is judged on what the customer pays for the goods, after any discount.
// Tax is charged on the discounted goods, not on shipping.
export const orderTotals = (items, coupon = null) => {
  const subtotalCents = items.reduce((total, item) => total + toCents(item.price) * item.quantity, 0)
  const discount = discountCents(subtotalCents, coupon)
  const goodsCents = subtotalCents - discount
  const shippingCents = goodsCents >= toCents(FREE_SHIPPING_MINIMUM) || subtotalCents === 0 ? 0 : toCents(FLAT_SHIPPING)
  const taxCents = Math.round(goodsCents * TAX_RATE)

  return {
    subtotal: subtotalCents / 100,
    discount: discount / 100,
    shipping: shippingCents / 100,
    tax: taxCents / 100,
    totalAmount: (goodsCents + shippingCents + taxCents) / 100,
  }
}
