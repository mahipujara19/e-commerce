import { createSlice, nanoid } from '@reduxjs/toolkit'

const MAX_TOASTS = 3

const toastSlice = createSlice({
  name: 'toast',
  initialState: { items: [] },
  reducers: {
    notify: {
      reducer: (state, action) => {
        state.items = [...state.items, action.payload].slice(-MAX_TOASTS)
      },
      // Accepts a plain message or { message, severity }; severity is 'success' | 'error' | 'info'.
      prepare: (toast) => {
        const { message, severity = 'success' } = typeof toast === 'string' ? { message: toast } : toast
        return { payload: { id: nanoid(), message, severity } }
      },
    },
    dismissToast: (state, action) => {
      state.items = state.items.filter((toast) => toast.id !== action.payload)
    },
  },
})

export const { notify, dismissToast } = toastSlice.actions
export default toastSlice.reducer
