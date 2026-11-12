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

// On Vercel, the site's own address is known without any setting: https://<project>.vercel.app (or your domain).
if (!process.env.CLIENT_URL && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  process.env.CLIENT_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
}

// Production refuses to start with settings that are only safe on a developer machine.
if (isProduction) {
  const weak = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter((name) => process.env[name].length < 32)
  if (weak.length) {
    throw new Error(`${weak.join(', ')} must be at least 32 characters in production. Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
  }
  if (!process.env.CLIENT_URL?.startsWith('https://')) {
    throw new Error('CLIENT_URL must be the https:// address of the storefront in production.')
  }
}

const SAME_SITE_VALUES = ['strict', 'lax', 'none']
const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase()
if (!SAME_SITE_VALUES.includes(sameSite)) {
  throw new Error(`COOKIE_SAMESITE must be one of: ${SAME_SITE_VALUES.join(', ')}.`)
}

// Browsers drop SameSite=None cookies that are not Secure, so "none" forces it on.
const cookieSecure = sameSite === 'none' || (process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction)

// Payment methods offered at checkout (the customer picks one):
//   cod      → cash on delivery: the order is placed unpaid and paid when it arrives.
//   razorpay → UPI, debit/credit cards, netbanking and wallets in the Razorpay popup.
//   stripe   → credit/debit cards (Apple Pay, Google Pay) on Stripe's hosted page.
// PAYMENT_METHODS lists them in display order, e.g. "razorpay,cod". When it is empty, every method whose keys are
// set is offered, plus cash on delivery. (The older PAYMENT_MODE setting still works: "manual" means cod.)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''
const razorpayConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
const KNOWN_METHODS = ['cod', 'razorpay', 'stripe']
const asMethod = (value) => (value === 'manual' ? 'cod' : value)
const listed = (process.env.PAYMENT_METHODS || process.env.PAYMENT_MODE || '')
  .split(',')
  .map((item) => asMethod(item.trim().toLowerCase()))
  .filter(Boolean)
const paymentMethods = listed.length
  ? [...new Set(listed)]
  : [...(razorpayConfigured ? ['razorpay'] : []), ...(stripeSecretKey ? ['stripe'] : []), 'cod']

const unknown = paymentMethods.filter((method) => !KNOWN_METHODS.includes(method))
if (unknown.length) throw new Error(`Unknown payment method: ${unknown.join(', ')}. Use any of: cod, razorpay, stripe.`)
if (paymentMethods.includes('razorpay') && !razorpayConfigured) {
  throw new Error('The razorpay payment method needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (Razorpay Dashboard → Account & Settings → API Keys).')
}
if (paymentMethods.includes('stripe') && !stripeSecretKey) throw new Error('The stripe payment method needs STRIPE_SECRET_KEY.')
if (isProduction && paymentMethods.includes('razorpay') && !process.env.RAZORPAY_WEBHOOK_SECRET) {
  console.warn('[payments] RAZORPAY_WEBHOOK_SECRET is not set: payments are confirmed by the browser and by re-checking with Razorpay only.')
}
if (isProduction && paymentMethods.includes('stripe') && !process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('[payments] STRIPE_WEBHOOK_SECRET is not set: payments are confirmed only when customers return from Stripe.')
}

// Razorpay accounts settle in rupees, so INR is the default there; anything else must be enabled by Razorpay.
// VITE_CURRENCY is what the storefront shows; CURRENCY (optional) is what is charged. They must match.
const currency = (process.env.CURRENCY || process.env.VITE_CURRENCY || (paymentMethods.includes('razorpay') ? 'inr' : 'usd')).toLowerCase()
const shownCurrency = (process.env.VITE_CURRENCY || 'usd').toLowerCase()
if (shownCurrency !== currency) {
  console.warn(`[payments] The store shows ${shownCurrency.toUpperCase()} but charges ${currency.toUpperCase()}. Set VITE_CURRENCY=${currency.toUpperCase()} in .env.`)
}

// Third-party shipping rates and tax. "flat" uses the built-in rules in utils/orderTotals.js, and is also the
// automatic fallback whenever a provider is slow or failing, so checkout never depends on an outside service.
const shippingProvider = (process.env.SHIPPING_PROVIDER || 'flat').toLowerCase()
const taxProvider = (process.env.TAX_PROVIDER || 'flat').toLowerCase()
if (!['flat', 'shippo'].includes(shippingProvider)) throw new Error('SHIPPING_PROVIDER must be "flat" or "shippo".')
if (!['flat', 'stripe'].includes(taxProvider)) throw new Error('TAX_PROVIDER must be "flat" or "stripe".')
if (shippingProvider === 'shippo') {
  const missing = ['SHIPPO_API_KEY', 'SHIP_FROM_STREET', 'SHIP_FROM_CITY', 'SHIP_FROM_ZIP', 'SHIP_FROM_COUNTRY'].filter((name) => !process.env[name])
  if (missing.length) throw new Error(`SHIPPING_PROVIDER=shippo needs: ${missing.join(', ')}.`)
}
if (taxProvider === 'stripe' && !stripeSecretKey) throw new Error('TAX_PROVIDER=stripe needs STRIPE_SECRET_KEY.')

// Signup reCAPTCHA: RECAPTCHA_SECRET_KEY (server) pairs with VITE_RECAPTCHA_SITE_KEY (browser) from the same
// Google registration. Production never skips the check: without the secret, sign-up is refused until it is set.
// Development runs without it when RECAPTCHA_SECRET_KEY is empty.
if (!process.env.RECAPTCHA_SECRET_KEY) {
  if (isProduction) {
    console.error('[captcha] RECAPTCHA_SECRET_KEY is not set, so new sign-ups are refused. Add RECAPTCHA_SECRET_KEY and VITE_RECAPTCHA_SITE_KEY (see .env.example).')
  } else if (process.env.NODE_ENV !== 'test') {
    console.warn('[captcha] RECAPTCHA_SECRET_KEY is empty: the sign-up reCAPTCHA is not checked (development only).')
  }
} else if (isProduction && !process.env.VITE_RECAPTCHA_SITE_KEY) {
  // On Vercel and similar hosts the build sees the same variables as the server, so a missing site key is detectable.
  console.error('[captcha] RECAPTCHA_SECRET_KEY is set but VITE_RECAPTCHA_SITE_KEY is not: the sign-up form shows no reCAPTCHA, so every sign-up will fail. Add the site key and redeploy.')
}

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
  // Where contact-form messages and new-order alerts go, and the address shown to customers.
  supportEmail: process.env.SUPPORT_EMAIL || '',
  payments: {
    // Offered at checkout, in display order. The first is preselected.
    methods: paymentMethods,
    // Shown greyed out in development so it is clear what is missing (never offered to customers).
    unavailable: KNOWN_METHODS.filter((method) => !paymentMethods.includes(method)),
    stripeSecretKey,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    // ISO 4217, lowercase. Prices in the catalogue are in this currency.
    currency,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
  // Server-side check of the signup reCAPTCHA. Pair with VITE_RECAPTCHA_SITE_KEY.
  recaptchaSecret: process.env.RECAPTCHA_SECRET_KEY || '',
  shipping: {
    provider: shippingProvider,
    shippoApiKey: process.env.SHIPPO_API_KEY || '',
    // Where parcels ship from. Country is a 2-letter ISO code, e.g. US, IN, GB.
    from: {
      name: process.env.SHIP_FROM_NAME || 'goodthings',
      street1: process.env.SHIP_FROM_STREET || '',
      city: process.env.SHIP_FROM_CITY || '',
      state: process.env.SHIP_FROM_STATE || '',
      zip: process.env.SHIP_FROM_ZIP || '',
      country: (process.env.SHIP_FROM_COUNTRY || '').toUpperCase(),
      phone: process.env.SHIP_FROM_PHONE || '',
      email: process.env.SHIP_FROM_EMAIL || process.env.SUPPORT_EMAIL || '',
    },
    // Box size in inches (LxWxH) and weight per item in pounds, used to ask carriers for a rate.
    parcel: (process.env.SHIP_PARCEL_IN || '12x9x4').split('x').map(Number),
    itemWeightLb: Number(process.env.SHIP_ITEM_WEIGHT_LB) || 1,
    // Added to the carrier rate to cover packaging.
    handlingFee: Number(process.env.SHIP_HANDLING_FEE) || 0,
  },
  tax: { provider: taxProvider },
  // Serve the built frontend (frontend/dist) from this server, for single-service deployments.
  serveClient: process.env.SERVE_CLIENT === 'true',
  release: process.env.RELEASE || process.env.npm_package_version || 'dev',
}
