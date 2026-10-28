import { configureStore } from "@reduxjs/toolkit";
import cartReducer from './slice'
import productReducer from './productslice'
import searchReducer from './searchSlice'
import authReducer from './authSlice'
import uiReducer from './uiSlice'

// Configure the Redux store with all reducers:
// - cart: shopping cart items (add, remove, quantity, clear)
// - products: fetched product data from the API
// - search: search query and category filter state
// - auth: user authentication and profile
const store = configureStore({
    reducer: {
        cart: cartReducer,
        products: productReducer,
        search: searchReducer,
        auth: authReducer,
        ui: uiReducer,
    }
})

export default store;
