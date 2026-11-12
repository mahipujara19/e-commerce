import { Router } from 'express'
import { body, param } from 'express-validator'
import {
  cancelOwnOrder,
  createOrder,
  getAllOrders,
  getCheckoutConfig,
  getOrder,
  getOrders,
  payOrder,
  quoteOrder,
  updateOrderStatus,
  verifyRazorpay,
} from '../controllers/orderController.js'
import { protect, staffOnly } from '../middleware/authMiddleware.js'
import { byUser, limitRequests } from '../middleware/rateLimit.js'
import { validate } from '../middleware/validate.js'
import { ORDER_STATUSES } from '../models/Order.js'
import { env } from '../config/env.js'
import { limiters } from '../utils/limiters.js'

const router = Router()

const idRule = param('id').isMongoId().withMessage('Invalid order id')

const text = (path, label, max = 200) =>
  body(path)
    .isString().withMessage(`${label} is required`)
    .trim()
    .isLength({ min: 1, max }).withMessage(`${label} is required`)

const itemRules = [
  body('items').isArray({ min: 1, max: 100 }).withMessage('Your bag is empty'),
  body('items.*.product').isString().isMongoId().withMessage('Invalid product id'),
  body('items.*.quantity').isInt({ min: 1, max: 1000 }).withMessage('Quantity must be between 1 and 1000').toInt(),
]

const couponRule = body('couponCode')
  .optional({ values: 'falsy' })
  .isString().trim()
  .isLength({ max: 40 }).withMessage('That code is too long')
  .matches(/^[A-Za-z0-9_-]+$/).withMessage('Codes only contain letters, numbers, - and _')

const createRules = [
  ...itemRules,
  couponRule,
  text('shippingAddress.fullName', 'Full name'),
  body('shippingAddress.email').isString().trim().isEmail().withMessage('Please enter a valid email'),
  body('shippingAddress.phone')
    .isString().withMessage('Phone number is required')
    .trim()
    .matches(/^\+?[\d\s\-()]{7,20}$/).withMessage('Please enter a valid phone number, including the area code'),
  text('shippingAddress.address', 'Street address'),
  text('shippingAddress.city', 'City'),
  text('shippingAddress.state', 'State / Province'),
  text('shippingAddress.zipCode', 'Postal code', 20).matches(/^[A-Za-z0-9\s-]{3,10}$/).withMessage('Please enter a valid postal code'),
  text('shippingAddress.country', 'Country', 100),
  body('saveAddress').optional().isBoolean().toBoolean(),
  body('paymentMethod').optional().isIn(env.payments.methods).withMessage('Please choose an available payment method'),
]

const statusRules = [
  idRule,
  body('status').optional().isIn(ORDER_STATUSES).withMessage(`Status must be one of: ${ORDER_STATUSES.join(', ')}`),
  body('carrier').optional({ values: 'null' }).isString().trim().isLength({ max: 60 }).withMessage('Carrier name is too long'),
  body('trackingNumber').optional({ values: 'null' }).isString().trim().isLength({ max: 80 }).withMessage('Tracking number is too long'),
  body('estimatedDelivery').optional({ values: 'null' }).custom((value) => value === '' || !Number.isNaN(Date.parse(value)))
    .withMessage('Estimated delivery must be a date')
    .customSanitizer((value) => (value ? new Date(value) : null)),
  body('note').optional().isString().trim().isLength({ max: 200 }).withMessage('Note is too long'),
]

const placeOrderLimit = limitRequests({
  limiter: limiters.placeOrderUser,
  key: byUser,
  name: 'placeOrderUser',
  message: 'Too many orders in a short time. Please wait a few minutes or contact us.',
})

router.get('/config', getCheckoutConfig)
// Quotes are public so the bag page can show live stock and coupon results before sign-in.
// An optional address lets the quote use live carrier rates and destination tax.
const quoteAddressRules = ['fullName', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'country'].map((field) =>
  body(`shippingAddress.${field}`).optional().isString().trim().isLength({ max: 200 }),
)
router.post('/quote', [...itemRules, couponRule, ...quoteAddressRules], validate, quoteOrder)

router.use(protect)

router.route('/').get(getOrders).post(placeOrderLimit, createRules, validate, createOrder)

// Registered before /:id so "all" is not read as an order id.
router.get('/all', staffOnly, getAllOrders)

router
  .route('/:id')
  .get(idRule, validate, getOrder)
  .put(staffOnly, statusRules, validate, updateOrderStatus)

router.post('/:id/pay', idRule, validate, payOrder)
router.post('/:id/cancel', idRule, validate, cancelOwnOrder)
router.post(
  '/:id/razorpay/verify',
  [
    idRule,
    body('razorpayOrderId').isString().matches(/^order_[A-Za-z0-9]+$/).withMessage('Invalid Razorpay order id'),
    body('razorpayPaymentId').isString().matches(/^pay_[A-Za-z0-9]+$/).withMessage('Invalid Razorpay payment id'),
    body('signature').isString().isHexadecimal().isLength({ min: 64, max: 64 }).withMessage('Invalid payment signature'),
  ],
  validate,
  verifyRazorpay,
)

export default router
