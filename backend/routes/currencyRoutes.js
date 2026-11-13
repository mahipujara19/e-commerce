import { Router } from 'express'
import { env } from '../config/env.js'
import { createRateCache } from '../services/currencyService.js'
import { sendSuccess } from '../utils/apiResponse.js'

const router = Router()
const rateCache = createRateCache({ base: env.payments.currency })

// GET /api/currency/rates — display-only exchange rates against the store currency. Public; customers are always
// charged in the store currency (`base`).
router.get('/rates', async (_req, res, next) => {
  try {
    const rates = await rateCache.getRates()
    res.set('Cache-Control', rates.available ? 'public, max-age=3600' : 'no-store')
    sendSuccess(res, { message: 'Exchange rates', data: rates })
  } catch (error) {
    next(error)
  }
})

export default router
