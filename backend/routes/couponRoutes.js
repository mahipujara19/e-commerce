import { Router } from 'express'
import { listPublicCoupons } from '../services/orderService.js'
import { sendSuccess } from '../utils/apiResponse.js'

const router = Router()

// GET /api/coupons — promo codes customers can use right now, for the storefront offers list. Public: no sign-in.
// Applying a code still goes through the server's checks in /api/orders/quote and /api/orders.
router.get('/', async (_req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=60')
    sendSuccess(res, { message: 'Current offers', data: await listPublicCoupons() })
  } catch (error) {
    next(error)
  }
})

export default router
