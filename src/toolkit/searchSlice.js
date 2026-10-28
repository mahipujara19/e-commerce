import { createSlice } from '@reduxjs/toolkit'

const STORAGE_KEY = 'search'

const loadSearch = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')
    return {
      query: typeof saved?.query === 'string' ? saved.query : '',
      category: typeof saved?.category === 'string' ? saved.category : '',
    }
  } catch {
    return { query: '', category: '' }
  }
}

const saveSearch = (state) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ query: state.query, category: state.category }))
  } catch {
    // Storage unavailable (private mode or quota) — filters just won't persist.
  }
}

const searchSlice = createSlice({
  name: 'search',
  initialState: loadSearch(),
  reducers: {
    setSearchQuery: (state, action) => {
      state.query = action.payload
      saveSearch(state)
    },
    setCategory: (state, action) => {
      state.category = action.payload
      saveSearch(state)
    },
  },
})

export const { setSearchQuery, setCategory } = searchSlice.actions
export default searchSlice.reducer
