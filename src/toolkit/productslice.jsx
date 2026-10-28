import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const EXCLUDED_CATEGORIES = new Set([
  'vehicle',
  'kitchen-accessories',
  'groceries',
  'tablets',
  'smartphones',
  'motorcycle',
  'laptops',
  'skin-care',
  'sports-accessories',
])

export const fetchproduct = createAsyncThunk(
  'products/fetchProducts',
  async () => {
    const response = await fetch('https://dummyjson.com/products?limit=0')

    if (!response.ok) {
      throw new Error(`Product request failed (${response.status})`)
    }

    const result = await response.json()
    return result.products.filter((product) => !EXCLUDED_CATEGORIES.has(product.category))
  },
  {
    condition: (_, { getState }) => {
      const { status } = getState().products
      return status !== 'loading' && status !== 'succeeded'
    },
  },
)

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
  },
})
export default productSlice.reducer