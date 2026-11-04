import { createHmac } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// The .env file sits at the repo root, shared with the frontend, so scripts work from any working directory.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })

const REQUIRED = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']

const missing = REQUIRED.filter((name) => !process.env[name])
if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`)
}

if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.')
}

const isProduction = process.env.NODE_ENV === 'production'

const SAME_SITE_VALUES = ['strict', 'lax', 'none']
const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase()
if (!SAME_SITE_VALUES.includes(sameSite)) {
  throw new Error(`COOKIE_SAMESITE must be one of: ${SAME_SITE_VALUES.join(', ')}.`)
}

// Browsers drop SameSite=None cookies that are not Secure, so "none" forces it on.
const cookieSecure = sameSite === 'none' || (process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction)

const list = (value) => (value ?? '').split(',').map((item) => item.trim()).filter(Boolean)

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  // Derived from the access secret when unset, so it is stable across restarts but still distinct from it.
  csrfSecret:
    process.env.CSRF_SECRET || createHmac('sha256', process.env.JWT_ACCESS_SECRET).update('csrf').digest('hex'),
  // Used in email links, so a trailing slash would produce "//verify-email".
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  isProduction,
  cookie: { sameSite, secure: cookieSecure },
  // Without SMTP_HOST, emails are printed to the console in development and refused in production.
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  emailFrom: process.env.EMAIL_FROM || 'goodthings <no-reply@goodthings.local>',
  // Who hears about stock changes; when empty, every admin account is emailed.
  stockAlertEmails: list(process.env.STOCK_ALERT_EMAILS),
}
