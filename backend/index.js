import { env } from './config/env.js'
import mongoose from 'mongoose'
import { createApp } from './app.js'
import { connectDbWithRetry } from './config/db.js'
import { sweepStalePayments } from './services/orderService.js'
import { runMigrations } from './utils/migrations.js'
import { checkEmailTransport } from './utils/sendEmail.js'

const SWEEP_INTERVAL_MS = 5 * 60 * 1000
const SHUTDOWN_TIMEOUT_MS = 10 * 1000

// Crashes are logged with full detail; an uncaught exception leaves the process in an unknown state,
// so it exits and the platform (Render, Docker, PM2, systemd) starts a fresh one.
process.on('unhandledRejection', (reason) => console.error('[process] Unhandled rejection:', reason))
process.on('uncaughtException', (error) => {
  console.error('[process] Uncaught exception:', error)
  process.exit(1)
})

const app = createApp()
const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port} (${env.isProduction ? 'production' : 'development'}, payments: ${env.payments.methods.join(', ')})`)
})

let sweepTimer = null
connectDbWithRetry(async () => {
  await runMigrations().catch((error) => console.error(`[migrate] ${error.message}`))
  // Settles card payments whose webhook never arrived, and releases stock held by abandoned checkouts.
  const sweep = () => sweepStalePayments().catch((error) => console.error(`[payments] Sweep failed: ${error.message}`))
  sweep()
  sweepTimer = setInterval(sweep, SWEEP_INTERVAL_MS)
})
checkEmailTransport()

// Deploys send SIGTERM: stop taking new connections, let in-flight requests finish, then close MongoDB.
const shutdown = (signal) => {
  console.log(`[process] ${signal} received, shutting down`)
  clearInterval(sweepTimer)
  setTimeout(() => {
    console.error('[process] Shutdown timed out, forcing exit')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS).unref()

  server.close(async () => {
    await mongoose.disconnect().catch(() => {})
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
