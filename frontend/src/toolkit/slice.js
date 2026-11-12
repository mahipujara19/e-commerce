import { createSlice } from '@reduxjs/toolkit'
import { login, logout, sessionExpired, signup } from './authSlice.js'
import { fetchproduct } from './productSlice.js'

/**
 * ── cart ──
 * The bag is kept in localStorage: "cart:<email>" per account, "cart:guest" before sign-in.
 * Signing in merges the guest bag into the account's bag; signing out starts an empty guest bag.
 * Items hold a snapshot of the product, refreshed whenever the catalogue loads, so prices and stock
 * shown in the bag are current. The server re-prices and re-checks stock on every order regardless.
 *
 * Per item, set by the sync:
 * - unavailable: the product was removed from the catalogue
 * - adjusted:    the quantity was lowered because less stock is left
 */

const getCartKey = (email) => `cart:${email.trim().toLowerCase()}`
const GUEST_KEY = 'cart:guest'

const loadCart = (key) => {
  try {
    const savedCart = localStorage.getItem(key)
    const items = savedCart ? JSON.parse(savedCart) : []
    // Numeric ids are left over from the old DummyJSON catalog and cannot be ordered.
    return Array.isArray(items) ? items.filter((item) => typeof item?.id === 'string') : []
  } catch {
    return []
  }
}

const saveCart = (key, items) => {
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {
    // Storage full or blocked (private mode): the bag still works for this visit.
  }
}

const getInitialCartKey = () => {
  try {
    const session = JSON.parse(localStorage.getItem('auth') || 'null')
    if (session?.isAuthenticated && session.user?.email) return getCartKey(session.user.email)
  } catch {
    // No storage or corrupted session
  }
  return GUEST_KEY
}

// Fields copied from the catalogue into the bag. Description and reviews are left out to keep storage small.
const SNAPSHOT_FIELDS = ['id', 'title', 'thumbnail', 'price', 'stock', 'brand', 'category', 'discountPercentage']

const snapshot = (product) => Object.fromEntries(SNAPSHOT_FIELDS.map((field) => [field, product[field]]))

const maxFor = (item) => (item.stock == null ? Number.POSITIVE_INFINITY : item.stock)

export const isPurchasable = (item) => !item.unavailable && (item.stock == null || item.stock > 0)

const initialCartKey = getInitialCartKey()

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: loadCart(initialCartKey),
    storageKey: initialCartKey,
  },
  reducers: {
    addItem: (state, action) => {
      const quantityToAdd = Math.max(1, Number(action.payload.quantity) || 1)
      const existingItem = state.items.find((item) => item.id === action.payload.id)
      if (existingItem) {
        existingItem.quantity = Math.min((existingItem.quantity ?? 1) + quantityToAdd, maxFor(existingItem))
      } else {
        const item = snapshot(action.payload)
        state.items.push({ ...item, quantity: Math.min(quantityToAdd, maxFor(item)) })
      }
      saveCart(state.storageKey, state.items)
    },
    changeQuantity: (state, action) => {
      const { id, change } = action.payload
      const item = state.items.find((cartItem) => cartItem.id === id)
      if (!item) return

      const nextQuantity = Math.min((item.quantity ?? 1) + change, maxFor(item))
      if (nextQuantity <= 0) {
        state.items = state.items.filter((cartItem) => cartItem.id !== id)
      } else {
        item.quantity = nextQuantity
        item.adjusted = false
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
    // Drops items that can no longer be bought (removed or sold out), e.g. before checkout.
    removeUnavailable: (state) => {
      state.items = state.items.filter(isPurchasable)
      saveCart(state.storageKey, state.items)
    },
  },
  extraReducers: (builder) => {
    const loadUserCart = (state, email) => {
      const guestItems = state.storageKey === GUEST_KEY ? state.items : []
      if (state.storageKey !== GUEST_KEY) saveCart(state.storageKey, state.items)

      state.storageKey = getCartKey(email)
      const items = loadCart(state.storageKey)
      // Pieces added before signing in join the account's bag.
      guestItems.forEach((guestItem) => {
        const existing = items.find((item) => item.id === guestItem.id)
        if (existing) existing.quantity = Math.min(Math.max(existing.quantity ?? 1, guestItem.quantity ?? 1), maxFor(guestItem))
        else items.push(guestItem)
      })
      state.items = items
      saveCart(state.storageKey, state.items)
      saveCart(GUEST_KEY, [])
    }

    const unloadUserCart = (state) => {
      if (state.storageKey !== GUEST_KEY) saveCart(state.storageKey, state.items)
      state.storageKey = GUEST_KEY
      state.items = []
      saveCart(GUEST_KEY, [])
    }

    builder
      .addCase(login.fulfilled, (state, action) => loadUserCart(state, action.payload.email))
      .addCase(signup.fulfilled, (state, action) => loadUserCart(state, action.payload.email))
      .addCase(logout.fulfilled, unloadUserCart)
      .addCase(sessionExpired, unloadUserCart)
      // Refresh every bag item from the catalogue that just loaded.
      .addCase(fetchproduct.fulfilled, (state, action) => {
        if (!state.items.length) return
        const byId = new Map(action.payload.map((product) => [product.id, product]))
        state.items.forEach((item) => {
          const product = byId.get(item.id)
          if (!product) {
            item.unavailable = true
            return
          }
          Object.assign(item, snapshot(product), { unavailable: false })
          if (product.stock > 0 && item.quantity > product.stock) {
            item.quantity = product.stock
            item.adjusted = true
          }
        })
        saveCart(state.storageKey, state.items)
      })
  },
})

export const { addItem, changeQuantity, removeItem, clearItem, removeUnavailable } = cartSlice.actions
export default cartSlice.reducer
