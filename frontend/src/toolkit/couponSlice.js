import { createSlice } from '@reduxjs/toolkit'
import { api } from '../utils/api'
import { apiThunk } from './apiThunk'
import { logout, sessionExpired } from './authSlice'

// Admin only.
export const fetchCoupons = apiThunk('coupons/fetch', () => api('/admin/coupons'))
export const createCoupon = apiThunk('coupons/create', (fields) => api('/admin/coupons', { method: 'POST', body: fields }))
export const updateCoupon = apiThunk('coupons/update', ({ id, ...fields }) => api(`/admin/coupons/${id}`, { method: 'PUT', body: fields }))
export const deleteCoupon = apiThunk('coupons/delete', async (id) => {
  await api(`/admin/coupons/${id}`, { method: 'DELETE' })
  return id
})

const initialState = { items: [], status: 'idle', error: null }

const couponSlice = createSlice({
  name: 'coupons',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCoupons.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchCoupons.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchCoupons.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Unable to load coupons'
      })
      .addCase(createCoupon.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
      })
      .addCase(updateCoupon.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id)
        if (index !== -1) state.items[index] = action.payload
      })
      .addCase(deleteCoupon.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

export default couponSlice.reducer
