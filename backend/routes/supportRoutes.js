import { Router } from 'express'
import { body, matchedData } from 'express-validator'
import { env } from '../config/env.js'
import { requireDb } from '../middleware/errorHandler.js'
import { byIp, limitRequests } from '../middleware/rateLimit.js'
import { validate } from '../middleware/validate.js'
import Product from '../models/Product.js'
import { sendSuccess } from '../utils/apiResponse.js'
import { clientIp } from '../utils/clientIp.js'
import { limiters } from '../utils/limiters.js'
import { sendContactEmail } from '../utils/sendEmail.js'

export const CONTACT_TOPICS = ['Order help', 'Returns & refunds', 'Product question', 'Account', 'Other']

const router = Router()

const contactRules = [
  body('name').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Please enter your name'),
  body('email').isString().trim().isEmail().withMessage('Please enter a valid email address'),
  body('topic').isIn(CONTACT_TOPICS).withMessage('Please choose a topic'),
  body('reference').optional({ values: 'falsy' }).isString().trim().isLength({ max: 30 }),
  body('message').isString().trim().isLength({ min: 10, max: 3000 }).withMessage('Messages must be between 10 and 3000 characters'),
  // Honeypot: real visitors never see or fill this field.
  body('website').optional().isString(),
]

// POST /api/contact — customer messages are emailed to SUPPORT_EMAIL.
router.post(
  '/contact',
  requireDb,
  limitRequests({ limiter: limiters.contactIp, key: byIp, name: 'contactIp', message: 'Too many messages. Please try again later or email us directly.' }),
  contactRules,
  validate,
  async (req, res, next) => {
    try {
      const { website, ...message } = matchedData(req, { locations: ['body'] })
      if (!website) {
        if (env.supportEmail) await sendContactEmail({ to: env.supportEmail, ...message })
        else console.warn(`[contact] SUPPORT_EMAIL is not set; message from ${message.email} was not forwarded:\n${message.message}`)
      }
      sendSuccess(res, { message: 'Thank you. We usually reply within one business day.' })
    } catch (error) {
      next(error)
    }
  },
)

const truncate = (value, max) => (typeof value === 'string' ? value.slice(0, max) : undefined)

// POST /api/client-errors — browser crashes (see frontend/src/utils/monitoring.js), one JSON line each.
// Sent with navigator.sendBeacon, so it is exempt from CSRF; it only writes to the log and is rate limited.
export const clientErrorHandler = [
  requireDb,
  limitRequests({ limiter: limiters.clientErrorsIp, key: byIp, name: 'clientErrorsIp', message: 'Too many reports' }),
  (req, res) => {
    const report = req.body ?? {}
    console.error(`[client-error] ${JSON.stringify({
      time: new Date().toISOString(),
      ip: clientIp(req),
      userAgent: truncate(req.get('user-agent'), 300),
      message: truncate(report.message, 500),
      url: truncate(report.url, 500),
      release: truncate(report.release, 60),
      stack: truncate(report.stack, 4000),
      componentStack: truncate(report.componentStack, 2000),
    })}`)
    res.status(204).end()
  },
]

// GET /sitemap.xml — every storefront page and product, for search engines.
const STATIC_PATHS = ['/', '/shop', '/about', '/contact', '/faq', '/shipping', '/returns', '/privacy', '/terms']

export const sitemap = async (_req, res, next) => {
  try {
    const products = await Product.find({}, '_id updatedAt').lean()
    const url = (path, lastmod) =>
      `<url><loc>${env.clientUrl}${path}</loc>${lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`
    const body = [
      ...STATIC_PATHS.map((path) => url(path)),
      ...products.map((product) => url(`/productitem/${product._id}`, product.updatedAt)),
    ].join('')

    res.type('application/xml').set('Cache-Control', 'public, max-age=3600')
    res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`)
  } catch (error) {
    next(error)
  }
}

export default router
