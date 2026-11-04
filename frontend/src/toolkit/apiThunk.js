import { createAsyncThunk } from '@reduxjs/toolkit'

// Wraps an API call so a failure rejects with the server's message, readable as action.payload or via unwrap().
export const apiThunk = (type, request, options) =>
  createAsyncThunk(
    type,
    async (arg, { rejectWithValue }) => {
      try {
        return await request(arg)
      } catch (error) {
        return rejectWithValue(error.message)
      }
    },
    options,
  )
