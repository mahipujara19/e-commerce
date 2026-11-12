// Vercel entry point: every /api/* request (plus /sitemap.xml and /robots.txt, see vercel.json) runs the Express app
// here as a serverless function. The website itself (frontend/dist) is served by Vercel directly.
// Locally and on normal servers, backend/index.js is used instead.
import { env } from '../backend/config/env.js'
import { createApp } from '../backend/app.js'
import { connectDb, isDbConnected } from '../backend/config/db.js'
import { runMigrations } from '../backend/utils/migrations.js'

const app = createApp()

// One connection per function instance, reused by every request it serves. A failed attempt is retried on the next request.
let connecting = null
const ensureDb = () => {
  if (isDbConnected()) return Promise.resolve()
  connecting ??= connectDb()
    .then(() => runMigrations().catch((error) => console.error(`[migrate] ${error.message}`)))
    .catch((error) => {
      console.error(`[db] MongoDB connection failed: ${error.message}`)
    })
    .finally(() => {
      connecting = null
    })
  return connecting
}

export default async function handler(req, res) {
  // When the database cannot be reached, the app answers 503 "temporarily unavailable" instead of crashing.
  await ensureDb()
  return app(req, res)
}

if (!env.mongoUri) console.error('[db] MONGO_URI is not set in the Vercel project settings')
