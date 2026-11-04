import { createSlice } from '@reduxjs/toolkit'
import { api } from '../utils/api'
import { apiThunk } from './apiThunk'
import { logout, sessionExpired } from './authSlice'

// Staff and admins: every account with its order count, total spend and last order date.
export const fetchCustomers = apiThunk('customers/fetch', () => api('/users'))

// Admin only. fields: { name, email, password, role }
export const createUser = apiThunk('customers/create', (fields) => api('/users', { method: 'POST', body: fields }))

// Admin only. The server signs the account out so the new role applies from its next sign-in.
export const updateUserRole = apiThunk('customers/updateRole', ({ id, role }) =>
  api(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
)

const initialState = { items: [], status: 'idle', error: null }

const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Unable to load customers'
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
      })
      // The role endpoint returns the plain account, so the order stats already in the list are kept.
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const user = state.items.find((item) => item.id === action.payload.id)
        if (user) user.role = action.payload.role
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

export default customerSlice.reducer
