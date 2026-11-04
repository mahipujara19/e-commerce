// Mirrors cartTotals in src/utils/format.js so the order total matches what checkout shows.
const FREE_SHIPPING_MINIMUM = 75
const FLAT_SHIPPING = 5.99
const TAX_RATE = 0.08

const round = (value) => Math.round(value * 100) / 100

export const orderTotals = (items) => {
  const subtotalCents = items.reduce((total, item) => total + Math.round(item.price * 100) * item.quantity, 0)
  const subtotal = subtotalCents / 100
  const shipping = subtotal >= FREE_SHIPPING_MINIMUM ? 0 : FLAT_SHIPPING
  const tax = round(subtotal * TAX_RATE)
  return { subtotal, shipping, tax, totalAmount: round(subtotal + tax + shipping) }
}
