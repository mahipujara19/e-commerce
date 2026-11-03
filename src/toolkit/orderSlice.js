import { createSlice } from '@reduxjs/toolkit'
import { api } from '../utils/api'
import { apiThunk } from './apiThunk'
import { logout, sessionExpired } from './authSlice'

// mine → the signed-in customer's order history; all → every order, for admins.
export const fetchMyOrders = apiThunk('orders/fetchMine', () => api('/orders'))
export const fetchAllOrders = apiThunk('orders/fetchAll', () => api('/orders/all'))

export const updateOrderStatus = apiThunk('orders/updateStatus', ({ id, status }) =>
  api(`/orders/${id}`, { method: 'PUT', body: { status } }),
)

const emptyList = () => ({ items: [], status: 'idle', error: null })

const initialState = { mine: emptyList(), all: emptyList() }

const addListCases = (builder, thunk, key) => {
  builder
    .addCase(thunk.pending, (state) => {
      state[key].status = 'loading'
      state[key].error = null
    })
    .addCase(thunk.fulfilled, (state, action) => {
      state[key].status = 'succeeded'
      state[key].items = action.payload
    })
    .addCase(thunk.rejected, (state, action) => {
      state[key].status = 'failed'
      state[key].error = action.payload ?? 'Unable to load orders'
    })
}

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchMyOrders, 'mine')
    addListCases(builder, fetchAllOrders, 'all')

    builder
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const replace = (list) => {
          const index = list.findIndex((order) => order.id === action.payload.id)
          if (index !== -1) list[index] = action.payload
        }
        replace(state.all.items)
        replace(state.mine.items)
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

export default orderSlice.reducer
