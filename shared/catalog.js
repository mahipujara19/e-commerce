/**
 * Catalogue rules shared by the API (backend/) and the store (frontend/): the "featured" order, stock levels and
 * paging limits. Plain JavaScript with no imports, so it runs unchanged in Node and in the browser.
 */

export const SIGNATURE_CATEGORIES = ['mens-watches', 'womens-jewellery', 'womens-bags', 'fragrances', 'womens-watches', 'sunglasses']

// "Featured" lists these categories first, in this order, then everything else.
export const LUXURY_CATEGORIES = [...SIGNATURE_CATEGORIES, 'furniture', 'home-decoration']

export const LOW_STOCK_THRESHOLD = 10

export const PRODUCT_PAGE_SIZE = 24
export const MAX_PRODUCT_PAGE_SIZE = 100
export const MAX_SUGGESTIONS = 6
