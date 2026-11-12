import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../utils/api";
import { apiThunk } from "./apiThunk";

// The API uses name/image; the components read title/thumbnail.
const toStorefrontProduct = ({ name, image, ...product }) => ({
  ...product,
  title: name,
  thumbnail: image,
})

export const fetchproduct = createAsyncThunk(
  'products/fetchProducts',
  async () => {
    const products = await api('/products')
    return products.map(toStorefrontProduct)
  },
  {
    condition: (options, { getState }) => {
      const { status } = getState().products
      return status !== 'loading' && (options?.force || status !== 'succeeded')
    },
  },
)

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

const replaceProduct = (state, action) => {
  const index = state.items.findIndex((item) => item.id === action.payload.id)
  if (index !== -1) state.items[index] = action.payload
}

const initialState = {
  items: [],
  status: 'idle',
  error: null,
}

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchproduct.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchproduct.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchproduct.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Unable to load products'
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
      .addCase(updateProduct.fulfilled, replaceProduct)
      .addCase(updateStock.fulfilled, (state, action) => {
        action.payload.forEach((product) => replaceProduct(state, { payload: product }))
      })
      .addCase(submitReview.fulfilled, replaceProduct)
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
  },
})
export default productSlice.reducer
