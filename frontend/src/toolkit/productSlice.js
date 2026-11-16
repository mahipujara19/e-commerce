import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { MAX_PRODUCT_PAGE_SIZE } from '../../../shared/catalog.js'
import { api } from '../utils/api'
import { apiThunk } from './apiThunk'

/**
 * ── products ──
 * The catalogue is never loaded whole. Screens ask the API for exactly what they show:
 *
 * - byId:    every product fetched so far, by id, in the storefront shape (title/thumbnail).
 * - lists:   one entry per query (filters + sort + page): the ids on that page and its paging metadata.
 *            Lists render from byId, so editing a product updates every screen that shows it.
 * - version: bumped when products are added or removed or orders change stock, so open lists reload.
 * - summary: catalogue-wide figures (categories with counts, total, average rating) for home, about and the shop.
 * - stats:   inventory totals for staff (units, value, low and out of stock).
 *
 * Use the hooks in hooks/useProducts.js rather than dispatching these thunks directly.
 */

// The API uses name/image; the components read title/thumbnail.
export const toStorefrontProduct = ({ name, image, ...product }) => ({
  ...product,
  title: name,
  thumbnail: image,
})

// A list query as a stable string, so equal queries share one cache entry whatever order the keys were in.
export const listKey = (params) =>
  JSON.stringify(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length))
      .sort(([a], [b]) => a.localeCompare(b)),
  )

const toSearchParams = (params) => {
  const search = new URLSearchParams()
  JSON.parse(listKey(params)).forEach(([key, value]) => search.set(key, Array.isArray(value) ? value.join(',') : String(value)))
  return search.toString()
}

// One page of products. params: { page, pageSize, sort, category, categories, search, ids, stock }.
export const fetchProductList = createAsyncThunk(
  'products/fetchList',
  async (params) => {
    const data = await api(`/products?${toSearchParams(params)}`)
    return { ...data, items: data.items.map(toStorefrontProduct) }
  },
  {
    // Concurrent requests for the same list (StrictMode, two components) share the first one.
    condition: (params, { getState }) => getState().products.lists[listKey(params)]?.status !== 'loading',
  },
)

// Specific products, e.g. a wishlist. The API takes up to MAX_PRODUCT_PAGE_SIZE ids per call, so larger sets are split.
// Resolves with the products that still exist; missing ids were deleted.
export const fetchProductsByIds = apiThunk('products/fetchByIds', async (ids) => {
  const unique = [...new Set(ids)]
  const chunks = []
  for (let index = 0; index < unique.length; index += MAX_PRODUCT_PAGE_SIZE) chunks.push(unique.slice(index, index + MAX_PRODUCT_PAGE_SIZE))
  const pages = await Promise.all(
    chunks.map((chunk) => api(`/products?${toSearchParams({ ids: chunk, pageSize: chunk.length })}`)),
  )
  return pages.flatMap((page) => page.items.map(toStorefrontProduct))
})

export const fetchProduct = apiThunk('products/fetchOne', async (id) => toStorefrontProduct(await api(`/products/${id}`)))

export const fetchProductSummary = createAsyncThunk('products/fetchSummary', () => api('/products/summary'), {
  condition: (_, { getState }) => getState().products.summary.status !== 'loading',
})

export const fetchProductStats = createAsyncThunk('products/fetchStats', () => api('/products/stats'), {
  condition: (_, { getState }) => getState().products.stats.status !== 'loading',
})

// Admin actions send the API's field names (name, image) and receive the storefront shape back.
export const createProduct = apiThunk('products/create', async (fields) =>
  toStorefrontProduct(await api('/products', { method: 'POST', body: fields })),
)

export const updateProduct = apiThunk('products/update', async ({ id, changes }) =>
  toStorefrontProduct(await api(`/products/${id}`, { method: 'PUT', body: changes })),
)

// Staff and admins. updates: [{ id, stock }]; resolves with the saved products. One save sends one email to admins.
export const updateStock = apiThunk('products/updateStock', async (updates) =>
  (await api('/products/stock', { method: 'PATCH', body: { updates } })).map(toStorefrontProduct),
)

export const deleteProduct = apiThunk('products/delete', async (id) => {
  await api(`/products/${id}`, { method: 'DELETE' })
  return id
})

export const submitReview = apiThunk('products/submitReview', async ({ id, rating, comment }) =>
  toStorefrontProduct(await api(`/products/${id}/reviews`, { method: 'POST', body: { rating, comment } })),
)

const loadable = () => ({ data: null, status: 'idle', error: null })

const initialState = {
  byId: {},
  lists: {},
  version: 0,
  summary: loadable(),
  stats: loadable(),
  // Ids the API said do not exist (deleted), so product pages can show "not found" instead of loading forever.
  missing: {},
}

const store = (state, products) => {
  products.forEach((product) => {
    state.byId[product.id] = product
    delete state.missing[product.id]
  })
}

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    // Stock or membership changed somewhere (an order, a cancellation, a new product): open lists reload.
    invalidateProducts: (state) => {
      state.version += 1
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductList.pending, (state, action) => {
        const key = listKey(action.meta.arg)
        // The previous ids stay until the new page arrives, so the grid does not flash empty.
        state.lists[key] = { ...(state.lists[key] ?? { ids: [], total: 0, totalPages: 1 }), status: 'loading', error: null }
      })
      .addCase(fetchProductList.fulfilled, (state, action) => {
        const { items, page, pageSize, total, totalPages } = action.payload
        store(state, items)
        state.lists[listKey(action.meta.arg)] = {
          ids: items.map((item) => item.id),
          page,
          pageSize,
          total,
          totalPages,
          status: 'succeeded',
          error: null,
          version: state.version,
          fetchedAt: Date.now(),
        }
      })
      .addCase(fetchProductList.rejected, (state, action) => {
        const key = listKey(action.meta.arg)
        state.lists[key] = { ...(state.lists[key] ?? { ids: [], total: 0, totalPages: 1 }), status: 'failed', error: action.error.message ?? 'Unable to load products' }
      })
      .addCase(fetchProductsByIds.fulfilled, (state, action) => {
        store(state, action.payload)
        const found = new Set(action.payload.map((product) => product.id))
        action.meta.arg.filter((id) => !found.has(id)).forEach((id) => {
          state.missing[id] = true
        })
      })
      .addCase(fetchProduct.fulfilled, (state, action) => store(state, [action.payload]))
      .addCase(fetchProduct.rejected, (state, action) => {
        // Deleted, or an id that could never exist (an old link): either way the page says "not found", not "retry".
        if (['Product not found', 'Invalid product id'].includes(action.payload)) state.missing[action.meta.arg] = true
      })
      .addCase(fetchProductSummary.pending, (state) => {
        state.summary.status = 'loading'
        state.summary.error = null
      })
      .addCase(fetchProductSummary.fulfilled, (state, action) => {
        state.summary = { data: action.payload, status: 'succeeded', error: null, version: state.version }
      })
      .addCase(fetchProductSummary.rejected, (state, action) => {
        state.summary.status = 'failed'
        state.summary.error = action.error.message ?? 'Unable to load the catalogue'
      })
      .addCase(fetchProductStats.pending, (state) => {
        state.stats.status = 'loading'
        state.stats.error = null
      })
      .addCase(fetchProductStats.fulfilled, (state, action) => {
        state.stats = { data: action.payload, status: 'succeeded', error: null, version: state.version }
      })
      .addCase(fetchProductStats.rejected, (state, action) => {
        state.stats.status = 'failed'
        state.stats.error = action.error.message ?? 'Unable to load inventory totals'
      })
      // Edits replace the product in place: every list showing it updates, and nothing reorders under the user.
      .addCase(updateProduct.fulfilled, (state, action) => store(state, [action.payload]))
      .addCase(submitReview.fulfilled, (state, action) => store(state, [action.payload]))
      .addCase(updateStock.fulfilled, (state, action) => store(state, action.payload))
      // Adding or removing a product changes which products belong on which page.
      .addCase(createProduct.fulfilled, (state, action) => {
        store(state, [action.payload])
        state.version += 1
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        delete state.byId[action.payload]
        state.missing[action.payload] = true
        state.version += 1
      })
  },
})

export const { invalidateProducts } = productSlice.actions
export default productSlice.reducer
