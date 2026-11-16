import { createSlice } from '@reduxjs/toolkit'
import { login, logout, sessionExpired, signup } from './authSlice.js'
import { fetchProduct, fetchProductList, fetchProductsByIds } from './productSlice.js'

/**
 * ── cart ──
 * The bag is kept in localStorage: "cart:<email>" per account, "cart:guest" before sign-in.
 * Signing in merges the guest bag into the account's bag; signing out starts an empty guest bag.
 * Items hold a snapshot of the product. It is refreshed from the server's quote (useCartStockCheck, on the bag
 * page, the bag drawer and checkout) and from any product the app happens to load, so prices and stock shown
 * in the bag are current without loading the catalogue. Quantities are never lowered silently: the bag shows the
 * problem and fixStockIssues applies the one-click fix. The server re-prices and re-checks stock on every order.
 *
 * Per item:
 * - unavailable: the product was removed from the catalogue
 * - adjusted:    the quantity was lowered to what is in stock by fixStockIssues
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
    // Copies prices, names, pictures and stock from a server quote (POST /orders/quote) into the bag.
    // payload: { quote, checked: [ids that were sent] }. Quantities are left alone; the quote's issues say what to fix.
    syncWithQuote: (state, action) => {
      const { quote, checked } = action.payload
      const quoted = new Map(quote.items.map((line) => [line.product, line]))
      const gone = new Set(quote.issues.filter((issue) => issue.type === 'unavailable').map((issue) => issue.product))
      let changed = false
      state.items.forEach((item) => {
        if (!checked.includes(item.id)) return
        const line = quoted.get(item.id)
        if (line) {
          Object.assign(item, { title: line.name, thumbnail: line.image, price: line.price, stock: line.stock, unavailable: false })
          changed = true
        } else if (gone.has(item.id)) {
          item.unavailable = true
          changed = true
        }
      })
      if (changed) saveCart(state.storageKey, state.items)
    },
    // The one-click fix for quote issues: lowers each line to what is in stock, removing sold-out and deleted ones.
    fixStockIssues: (state, action) => {
      action.payload.forEach((issue) => {
        const item = state.items.find((cartItem) => cartItem.id === issue.product)
        if (!item) return
        if (issue.type === 'unavailable' || issue.available <= 0) {
          state.items = state.items.filter((cartItem) => cartItem.id !== issue.product)
        } else {
          item.quantity = issue.available
          item.stock = issue.available
          item.adjusted = true
        }
      })
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
      // Any product loaded elsewhere (shop page, product page, wishlist) refreshes its copy in the bag for free.
      // Only fields are updated: whether the quantity still fits is decided by the stock check, not here.
      .addMatcher(
        (action) => [fetchProduct.fulfilled, fetchProductList.fulfilled, fetchProductsByIds.fulfilled].some((thunk) => thunk.match(action)),
        (state, action) => {
          if (!state.items.length) return
          const payload = action.payload
          const products = Array.isArray(payload) ? payload : payload.items ?? [payload]
          const byId = new Map(products.map((product) => [product.id, product]))
          let changed = false
          state.items.forEach((item) => {
            const product = byId.get(item.id)
            if (!product) return
            Object.assign(item, snapshot(product), { unavailable: false })
            changed = true
          })
          if (changed) saveCart(state.storageKey, state.items)
        },
      )
  },
})

export const { addItem, changeQuantity, removeItem, clearItem, removeUnavailable, syncWithQuote, fixStockIssues } = cartSlice.actions
export default cartSlice.reducer
