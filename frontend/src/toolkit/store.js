import { configureStore } from "@reduxjs/toolkit";
import cartReducer from './slice'
import productReducer from './productslice'
import searchReducer from './searchSlice'
import authReducer, { sessionExpired } from './authSlice'
import uiReducer from './uiSlice'
import wishlistReducer from './wishlistSlice'
import orderReducer from './orderSlice'
import toastReducer from './toastSlice'
import customerReducer from './customerSlice'
import { toastListeners } from './toastListeners'
import { setSessionExpiredHandler } from '../utils/api'

// Configure the Redux store with all reducers:
// - cart: shopping cart items (add, remove, quantity, clear)
// - products: fetched product data from the API, plus admin edits and reviews
// - search: search query and category filter state
// - auth: user authentication and profile
// - wishlist: ids of the signed-in user's saved products
// - orders: the user's order history and, for admins, every order
// - toast: notifications shown by <Toaster />
// - customers: every account with order stats, for the admin area
const store = configureStore({
    reducer: {
        cart: cartReducer,
        products: productReducer,
        search: searchReducer,
        auth: authReducer,
        ui: uiReducer,
        wishlist: wishlistReducer,
        orders: orderReducer,
        toast: toastReducer,
        customers: customerReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(toastListeners.middleware),
})

setSessionExpiredHandler(() => store.dispatch(sessionExpired()))

export default store;
