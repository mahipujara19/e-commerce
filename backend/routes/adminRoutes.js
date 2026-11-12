import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { createCoupon, deleteCoupon, getAuditLogs, getCoupons, updateCoupon } from '../controllers/adminController.js'
import { adminOnly, protect } from '../middleware/authMiddleware.js'
import { validate } from '../middleware/validate.js'
import { COUPON_TYPES } from '../models/Coupon.js'

const router = Router()

const idRule = param('id').isMongoId().withMessage('Invalid id')

const couponRules = ({ partial }) => {
  const field = (name) => (partial ? body(name).optional() : body(name))
  return [
    field('code').isString().trim().toUpperCase()
      .matches(/^[A-Z0-9_-]{3,40}$/).withMessage('Codes are 3–40 letters, numbers, - or _'),
    field('type').isIn(COUPON_TYPES).withMessage('Type must be percent or fixed'),
    field('value').isFloat({ min: 0.01, max: 100000 }).withMessage('Value must be a positive number').toFloat()
      .custom((value, { req }) => req.body.type !== 'percent' || value <= 100).withMessage('A percentage cannot exceed 100'),
    body('description').optional().isString().trim().isLength({ max: 200 }),
    body('minSubtotal').optional().isFloat({ min: 0 }).withMessage('Minimum must be 0 or more').toFloat(),
    body('maxUses').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Usage limit must be at least 1').toInt(),
    body('expiresAt').optional({ values: 'null' }).isISO8601().withMessage('Expiry must be a date').toDate(),
    body('active').optional().isBoolean().toBoolean(),
  ]
}

router.use(protect, adminOnly)

router.route('/coupons')
  .get(getCoupons)
  .post(couponRules({ partial: false }), validate, createCoupon)

router.route('/coupons/:id')
  .put(idRule, couponRules({ partial: true }), validate, updateCoupon)
  .delete(idRule, validate, deleteCoupon)

router.get(
  '/audit-logs',
  [
    query('action').optional().isString().isLength({ max: 40 }),
    query('limit').optional().isInt({ min: 1, max: 500 }).toInt(),
  ],
  validate,
  getAuditLogs,
)

export default router
