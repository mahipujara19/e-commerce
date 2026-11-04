import mongoose from 'mongoose'
import { env } from './env.js'

const RETRY_DELAY_MS = 5000

export const isDbConnected = () => mongoose.connection.readyState === 1

// Connects once; used by one-off scripts that should fail if MongoDB is down.
export const connectDb = () => mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 })

// Keeps trying in the background so the API can stay up and answer 503 until MongoDB is available.
// onConnect runs once after the first successful connection.
export const connectDbWithRetry = async (onConnect) => {
  try {
    await connectDb()
    console.log('MongoDB connected')
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}. Retrying in ${RETRY_DELAY_MS / 1000}s`)
    setTimeout(() => connectDbWithRetry(onConnect), RETRY_DELAY_MS)
    return
  }
  await onConnect?.()
}

mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'))
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'))
