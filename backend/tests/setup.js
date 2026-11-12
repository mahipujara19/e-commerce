import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import request from 'supertest'

/**
 * Starts an in-memory MongoDB and the Express app with test settings (manual payments, console email).
 * Environment variables are set before the app is imported, so config/env.js reads them instead of .env.
 */
export const startTestServer = async (overrides = {}) => {
  const mongo = await MongoMemoryServer.create()
  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGO_URI: mongo.getUri(),
    JWT_ACCESS_SECRET: 'test-access-secret-that-is-long-enough-123456',
    JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-long-enough-654321',
    CLIENT_URL: 'http://localhost:5173',
    PAYMENT_METHODS: '',
    PAYMENT_MODE: 'manual',
    STRIPE_SECRET_KEY: '',
    RECAPTCHA_SECRET_KEY: '',
    SMTP_HOST: '',
    SUPPORT_EMAIL: '',
    ...overrides,
  })

  const { connectDb } = await import('../config/db.js')
  const { createApp } = await import('../app.js')
  await connectDb()

  return {
    app: createApp(),
    stop: async () => {
      await mongoose.disconnect()
      await mongo.stop()
    },
  }
}

// A cookie-keeping client that fetches a CSRF token and signs in, like the browser does.
export const client = async (app) => {
  const agent = request.agent(app)
  const { body } = await agent.get('/api/csrf-token')
  const csrf = body.data.csrfToken
  let token = null

  const send = (method, path, payload) => {
    let req = agent[method](path).set('X-CSRF-Token', csrf)
    if (token) req = req.set('Authorization', `Bearer ${token}`)
    return payload === undefined ? req : req.send(payload)
  }

  return {
    get: (path) => send('get', path),
    post: (path, payload) => send('post', path, payload ?? {}),
    put: (path, payload) => send('put', path, payload ?? {}),
    patch: (path, payload) => send('patch', path, payload ?? {}),
    delete: (path) => send('delete', path),
    async signup(fields) {
      const res = await send('post', '/api/auth/signup', { password: 'Secret123!', ...fields })
      token = res.body.data?.accessToken
      return res
    },
    async login(email, password) {
      const res = await send('post', '/api/auth/login', { email, password })
      token = res.body.data?.accessToken
      return res
    },
  }
}
