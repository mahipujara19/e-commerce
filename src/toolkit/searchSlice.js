import { createSlice } from '@reduxjs/toolkit'

/**
 * Manages product search query and category filter state.
 * The header's search bar dispatches setSearchQuery,
 * and the category chips dispatch setCategory.
 * Product.jsx reads both to filter the displayed product list.
 */
const searchSlice = createSlice({
  name: 'search',
  initialState: {
    // The text the user types in the search bar
    query: '',
    // The currently selected category filter (empty string = show all)
    category: '',
  },
  reducers: {
    // Updates the search query as the user types
    setSearchQuery: (state, action) => {
      state.query = action.payload
    },
    // Sets the active category filter (e.g. "groceries", "beauty", or "" for all)
    setCategory: (state, action) => {
      state.category = action.payload
    },
  },
})

export const { setSearchQuery, setCategory } = searchSlice.actions
export default searchSlice.reducer
