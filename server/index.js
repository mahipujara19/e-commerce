import { env } from './config/env.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { connectDbWithRetry, isDbConnected } from './config/db.js'
import { errorHandler, notFound, requireDb } from './middleware/errorHandler.js'
import authRoutes from './routes/authRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import productRoutes from './routes/productRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { sendSuccess } from './utils/apiResponse.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.clientUrl, credentials: true }))
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  sendSuccess(res, { data: { database: isDbConnected() ? 'connected' : 'disconnected' } })
})

app.use('/api/auth', requireDb, authRoutes)
app.use('/api/products', requireDb, productRoutes)
app.use('/api/orders', requireDb, orderRoutes)
app.use('/api/users', requireDb, userRoutes)

app.use(notFound)
app.use(errorHandler)

app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`))
connectDbWithRetry()
