export const FREE_SHIPPING_MINIMUM = 75

export const SIGNATURE_CATEGORIES = ['mens-watches', 'womens-jewellery', 'womens-bags', 'fragrances', 'womens-watches', 'sunglasses']

export const LUXURY_CATEGORIES = [...SIGNATURE_CATEGORIES, 'furniture', 'home-decoration']

export const featuredRank = (product) => {
  const index = LUXURY_CATEGORIES.indexOf(product.category)
  return index === -1 ? LUXURY_CATEGORIES.length : index
}

export const formatCategory = (value = '') =>
  value.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())

export const money = (value) => `$${Number(value).toFixed(2)}`

export const originalPrice = (product) =>
  product.discountPercentage > 0 ? product.price / (1 - product.discountPercentage / 100) : null

export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

export const LOW_STOCK_THRESHOLD = 10

export const stockLevel = (stock) => (stock === 0 ? 'out' : stock <= LOW_STOCK_THRESHOLD ? 'low' : 'ok')

export const orderNumber = (id) => `GT-${id.slice(-8).toUpperCase()}`

export const formatDate = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Date(value).toLocaleDateString(undefined, options)

export const cartTotals =(items) => {
  const count = items.reduce((total, item) => total + (item.quantity ?? 1), 0)
  const subtotal = items.reduce((total, item) => total + item.price * (item.quantity ?? 1), 0)
  const shipping = subtotal >= FREE_SHIPPING_MINIMUM || subtotal === 0 ? 0 : 5.99
  const tax = subtotal * 0.08
  return { count, subtotal, shipping, tax, total: subtotal + tax + shipping }
}
