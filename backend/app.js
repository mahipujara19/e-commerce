import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { isDbConnected } from './config/db.js'
import { env } from './config/env.js'
import { razorpayWebhook, stripeWebhook } from './controllers/paymentController.js'
import couponRoutes from './routes/couponRoutes.js'
import currencyRoutes from './routes/currencyRoutes.js'
import { issueCsrfToken, verifyCsrf } from './middleware/csrf.js'
import { errorHandler, notFound, requireDb } from './middleware/errorHandler.js'
import adminRoutes from './routes/adminRoutes.js'
import authRoutes from './routes/authRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import productRoutes from './routes/productRoutes.js'
import supportRoutes, { clientErrorHandler, sitemap } from './routes/supportRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { sweepStalePayments } from './services/orderService.js'
import { sendSuccess } from './utils/apiResponse.js'
import { clientIp } from './utils/clientIp.js'

const CLIENT_DIST = fileURLToPath(new URL('../frontend/dist', import.meta.url))
const startedAt = Date.now()

// One JSON line per request (method, path, status, duration), so logs can be searched and turned into
// latency and error-rate alerts by any log platform. Health checks are skipped to keep the noise down.
const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint()
  req.id = req.get('x-request-id')?.slice(0, 64) || randomUUID()
  res.set('X-Request-Id', req.id)

  res.on('finish', () => {
    if (req.path.startsWith('/api/health')) return
    const ms = Number(process.hrtime.bigint() - start) / 1e6
    const entry = {
      time: new Date().toISOString(),
      id: req.id,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      ms: Math.round(ms),
      ip: clientIp(req),
      user: req.user?.id,
    }
    const line = `[http] ${JSON.stringify(entry)}`
    if (res.statusCode >= 500) console.error(line)
    else if (res.statusCode >= 400 || ms > 1000) console.warn(line)
    else if (env.isProduction) console.log(line)
  })
  next()
}

// Behind a TLS-terminating proxy, plain-HTTP visitors are sent to HTTPS.
const forceHttps = (req, res, next) => {
  if (req.secure || req.path.startsWith('/api/health')) return next()
  return res.redirect(308, `https://${req.get('host')}${req.originalUrl}`)
}

// Hashes of the inline <script> blocks in the built index.html, so the CSP can allow exactly those.
// Browsers hash the script after turning CRLF line endings into LF, so the same is done here.
const inlineScriptHashes = (html) =>
  [...html.replace(/\r\n?/g, '\n').matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(([, code]) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`)

const serveClient = (app) => {
  const indexFile = `${CLIENT_DIST}/index.html`
  if (!existsSync(indexFile)) {
    console.warn('[client] SERVE_CLIENT=true but frontend/dist is missing. Run `npm run build` first.')
    return
  }
  const html = readFileSync(indexFile, 'utf8')

  const csp = helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        ...inlineScriptHashes(html),
        'https://www.googletagmanager.com',
        'https://www.google.com',
        'https://www.gstatic.com',
        'https://www.recaptcha.net',
      ],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      // Product images may come from any https host an admin enters.
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: [
        "'self'",
        'https://*.google-analytics.com',
        'https://*.analytics.google.com',
        'https://nominatim.openstreetmap.org',
      ],
      frameSrc: ["'self'", 'https://www.google.com', 'https://recaptcha.google.com', 'https://www.recaptcha.net'],
      formAction: ["'self'", 'https://checkout.stripe.com'],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: [],
    },
  })

  // Hashed build files never change, so browsers may cache them for a year; index.html is always revalidated.
  app.use('/assets', express.static(`${CLIENT_DIST}/assets`, { immutable: true, maxAge: '1y', fallthrough: false }))
  app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }))
  app.get(/^(?!\/api\/).*/, csp, (_req, res) => {
    res.set('Cache-Control', 'no-cache').type('html').send(html)
  })
}

export const createApp = () => {
  const app = express()
  app.disable('x-powered-by')

  // Needed behind a proxy (Render, Heroku, nginx) so secure cookies and req.ip see the real connection.
  if (env.isProduction) app.set('trust proxy', 1)

  app.use(requestLogger)
  if (env.isProduction) app.use(forceHttps)

  // The API only returns JSON, so the strictest policy fits; the storefront gets its own policy in serveClient.
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      strictTransportSecurity: { maxAge: 365 * 24 * 60 * 60, includeSubDomains: true },
    }),
  )
  // credentials lets the browser send the refresh and CSRF cookies when the frontend is on another origin.
  app.use(cors({ origin: env.clientUrl, credentials: true }))

  // Stripe signs the raw bytes, so this route must see the body before the JSON parser does.
  app.post('/api/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }), requireDb, stripeWebhook)
  app.post('/api/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '1mb' }), requireDb, razorpayWebhook)

  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  // Liveness: the process is up. Readiness: it can serve traffic (503 while MongoDB is unreachable).
  app.get('/api/health/live', (_req, res) => sendSuccess(res, { data: { status: 'ok' } }))
  app.get('/api/health', (_req, res) => {
    const healthy = isDbConnected()
    res.set('Cache-Control', 'no-store')
    // Same envelope as every other response: success is false whenever the status is not 2xx.
    res.status(healthy ? 200 : 503).json({
      success: healthy,
      message: healthy ? 'OK' : 'Database unavailable',
      data: {
        status: healthy ? 'ok' : 'degraded',
        database: healthy ? 'connected' : 'disconnected',
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        release: env.release,
        payments: env.payments.methods.join(','),
        shipping: env.shipping.provider,
        tax: env.tax.provider,
      },
    })
  })

  // Vercel Cron calls this daily with "Authorization: Bearer <CRON_SECRET>". A long-running server (npm start) does
  // the same every 5 minutes by itself (index.js). Hidden (404) unless CRON_SECRET is set.
  app.get('/api/internal/sweep', requireDb, async (req, res, next) => {
    const secret = process.env.CRON_SECRET
    if (!secret || req.get('authorization') !== `Bearer ${secret}`) return next()
    try {
      await sweepStalePayments()
      return sendSuccess(res, { message: 'Payments checked' })
    } catch (error) {
      return next(error)
    }
  })

  app.get('/api/csrf-token', issueCsrfToken)
  // Before the CSRF check: browsers send these with sendBeacon, which cannot add headers.
  app.post('/api/client-errors', clientErrorHandler)

  // Every POST/PUT/PATCH/DELETE below needs a matching X-CSRF-Token header, including login and signup.
  app.use('/api', verifyCsrf)

  app.use('/api/auth', requireDb, authRoutes)
  app.use('/api/products', requireDb, productRoutes)
  app.use('/api/orders', requireDb, orderRoutes)
  app.use('/api/users', requireDb, userRoutes)
  app.use('/api/admin', requireDb, adminRoutes)
  app.use('/api/coupons', requireDb, couponRoutes)
  app.use('/api/currency', currencyRoutes)
  app.use('/api', supportRoutes)

  // Private pages are also marked noindex in the page itself.
  const PRIVATE_PATHS = ['/admin', '/account', '/checkout', '/cart', '/wishlist', '/reset-password', '/verify-email']
  app.get('/robots.txt', (_req, res) => {
    const lines = ['User-agent: *', ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`), '', `Sitemap: ${env.clientUrl}/sitemap.xml`, '']
    res.type('text/plain').set('Cache-Control', 'public, max-age=86400').send(lines.join('\n'))
  })
  app.get('/sitemap.xml', requireDb, sitemap)
  app.get('/api/sitemap.xml', requireDb, sitemap)

  if (env.serveClient) serveClient(app)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
