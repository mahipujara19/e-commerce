import { createSlice } from '@reduxjs/toolkit'
import { api } from '../utils/api'
import { apiThunk } from './apiThunk'
import { logout, sessionExpired } from './authSlice'

// Saved shipping addresses. Every endpoint returns the full, updated list.
export const fetchAddresses = apiThunk('addresses/fetch', () => api('/users/me/addresses'))
export const saveAddress = apiThunk('addresses/save', ({ id, ...fields }) =>
  api(id ? `/users/me/addresses/${id}` : '/users/me/addresses', { method: id ? 'PUT' : 'POST', body: fields }),
)
export const deleteAddress = apiThunk('addresses/delete', (id) => api(`/users/me/addresses/${id}`, { method: 'DELETE' }))

const initialState = { items: [], status: 'idle', error: null }

const setList = (state, action) => {
  state.status = 'succeeded'
  state.items = action.payload
}

const addressSlice = createSlice({
  name: 'addresses',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchAddresses.fulfilled, setList)
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Unable to load your addresses'
      })
      .addCase(saveAddress.fulfilled, setList)
      .addCase(deleteAddress.fulfilled, setList)
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

export default addressSlice.reducer
