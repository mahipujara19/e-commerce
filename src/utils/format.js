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

export const cartTotals = (items) => {
  const count = items.reduce((total, item) => total + (item.quantity ?? 1), 0)
  const subtotal = items.reduce((total, item) => total + item.price * (item.quantity ?? 1), 0)
  const shipping = subtotal >= FREE_SHIPPING_MINIMUM || subtotal === 0 ? 0 : 5.99
  const tax = subtotal * 0.08
  return { count, subtotal, shipping, tax, total: subtotal + tax + shipping }
}
