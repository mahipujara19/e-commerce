import { configureStore } from "@reduxjs/toolkit";
import cartReducer from './slice'
import productReducer from './productslice'
const store =configureStore({
    reducer:{
        cart:cartReducer,
        products:productReducer
    }
})

export default store;
