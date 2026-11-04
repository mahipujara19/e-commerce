import { createSlice } from '@reduxjs/toolkit'
import { api } from '../utils/api'
import { apiThunk } from './apiThunk'
import { logout, sessionExpired } from './authSlice'

// The server returns the full list of saved product ids after every change.
export const fetchWishlist = apiThunk('wishlist/fetch', () => api('/users/me/wishlist'))

export const toggleWishlist = apiThunk('wishlist/toggle', ({ productId, save }) =>
  api(`/users/me/wishlist/${productId}`, { method: save ? 'PUT' : 'DELETE' }),
)

const initialState = { ids: [], status: 'idle' }

const setSaved = (state, productId, save) => {
  state.ids = save ? [...new Set([...state.ids, productId])] : state.ids.filter((id) => id !== productId)
}

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.ids = action.payload
      })
      .addCase(fetchWishlist.rejected, (state) => {
        state.status = 'failed'
      })
      // Optimistic: the heart fills immediately and is reverted if the request fails.
      .addCase(toggleWishlist.pending, (state, action) => {
        setSaved(state, action.meta.arg.productId, action.meta.arg.save)
      })
      .addCase(toggleWishlist.fulfilled, (state, action) => {
        state.ids = action.payload
      })
      .addCase(toggleWishlist.rejected, (state, action) => {
        setSaved(state, action.meta.arg.productId, !action.meta.arg.save)
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

export default wishlistSlice.reducer
