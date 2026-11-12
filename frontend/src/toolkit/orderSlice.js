import { createSlice } from '@reduxjs/toolkit'
import { api } from '../utils/api'
import { apiThunk } from './apiThunk'
import { logout, sessionExpired } from './authSlice'

// mine → the signed-in customer's order history; all → every order, for admins.
export const fetchMyOrders = apiThunk('orders/fetchMine', () => api('/orders'))
export const fetchAllOrders = apiThunk('orders/fetchAll', () => api('/orders/all'))

// One order, for the order page and the post-payment confirmation. Also settles a just-finished card payment.
export const fetchOrder = apiThunk('orders/fetchOne', (id) => api(`/orders/${id}`))

// Customers, while the order is still pending. A card payment is refunded by the server.
export const cancelMyOrder = apiThunk('orders/cancelMine', (id) => api(`/orders/${id}/cancel`, { method: 'POST' }))

// Staff. changes: { status?, carrier?, trackingNumber?, estimatedDelivery?, note? }
export const updateOrderStatus = apiThunk('orders/updateStatus', ({ id, ...changes }) =>
  api(`/orders/${id}`, { method: 'PUT', body: changes }),
)

const emptyList = () => ({ items: [], status: 'idle', error: null })

const initialState = { mine: emptyList(), all: emptyList(), byId: {} }

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

    // Keeps every list that holds the order in step with the latest copy from the server.
    const replaceEverywhere = (state, action) => {
      const order = action.payload
      const replace = (list) => {
        const index = list.findIndex((item) => item.id === order.id)
        if (index !== -1) list[index] = order
      }
      replace(state.all.items)
      replace(state.mine.items)
      state.byId[order.id] = order
    }

    builder
      .addCase(updateOrderStatus.fulfilled, replaceEverywhere)
      .addCase(fetchOrder.fulfilled, replaceEverywhere)
      .addCase(cancelMyOrder.fulfilled, replaceEverywhere)
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

export default orderSlice.reducer
