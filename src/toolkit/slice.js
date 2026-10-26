import { createSlice } from "@reduxjs/toolkit"

const initialState={
    items:localStorage.getItem('cart')?JSON.parse(localStorage.getItem('cart')):0
}

const addtocart=createSlice({
    name:'cart',
    initialState,
    reducers:{
        addItem:(state,action)=>{
          //  state.value+=1;
          console.log(action);
          state.items.push(action.payload)
          localStorage.setItem('cart',JSON.stringify(state.items))
        },
        removeItem:(state,action)=>{
            const cartdata=state.items.filter((item)=>item.id!==action.payload.id)
            state.items=cartdata
            localStorage.setItem('cart',JSON.stringify(cartdata))
        },
        clearItem:(state)=>{
            state.value=0
        }
    }
})

export const {addItem,removeItem,clearItem}=addtocart.actions
export default addtocart.reducer