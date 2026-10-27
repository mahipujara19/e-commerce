import { createSlice } from '@reduxjs/toolkit'
import { login, logout, signup } from './authSlice.js'

const getCartKey = (email) => `cart:${email.trim().toLowerCase()}`

const loadCart = (key) => {
  try {
    const savedCart = localStorage.getItem(key)
    const items = savedCart ? JSON.parse(savedCart) : []
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

const saveCart = (key, items) => {
  if (key) {
    localStorage.setItem(key, JSON.stringify(items))
  }
}

const getInitialCartKey = () => {
  try {
    const session = JSON.parse(localStorage.getItem('auth') || 'null')
    if (session?.isAuthenticated && session.user?.email) {
      return getCartKey(session.user.email)
    }
  } catch {
    return null
  }

  return null
}

const initialCartKey = getInitialCartKey()

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: initialCartKey ? loadCart(initialCartKey) : [],
    storageKey: initialCartKey,
  },
  reducers: {
    addItem: (state, action) => {
      const quantityToAdd = Math.max(1, Number(action.payload.quantity) || 1)
      const existingItem = state.items.find((item) => item.id === action.payload.id)
      if (existingItem) {
        existingItem.quantity = (existingItem.quantity ?? 1) + quantityToAdd
      } else {
        state.items.push({ ...action.payload, quantity: quantityToAdd })
      }
      saveCart(state.storageKey, state.items)
    },
    changeQuantity: (state, action) => {
      const { id, change } = action.payload
      const item = state.items.find((cartItem) => cartItem.id === id)

      if (!item) return

      const nextQuantity = (item.quantity ?? 1) + change
      if (nextQuantity <= 0) {
        state.items = state.items.filter((cartItem) => cartItem.id !== id)
      } else {
        item.quantity = nextQuantity
      }

      saveCart(state.storageKey, state.items)
    },
    removeItem: (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload.id)
      saveCart(state.storageKey, state.items)
    },
    clearItem: (state) => {
      state.items = []
      saveCart(state.storageKey, state.items)
    },
  },
  extraReducers: (builder) => {
    const loadUserCart = (state, email) => {
      if (state.storageKey) {
        saveCart(state.storageKey, state.items)
      }

      state.storageKey = getCartKey(email)
      state.items = loadCart(state.storageKey)
    }

    builder
      .addCase(login, (state, action) => {
        loadUserCart(state, action.payload.email)
      })
      .addCase(signup, (state, action) => {
        loadUserCart(state, action.payload.email)
      })
      .addCase(logout, (state) => {
        if (state.storageKey) {
          saveCart(state.storageKey, state.items)
        }
        state.storageKey = null
        state.items = []
      })
  },
})

export const { addItem, changeQuantity, removeItem, clearItem } = cartSlice.actions
export default cartSlice.reducer
