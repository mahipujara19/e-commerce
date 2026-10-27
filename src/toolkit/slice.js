import { createSlice } from "@reduxjs/toolkit"

const initialState={
    items:localStorage.getItem('cart')?JSON.parse(localStorage.getItem('cart')):[]
}

const addtocart=createSlice({
    name:'cart',
    initialState,
    reducers:{
        addItem:(state,action)=>{
          const quantityToAdd = Math.max(1, Number(action.payload.quantity) || 1)
          const existingItem = state.items.find((item)=>item.id===action.payload.id)
          if (existingItem) {
            existingItem.quantity = (existingItem.quantity ?? 1) + quantityToAdd
          } else {
            state.items.push({...action.payload, quantity:quantityToAdd})
          }
          localStorage.setItem('cart',JSON.stringify(state.items))
        },
        changeQuantity:(state,action)=>{
            const { id, change } = action.payload
            const item = state.items.find((cartItem)=>cartItem.id===id)

            if (!item) return

            const nextQuantity = (item.quantity ?? 1) + change
            if (nextQuantity <= 0) {
                state.items = state.items.filter((cartItem)=>cartItem.id!==id)
            } else {
                item.quantity = nextQuantity
            }

            localStorage.setItem('cart',JSON.stringify(state.items))
        },
        removeItem:(state,action)=>{
            const cartdata=state.items.filter((item)=>item.id!==action.payload.id)
            state.items=cartdata
            localStorage.setItem('cart',JSON.stringify(cartdata))
        },
        clearItem:(state)=>{
            state.items=[]
            localStorage.setItem('cart',JSON.stringify(state.items))
        }
    }
})

export const {addItem,changeQuantity,removeItem,clearItem}=addtocart.actions
export default addtocart.reducer